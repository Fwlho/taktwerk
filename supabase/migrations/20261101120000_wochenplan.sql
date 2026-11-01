-- Wochenplan: Vorwoche kopieren, Wochenvorlagen, Woche gesammelt einreichen und freigeben.
-- Der Wochenplan ist nur eine Ansicht auf normale Beiträge; diese Funktionen legen Beiträge an
-- bzw. ändern deren Status über transition_post_status (alle Regeln gelten weiter).

-- Kalendertag eines Beitrags in deutscher Ortszeit
create function private.post_day(p_scheduled_at timestamptz, p_planned_on date) returns date
language sql immutable
set search_path = ''
as $$
  select coalesce((p_scheduled_at at time zone 'Europe/Berlin')::date, p_planned_on);
$$;
grant execute on function private.post_day(timestamptz, date) to authenticated;

-- Benachrichtigungen bei Sammel-Aktionen unterdrücken (statt einer Nachricht je Beitrag gibt es eine Zusammenfassung)
create or replace function private.notify(org uuid, recipients uuid[], p_type text, p_payload jsonb) returns void
language sql security definer
set search_path = ''
as $$
  insert into public.notifications (organization_id, user_id, type, payload)
  select org, r, p_type, p_payload
  from (select distinct unnest(recipients) as r) x
  where coalesce(current_setting('app.suppress_notify', true), '') <> 'on'
    and r is not null and r is distinct from (select auth.uid())
    and exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = r);
$$;

-- ---------------------------------------------------------------------------
-- Beiträge einer Woche kopieren (als Ideen, ohne Text, Ergebnisse und Kommentare)
-- Läuft mit den Rechten der aufrufenden Person (RLS + Spaltenrechte gelten).
-- ---------------------------------------------------------------------------
create function public.copy_week(p_org uuid, p_from date, p_to date, p_channel uuid default null) returns integer
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_src  record;
  v_new  uuid;
  v_days integer := p_to - p_from;
  v_n    integer := 0;
begin
  if extract(isodow from p_from) <> 1 or extract(isodow from p_to) <> 1 then
    raise exception 'week_start_monday' using errcode = 'P0001';
  end if;
  if not private.has_role(p_org, '{owner,editor}') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  for v_src in
    select p.* from public.posts p
    where p.organization_id = p_org
      and (p_channel is null or p.channel_id = p_channel)
      and private.post_day(p.scheduled_at, p.planned_on) between p_from and p_from + 6
    order by p.scheduled_at nulls last, p.created_at
  loop
    insert into public.posts (organization_id, channel_id, campaign_id, title, internal_notes, status, planned_on, scheduled_at)
    values (p_org, v_src.channel_id, v_src.campaign_id, v_src.title, v_src.internal_notes, 'idea',
            private.post_day(v_src.scheduled_at, v_src.planned_on) + v_days,
            v_src.scheduled_at + make_interval(days => v_days))
    returning id into v_new;

    insert into public.post_ai_prompts (organization_id, post_id, kind, prompt, position)
    select p_org, v_new, a.kind, a.prompt, a.position
    from public.post_ai_prompts a where a.post_id = v_src.id;

    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Woche als Vorlage speichern / Vorlage auf eine Woche anwenden
-- ---------------------------------------------------------------------------
create function public.save_week_as_template(p_org uuid, p_week_start date, p_name text, p_default boolean default false)
returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_tpl uuid;
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start_monday' using errcode = 'P0001';
  end if;
  if p_default then
    update public.week_templates set is_default = false where organization_id = p_org and is_default;
  end if;
  insert into public.week_templates (organization_id, name, is_default)
  values (p_org, btrim(p_name), p_default)
  returning id into v_tpl;

  insert into public.week_template_slots (organization_id, week_template_id, channel_id, weekday, time_of_day, title, notes, prompts, position)
  select p_org, v_tpl, p.channel_id,
         extract(isodow from private.post_day(p.scheduled_at, p.planned_on))::smallint,
         (p.scheduled_at at time zone 'Europe/Berlin')::time,
         p.title, p.internal_notes,
         coalesce((select jsonb_agg(jsonb_build_object('kind', a.kind, 'prompt', a.prompt) order by a.position)
                   from public.post_ai_prompts a where a.post_id = p.id), '[]'::jsonb),
         row_number() over (order by p.scheduled_at nulls last, p.created_at)
  from public.posts p
  where p.organization_id = p_org
    and private.post_day(p.scheduled_at, p.planned_on) between p_week_start and p_week_start + 6;

  if not exists (select 1 from public.week_template_slots s where s.week_template_id = v_tpl) then
    raise exception 'week_empty' using errcode = 'P0001';
  end if;
  return v_tpl;
end;
$$;

create function public.apply_week_template(p_template uuid, p_week_start date) returns integer
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_slot record;
  v_new  uuid;
  v_day  date;
  v_n    integer := 0;
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start_monday' using errcode = 'P0001';
  end if;
  for v_slot in
    select s.* from public.week_template_slots s
    where s.week_template_id = p_template
    order by s.weekday, s.time_of_day nulls first, s.position
  loop
    if not private.has_role(v_slot.organization_id, '{owner,editor}') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    v_day := p_week_start + (v_slot.weekday - 1);
    insert into public.posts (organization_id, channel_id, title, internal_notes, status, planned_on, scheduled_at)
    values (v_slot.organization_id, v_slot.channel_id, v_slot.title, v_slot.notes, 'idea', v_day,
            case when v_slot.time_of_day is null then null
                 else (v_day + v_slot.time_of_day) at time zone 'Europe/Berlin' end)
    returning id into v_new;

    insert into public.post_ai_prompts (organization_id, post_id, kind, prompt, position)
    select v_slot.organization_id, v_new,
           coalesce((e.value ->> 'kind')::public.ai_prompt_kind, 'text'),
           left(coalesce(e.value ->> 'prompt', ''), 10000),
           (e.ordinality - 1)::integer
    from jsonb_array_elements(v_slot.prompts) with ordinality as e(value, ordinality);

    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Woche (eine oder alle Plattformen) gesammelt zur Freigabe einreichen
-- ---------------------------------------------------------------------------
create function public.submit_week_for_approval(p_org uuid, p_week_start date, p_channel uuid default null, p_message text default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_req uuid;
  v_id  uuid;
begin
  if extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start_monday' using errcode = 'P0001';
  end if;
  if not private.has_role(p_org, '{owner,editor,external}') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- nur Beiträge, die die Person sieht und die noch nicht eingereicht sind
  select array_agg(p.id order by p.scheduled_at nulls last) into v_ids
  from public.posts p
  where p.organization_id = p_org
    and (p_channel is null or p.channel_id = p_channel)
    and p.status in ('idea', 'draft', 'changes_requested')
    and private.post_day(p.scheduled_at, p.planned_on) between p_week_start and p_week_start + 6
    and private.can_edit_post(p.organization_id, p.id);

  if v_ids is null then
    raise exception 'nothing_to_submit' using errcode = 'P0001';
  end if;

  perform set_config('app.suppress_notify', 'on', true);
  foreach v_id in array v_ids loop
    perform public.transition_post_status(v_id, 'in_review');
  end loop;
  perform set_config('app.suppress_notify', '', true);

  insert into public.approval_requests (organization_id, requested_by, week_start, channel_id, message)
  values (p_org, auth.uid(), p_week_start, p_channel, nullif(btrim(coalesce(p_message, '')), ''))
  returning id into v_req;
  insert into public.approval_request_posts (approval_request_id, post_id, organization_id)
  select v_req, unnest(v_ids), p_org;

  perform private.notify(p_org,
    array(select m.user_id from public.memberships m where m.organization_id = p_org and m.role = 'owner'),
    'week_submitted',
    jsonb_build_object('request_id', v_req, 'week_start', p_week_start, 'count', cardinality(v_ids),
                       'title', format('KW %s', extract(week from p_week_start))));
  return v_req;
end;
$$;

-- Owner gibt eine eingereichte Woche gesammelt frei (nur Beiträge, die noch „Zur Freigabe“ sind)
create function public.approve_week(p_request uuid, p_comment text default null) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_req public.approval_requests;
  v_id  uuid;
  v_n   integer := 0;
begin
  select * into v_req from public.approval_requests where id = p_request for update;
  if v_req.id is null or not private.has_role(v_req.organization_id, '{owner}') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform set_config('app.suppress_notify', 'on', true);
  for v_id in
    select arp.post_id from public.approval_request_posts arp
    join public.posts p on p.id = arp.post_id
    where arp.approval_request_id = p_request and p.status = 'in_review'
  loop
    perform public.transition_post_status(v_id, 'approved', p_comment);
    v_n := v_n + 1;
  end loop;
  perform set_config('app.suppress_notify', '', true);

  update public.approval_requests set status = 'closed', closed_at = now() where id = p_request;
  perform private.notify(v_req.organization_id, array[v_req.requested_by], 'week_approved',
    jsonb_build_object('request_id', p_request, 'week_start', v_req.week_start, 'count', v_n,
                       'title', format('KW %s', extract(week from v_req.week_start))));
  return v_n;
end;
$$;

revoke execute on function public.copy_week(uuid, date, date, uuid) from public, anon;
revoke execute on function public.save_week_as_template(uuid, date, text, boolean) from public, anon;
revoke execute on function public.apply_week_template(uuid, date) from public, anon;
revoke execute on function public.submit_week_for_approval(uuid, date, uuid, text) from public, anon;
revoke execute on function public.approve_week(uuid, text) from public, anon;
grant execute on function public.copy_week(uuid, date, date, uuid) to authenticated;
grant execute on function public.save_week_as_template(uuid, date, text, boolean) to authenticated;
grant execute on function public.apply_week_template(uuid, date) to authenticated;
grant execute on function public.submit_week_for_approval(uuid, date, uuid, text) to authenticated;
grant execute on function public.approve_week(uuid, text) to authenticated;

-- Phase 5 – Plattform-Anbindung: Konto-Kennung, Veröffentlichungs-Versuche, System-Funktionen

-- Der Server (Service-Rolle) veröffentlicht; die Trigger auf posts nutzen Hilfsfunktionen im Schema private.
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;

-- Konto auf der Plattform (z. B. Facebook-Seiten-ID) – sichtbar, aber nur der Server schreibt es
alter table public.channels add column external_account_id text check (char_length(external_account_id) <= 120);

-- Link zum veröffentlichten Beitrag und Wiederholungsversuche bei Fehlern
alter table public.posts
  add column external_url     text check (char_length(external_url) <= 500),
  add column publish_attempts smallint not null default 0,
  add column publish_retry_at timestamptz;

-- Neu geplant oder neuer Termin → Versuche und alten Fehler zurücksetzen
create function private.posts_publish_reset() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'scheduled' and (old.status is distinct from 'scheduled' or new.scheduled_at is distinct from old.scheduled_at) then
    new.publish_attempts := 0;
    new.publish_retry_at := null;
    new.publish_error := null;
  end if;
  return new;
end;
$$;
-- läuft nach posts_guard_update (alphabetische Reihenfolge)
create trigger posts_publish_reset before update on public.posts for each row execute function private.posts_publish_reset();

-- ---------------------------------------------------------------------------
-- Nur für den Server (Service-Rolle)
-- ---------------------------------------------------------------------------

/**
 * Fällige geplante Beiträge auf verbundenen Kanälen reservieren (5 Min. Sperre, höchstens 5 Versuche).
 * Mit p_post nur diesen einen Beitrag („Jetzt veröffentlichen“).
 */
create function public.claim_due_posts(p_limit integer default 10, p_post uuid default null)
returns table (post_id uuid, organization_id uuid, channel_id uuid, attempt smallint)
language plpgsql security definer set search_path = ''
as $$
begin
  return query
  with due as (
    select p.id from public.posts p
    join public.channels c on c.id = p.channel_id
    where p.status = 'scheduled'
      and c.connection_status = 'connected'
      and (p_post is null or p.id = p_post)
      and (p_post is not null or p.scheduled_at <= now())
      and coalesce(p.publish_retry_at, '-infinity') <= now()
      and p.publish_attempts < 5
    order by p.scheduled_at
    limit greatest(1, least(p_limit, 50))
    for update of p skip locked
  )
  update public.posts p
     set publish_attempts = p.publish_attempts + 1,
         publish_retry_at = now() + interval '5 minutes'
    from due
   where p.id = due.id
  returning p.id, p.organization_id, p.channel_id, p.publish_attempts;
end $$;

/** Erfolg: Status „Veröffentlicht“, Link speichern, Ersteller benachrichtigen. */
create function public.mark_post_published(p_post uuid, p_external_id text, p_url text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.posts;
begin
  update public.posts
     set status = 'published', published_at = now(), external_post_id = left(p_external_id, 200),
         external_url = left(p_url, 500), publish_error = null, publish_retry_at = null
   where id = p_post and status = 'scheduled'
  returning * into v;
  if v.id is null then return; end if;
  perform private.notify(v.organization_id, array[v.created_by], 'post_published',
    jsonb_build_object('post_id', v.id, 'title', v.title));
end $$;

/**
 * Fehler: Meldung speichern; bei vorübergehenden Fehlern später erneut (Abstand wächst),
 * bei dauerhaften Fehlern oder nach 5 Versuchen Inhaber und Ersteller benachrichtigen.
 */
create function public.mark_post_failed(p_post uuid, p_error text, p_retry boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v public.posts;
  v_final boolean;
begin
  select * into v from public.posts where id = p_post;
  if v.id is null then return; end if;
  v_final := not p_retry or v.publish_attempts >= 5;
  update public.posts
     set publish_error = left(p_error, 500),
         publish_retry_at = case when v_final then null else now() + (interval '2 minutes' * power(2, v.publish_attempts)) end,
         publish_attempts = case when v_final then 5 else publish_attempts end
   where id = p_post;
  if v_final then
    perform private.notify(v.organization_id,
      array(select m.user_id from public.memberships m where m.organization_id = v.organization_id and m.role = 'owner') || v.created_by,
      'publish_failed', jsonb_build_object('post_id', v.id, 'title', v.title));
  end if;
end $$;

revoke execute on function public.claim_due_posts(integer, uuid) from public, anon, authenticated;
revoke execute on function public.mark_post_published(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.mark_post_failed(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_due_posts(integer, uuid) to service_role;
grant execute on function public.mark_post_published(uuid, text, text) to service_role;
grant execute on function public.mark_post_failed(uuid, text, boolean) to service_role;
grant execute on function private.posts_publish_reset() to authenticated, service_role;

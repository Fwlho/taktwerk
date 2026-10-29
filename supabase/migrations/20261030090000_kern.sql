-- Phase 2 – Kern: Kanäle, Kampagnen, Beiträge, Freigaben, Kommentare, Assets,
-- Verlauf, Benachrichtigungen, Push, Einstellungen, Wochenplan-Tabellen.
--
-- Mandantentrennung doppelt abgesichert:
--   1. RLS auf jeder Tabelle
--   2. zusammengesetzte Fremdschlüssel (id, organization_id), damit keine
--      Verknüpfung über Unternehmensgrenzen hinweg möglich ist.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.channel_type as enum ('instagram', 'facebook', 'youtube', 'linkedin', 'tiktok', 'offline');
create type public.offline_kind as enum ('flyer', 'poster', 'vehicle', 'fair', 'print_ad', 'other');
create type public.post_status as enum ('idea', 'draft', 'in_review', 'changes_requested', 'approved', 'scheduled', 'published', 'evaluated');
create type public.campaign_status as enum ('draft', 'running', 'paused', 'completed');
create type public.campaign_goal as enum ('inquiries', 'recruiting', 'awareness', 'event', 'other');
create type public.approval_decision as enum ('approved', 'changes_requested');
create type public.connection_status as enum ('not_connected', 'connected', 'expired', 'error');
create type public.asset_kind as enum ('image', 'video', 'logo', 'document');
create type public.ai_prompt_kind as enum ('text', 'image', 'video', 'caption');

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------------------

-- System (Service-Rolle, z. B. Veröffentlichungs-Job) darf Regeln umgehen, die für Nutzer gelten.
create function private.is_system() returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(auth.role(), '') = 'service_role' or (select auth.uid()) is null and current_user in ('postgres', 'supabase_admin');
$$;


-- ---------------------------------------------------------------------------
-- Kanäle
-- ---------------------------------------------------------------------------
create table public.channels (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  type                  public.channel_type not null,
  name                  text not null check (char_length(btrim(name)) between 1 and 80),
  connection_status     public.connection_status not null default 'not_connected',
  provider              text check (char_length(provider) <= 40),
  external_account_name text check (char_length(external_account_name) <= 120),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id, type),
  unique (id, organization_id)
);

-- Plattform-Zugangsdaten: verschlüsselt, nur für den Server (Service-Rolle) lesbar.
create table public.channel_credentials (
  channel_id      uuid primary key,
  organization_id uuid not null,
  ciphertext      bytea not null,
  iv              bytea not null,
  auth_tag        bytea not null,
  expires_at      timestamptz,
  updated_at      timestamptz not null default now(),
  foreign key (channel_id, organization_id) references public.channels (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Kampagnen
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  name                 text not null check (char_length(btrim(name)) between 1 and 120),
  goal                 public.campaign_goal not null default 'inquiries',
  goal_description     text check (char_length(goal_description) <= 500),
  goal_target          integer check (goal_target >= 0),
  start_date           date not null,
  end_date             date,
  status               public.campaign_status not null default 'draft',
  budget_planned_cents bigint not null default 0 check (budget_planned_cents >= 0),
  created_by           uuid default auth.uid() references auth.users (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  unique (id, organization_id)
);
create index campaigns_org_idx on public.campaigns (organization_id, start_date desc);

create table public.campaign_channels (
  campaign_id          uuid not null,
  channel_id           uuid not null,
  organization_id      uuid not null,
  budget_planned_cents bigint not null default 0 check (budget_planned_cents >= 0),
  primary key (campaign_id, channel_id),
  foreign key (campaign_id, organization_id) references public.campaigns (id, organization_id) on delete cascade,
  foreign key (channel_id, organization_id) references public.channels (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Beiträge
-- ---------------------------------------------------------------------------
create table public.post_groups (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null default '' check (char_length(title) <= 200),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  channel_id       uuid not null,
  campaign_id      uuid,
  group_id         uuid,
  title            text not null default '' check (char_length(title) <= 200),
  body             text not null default '' check (char_length(body) <= 63206),
  internal_notes   text check (char_length(internal_notes) <= 5000),
  status           public.post_status not null default 'idea',
  planned_on       date,
  scheduled_at     timestamptz,
  published_at     timestamptz,
  external_post_id text,
  publish_error    text check (char_length(publish_error) <= 500),
  created_by       uuid references auth.users (id) on delete set null,
  updated_by       uuid references auth.users (id) on delete set null,
  version          integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (channel_id, organization_id) references public.channels (id, organization_id),
  foreign key (campaign_id, organization_id) references public.campaigns (id, organization_id) on delete set null (campaign_id),
  foreign key (group_id, organization_id) references public.post_groups (id, organization_id) on delete set null (group_id)
);
create index posts_org_status_idx on public.posts (organization_id, status);
create index posts_org_planned_idx on public.posts (organization_id, planned_on);
create index posts_org_scheduled_idx on public.posts (organization_id, scheduled_at);
create index posts_campaign_idx on public.posts (campaign_id) where campaign_id is not null;
create index posts_group_idx on public.posts (group_id) where group_id is not null;

create table public.post_assignees (
  post_id         uuid not null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null,
  created_at      timestamptz not null default now(),
  primary key (post_id, user_id),
  foreign key (post_id, organization_id) references public.posts (id, organization_id) on delete cascade,
  foreign key (organization_id, user_id) references public.memberships (organization_id, user_id) on delete cascade
);
create index post_assignees_user_idx on public.post_assignees (user_id);

create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  post_id         uuid not null,
  author_id       uuid default auth.uid() references auth.users (id) on delete set null,
  body            text not null check (char_length(btrim(body)) between 1 and 5000),
  quoted_text     text check (char_length(quoted_text) <= 500),
  created_at      timestamptz not null default now(),
  edited_at       timestamptz,
  unique (id, organization_id),
  foreign key (post_id, organization_id) references public.posts (id, organization_id) on delete cascade
);
create index comments_post_idx on public.comments (post_id, created_at);

create table public.approvals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  post_id         uuid not null,
  decision        public.approval_decision not null,
  comment_id      uuid,
  decided_by      uuid references auth.users (id) on delete set null,
  decided_at      timestamptz not null default now(),
  foreign key (post_id, organization_id) references public.posts (id, organization_id) on delete cascade,
  foreign key (comment_id, organization_id) references public.comments (id, organization_id) on delete set null (comment_id)
);
create index approvals_post_idx on public.approvals (post_id, decided_at);

-- ---------------------------------------------------------------------------
-- Assets (Dateien im Storage-Bucket "assets" unter <organization_id>/…)
-- ---------------------------------------------------------------------------
create table public.assets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind            public.asset_kind not null,
  storage_path    text not null unique,
  file_name       text not null check (char_length(file_name) between 1 and 200),
  mime_type       text not null check (char_length(mime_type) <= 100),
  size_bytes      bigint not null check (size_bytes > 0),
  width           integer check (width > 0),
  height          integer check (height > 0),
  duration_s      numeric(10, 2) check (duration_s >= 0),
  alt_text        text check (char_length(alt_text) <= 500),
  uploaded_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (id, organization_id),
  check (storage_path like organization_id::text || '/%'),
  -- Bilder/Logos/Dokumente bis 20 MB, Videos bis 50 MB
  check (size_bytes <= case when kind = 'video' then 52428800 else 20971520 end)
);
create index assets_org_idx on public.assets (organization_id, created_at desc);

create table public.post_assets (
  post_id         uuid not null,
  asset_id        uuid not null,
  organization_id uuid not null,
  position        integer not null default 0,
  primary key (post_id, asset_id),
  foreign key (post_id, organization_id) references public.posts (id, organization_id) on delete cascade,
  foreign key (asset_id, organization_id) references public.assets (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Wochenplan: KI-Prompts, Vorlagen, Sammel-Freigabe
-- ---------------------------------------------------------------------------
create table public.post_ai_prompts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  post_id         uuid not null,
  kind            public.ai_prompt_kind not null default 'text',
  prompt          text not null default '' check (char_length(prompt) <= 10000),
  result          text check (char_length(result) <= 20000),
  result_at       timestamptz,
  position        integer not null default 0,
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (post_id, organization_id) references public.posts (id, organization_id) on delete cascade
);
create index post_ai_prompts_post_idx on public.post_ai_prompts (post_id, position);

create table public.prompt_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  kind            public.ai_prompt_kind not null default 'text',
  prompt          text not null check (char_length(prompt) between 1 and 10000),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create table public.week_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  is_default      boolean not null default false,
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (id, organization_id)
);
create unique index week_templates_default_uidx on public.week_templates (organization_id) where is_default;

create table public.week_template_slots (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null,
  week_template_id uuid not null,
  channel_id       uuid not null,
  weekday          smallint not null check (weekday between 1 and 7),
  time_of_day      time,
  title            text not null default '' check (char_length(title) <= 200),
  notes            text check (char_length(notes) <= 5000),
  prompts          jsonb not null default '[]' check (jsonb_typeof(prompts) = 'array'),
  position         integer not null default 0,
  foreign key (week_template_id, organization_id) references public.week_templates (id, organization_id) on delete cascade,
  foreign key (channel_id, organization_id) references public.channels (id, organization_id) on delete cascade
);

create table public.approval_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  requested_by    uuid default auth.uid() references auth.users (id) on delete set null,
  week_start      date not null check (extract(isodow from week_start) = 1),
  channel_id      uuid,
  message         text check (char_length(message) <= 2000),
  status          text not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now(),
  closed_at       timestamptz,
  unique (id, organization_id),
  foreign key (channel_id, organization_id) references public.channels (id, organization_id) on delete cascade
);

create table public.approval_request_posts (
  approval_request_id uuid not null,
  post_id             uuid not null,
  organization_id     uuid not null,
  primary key (approval_request_id, post_id),
  foreign key (approval_request_id, organization_id) references public.approval_requests (id, organization_id) on delete cascade,
  foreign key (post_id, organization_id) references public.posts (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Verlauf, Benachrichtigungen, Push, Einstellungen
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type     text not null,
  entity_id       uuid not null,
  post_id         uuid,
  action          text not null,
  actor_id        uuid references auth.users (id) on delete set null,
  changes         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index activity_log_entity_idx on public.activity_log (organization_id, entity_type, entity_id, created_at desc);
create index activity_log_post_idx on public.activity_log (post_id, created_at desc) where post_id is not null;

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  type            text not null check (char_length(type) <= 50),
  payload         jsonb not null default '{}',
  read_at         timestamptz,
  pushed_at       timestamptz,
  created_at      timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Gehört dem Gerät der Person, nicht dem Unternehmen (Ausnahme ohne organization_id)
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key             text not null check (key ~ '^[a-z][a-z0-9_.]{0,63}$'),
  value           jsonb not null,
  updated_at      timestamptz not null default now(),
  primary key (user_id, organization_id, key)
);

-- ---------------------------------------------------------------------------
-- Sichtbarkeit von Beiträgen
-- ---------------------------------------------------------------------------
-- Beitrag sichtbar? Intern alle, Externe nur zugewiesene.
create function private.can_see_post(org uuid, post uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_role(org, '{owner,editor,viewer}')
      or (private.has_role(org, '{external}')
          and exists (select 1 from public.post_assignees a
                      where a.post_id = post and a.user_id = (select auth.uid())));
$$;

-- Beitrag bearbeitbar? Inhaber/Ersteller alle, Externe nur zugewiesene.
create function private.can_edit_post(org uuid, post uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_role(org, '{owner,editor}')
      or (private.has_role(org, '{external}')
          and exists (select 1 from public.post_assignees a
                      where a.post_id = post and a.user_id = (select auth.uid())));
$$;

grant execute on function private.can_see_post(uuid, uuid) to authenticated;
grant execute on function private.can_edit_post(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger channels_updated_at before update on public.channels for each row execute function private.set_updated_at();
create trigger campaigns_updated_at before update on public.campaigns for each row execute function private.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute function private.set_updated_at();
create trigger post_ai_prompts_updated_at before update on public.post_ai_prompts for each row execute function private.set_updated_at();
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function private.set_updated_at();
create trigger channel_credentials_updated_at before update on public.channel_credentials for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Regeln für Beiträge
-- ---------------------------------------------------------------------------
create function private.posts_before_insert() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_system() then
    new.created_by := (select auth.uid());
    new.updated_by := (select auth.uid());
    if new.status not in ('idea', 'draft') then
      raise exception 'invalid_initial_status' using errcode = 'P0001';
    end if;
    new.published_at := null;
    new.external_post_id := null;
    new.publish_error := null;
  end if;
  new.version := 1;
  return new;
end;
$$;

create function private.posts_before_update() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_transition boolean := coalesce(current_setting('app.status_transition', true), '') = 'on';
  v_content_changed boolean := new.title is distinct from old.title
                            or new.body is distinct from old.body
                            or new.channel_id is distinct from old.channel_id;
begin
  if private.is_system() then
    new.version := old.version + 1;
    return new;
  end if;

  if old.status in ('published', 'evaluated') and not v_transition and (
       v_content_changed or new.scheduled_at is distinct from old.scheduled_at
       or new.planned_on is distinct from old.planned_on) then
    raise exception 'post_published_locked' using errcode = 'P0001';
  end if;

  -- Externe dürfen nur Texte ändern, nicht Kanal, Kampagne, Gruppe oder Termin.
  if not private.has_role(old.organization_id, '{owner,editor}') and (
       new.channel_id is distinct from old.channel_id or new.campaign_id is distinct from old.campaign_id
       or new.group_id is distinct from old.group_id or new.planned_on is distinct from old.planned_on
       or new.scheduled_at is distinct from old.scheduled_at) then
    raise exception 'forbidden_field' using errcode = '42501';
  end if;

  if new.status is distinct from old.status and not v_transition then
    raise exception 'status_via_transition_only' using errcode = 'P0001';
  end if;

  -- Geänderter Inhalt nach der Freigabe muss neu freigegeben werden.
  if v_content_changed and old.status in ('approved', 'scheduled') and not v_transition then
    new.status := 'draft';
  end if;

  new.published_at := old.published_at;
  new.external_post_id := old.external_post_id;
  new.publish_error := old.publish_error;
  new.created_by := old.created_by;
  new.updated_by := (select auth.uid());
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger posts_guard_insert before insert on public.posts for each row execute function private.posts_before_insert();
create trigger posts_guard_update before update on public.posts for each row execute function private.posts_before_update();

-- Zugewiesene Person muss Mitglied sein (FK) – Betrachter können nichts bearbeiten, daher nicht zuweisbar.
create function private.post_assignees_check() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.memberships m
             where m.organization_id = new.organization_id and m.user_id = new.user_id and m.role = 'viewer') then
    raise exception 'assignee_viewer' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger post_assignees_check before insert on public.post_assignees for each row execute function private.post_assignees_check();

create function private.comments_before_update() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.post_id := old.post_id;
  new.organization_id := old.organization_id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  new.edited_at := now();
  return new;
end;
$$;
create trigger comments_guard_update before update on public.comments for each row execute function private.comments_before_update();

-- ---------------------------------------------------------------------------
-- Statuswechsel – einziger Weg, den Status eines Beitrags zu ändern
-- ---------------------------------------------------------------------------
create function private.notify(org uuid, recipients uuid[], p_type text, p_payload jsonb) returns void
language sql security definer
set search_path = ''
as $$
  insert into public.notifications (organization_id, user_id, type, payload)
  select org, r, p_type, p_payload
  from (select distinct unnest(recipients) as r) x
  where r is not null and r is distinct from (select auth.uid())
    and exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = r);
$$;

create function public.transition_post_status(p_post_id uuid, p_to public.post_status, p_comment text default null)
returns public.posts
language plpgsql security definer
set search_path = ''
as $$
declare
  v_post    public.posts;
  v_role    public.member_role;
  v_from    public.post_status;
  v_uid     uuid := auth.uid();
  v_comment uuid;
  v_ok      boolean := false;
  v_payload jsonb;
begin
  select * into v_post from public.posts where id = p_post_id for update;
  if v_post.id is null or not private.can_see_post(v_post.organization_id, v_post.id) then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;
  select m.role into v_role from public.memberships m
  where m.organization_id = v_post.organization_id and m.user_id = v_uid;
  v_from := v_post.status;

  if v_from = p_to then
    return v_post;
  end if;
  if p_to in ('published', 'evaluated') or v_from in ('published', 'evaluated') then
    raise exception 'transition_system_only' using errcode = '42501';
  end if;

  -- Erlaubte Übergänge je Rolle
  v_ok := case v_role
    when 'owner' then
      (v_from, p_to) in (
        ('idea', 'draft'), ('draft', 'idea'), ('idea', 'in_review'), ('draft', 'in_review'),
        ('in_review', 'draft'), ('in_review', 'approved'), ('in_review', 'changes_requested'),
        ('changes_requested', 'draft'), ('changes_requested', 'in_review'),
        ('idea', 'approved'), ('draft', 'approved'), ('changes_requested', 'approved'),
        ('approved', 'in_review'), ('approved', 'draft'), ('approved', 'scheduled'),
        ('scheduled', 'approved'), ('scheduled', 'draft'))
    when 'editor' then
      (v_from, p_to) in (
        ('idea', 'draft'), ('draft', 'idea'), ('idea', 'in_review'), ('draft', 'in_review'),
        ('in_review', 'draft'), ('changes_requested', 'draft'), ('changes_requested', 'in_review'),
        ('approved', 'draft'), ('approved', 'scheduled'), ('scheduled', 'approved'), ('scheduled', 'draft'))
    when 'external' then
      private.can_edit_post(v_post.organization_id, v_post.id) and (v_from, p_to) in (
        ('idea', 'draft'), ('draft', 'idea'), ('idea', 'in_review'), ('draft', 'in_review'),
        ('in_review', 'draft'), ('changes_requested', 'draft'), ('changes_requested', 'in_review'))
    else false
  end;

  if not coalesce(v_ok, false) then
    raise exception 'transition_forbidden' using errcode = '42501',
      detail = format('%s -> %s als %s', v_from, p_to, coalesce(v_role::text, '-'));
  end if;

  if p_to = 'changes_requested' and coalesce(btrim(p_comment), '') = '' then
    raise exception 'comment_required' using errcode = 'P0001';
  end if;
  if p_to = 'scheduled' and (v_post.scheduled_at is null or v_post.scheduled_at <= now()) then
    raise exception 'schedule_required' using errcode = 'P0001';
  end if;

  if coalesce(btrim(p_comment), '') <> '' then
    insert into public.comments (organization_id, post_id, author_id, body)
    values (v_post.organization_id, v_post.id, v_uid, btrim(p_comment))
    returning id into v_comment;
  end if;

  perform set_config('app.status_transition', 'on', true);
  update public.posts set status = p_to where id = v_post.id returning * into v_post;
  perform set_config('app.status_transition', '', true);

  if p_to in ('approved', 'changes_requested') then
    insert into public.approvals (organization_id, post_id, decision, comment_id, decided_by)
    values (v_post.organization_id, v_post.id, p_to::text::public.approval_decision, v_comment, v_uid);
  end if;

  v_payload := jsonb_build_object('post_id', v_post.id, 'title', v_post.title, 'from', v_from, 'to', p_to);
  if p_to = 'in_review' then
    perform private.notify(v_post.organization_id,
      array(select m.user_id from public.memberships m where m.organization_id = v_post.organization_id and m.role = 'owner'),
      'approval_requested', v_payload);
  elsif p_to in ('approved', 'changes_requested') then
    perform private.notify(v_post.organization_id,
      array_append(array(select a.user_id from public.post_assignees a where a.post_id = v_post.id), v_post.created_by),
      case when p_to = 'approved' then 'post_approved' else 'changes_requested' end, v_payload);
  end if;

  return v_post;
end;
$$;

-- Mehrere Beiträge auf einmal (z. B. Woche gesammelt freigeben). Alles oder nichts.
create function public.transition_posts_status(p_post_ids uuid[], p_to public.post_status, p_comment text default null)
returns setof public.posts
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  foreach v_id in array p_post_ids loop
    return next public.transition_post_status(v_id, p_to, p_comment);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Verlauf (wer, was, wann) – nur per Trigger, nie direkt beschreibbar
-- ---------------------------------------------------------------------------
create function private.log_activity() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_row     jsonb;
  v_old     jsonb;
  v_changes jsonb := '{}';
  v_key     text;
  v_post    uuid;
  -- Inhalte selbst werden nicht kopiert (Datensparsamkeit), nur dass sie sich geändert haben.
  v_value_keys text[] := array['status', 'channel_id', 'campaign_id', 'planned_on', 'scheduled_at', 'decision', 'user_id', 'asset_id'];
  v_skip_keys  text[] := array['updated_at', 'updated_by', 'version', 'created_at', 'created_by', 'organization_id', 'id'];
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;
  v_post := case when tg_table_name = 'posts' then (v_row ->> 'id')::uuid else (v_row ->> 'post_id')::uuid end;

  -- Unternehmen wird gerade gelöscht (Kaskade): nichts protokollieren
  if not exists (select 1 from public.organizations o where o.id = (v_row ->> 'organization_id')::uuid) then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    for v_key in select jsonb_object_keys(v_row) loop
      if v_key = any (v_skip_keys) or (v_row -> v_key) is not distinct from (v_old -> v_key) then
        continue;
      end if;
      v_changes := v_changes || jsonb_build_object(v_key,
        case when v_key = any (v_value_keys)
             then jsonb_build_object('from', v_old -> v_key, 'to', v_row -> v_key)
             else to_jsonb('changed'::text) end);
    end loop;
    if v_changes = '{}' then
      return null;
    end if;
  elsif tg_op = 'INSERT' then
    for v_key in select unnest(v_value_keys) loop
      if v_row ? v_key and (v_row -> v_key) <> 'null'::jsonb then
        v_changes := v_changes || jsonb_build_object(v_key, v_row -> v_key);
      end if;
    end loop;
  end if;

  insert into public.activity_log (organization_id, entity_type, entity_id, post_id, action, actor_id, changes)
  values ((v_row ->> 'organization_id')::uuid, tg_table_name,
          coalesce((v_row ->> 'id')::uuid, v_post), v_post,
          lower(tg_op), (select auth.uid()), v_changes);
  return null;
end;
$$;

create trigger posts_activity after insert or update or delete on public.posts
  for each row execute function private.log_activity();
create trigger approvals_activity after insert on public.approvals
  for each row execute function private.log_activity();
create trigger comments_activity after insert or delete on public.comments
  for each row execute function private.log_activity();
create trigger post_assignees_activity after insert or delete on public.post_assignees
  for each row execute function private.log_activity();

-- Neue Kommentare: Ersteller und Zugewiesene benachrichtigen
create function private.notify_comment() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  select * into v_post from public.posts where id = new.post_id;
  perform private.notify(new.organization_id,
    array_append(array(select a.user_id from public.post_assignees a where a.post_id = new.post_id), v_post.created_by),
    'comment_added',
    jsonb_build_object('post_id', new.post_id, 'title', v_post.title, 'comment_id', new.id));
  return null;
end;
$$;
create trigger comments_notify after insert on public.comments
  for each row execute function private.notify_comment();

-- Neu zugewiesen: Person benachrichtigen
create function private.notify_assignment() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform private.notify(new.organization_id, array[new.user_id], 'post_assigned',
    jsonb_build_object('post_id', new.post_id,
                       'title', (select p.title from public.posts p where p.id = new.post_id)));
  return null;
end;
$$;
create trigger post_assignees_notify after insert on public.post_assignees
  for each row execute function private.notify_assignment();

-- ---------------------------------------------------------------------------
-- RLS + Rechte
-- ---------------------------------------------------------------------------
alter table public.channels enable row level security;
alter table public.channel_credentials enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_channels enable row level security;
alter table public.post_groups enable row level security;
alter table public.posts enable row level security;
alter table public.post_assignees enable row level security;
alter table public.comments enable row level security;
alter table public.approvals enable row level security;
alter table public.assets enable row level security;
alter table public.post_assets enable row level security;
alter table public.post_ai_prompts enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.week_templates enable row level security;
alter table public.week_template_slots enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_request_posts enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.user_preferences enable row level security;

revoke all on public.channels, public.channel_credentials, public.campaigns, public.campaign_channels,
  public.post_groups, public.posts, public.post_assignees, public.comments, public.approvals,
  public.assets, public.post_assets, public.post_ai_prompts, public.prompt_templates,
  public.week_templates, public.week_template_slots, public.approval_requests,
  public.approval_request_posts, public.activity_log, public.notifications,
  public.push_subscriptions, public.user_preferences
  from anon, authenticated;

-- Kanäle: alle Mitglieder lesen, Inhaber verwalten
grant select, delete on public.channels to authenticated;
grant insert (organization_id, type, name) on public.channels to authenticated;
grant update (name) on public.channels to authenticated;
create policy channels_select on public.channels for select to authenticated using (private.is_member(organization_id));
create policy channels_insert on public.channels for insert to authenticated with check (private.has_role(organization_id, '{owner}'));
create policy channels_update on public.channels for update to authenticated
  using (private.has_role(organization_id, '{owner}')) with check (private.has_role(organization_id, '{owner}'));
create policy channels_delete on public.channels for delete to authenticated using (private.has_role(organization_id, '{owner}'));
-- channel_credentials: keine Rechte für Nutzer – nur Service-Rolle

-- Kampagnen: intern lesen; Externe nur, wenn ein zugewiesener Beitrag darin liegt
grant select, delete on public.campaigns to authenticated;
grant insert (organization_id, name, goal, goal_description, goal_target, start_date, end_date, status, budget_planned_cents)
  on public.campaigns to authenticated;
grant update (name, goal, goal_description, goal_target, start_date, end_date, status, budget_planned_cents)
  on public.campaigns to authenticated;
create policy campaigns_select on public.campaigns for select to authenticated using (
  private.has_role(organization_id, '{owner,editor,viewer}')
  or (private.has_role(organization_id, '{external}') and exists (
        select 1 from public.posts p join public.post_assignees a on a.post_id = p.id
        where p.campaign_id = campaigns.id and a.user_id = (select auth.uid()))));
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (private.has_role(organization_id, '{owner,editor}'));
create policy campaigns_update on public.campaigns for update to authenticated
  using (private.has_role(organization_id, '{owner,editor}')) with check (private.has_role(organization_id, '{owner,editor}'));
create policy campaigns_delete on public.campaigns for delete to authenticated using (private.has_role(organization_id, '{owner}'));

grant select, insert, delete on public.campaign_channels to authenticated;
grant update (budget_planned_cents) on public.campaign_channels to authenticated;
create policy campaign_channels_select on public.campaign_channels for select to authenticated
  using (private.has_role(organization_id, '{owner,editor,viewer}'));
create policy campaign_channels_write on public.campaign_channels for all to authenticated
  using (private.has_role(organization_id, '{owner,editor}')) with check (private.has_role(organization_id, '{owner,editor}'));

-- Beitragsgruppen
grant select, delete on public.post_groups to authenticated;
grant insert (organization_id, title) on public.post_groups to authenticated;
grant update (title) on public.post_groups to authenticated;
create policy post_groups_select on public.post_groups for select to authenticated using (private.is_member(organization_id));
create policy post_groups_write on public.post_groups for all to authenticated
  using (private.has_role(organization_id, '{owner,editor}')) with check (private.has_role(organization_id, '{owner,editor}'));

-- Beiträge
grant select, delete on public.posts to authenticated;
grant insert (organization_id, channel_id, campaign_id, group_id, title, body, internal_notes, status, planned_on, scheduled_at)
  on public.posts to authenticated;
grant update (channel_id, campaign_id, group_id, title, body, internal_notes, planned_on, scheduled_at)
  on public.posts to authenticated;
create policy posts_select on public.posts for select to authenticated using (private.can_see_post(organization_id, id));
create policy posts_insert on public.posts for insert to authenticated
  with check (private.has_role(organization_id, '{owner,editor}'));
create policy posts_update on public.posts for update to authenticated
  using (private.can_edit_post(organization_id, id)) with check (private.can_edit_post(organization_id, id));
create policy posts_delete on public.posts for delete to authenticated
  using (private.has_role(organization_id, '{owner,editor}') and status not in ('published', 'evaluated'));

grant select, insert, delete on public.post_assignees to authenticated;
create policy post_assignees_select on public.post_assignees for select to authenticated
  using (private.can_see_post(organization_id, post_id));
create policy post_assignees_insert on public.post_assignees for insert to authenticated
  with check (private.has_role(organization_id, '{owner,editor}'));
create policy post_assignees_delete on public.post_assignees for delete to authenticated
  using (private.has_role(organization_id, '{owner,editor}'));

-- Kommentare: wer den Beitrag sieht, liest; wer ihn bearbeiten darf, schreibt
grant select, delete on public.comments to authenticated;
grant insert (organization_id, post_id, body, quoted_text) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
create policy comments_select on public.comments for select to authenticated using (private.can_see_post(organization_id, post_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (private.can_edit_post(organization_id, post_id) and author_id = (select auth.uid()));
create policy comments_update on public.comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or private.has_role(organization_id, '{owner}'));

-- Freigaben: nur lesen; geschrieben wird ausschließlich über transition_post_status
grant select on public.approvals to authenticated;
create policy approvals_select on public.approvals for select to authenticated using (private.can_see_post(organization_id, post_id));

-- Assets
grant select, delete on public.assets to authenticated;
grant insert (organization_id, kind, storage_path, file_name, mime_type, size_bytes, width, height, duration_s, alt_text)
  on public.assets to authenticated;
grant update (alt_text, file_name) on public.assets to authenticated;
create policy assets_select on public.assets for select to authenticated using (
  private.has_role(organization_id, '{owner,editor,viewer}')
  or (private.has_role(organization_id, '{external}') and (
        uploaded_by = (select auth.uid())
        or exists (select 1 from public.post_assets pa
                   where pa.asset_id = assets.id and private.can_see_post(pa.organization_id, pa.post_id)))));
create policy assets_insert on public.assets for insert to authenticated
  with check (private.has_role(organization_id, '{owner,editor,external}'));
create policy assets_update on public.assets for update to authenticated
  using (private.has_role(organization_id, '{owner,editor}') or uploaded_by = (select auth.uid()))
  with check (private.has_role(organization_id, '{owner,editor}') or uploaded_by = (select auth.uid()));
create policy assets_delete on public.assets for delete to authenticated
  using (private.has_role(organization_id, '{owner,editor}') or uploaded_by = (select auth.uid()));

grant select, insert, delete on public.post_assets to authenticated;
grant update (position) on public.post_assets to authenticated;
create policy post_assets_select on public.post_assets for select to authenticated using (private.can_see_post(organization_id, post_id));
create policy post_assets_write on public.post_assets for all to authenticated
  using (private.can_edit_post(organization_id, post_id)) with check (private.can_edit_post(organization_id, post_id));

-- KI-Prompts am Beitrag
grant select, delete on public.post_ai_prompts to authenticated;
grant insert (organization_id, post_id, kind, prompt, position) on public.post_ai_prompts to authenticated;
grant update (kind, prompt, position) on public.post_ai_prompts to authenticated;
create policy post_ai_prompts_select on public.post_ai_prompts for select to authenticated using (private.can_see_post(organization_id, post_id));
create policy post_ai_prompts_write on public.post_ai_prompts for all to authenticated
  using (private.can_edit_post(organization_id, post_id)) with check (private.can_edit_post(organization_id, post_id));

-- Vorlagen
grant select, delete on public.prompt_templates to authenticated;
grant insert (organization_id, name, kind, prompt) on public.prompt_templates to authenticated;
grant update (name, kind, prompt) on public.prompt_templates to authenticated;
create policy prompt_templates_select on public.prompt_templates for select to authenticated using (private.is_member(organization_id));
create policy prompt_templates_write on public.prompt_templates for all to authenticated
  using (private.has_role(organization_id, '{owner,editor}')) with check (private.has_role(organization_id, '{owner,editor}'));

grant select, delete on public.week_templates to authenticated;
grant insert (organization_id, name, is_default) on public.week_templates to authenticated;
grant update (name, is_default) on public.week_templates to authenticated;
create policy week_templates_select on public.week_templates for select to authenticated
  using (private.has_role(organization_id, '{owner,editor,viewer}'));
create policy week_templates_write on public.week_templates for all to authenticated
  using (private.has_role(organization_id, '{owner,editor}')) with check (private.has_role(organization_id, '{owner,editor}'));

grant select, delete on public.week_template_slots to authenticated;
grant insert (organization_id, week_template_id, channel_id, weekday, time_of_day, title, notes, prompts, position)
  on public.week_template_slots to authenticated;
grant update (channel_id, weekday, time_of_day, title, notes, prompts, position) on public.week_template_slots to authenticated;
create policy week_template_slots_select on public.week_template_slots for select to authenticated
  using (private.has_role(organization_id, '{owner,editor,viewer}'));
create policy week_template_slots_write on public.week_template_slots for all to authenticated
  using (private.has_role(organization_id, '{owner,editor}')) with check (private.has_role(organization_id, '{owner,editor}'));

-- Sammel-Freigaben: lesen intern + eigene; anlegen über Funktion (Wochenplan)
grant select on public.approval_requests, public.approval_request_posts to authenticated;
create policy approval_requests_select on public.approval_requests for select to authenticated
  using (private.has_role(organization_id, '{owner,editor,viewer}') or requested_by = (select auth.uid()));
create policy approval_request_posts_select on public.approval_request_posts for select to authenticated
  using (private.can_see_post(organization_id, post_id));

-- Verlauf: wer den Beitrag sieht, sieht dessen Verlauf; sonstiges nur intern
grant select on public.activity_log to authenticated;
create policy activity_log_select on public.activity_log for select to authenticated using (
  private.has_role(organization_id, '{owner,editor,viewer}')
  or (post_id is not null and private.can_see_post(organization_id, post_id)));

-- Benachrichtigungen: nur eigene; nur „gelesen“ setzen und löschen
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_own on public.notifications for all to authenticated
  using (user_id = (select auth.uid()) and private.is_member(organization_id))
  with check (user_id = (select auth.uid()));

grant select, insert, delete on public.push_subscriptions to authenticated;
grant update (p256dh, auth, user_agent) on public.push_subscriptions to authenticated;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, delete on public.user_preferences to authenticated;
grant update (value) on public.user_preferences to authenticated;
create policy user_preferences_own on public.user_preferences for all to authenticated
  using (user_id = (select auth.uid()) and private.is_member(organization_id))
  with check (user_id = (select auth.uid()) and private.is_member(organization_id));

-- Funktionen
revoke execute on function public.transition_post_status(uuid, public.post_status, text) from public, anon;
revoke execute on function public.transition_posts_status(uuid[], public.post_status, text) from public, anon;
grant execute on function public.transition_post_status(uuid, public.post_status, text) to authenticated;
grant execute on function public.transition_posts_status(uuid[], public.post_status, text) to authenticated;
revoke execute on function private.notify(uuid, uuid[], text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: privater Bucket "assets", Pfad <organization_id>/<uuid>/<dateiname>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', false, 52428800, array[
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
  'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf'])
on conflict (id) do nothing;

create function private.storage_org(object_name text) returns uuid
language sql immutable
set search_path = ''
as $$
  select case when split_part(object_name, '/', 1) ~ '^[0-9a-f-]{36}$'
              then split_part(object_name, '/', 1)::uuid end;
$$;
grant execute on function private.storage_org(text) to authenticated;

create policy assets_objects_select on storage.objects for select to authenticated using (
  bucket_id = 'assets' and exists (select 1 from public.assets a where a.storage_path = objects.name));
create policy assets_objects_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'assets' and private.has_role(private.storage_org(name), '{owner,editor,external}'));
create policy assets_objects_delete on storage.objects for delete to authenticated using (
  bucket_id = 'assets' and (
    private.has_role(private.storage_org(name), '{owner,editor}')
    or (owner_id = (select auth.uid())::text and private.is_member(private.storage_org(name)))));

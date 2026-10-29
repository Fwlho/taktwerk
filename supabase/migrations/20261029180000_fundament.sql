-- Phase 1 – Fundament: Profile, Unternehmen, Mitgliedschaften, Einladungen
-- Zugriff ausschließlich über RLS; schreibende Sonderfälle über SECURITY-DEFINER-Funktionen.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'editor', 'external', 'viewer');
create type public.address_form as enum ('du', 'sie');

-- ---------------------------------------------------------------------------
-- Allgemeine Trigger-Funktion: updated_at pflegen
-- ---------------------------------------------------------------------------
create function private.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  avatar_path text,
  locale      text not null default 'de' check (locale ~ '^[a-z]{2}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_profiles (
  organization_id         uuid primary key references public.organizations (id) on delete cascade,
  industry                text check (char_length(industry) <= 80),
  location                text check (char_length(location) <= 120),
  radius_km               integer check (radius_km between 0 and 1000),
  website                 text check (char_length(website) <= 300),
  target_audiences        text[] not null default '{}' check (cardinality(target_audiences) <= 20),
  address_form            public.address_form not null default 'du',
  tone                    text check (char_length(tone) <= 500),
  services                text[] not null default '{}' check (cardinality(services) <= 50),
  onboarding_completed_at timestamptz,
  updated_at              timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            public.member_role not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);

create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role            public.member_role not null,
  token_hash      text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by      uuid default auth.uid() references auth.users (id) on delete set null,
  expires_at      timestamptz not null default now() + interval '7 days',
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create unique index invitations_open_email_uidx
  on public.invitations (organization_id, email) where accepted_at is null;
create index invitations_email_idx on public.invitations (email) where accepted_at is null;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger organization_profiles_updated_at before update on public.organization_profiles
  for each row execute function private.set_updated_at();
create trigger memberships_updated_at before update on public.memberships
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen für RLS (SECURITY DEFINER, damit Policies nicht rekursiv werden)
-- ---------------------------------------------------------------------------
create function private.is_member(org uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$$;

create function private.has_role(org uuid, roles public.member_role[]) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

create function private.shares_organization(other_user uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other_user
  );
$$;

grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, public.member_role[]) to authenticated;
grant execute on function private.shares_organization(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Profil automatisch bei Registrierung anlegen
-- ---------------------------------------------------------------------------
create function private.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Mindestens ein Inhaber je Unternehmen
-- ---------------------------------------------------------------------------
create function private.ensure_owner_remains() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    -- Beim Löschen des ganzen Unternehmens (Kaskade) ist nichts zu schützen.
    if not exists (select 1 from public.organizations o where o.id = old.organization_id) then
      return coalesce(new, old);
    end if;
    if not exists (
      select 1 from public.memberships m
      where m.organization_id = old.organization_id
        and m.role = 'owner'
        and m.user_id <> old.user_id
    ) then
      raise exception 'last_owner' using errcode = 'P0001',
        hint = 'Ein Unternehmen braucht mindestens einen Inhaber.';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger memberships_keep_owner before update or delete on public.memberships
  for each row execute function private.ensure_owner_remains();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;

-- Grundrechte: anon nichts; authenticated nur, was Policies + Spaltenrechte erlauben.
revoke all on public.profiles, public.organizations, public.organization_profiles,
  public.memberships, public.invitations from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_path, locale) on public.profiles to authenticated;

grant select, delete on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;

grant select on public.organization_profiles to authenticated;
grant update (industry, location, radius_km, website, target_audiences, address_form, tone,
  services, onboarding_completed_at) on public.organization_profiles to authenticated;

grant select, delete on public.memberships to authenticated;
grant update (role) on public.memberships to authenticated;

grant select, delete on public.invitations to authenticated;
grant insert (organization_id, email, role, token_hash, expires_at) on public.invitations to authenticated;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_organization(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- organizations
create policy organizations_select on public.organizations for select to authenticated
  using (private.is_member(id));
create policy organizations_update on public.organizations for update to authenticated
  using (private.has_role(id, '{owner}')) with check (private.has_role(id, '{owner}'));
create policy organizations_delete on public.organizations for delete to authenticated
  using (private.has_role(id, '{owner}'));

-- organization_profiles
create policy org_profiles_select on public.organization_profiles for select to authenticated
  using (private.is_member(organization_id));
create policy org_profiles_update on public.organization_profiles for update to authenticated
  using (private.has_role(organization_id, '{owner,editor}'))
  with check (private.has_role(organization_id, '{owner,editor}'));

-- memberships
create policy memberships_select on public.memberships for select to authenticated
  using (private.is_member(organization_id));
create policy memberships_update on public.memberships for update to authenticated
  using (private.has_role(organization_id, '{owner}'))
  with check (private.has_role(organization_id, '{owner}'));
create policy memberships_delete on public.memberships for delete to authenticated
  using (private.has_role(organization_id, '{owner}') or user_id = (select auth.uid()));

-- invitations: nur Inhaber
create policy invitations_select on public.invitations for select to authenticated
  using (private.has_role(organization_id, '{owner}'));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (private.has_role(organization_id, '{owner}') and expires_at <= now() + interval '30 days');
create policy invitations_delete on public.invitations for delete to authenticated
  using (private.has_role(organization_id, '{owner}'));

-- ---------------------------------------------------------------------------
-- RPC: Unternehmen anlegen (Unternehmen + Inhaber + leeres Profil, atomar)
-- ---------------------------------------------------------------------------
create function public.create_organization(p_name text, p_slug text) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  insert into public.organizations (name, slug, created_by)
  values (btrim(p_name), p_slug, v_uid)
  returning id into v_id;
  insert into public.memberships (organization_id, user_id, role) values (v_id, v_uid, 'owner');
  insert into public.organization_profiles (organization_id) values (v_id);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: Einladungen für die eigene E-Mail-Adresse anzeigen und annehmen
-- ---------------------------------------------------------------------------
create function private.current_email() returns text
language sql stable security definer
set search_path = ''
as $$
  select lower(u.email) from auth.users u where u.id = (select auth.uid());
$$;

create function public.my_pending_invitations()
returns table (id uuid, organization_name text, role public.member_role, expires_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select i.id, o.name, i.role, i.expires_at
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.email = private.current_email()
    and i.accepted_at is null
    and i.expires_at > now()
  order by i.created_at;
$$;

create function private.accept_invitation_row(inv public.invitations) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if inv.id is null or inv.accepted_at is not null or inv.expires_at <= now() then
    raise exception 'invitation_invalid' using errcode = 'P0002';
  end if;
  if inv.email <> private.current_email() then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;

  insert into public.memberships (organization_id, user_id, role)
  values (inv.organization_id, v_uid, inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now(), accepted_by = v_uid
  where id = inv.id;

  return inv.organization_id;
end;
$$;

create function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  inv public.invitations;
begin
  select * into inv from public.invitations
  where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  for update;
  return private.accept_invitation_row(inv);
end;
$$;

create function public.accept_invitation_by_id(p_invitation_id uuid) returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  inv public.invitations;
begin
  select * into inv from public.invitations where id = p_invitation_id for update;
  return private.accept_invitation_row(inv);
end;
$$;

revoke execute on function public.create_organization(text, text) from public, anon;
revoke execute on function public.my_pending_invitations() from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
revoke execute on function public.accept_invitation_by_id(uuid) from public, anon;
revoke execute on function private.accept_invitation_row(public.invitations) from public, anon, authenticated;
revoke execute on function private.current_email() from public, anon;
grant execute on function public.create_organization(text, text) to authenticated;
grant execute on function public.my_pending_invitations() to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.accept_invitation_by_id(uuid) to authenticated;
grant execute on function private.current_email() to authenticated;

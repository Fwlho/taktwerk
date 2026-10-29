-- Mandantentrennung und Rollenrechte – Phase 1
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

-- Hilfsfunktionen: als Nutzer anmelden / abmelden
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Anzahl betroffener Zeilen einer Änderung (läuft mit den Rechten der angemeldeten Rolle)
create function pg_temp.affected(stmt text) returns int language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

-- Testnutzer
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'anna@test.de',   '{"full_name":"Anna Inhaberin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@test.de',    '{"full_name":"Ben Fremd"}'),
  ('00000000-0000-0000-0000-00000000000c', 'clara@test.de',  '{"full_name":"Clara Editor"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dirk@test.de',   '{"full_name":"Dirk Viewer"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eva@test.de',    '{"full_name":"Eva Extern"}'),
  ('00000000-0000-0000-0000-00000000000f', 'finn@test.de',   '{"full_name":"Finn Neu"}');

select is((select count(*)::int from public.profiles), 6, 'Profil wird bei Registrierung angelegt');

-- Unternehmen anlegen
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.create_organization('Malerei Krause', 'malerei-krause') $$, 'Anna legt Unternehmen an');
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.create_organization('Bäckerei Fremd', 'baeckerei-fremd') $$, 'Ben legt Unternehmen an');
select pg_temp.logout();

create temp table ids as
select (select id from public.organizations where slug = 'malerei-krause') as org1,
       (select id from public.organizations where slug = 'baeckerei-fremd') as org2;
grant select on ids to authenticated;

insert into public.memberships (organization_id, user_id, role)
select org1, u, r from ids, (values
  ('00000000-0000-0000-0000-00000000000c'::uuid, 'editor'::public.member_role),
  ('00000000-0000-0000-0000-00000000000d'::uuid, 'viewer'::public.member_role),
  ('00000000-0000-0000-0000-00000000000e'::uuid, 'external'::public.member_role)) v(u, r);

select is((select role::text from public.memberships m, ids
           where m.organization_id = ids.org1 and m.user_id = '00000000-0000-0000-0000-00000000000a'),
          'owner', 'Ersteller ist Inhaber');
select ok(exists (select 1 from public.organization_profiles p, ids where p.organization_id = ids.org1),
          'Unternehmensprofil wird angelegt');

-- ---------------------------------------------------------------------------
-- Mandantentrennung: Ben (org2) gegen org1
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.organizations o, ids where o.id = ids.org1), 0,
          'Fremdes Unternehmen ist unsichtbar');
select is((select count(*)::int from public.memberships m, ids where m.organization_id = ids.org1), 0,
          'Fremde Mitglieder sind unsichtbar');
select is((select count(*)::int from public.organization_profiles p, ids where p.organization_id = ids.org1), 0,
          'Fremdes Unternehmensprofil ist unsichtbar');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 0,
          'Profile fremder Personen sind unsichtbar');
select is(pg_temp.affected($q$update public.organizations set name = 'Gehackt' where id = (select org1 from ids)$q$), 0, 'Fremdes Unternehmen nicht änderbar');
select is(pg_temp.affected($q$update public.organization_profiles set tone = 'x' where organization_id = (select org1 from ids)$q$), 0, 'Fremdes Profil nicht änderbar');
select is(pg_temp.affected($q$delete from public.organizations where id = (select org1 from ids)$q$), 0, 'Fremdes Unternehmen nicht löschbar');
select is(pg_temp.affected($q$delete from public.memberships where organization_id = (select org1 from ids)$q$), 0, 'Fremde Mitglieder nicht entfernbar');
select throws_ok($$ insert into public.invitations (organization_id, email, role, token_hash)
                    select org1, 'ben2@test.de', 'owner', repeat('a', 64) from ids $$,
                 '42501', null, 'Keine Einladung in fremdes Unternehmen');
select throws_ok($$ insert into public.memberships (organization_id, user_id, role)
                    select org1, '00000000-0000-0000-0000-00000000000b', 'owner' from ids $$,
                 '42501', null, 'Kein Selbst-Beitritt in fremdes Unternehmen');

-- ---------------------------------------------------------------------------
-- Rollen innerhalb von org1
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000c'); -- editor
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 1,
          'Mitglieder sehen Profile im selben Unternehmen');
select is(pg_temp.affected($q$update public.organizations set name = 'Neu' where id = (select org1 from ids)$q$), 0, 'Editor darf Unternehmensnamen nicht ändern');
select is(pg_temp.affected($q$update public.organization_profiles set tone = 'freundlich' where organization_id = (select org1 from ids)$q$), 1, 'Editor darf Unternehmensprofil ändern');
select is(pg_temp.affected($q$update public.memberships set role = 'owner' where organization_id = (select org1 from ids) and user_id = '00000000-0000-0000-0000-00000000000c'$q$), 0, 'Editor kann sich nicht selbst befördern');
select throws_ok($$ insert into public.invitations (organization_id, email, role, token_hash)
                    select org1, 'x@test.de', 'editor', repeat('b', 64) from ids $$,
                 '42501', null, 'Editor darf nicht einladen');

select pg_temp.login('00000000-0000-0000-0000-00000000000d'); -- viewer
select is(pg_temp.affected($q$update public.organization_profiles set tone = 'x' where organization_id = (select org1 from ids)$q$), 0, 'Viewer darf nichts ändern');

select pg_temp.login('00000000-0000-0000-0000-00000000000e'); -- external
select is((select count(*)::int from public.invitations), 0, 'Externe sehen keine Einladungen');

-- ---------------------------------------------------------------------------
-- Letzter Inhaber
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ delete from public.memberships where organization_id = (select org1 from ids)
                    and user_id = '00000000-0000-0000-0000-00000000000a' $$,
                 'P0001', 'last_owner', 'Letzter Inhaber kann nicht austreten');
select throws_ok($$ update public.memberships set role = 'editor' where organization_id = (select org1 from ids)
                    and user_id = '00000000-0000-0000-0000-00000000000a' $$,
                 'P0001', 'last_owner', 'Letzter Inhaber kann sich nicht herabstufen');

-- ---------------------------------------------------------------------------
-- Einladungen
-- ---------------------------------------------------------------------------
select lives_ok($$ insert into public.invitations (organization_id, email, role, token_hash)
                   select org1, 'finn@test.de', 'editor', encode(sha256(convert_to('token-finn', 'UTF8')), 'hex') from ids $$,
                'Inhaberin lädt ein');
select lives_ok($$ insert into public.invitations (organization_id, email, role, token_hash, expires_at)
                   select org1, 'ben@test.de', 'viewer', encode(sha256(convert_to('token-alt', 'UTF8')), 'hex'), now() - interval '1 day' from ids $$,
                'Abgelaufene Einladung angelegt');

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.accept_invitation('token-finn') $$, '42501', 'invitation_email_mismatch',
                 'Einladung gilt nur für die eingeladene E-Mail');
select throws_ok($$ select public.accept_invitation('token-alt') $$, 'P0002', 'invitation_invalid',
                 'Abgelaufene Einladung wird abgelehnt');

select pg_temp.login('00000000-0000-0000-0000-00000000000f');
select is((select count(*)::int from public.my_pending_invitations()), 1, 'Eingeladene Person sieht ihre Einladung');
select is(public.accept_invitation('token-finn'), (select org1 from ids), 'Einladung annehmen');
select is((select role::text from public.memberships m, ids where m.organization_id = ids.org1
           and m.user_id = '00000000-0000-0000-0000-00000000000f'), 'editor', 'Rolle aus Einladung übernommen');
select throws_ok($$ select public.accept_invitation('token-finn') $$, 'P0002', 'invitation_invalid',
                 'Einladung nur einmal verwendbar');

-- ---------------------------------------------------------------------------
-- Löschen des ganzen Unternehmens (DSGVO) trotz Inhaber-Schutz
-- ---------------------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select is(pg_temp.affected($q$delete from public.organizations where id = (select org1 from ids)$q$), 1,
          'Inhaberin kann ihr Unternehmen löschen');
select pg_temp.logout();
select is((select count(*)::int from public.memberships m, ids where m.organization_id = ids.org1), 0,
          'Mitgliedschaften werden mitgelöscht');

-- ---------------------------------------------------------------------------
-- Anonym: kein Zugriff
-- ---------------------------------------------------------------------------
select pg_temp.logout();
set local role anon;
select throws_ok($$ select * from public.organizations $$, '42501', null, 'Anonym: kein Zugriff');
reset role;

select * from finish();
rollback;

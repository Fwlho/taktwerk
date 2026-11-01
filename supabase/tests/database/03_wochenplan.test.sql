-- Wochenplan: Vorwoche kopieren, Vorlagen, Sammel-Einreichung, Sammel-Freigabe
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('20000000-0000-0000-0000-00000000000a', 'w-owner@k.de',  '{"full_name":"Wanda Owner"}'),
  ('20000000-0000-0000-0000-00000000000b', 'w-fremd@k.de',  '{"full_name":"Willi Fremd"}'),
  ('20000000-0000-0000-0000-00000000000c', 'w-editor@k.de', '{"full_name":"Wim Editor"}'),
  ('20000000-0000-0000-0000-00000000000d', 'w-viewer@k.de', '{"full_name":"Wera Viewer"}');

select pg_temp.login('20000000-0000-0000-0000-00000000000a');
select public.create_organization('Woche Eins', 'pgtap-woche-eins');
select pg_temp.login('20000000-0000-0000-0000-00000000000b');
select public.create_organization('Woche Zwei', 'pgtap-woche-zwei');
select pg_temp.logout();

create temp table w as select
  (select id from public.organizations where slug = 'pgtap-woche-eins') as org1,
  (select id from public.organizations where slug = 'pgtap-woche-zwei') as org2;
alter table w add column ig uuid, add column fb uuid, add column tpl uuid, add column req uuid;
grant select on w to authenticated;

insert into public.memberships (organization_id, user_id, role) select org1, '20000000-0000-0000-0000-00000000000c', 'editor' from w;
insert into public.memberships (organization_id, user_id, role) select org1, '20000000-0000-0000-0000-00000000000d', 'viewer' from w;
insert into public.channels (organization_id, type, name) select org1, 'instagram', 'Instagram' from w;
insert into public.channels (organization_id, type, name) select org1, 'facebook', 'Facebook' from w;
update w set ig = (select id from public.channels c where c.organization_id = w.org1 and c.type = 'instagram'),
             fb = (select id from public.channels c where c.organization_id = w.org1 and c.type = 'facebook');

-- Woche 2.–8. Nov 2026: Mo 9:00 IG (Uhrzeit), Mi IG ohne Uhrzeit, Fr FB 18:00; dazu ein Beitrag der Folgewoche
insert into public.posts (organization_id, channel_id, title, body, internal_notes, status, planned_on, scheduled_at)
select org1, ig, 'Montagsbild', 'Text Mo', 'Notiz Mo', 'draft'::public.post_status, '2026-11-02'::date, '2026-11-02 09:00 Europe/Berlin'::timestamptz from w
union all select org1, ig, 'Mittwochstipp', '', null, 'idea', '2026-11-04', null from w
union all select org1, fb, 'Freitagsangebot', 'Text Fr', null, 'draft', '2026-11-06', '2026-11-06 18:00 Europe/Berlin' from w
union all select org1, fb, 'Nächste Woche', '', null, 'idea', '2026-11-10', null from w;
insert into public.post_ai_prompts (organization_id, post_id, kind, prompt, result, position)
select org1, p.id, 'image', 'Vorher-Nachher-Foto, Morgenlicht', 'altes Ergebnis', 0
from w, public.posts p where p.title = 'Montagsbild';

-- ---------------------------------------------------------------------------
-- Vorwoche kopieren
-- ---------------------------------------------------------------------------
select pg_temp.login('20000000-0000-0000-0000-00000000000c');
select is(public.copy_week((select org1 from w), '2026-11-02', '2026-11-09'), 3, 'Vorwoche: 3 Beiträge kopiert');
select is((select count(*)::int from public.posts p, w where p.organization_id = w.org1
           and private.post_day(p.scheduled_at, p.planned_on) between '2026-11-09' and '2026-11-15'), 4,
          'Zielwoche enthält Kopien plus vorhandenen Beitrag');
select is((select (p.scheduled_at at time zone 'Europe/Berlin')::text from public.posts p
           where p.title = 'Montagsbild' and p.status = 'idea'), '2026-11-09 09:00:00', 'Uhrzeit bleibt, Tag +7');
select is((select p.body from public.posts p where p.title = 'Montagsbild' and p.status = 'idea'), '', 'Text wird nicht kopiert');
select is((select p.internal_notes from public.posts p where p.title = 'Montagsbild' and p.status = 'idea'), 'Notiz Mo', 'Notizen werden kopiert');
select is((select count(*)::int from public.post_ai_prompts a join public.posts p on p.id = a.post_id
           where p.title = 'Montagsbild' and p.status = 'idea' and a.result is null and a.kind = 'image'), 1,
          'Prompts werden ohne Ergebnis kopiert');
select is(public.copy_week((select org1 from w), '2026-11-02', '2026-11-16', (select fb from w)), 1, 'Nur eine Plattform kopieren');
select throws_ok($$ select public.copy_week((select org1 from w), '2026-11-03', '2026-11-10') $$, 'P0001', 'week_start_monday',
                 'Woche muss am Montag beginnen');

select pg_temp.login('20000000-0000-0000-0000-00000000000d');
select throws_ok($$ select public.copy_week((select org1 from w), '2026-11-02', '2026-11-23') $$, '42501', 'forbidden',
                 'Betrachter darf nicht kopieren');

select pg_temp.login('20000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.copy_week((select org1 from w), '2026-11-02', '2026-11-23') $$, '42501', 'forbidden',
                 'Fremdes Unternehmen darf nicht kopieren');

-- ---------------------------------------------------------------------------
-- Vorlagen
-- ---------------------------------------------------------------------------
select pg_temp.login('20000000-0000-0000-0000-00000000000c');
select lives_ok($$ select public.save_week_as_template((select org1 from w), '2026-11-02', 'Standardwoche', true) $$, 'Woche als Vorlage speichern');
select pg_temp.logout();
update w set tpl = (select id from public.week_templates t where t.organization_id = w.org1);
select is((select count(*)::int from public.week_template_slots s, w where s.week_template_id = w.tpl), 3, 'Vorlage hat 3 Plätze');

select pg_temp.login('20000000-0000-0000-0000-00000000000c');
select is(public.apply_week_template((select tpl from w), '2026-11-30'), 3, 'Vorlage auf Woche anwenden');
select is((select (p.scheduled_at at time zone 'Europe/Berlin')::text from public.posts p
           where p.title = 'Freitagsangebot' and private.post_day(p.scheduled_at, p.planned_on) = '2026-12-04'),
          '2026-12-04 18:00:00', 'Vorlage setzt Wochentag und Uhrzeit (Winterzeit)');
select pg_temp.login('20000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.week_templates), 0, 'Fremde Vorlagen unsichtbar');

-- ---------------------------------------------------------------------------
-- Woche einreichen und gesammelt freigeben
-- ---------------------------------------------------------------------------
select pg_temp.login('20000000-0000-0000-0000-00000000000c');
select lives_ok($$ select public.submit_week_for_approval((select org1 from w), '2026-11-02', null, 'Bitte bis Freitag') $$,
                'Ersteller reicht die Woche ein');
select pg_temp.logout();
update w set req = (select id from public.approval_requests r where r.organization_id = w.org1);

select pg_temp.login('20000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.notifications where type in ('approval_requested', 'week_submitted')), 1,
          'Inhaber bekommt eine Sammel-Nachricht statt einer je Beitrag');
select throws_ok($$ select public.submit_week_for_approval((select org1 from w), '2026-11-02') $$, 'P0001', 'nothing_to_submit',
                 'Nichts mehr einzureichen');

select pg_temp.login('20000000-0000-0000-0000-00000000000c');
select throws_ok($$ select public.approve_week((select req from w)) $$, '42501', 'forbidden', 'Ersteller darf Woche nicht freigeben');

select pg_temp.login('20000000-0000-0000-0000-00000000000a');
select is(public.approve_week((select req from w)), 3, 'Inhaber gibt die Woche gesammelt frei');

select pg_temp.logout();
select * from finish();
rollback;

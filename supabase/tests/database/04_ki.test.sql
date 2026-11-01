-- KI: Rechte, Tageslimit, Nutzungsprotokoll ohne Texte, Branchenvorlagen
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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
  ('30000000-0000-0000-0000-00000000000a', 'k-owner@k.de',  '{"full_name":"Kai Owner"}'),
  ('30000000-0000-0000-0000-00000000000b', 'k-fremd@k.de',  '{"full_name":"Kim Fremd"}'),
  ('30000000-0000-0000-0000-00000000000c', 'k-editor@k.de', '{"full_name":"Kurt Editor"}'),
  ('30000000-0000-0000-0000-00000000000d', 'k-viewer@k.de', '{"full_name":"Karla Viewer"}');

select pg_temp.login('30000000-0000-0000-0000-00000000000a');
select public.create_organization('KI Eins', 'pgtap-ki-eins');
select pg_temp.login('30000000-0000-0000-0000-00000000000b');
select public.create_organization('KI Zwei', 'pgtap-ki-zwei');
select pg_temp.logout();

create temp table k as select
  (select id from public.organizations where slug = 'pgtap-ki-eins') as org1,
  (select id from public.organizations where slug = 'pgtap-ki-zwei') as org2;
alter table k add column req uuid;
grant select, update on k to authenticated;

insert into public.memberships (organization_id, user_id, role) select org1, '30000000-0000-0000-0000-00000000000c', 'editor' from k;
insert into public.memberships (organization_id, user_id, role) select org1, '30000000-0000-0000-0000-00000000000d', 'viewer' from k;
update public.organizations set ai_daily_limit = 2 where id = (select org1 from k);

-- ---------------------------------------------------------------------------
-- Anmelden und Limit
-- ---------------------------------------------------------------------------
select pg_temp.login('30000000-0000-0000-0000-00000000000c');
update k set req = public.begin_ai_request(org1, 'text');
select isnt((select req from k), null, 'Ersteller darf KI nutzen');
select is((select used from public.ai_usage_today((select org1 from k))), 1, 'Verbrauch heute: 1');
select is((select daily_limit from public.ai_usage_today((select org1 from k))), 2, 'Limit wird angezeigt');
select lives_ok($$ select public.begin_ai_request((select org1 from k), 'ideas') $$, 'Zweite Anfrage im Limit');
select throws_ok($$ select public.begin_ai_request((select org1 from k), 'text') $$, 'P0001', 'ai_limit_reached', 'Tageslimit greift');

-- Verbrauch nachtragen: nur eigene, nur einmal
select pg_temp.login('30000000-0000-0000-0000-00000000000a');
select public.finish_ai_request((select req from k), 'fremd', 999, 999);
select pg_temp.logout();
select is((select model from public.ai_requests where id = (select req from k)), null, 'Andere Person kann Verbrauch nicht eintragen');
select pg_temp.login('30000000-0000-0000-0000-00000000000c');
select public.finish_ai_request((select req from k), 'claude-test', 120, 80);
select public.finish_ai_request((select req from k), 'nochmal', 1, 1);
select pg_temp.logout();
select is((select model || ':' || input_tokens || ':' || output_tokens from public.ai_requests where id = (select req from k)),
          'claude-test:120:80', 'Verbrauch eingetragen, danach gesperrt');

-- ---------------------------------------------------------------------------
-- Rechte und Sichtbarkeit
-- ---------------------------------------------------------------------------
select pg_temp.login('30000000-0000-0000-0000-00000000000d');
select throws_ok($$ select public.begin_ai_request((select org1 from k), 'text') $$, '42501', null, 'Leserolle darf keine KI nutzen');
select pg_temp.login('30000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.begin_ai_request((select org1 from k), 'text') $$, '42501', null, 'Fremde dürfen keine KI-Anfrage für fremdes Unternehmen');
select is((select count(*)::int from public.ai_usage_today((select org1 from k))), 0, 'Fremde sehen keinen Verbrauch');
select is((select count(*)::int from public.ai_requests), 0, 'Fremde sehen kein Protokoll');

select pg_temp.login('30000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.ai_requests), 0, 'Ersteller sieht das Protokoll nicht');
select throws_ok($$ insert into public.ai_requests (organization_id, kind) select org1, 'text' from k $$, '42501', null,
                 'Protokoll nicht direkt beschreibbar');

select pg_temp.login('30000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.ai_requests), 2, 'Inhaber sieht den Verbrauch');
update public.organizations set name = 'KI Eins' where id = (select org1 from k);
select throws_ok($$ update public.organizations set ai_daily_limit = 9999 where id = (select org1 from k) $$, '42501', null,
                 'Inhaber kann das Limit nicht selbst erhöhen');

-- ---------------------------------------------------------------------------
-- Branchenvorlagen
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.industry_templates), 28, 'Branchenvorlagen lesbar');
select throws_ok($$ insert into public.industry_templates (industry, goal, name, content) values ('other', 'other', 'x', '{}') $$,
                 '42501', null, 'Vorlagen sind nur lesbar');

select pg_temp.logout();
select * from finish();
rollback;

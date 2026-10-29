-- Phase 2: Mandantentrennung, Rollen, Statuswechsel, Freigabe, Verlauf
begin;
create extension if not exists pgtap with schema extensions;
select plan(57);

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
create function pg_temp.affected(stmt text) returns int language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

-- Personen
insert into auth.users (id, email, raw_user_meta_data) values
  ('10000000-0000-0000-0000-00000000000a', 'owner@k.de',  '{"full_name":"Olga Owner"}'),
  ('10000000-0000-0000-0000-00000000000b', 'fremd@k.de',  '{"full_name":"Fritz Fremd"}'),
  ('10000000-0000-0000-0000-00000000000c', 'editor@k.de', '{"full_name":"Ede Editor"}'),
  ('10000000-0000-0000-0000-00000000000d', 'viewer@k.de', '{"full_name":"Vera Viewer"}'),
  ('10000000-0000-0000-0000-00000000000e', 'ext1@k.de',   '{"full_name":"Eva Extern"}'),
  ('10000000-0000-0000-0000-00000000000f', 'ext2@k.de',   '{"full_name":"Felix Extern"}');

select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select public.create_organization('Kern Eins', 'pgtap-kern-eins');
select pg_temp.login('10000000-0000-0000-0000-00000000000b');
select public.create_organization('Kern Zwei', 'pgtap-kern-zwei');
select pg_temp.logout();

create temp table t as
select (select id from public.organizations where slug = 'pgtap-kern-eins') as org1,
       (select id from public.organizations where slug = 'pgtap-kern-zwei') as org2;
alter table t add column ch1 uuid, add column ch2 uuid, add column camp uuid, add column post uuid, add column asset uuid;
grant select on t to authenticated;

insert into public.memberships (organization_id, user_id, role)
select org1, u, r from t, (values
  ('10000000-0000-0000-0000-00000000000c'::uuid, 'editor'::public.member_role),
  ('10000000-0000-0000-0000-00000000000d'::uuid, 'viewer'::public.member_role),
  ('10000000-0000-0000-0000-00000000000e'::uuid, 'external'::public.member_role),
  ('10000000-0000-0000-0000-00000000000f'::uuid, 'external'::public.member_role)) v(u, r);

-- ---------------------------------------------------------------------------
-- Kanäle und Kampagnen
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select lives_ok($$ insert into public.channels (organization_id, type, name) select org1, 'instagram', 'Instagram' from t $$,
                'Inhaber legt Kanal an');
select pg_temp.login('10000000-0000-0000-0000-00000000000b');
select lives_ok($$ insert into public.channels (organization_id, type, name) select org2, 'instagram', 'Instagram' from t $$,
                'Fremder legt eigenen Kanal an');
select pg_temp.logout();
update t set ch1 = (select id from public.channels c where c.organization_id = t.org1),
             ch2 = (select id from public.channels c where c.organization_id = t.org2);

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select throws_ok($$ insert into public.channels (organization_id, type, name) select org1, 'facebook', 'Facebook' from t $$,
                 '42501', null, 'Ersteller darf keine Kanäle anlegen');
select lives_ok($$ insert into public.campaigns (organization_id, name, start_date) select org1, 'Frühjahr', '2026-11-01' from t $$,
                'Ersteller legt Kampagne an');
select pg_temp.login('10000000-0000-0000-0000-00000000000d');
select throws_ok($$ insert into public.campaigns (organization_id, name, start_date) select org1, 'X', '2026-11-01' from t $$,
                 '42501', null, 'Betrachter darf keine Kampagne anlegen');
select pg_temp.logout();
update t set camp = (select id from public.campaigns c where c.organization_id = t.org1);

-- ---------------------------------------------------------------------------
-- Beiträge anlegen
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select lives_ok($$ insert into public.posts (organization_id, channel_id, campaign_id, title, body)
                   select org1, ch1, camp, 'Vorher/Nachher', 'Fassade fertig' from t $$, 'Ersteller legt Beitrag an');
select throws_ok($$ insert into public.posts (organization_id, channel_id, title, status)
                    select org1, ch1, 'Frech', 'approved' from t $$, 'P0001', 'invalid_initial_status',
                 'Neuer Beitrag kann nicht direkt freigegeben sein');
select pg_temp.logout();
update t set post = (select id from public.posts p where p.organization_id = t.org1 and p.title = 'Vorher/Nachher');
select is((select created_by from public.posts p, t where p.id = t.post), '10000000-0000-0000-0000-00000000000c'::uuid,
          'Ersteller wird automatisch gesetzt');

-- ---------------------------------------------------------------------------
-- Mandantentrennung
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.posts p, t where p.organization_id = t.org1), 0, 'Fremde Beiträge unsichtbar');
select is((select count(*)::int from public.campaigns c, t where c.organization_id = t.org1), 0, 'Fremde Kampagnen unsichtbar');
select is((select count(*)::int from public.channels c, t where c.organization_id = t.org1), 0, 'Fremde Kanäle unsichtbar');
select is(pg_temp.affected($q$update public.posts set body = 'gehackt' where id = (select post from t)$q$), 0,
          'Fremder Beitrag nicht änderbar');
select is(pg_temp.affected($q$delete from public.posts where id = (select post from t)$q$), 0, 'Fremder Beitrag nicht löschbar');
select throws_ok($$ insert into public.posts (organization_id, channel_id, title) select org1, ch1, 'x' from t $$,
                 '42501', null, 'Kein Beitrag in fremdem Unternehmen');
select throws_ok($$ insert into public.posts (organization_id, channel_id, title) select org2, ch1, 'x' from t $$,
                 '23503', null, 'Fremder Kanal nicht verknüpfbar (zusammengesetzter Schlüssel)');
select throws_ok($$ insert into public.campaign_channels (organization_id, campaign_id, channel_id) select org2, camp, ch2 from t $$,
                 '23503', null, 'Fremde Kampagne nicht verknüpfbar');
select throws_ok($$ select public.transition_post_status((select post from t), 'in_review') $$,
                 'P0002', 'post_not_found', 'Statuswechsel an fremdem Beitrag unmöglich');
select throws_ok($$ insert into public.comments (organization_id, post_id, body) select org1, post, 'Hallo' from t $$,
                 '42501', null, 'Kein Kommentar an fremdem Beitrag');

-- ---------------------------------------------------------------------------
-- Statuswechsel und Freigabe
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select throws_ok($$ update public.posts set status = 'approved' where id = (select post from t) $$,
                 '42501', null, 'Status nie direkt änderbar – auch nicht vom Inhaber');

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select lives_ok($$ select public.transition_post_status((select post from t), 'draft') $$, 'Idee → Entwurf');
select lives_ok($$ select public.transition_post_status((select post from t), 'in_review') $$, 'Entwurf → Zur Freigabe');
select throws_ok($$ select public.transition_post_status((select post from t), 'approved') $$,
                 '42501', 'transition_forbidden', 'Ersteller darf nicht freigeben');

select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.notifications where type = 'approval_requested'), 1,
          'Inhaber wird über Freigabe-Anfrage benachrichtigt');
select throws_ok($$ select public.transition_post_status((select post from t), 'changes_requested') $$,
                 'P0001', 'comment_required', 'Änderungswunsch verlangt Kommentar');
select lives_ok($$ select public.transition_post_status((select post from t), 'changes_requested', 'Bitte Mai statt April') $$,
                'Änderung gewünscht mit Kommentar');
select is((select count(*)::int from public.approvals a, t where a.post_id = t.post and a.decision = 'changes_requested' and a.comment_id is not null),
          1, 'Entscheidung mit Kommentar protokolliert');

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.notifications where type = 'changes_requested'), 1,
          'Ersteller wird über Änderungswunsch benachrichtigt');
select lives_ok($$ select public.transition_post_status((select post from t), 'in_review') $$, 'Erneut einreichen');

select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.transition_post_status((select post from t), 'approved') $$, 'Inhaber gibt frei');
select throws_ok($$ select public.transition_post_status((select post from t), 'scheduled') $$,
                 'P0001', 'schedule_required', 'Einplanen verlangt Termin in der Zukunft');
select throws_ok($$ select public.transition_post_status((select post from t), 'published') $$,
                 '42501', 'transition_system_only', 'Veröffentlicht setzt nur das System');

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select lives_ok($$ update public.posts set body = 'Fassade fertig – Termine im Mai frei' where id = (select post from t) $$,
                'Ersteller ändert freigegebenen Text');
select is((select status::text from public.posts p, t where p.id = t.post), 'draft',
          'Geänderter Text nach Freigabe fällt auf Entwurf zurück');

-- ---------------------------------------------------------------------------
-- Externe
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000e');
select is((select count(*)::int from public.posts), 0, 'Externe sehen nicht zugewiesene Beiträge nicht');
select is((select count(*)::int from public.campaigns), 0, 'Externe sehen Kampagnen ohne Zuweisung nicht');

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select lives_ok($$ insert into public.post_assignees (organization_id, post_id, user_id)
                   select org1, post, '10000000-0000-0000-0000-00000000000e' from t $$, 'Ersteller weist Externe zu');
select throws_ok($$ insert into public.post_assignees (organization_id, post_id, user_id)
                    select org1, post, '10000000-0000-0000-0000-00000000000b' from t $$,
                 '23503', null, 'Nur Mitglieder sind zuweisbar');

select pg_temp.login('10000000-0000-0000-0000-00000000000e');
select is((select count(*)::int from public.posts), 1, 'Externe sieht zugewiesenen Beitrag');
select is((select count(*)::int from public.campaigns), 1, 'Externe sieht die Kampagne ihres Beitrags');
select is(pg_temp.affected($q$update public.posts set body = 'Text von der Agentur' where id = (select post from t)$q$), 1,
          'Externe darf Text ändern');
select throws_ok($$ update public.posts set campaign_id = null where id = (select post from t) $$,
                 '42501', 'forbidden_field', 'Externe darf Kampagne nicht ändern');
select lives_ok($$ select public.transition_post_status((select post from t), 'in_review') $$, 'Externe reicht ein');
select throws_ok($$ select public.transition_post_status((select post from t), 'approved') $$,
                 '42501', 'transition_forbidden', 'Externe darf nicht freigeben');
select lives_ok($$ insert into public.comments (organization_id, post_id, body) select org1, post, 'Passt so?' from t $$,
                'Externe kommentiert');

select pg_temp.login('10000000-0000-0000-0000-00000000000f');
select is((select count(*)::int from public.posts), 0, 'Andere Externe sieht fremd zugewiesenen Beitrag nicht');
select is((select count(*)::int from public.comments), 0, 'Andere Externe sieht keine Kommentare');

-- ---------------------------------------------------------------------------
-- Betrachter
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.posts), 1, 'Betrachter sieht Beiträge');
select is(pg_temp.affected($q$update public.posts set body = 'x' where id = (select post from t)$q$), 0, 'Betrachter ändert nichts');
select throws_ok($$ insert into public.comments (organization_id, post_id, body) select org1, post, 'Hallo' from t $$,
                 '42501', null, 'Betrachter kommentiert nicht');
select throws_ok($$ select public.transition_post_status((select post from t), 'draft') $$,
                 '42501', 'transition_forbidden', 'Betrachter ändert keinen Status');

-- ---------------------------------------------------------------------------
-- Verlauf
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select ok((select count(*) from public.activity_log l, t
           where l.post_id = t.post and l.changes -> 'status' ->> 'to' = 'approved'
             and l.actor_id = '10000000-0000-0000-0000-00000000000a') = 1,
          'Verlauf: wer hat wann freigegeben');
select ok(not exists (select 1 from public.activity_log l where l.changes::text like '%Fassade fertig%'),
          'Verlauf speichert keine Texte (Datensparsamkeit)');
select throws_ok($$ insert into public.activity_log (organization_id, entity_type, entity_id, action) select org1, 'x', post, 'x' from t $$,
                 '42501', null, 'Verlauf ist nicht von Hand beschreibbar');

-- ---------------------------------------------------------------------------
-- Veröffentlicht: gesperrt
-- ---------------------------------------------------------------------------
select pg_temp.logout();
select set_config('app.status_transition', 'on', true);
update public.posts set status = 'published', published_at = now() where id = (select post from t);
select set_config('app.status_transition', '', true);
select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select throws_ok($$ update public.posts set body = 'nachträglich' where id = (select post from t) $$,
                 'P0001', 'post_published_locked', 'Veröffentlichte Beiträge sind gesperrt');
select is(pg_temp.affected($q$delete from public.posts where id = (select post from t)$q$), 0, 'Veröffentlichte Beiträge nicht löschbar');

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------
select throws_ok($$ insert into public.assets (organization_id, kind, storage_path, file_name, mime_type, size_bytes)
                    select org1, 'image', org2 || '/x/bild.jpg', 'bild.jpg', 'image/jpeg', 1000 from t $$,
                 '23514', null, 'Dateipfad muss im eigenen Unternehmensordner liegen');

-- ---------------------------------------------------------------------------
-- Löschen des Unternehmens räumt alles ab
-- ---------------------------------------------------------------------------
select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select is(pg_temp.affected($q$delete from public.organizations where id = (select org1 from t)$q$), 1,
          'Unternehmen mit Beiträgen löschbar');
select pg_temp.logout();

select * from finish();
rollback;

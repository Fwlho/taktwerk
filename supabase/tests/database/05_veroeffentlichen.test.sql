-- Veröffentlichen: nur der Server reserviert und markiert, Zugangsdaten bleiben unsichtbar
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.as_server() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('40000000-0000-0000-0000-00000000000a', 'v-owner@k.de',  '{"full_name":"Vera Owner"}'),
  ('40000000-0000-0000-0000-00000000000c', 'v-editor@k.de', '{"full_name":"Veit Editor"}');

select pg_temp.login('40000000-0000-0000-0000-00000000000a');
select public.create_organization('Veröffentlichen', 'pgtap-veroeffentlichen');
select pg_temp.logout();

create temp table v as select (select id from public.organizations where slug = 'pgtap-veroeffentlichen') as org;
alter table v add column fb uuid, add column ig uuid, add column due uuid, add column later uuid, add column off uuid;
grant select on v to authenticated, service_role;
insert into public.memberships (organization_id, user_id, role) select org, '40000000-0000-0000-0000-00000000000c', 'editor' from v;
insert into public.channels (organization_id, type, name, connection_status) select org, 'facebook', 'Facebook', 'connected' from v;
insert into public.channels (organization_id, type, name) select org, 'instagram', 'Instagram' from v;
update v set fb = (select id from public.channels c where c.organization_id = v.org and c.type = 'facebook'),
             ig = (select id from public.channels c where c.organization_id = v.org and c.type = 'instagram');
insert into public.channel_credentials (channel_id, organization_id, ciphertext, iv, auth_tag)
select fb, org, '\x01', '\x02', '\x03' from v;

insert into public.posts (organization_id, channel_id, title, body, status, scheduled_at, created_by)
select org, fb, 'Fällig', 'Text', 'scheduled'::public.post_status, now() - interval '1 minute', '40000000-0000-0000-0000-00000000000c'::uuid from v
union all select org, fb, 'Später', 'Text', 'scheduled', now() + interval '1 day', '40000000-0000-0000-0000-00000000000c' from v
union all select org, ig, 'Nicht verbunden', 'Text', 'scheduled', now() - interval '1 minute', '40000000-0000-0000-0000-00000000000c' from v;
update v set due = (select id from public.posts where title = 'Fällig' and organization_id = v.org),
             later = (select id from public.posts where title = 'Später' and organization_id = v.org),
             off = (select id from public.posts where title = 'Nicht verbunden' and organization_id = v.org);

-- ---------------------------------------------------------------------------
-- Nutzer dürfen weder reservieren noch Zugangsdaten sehen
-- ---------------------------------------------------------------------------
select pg_temp.login('40000000-0000-0000-0000-00000000000a');
select throws_ok($$ select * from public.claim_due_posts() $$, '42501', null, 'Nutzer können nicht reservieren');
select throws_ok($$ select public.mark_post_published((select due from v), 'x', 'https://x') $$, '42501', null, 'Nutzer können nicht als veröffentlicht markieren');
select throws_ok($$ select * from public.channel_credentials $$, '42501', null, 'Zugangsdaten für Nutzer unsichtbar');
select throws_ok($$ update public.channels set connection_status = 'connected' where id = (select ig from v) $$, '42501', null,
                 'Verbindungsstatus setzt nur der Server');

-- ---------------------------------------------------------------------------
-- Server: reservieren, veröffentlichen, Fehler
-- ---------------------------------------------------------------------------
select pg_temp.as_server();
select is((select array_agg(post_id) from public.claim_due_posts() c join v on c.organization_id = v.org), array[(select due from v)],
          'Nur fällige Beiträge auf verbundenen Kanälen');
select is((select count(*)::int from public.claim_due_posts() c join v on c.organization_id = v.org), 0, 'Reservierte Beiträge sind 5 Minuten gesperrt');
select is((select count(*)::int from public.claim_due_posts(10, (select later from v))), 1, '„Jetzt veröffentlichen“ greift auch vor dem Termin');

select public.mark_post_published((select due from v), 'page_123', 'https://www.facebook.com/page_123');
select is((select status::text || '|' || external_url from public.posts where id = (select due from v)), 'published|https://www.facebook.com/page_123',
          'Beitrag ist veröffentlicht, Link gespeichert');
select is((select count(*)::int from public.notifications n, v where n.organization_id = v.org and n.type = 'post_published'
           and n.user_id = '40000000-0000-0000-0000-00000000000c'), 1, 'Ersteller wird benachrichtigt');

select public.mark_post_failed((select later from v), 'Seite nicht gefunden', true);
select ok((select publish_retry_at > now() and publish_attempts = 1 from public.posts where id = (select later from v)),
          'Vorübergehender Fehler: späterer neuer Versuch');
select public.mark_post_failed((select later from v), 'Token abgelaufen', false);
select is((select publish_attempts::int || '|' || publish_error from public.posts where id = (select later from v)), '5|Token abgelaufen',
          'Dauerhafter Fehler: keine weiteren Versuche');
select is((select count(*)::int from public.notifications n, v where n.organization_id = v.org and n.type = 'publish_failed'), 2,
          'Inhaberin und Ersteller werden über den Fehler informiert');

-- ---------------------------------------------------------------------------
-- Neu planen setzt Versuche zurück
-- ---------------------------------------------------------------------------
select pg_temp.login('40000000-0000-0000-0000-00000000000a');
select public.transition_post_status((select later from v), 'approved');
update public.posts set scheduled_at = now() + interval '2 days' where id = (select later from v);
select public.transition_post_status((select later from v), 'scheduled');
select pg_temp.logout();
select is((select publish_attempts::int from public.posts where id = (select later from v)), 0, 'Neu geplant: Versuche zurückgesetzt');
select is((select publish_error from public.posts where id = (select later from v)), null, 'Neu geplant: alter Fehler entfernt');

select * from finish();
rollback;

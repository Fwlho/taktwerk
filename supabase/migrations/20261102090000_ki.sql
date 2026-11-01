-- Phase 3 – KI-Assistent: Nutzungsprotokoll mit Tageslimit, Branchenvorlagen

-- ---------------------------------------------------------------------------
-- Tageslimit je Unternehmen (Kostenbremse). Nur Betreiber ändern es (keine Spaltenrechte).
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column ai_daily_limit integer not null default 100 check (ai_daily_limit between 0 and 10000);

-- ---------------------------------------------------------------------------
-- Nutzungsprotokoll: nur Mengen, keine Prompts oder Texte (Datensparsamkeit)
-- ---------------------------------------------------------------------------
create type public.ai_request_kind as enum ('text', 'adapt', 'prompt', 'ideas', 'campaign');

create table public.ai_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid references auth.users (id) on delete set null,
  kind            public.ai_request_kind not null,
  model           text check (char_length(model) <= 80),
  input_tokens    integer not null default 0 check (input_tokens >= 0),
  output_tokens   integer not null default 0 check (output_tokens >= 0),
  created_at      timestamptz not null default now(),
  finished_at     timestamptz
);
create index ai_requests_org_day_idx on public.ai_requests (organization_id, created_at desc);

alter table public.ai_requests enable row level security;
grant select on public.ai_requests to authenticated;
-- Verbrauch sieht nur der Inhaber; Schreiben ausschließlich über die Funktionen unten
create policy ai_requests_select on public.ai_requests for select to authenticated
  using (private.has_role(organization_id, '{owner}'));

-- Beginn des heutigen Tages in Berlin
create function private.berlin_day_start() returns timestamptz
language sql stable set search_path = ''
as $$ select (date_trunc('day', now() at time zone 'Europe/Berlin')) at time zone 'Europe/Berlin' $$;

/** KI-Anfrage anmelden: prüft Rolle und Tageslimit, legt den Protokolleintrag an. */
create function public.begin_ai_request(p_org uuid, p_kind public.ai_request_kind) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_limit integer;
  v_used  integer;
  v_id    uuid;
begin
  if not private.has_role(p_org, '{owner,editor,external}') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- gleichzeitige Anfragen desselben Unternehmens nacheinander zählen
  perform pg_advisory_xact_lock(hashtext('ai:' || p_org::text));
  select ai_daily_limit into v_limit from public.organizations where id = p_org;
  select count(*) into v_used from public.ai_requests
   where organization_id = p_org and created_at >= private.berlin_day_start();
  if v_used >= v_limit then
    raise exception 'ai_limit_reached';
  end if;
  insert into public.ai_requests (organization_id, user_id, kind)
  values (p_org, auth.uid(), p_kind)
  returning id into v_id;
  return v_id;
end $$;

/** Verbrauch nachtragen – nur die eigene, noch offene Anfrage. */
create function public.finish_ai_request(p_id uuid, p_model text, p_input integer, p_output integer) returns void
language sql security definer set search_path = ''
as $$
  update public.ai_requests
     set model = left(p_model, 80),
         input_tokens = greatest(coalesce(p_input, 0), 0),
         output_tokens = greatest(coalesce(p_output, 0), 0),
         finished_at = now()
   where id = p_id and user_id = auth.uid() and finished_at is null;
$$;

/** Heutiger Verbrauch und Limit (für den Hinweis „noch X Vorschläge heute“). */
create function public.ai_usage_today(p_org uuid) returns table (used integer, daily_limit integer)
language sql stable security definer set search_path = ''
as $$
  select (select count(*)::integer from public.ai_requests
           where organization_id = p_org and created_at >= private.berlin_day_start()),
         o.ai_daily_limit
    from public.organizations o
   where o.id = p_org and private.is_member(p_org);
$$;

revoke execute on function public.begin_ai_request(uuid, public.ai_request_kind) from public, anon;
revoke execute on function public.finish_ai_request(uuid, text, integer, integer) from public, anon;
revoke execute on function public.ai_usage_today(uuid) from public, anon;
grant execute on function public.begin_ai_request(uuid, public.ai_request_kind) to authenticated;
grant execute on function public.finish_ai_request(uuid, text, integer, integer) to authenticated;
grant execute on function public.ai_usage_today(uuid) to authenticated;
grant execute on function private.berlin_day_start() to authenticated;

-- ---------------------------------------------------------------------------
-- Branchenvorlagen: global (ohne organization_id), nur lesbar.
-- Grundlage für Kampagnenvorschläge; ohne KI werden sie direkt übernommen.
-- content: { description, duration_weeks, channels[], ideas[{title, body}] }
-- ---------------------------------------------------------------------------
create table public.industry_templates (
  id       uuid primary key default gen_random_uuid(),
  industry text not null check (industry in ('craft', 'gastronomy', 'retail', 'services', 'health', 'beauty', 'other')),
  goal     public.campaign_goal not null,
  name     text not null check (char_length(name) between 1 and 120),
  content  jsonb not null,
  unique (industry, goal)
);
alter table public.industry_templates enable row level security;
grant select on public.industry_templates to authenticated;
create policy industry_templates_select on public.industry_templates for select to authenticated using (true);

insert into public.industry_templates (industry, goal, name, content) values
-- Allgemein (für alle Branchen ohne eigene Vorlage)
('other', 'inquiries', 'Mehr Anfragen', '{"description":"Zeigt, wobei ihr helft, und macht die Kontaktaufnahme leicht.","duration_weeks":4,"channels":["instagram","facebook"],"ideas":[{"title":"Unser Angebot in 30 Sekunden","body":"Kurz erklären, was ihr macht und für wen."},{"title":"Vorher/Nachher oder Ergebnis","body":"Ein typisches Ergebnis zeigen und den Nutzen nennen."},{"title":"Häufige Frage beantwortet","body":"Eine Frage, die Kundschaft oft stellt, einfach beantworten."},{"title":"So erreicht ihr uns","body":"Kontaktwege, Termine, Ansprechperson – mit klarer Handlungsaufforderung."}]}'),
('other', 'recruiting', 'Neue Mitarbeitende', '{"description":"Macht euren Betrieb als Arbeitgeber sichtbar.","duration_weeks":4,"channels":["instagram","facebook","linkedin"],"ideas":[{"title":"Wir suchen dich","body":"Stelle kurz vorstellen: Aufgaben, was ihr bietet, wie man sich meldet."},{"title":"Ein Tag bei uns","body":"Einblick in den Arbeitsalltag aus Sicht eines Teammitglieds."},{"title":"Das Team stellt sich vor","body":"Gesichter zeigen, Stimmung vermitteln."},{"title":"Bewerben in 2 Minuten","body":"Einfacher Bewerbungsweg ohne Anschreiben."}]}'),
('other', 'awareness', 'Bekanntheit', '{"description":"Macht euren Betrieb in der Region bekannter.","duration_weeks":6,"channels":["instagram","facebook"],"ideas":[{"title":"Wer wir sind","body":"Geschichte und Werte des Betriebs in wenigen Sätzen."},{"title":"Blick hinter die Kulissen","body":"Etwas zeigen, das Kundschaft sonst nicht sieht."},{"title":"Kundenstimme","body":"Eine echte Rückmeldung (mit Erlaubnis) teilen."},{"title":"Tipp aus der Praxis","body":"Einen nützlichen Rat aus eurem Fachgebiet geben."}]}'),
('other', 'event', 'Veranstaltung', '{"description":"Bewirbt einen Termin vorher, währenddessen und danach.","duration_weeks":3,"channels":["instagram","facebook"],"ideas":[{"title":"Save the Date","body":"Termin, Ort und worum es geht ankündigen."},{"title":"Was euch erwartet","body":"Programm oder Höhepunkte vorstellen."},{"title":"Erinnerung: morgen geht es los","body":"Kurz vor dem Termin noch einmal einladen."},{"title":"Danke fürs Kommen","body":"Rückblick mit Eindrücken und Dank."}]}'),
-- Handwerk
('craft', 'inquiries', 'Aufträge gewinnen', '{"description":"Zeigt eure Arbeit und macht Anfragen für Angebote leicht.","duration_weeks":4,"channels":["instagram","facebook"],"ideas":[{"title":"Vorher/Nachher einer Baustelle","body":"Ein abgeschlossenes Projekt mit Ausgangslage und Ergebnis."},{"title":"Saison-Tipp","body":"Was man jetzt prüfen oder erledigen lassen sollte."},{"title":"Wie läuft ein Auftrag bei uns ab?","body":"Von der Anfrage bis zur Abnahme in vier Schritten."},{"title":"Jetzt Termin für Angebot sichern","body":"Freie Termine nennen und Kontaktweg zeigen."}]}'),
('craft', 'recruiting', 'Fachkräfte und Azubis finden', '{"description":"Zeigt, warum sich Handwerk bei euch lohnt.","duration_weeks":6,"channels":["instagram","facebook","tiktok"],"ideas":[{"title":"Azubi erzählt","body":"Ein Auszubildender zeigt, was er diese Woche gelernt hat."},{"title":"Werkzeug des Monats","body":"Ein Werkzeug oder eine Maschine vorstellen – mit Augenzwinkern."},{"title":"Was wir bieten","body":"Fahrzeug, Weiterbildung, feste Zeiten – konkrete Vorteile nennen."},{"title":"Probetag vereinbaren","body":"Einladung zum unverbindlichen Reinschnuppern."}]}'),
('craft', 'awareness', 'Meisterbetrieb aus der Region', '{"description":"Stärkt euren Ruf als verlässlicher Betrieb vor Ort.","duration_weeks":6,"channels":["instagram","facebook"],"ideas":[{"title":"Seit wann es uns gibt","body":"Geschichte des Betriebs, Generationen, Meilensteine."},{"title":"Projekt aus der Nachbarschaft","body":"Eine Arbeit im Ort zeigen (mit Erlaubnis der Kundschaft)."},{"title":"Material erklärt","body":"Warum ihr ein bestimmtes Material verwendet."},{"title":"Danke für die Bewertung","body":"Eine Kundenbewertung teilen."}]}'),
('craft', 'event', 'Tag der offenen Werkstatt', '{"description":"Lädt zu einem Termin in eure Werkstatt oder auf eine Messe ein.","duration_weeks":3,"channels":["instagram","facebook"],"ideas":[{"title":"Wir öffnen die Werkstatt","body":"Datum, Uhrzeit, Ort und was man ausprobieren kann."},{"title":"Mitmach-Aktion","body":"Eine Aktion für Kinder oder Interessierte ankündigen."},{"title":"Letzte Erinnerung","body":"Am Vortag noch einmal einladen."},{"title":"Rückblick","body":"Bilder und Dank an alle Gäste."}]}'),
-- Gastronomie
('gastronomy', 'inquiries', 'Mehr Gäste und Reservierungen', '{"description":"Macht Lust auf einen Besuch und führt zur Reservierung.","duration_weeks":4,"channels":["instagram","facebook"],"ideas":[{"title":"Gericht der Woche","body":"Ein Gericht appetitlich zeigen und kurz beschreiben."},{"title":"Aus der Küche","body":"Kurzer Einblick, wie ein Gericht entsteht."},{"title":"Tisch für das Wochenende","body":"Zur Reservierung einladen, Kontaktweg nennen."},{"title":"Feiern bei uns","body":"Räume und Angebote für Familienfeiern oder Firmenessen."}]}'),
('gastronomy', 'recruiting', 'Team für Küche und Service', '{"description":"Findet Verstärkung für Küche und Service.","duration_weeks":4,"channels":["instagram","facebook"],"ideas":[{"title":"Wir suchen Verstärkung","body":"Offene Stellen, Arbeitszeiten, was ihr bietet."},{"title":"Schicht mit dem Team","body":"Einblick in eine Schicht, gute Stimmung zeigen."},{"title":"Lieblingsgericht des Teams","body":"Teammitglieder stellen ihr Lieblingsgericht vor."},{"title":"Einfach vorbeikommen","body":"Unkomplizierter Weg zur Bewerbung."}]}'),
('gastronomy', 'awareness', 'Bekannt in der Nachbarschaft', '{"description":"Macht euer Lokal und seine Geschichte bekannt.","duration_weeks":6,"channels":["instagram","facebook","tiktok"],"ideas":[{"title":"Unsere Geschichte","body":"Wie das Lokal entstanden ist."},{"title":"Zutaten aus der Region","body":"Lieferanten und Produkte aus der Umgebung vorstellen."},{"title":"Gästestimme","body":"Eine schöne Rückmeldung teilen."},{"title":"Saisonkarte","body":"Was es neu auf der Karte gibt."}]}'),
('gastronomy', 'event', 'Themenabend', '{"description":"Bewirbt einen Themenabend, ein Fest oder eine Verkostung.","duration_weeks":3,"channels":["instagram","facebook"],"ideas":[{"title":"Ankündigung Themenabend","body":"Datum, Menü-Highlights, Reservierungshinweis."},{"title":"Vorgeschmack","body":"Ein Gericht oder Getränk des Abends zeigen."},{"title":"Nur noch wenige Plätze","body":"Erinnerung mit Reservierungsaufruf."},{"title":"So war der Abend","body":"Eindrücke und Dank an die Gäste."}]}'),
-- Handel
('retail', 'inquiries', 'Mehr Kundschaft im Laden', '{"description":"Bringt Menschen in den Laden und auf eure Angebote.","duration_weeks":4,"channels":["instagram","facebook"],"ideas":[{"title":"Neu eingetroffen","body":"Neue Produkte zeigen und Lust auf einen Besuch machen."},{"title":"Beratung bei uns","body":"Zeigen, wie ihr persönlich beratet."},{"title":"Produkt im Einsatz","body":"Ein Produkt im Alltag zeigen."},{"title":"Öffnungszeiten und Weg","body":"Wann und wo man euch findet."}]}'),
('retail', 'recruiting', 'Verkaufsteam verstärken', '{"description":"Findet Verstärkung für Verkauf und Lager.","duration_weeks":4,"channels":["instagram","facebook"],"ideas":[{"title":"Wir suchen dich für den Verkauf","body":"Aufgaben, Zeiten, Vorteile."},{"title":"Lieblingsprodukt im Team","body":"Teammitglieder stellen ihr Lieblingsprodukt vor."},{"title":"Ein Tag im Laden","body":"Einblick in den Arbeitsalltag."},{"title":"Bewerben im Laden","body":"Einfach vorbeikommen oder kurz schreiben."}]}'),
('retail', 'awareness', 'Euer Laden vor Ort', '{"description":"Macht euren Laden als Ort in der Stadt bekannt.","duration_weeks":6,"channels":["instagram","facebook"],"ideas":[{"title":"Wer hinter dem Laden steckt","body":"Inhaberin oder Inhaber stellt sich vor."},{"title":"Schaufenster der Woche","body":"Die aktuelle Dekoration zeigen."},{"title":"Lokal einkaufen lohnt sich","body":"Warum der Einkauf vor Ort einen Unterschied macht."},{"title":"Kundenfrage","body":"Eine häufige Frage zu einem Produkt beantworten."}]}'),
('retail', 'event', 'Aktionstag', '{"description":"Bewirbt einen Aktionstag, Jubiläum oder Verkaufsoffenen Sonntag.","duration_weeks":3,"channels":["instagram","facebook"],"ideas":[{"title":"Aktionstag angekündigt","body":"Datum und was es gibt."},{"title":"Vorschau auf Angebote","body":"Ein paar Höhepunkte zeigen."},{"title":"Morgen ist es so weit","body":"Erinnerung mit Öffnungszeiten."},{"title":"Danke für euren Besuch","body":"Rückblick mit Eindrücken."}]}'),
-- Dienstleistung
('services', 'inquiries', 'Mehr Anfragen für Termine', '{"description":"Erklärt eure Leistung verständlich und führt zur Anfrage.","duration_weeks":4,"channels":["instagram","facebook","linkedin"],"ideas":[{"title":"Was wir für euch erledigen","body":"Leistung in einfachen Worten erklären."},{"title":"Typischer Fall aus der Praxis","body":"Ein anonymisiertes Beispiel mit Ergebnis."},{"title":"Drei Fragen vor dem Erstgespräch","body":"Woran man merkt, dass man Unterstützung braucht."},{"title":"Kostenloses Erstgespräch","body":"Termin anfragen, Kontaktweg zeigen."}]}'),
('services', 'recruiting', 'Verstärkung fürs Team', '{"description":"Zeigt euch als guten Arbeitgeber.","duration_weeks":4,"channels":["linkedin","instagram","facebook"],"ideas":[{"title":"Offene Stelle","body":"Aufgaben, Rahmenbedingungen, Vorteile."},{"title":"So arbeiten wir","body":"Arbeitsweise, Werkzeuge, Zusammenarbeit."},{"title":"Teammitglied im Porträt","body":"Eine Person aus dem Team stellt sich vor."},{"title":"Bewerbung ohne Hürden","body":"Kurzer Weg zur Bewerbung."}]}'),
('services', 'awareness', 'Expertise zeigen', '{"description":"Baut Vertrauen über Fachwissen auf.","duration_weeks":6,"channels":["linkedin","instagram","facebook"],"ideas":[{"title":"Fachbegriff einfach erklärt","body":"Einen Begriff aus eurem Gebiet verständlich machen."},{"title":"Häufiger Irrtum","body":"Einen verbreiteten Fehler aufklären."},{"title":"Kundenstimme","body":"Eine Rückmeldung teilen (mit Erlaubnis)."},{"title":"Wer wir sind","body":"Team und Haltung kurz vorstellen."}]}'),
('services', 'event', 'Info-Abend oder Webinar', '{"description":"Bewirbt einen Vortrag, Info-Abend oder ein Webinar.","duration_weeks":3,"channels":["linkedin","instagram","facebook"],"ideas":[{"title":"Einladung zum Info-Abend","body":"Thema, Termin, Anmeldung."},{"title":"Das lernt ihr","body":"Drei Punkte, die man mitnimmt."},{"title":"Letzte Plätze","body":"Erinnerung zur Anmeldung."},{"title":"Danke und Unterlagen","body":"Rückblick und Hinweis auf Unterlagen."}]}'),
-- Gesundheit
('health', 'inquiries', 'Neue Patientinnen und Patienten', '{"description":"Informiert sachlich über Angebote und Terminvergabe.","duration_weeks":4,"channels":["instagram","facebook"],"ideas":[{"title":"Unser Leistungsangebot","body":"Angebote sachlich und verständlich vorstellen."},{"title":"So läuft der erste Termin ab","body":"Ablauf erklären, Unsicherheit nehmen."},{"title":"Gesundheitstipp","body":"Einen allgemeinen, sachlichen Tipp geben (keine Heilversprechen)."},{"title":"Termin vereinbaren","body":"Wege zur Terminvergabe nennen."}]}'),
('health', 'recruiting', 'Team für die Praxis', '{"description":"Findet Fachpersonal für Praxis oder Empfang.","duration_weeks":4,"channels":["instagram","facebook","linkedin"],"ideas":[{"title":"Wir suchen Verstärkung","body":"Stelle, Arbeitszeiten, Vorteile."},{"title":"Unser Praxisteam","body":"Das Team kurz vorstellen."},{"title":"Weiterbildung bei uns","body":"Entwicklungsmöglichkeiten zeigen."},{"title":"Unkompliziert bewerben","body":"Kurzer Bewerbungsweg."}]}'),
('health', 'awareness', 'Vertrauen aufbauen', '{"description":"Stellt Praxis und Team sachlich und nahbar vor.","duration_weeks":6,"channels":["instagram","facebook"],"ideas":[{"title":"Unsere Räume","body":"Praxis und Ausstattung zeigen."},{"title":"Wer behandelt euch","body":"Team mit Qualifikationen vorstellen."},{"title":"Häufige Frage","body":"Eine allgemeine Frage sachlich beantworten."},{"title":"Barrierefrei erreichbar","body":"Anfahrt, Parken, Zugang."}]}'),
('health', 'event', 'Gesundheitstag', '{"description":"Bewirbt einen Gesundheitstag, Kurs oder Vortrag.","duration_weeks":3,"channels":["instagram","facebook"],"ideas":[{"title":"Einladung","body":"Thema, Termin, Anmeldung."},{"title":"Was euch erwartet","body":"Inhalte kurz vorstellen."},{"title":"Erinnerung","body":"Kurz vorher noch einmal einladen."},{"title":"Rückblick","body":"Dank an die Teilnehmenden."}]}'),
-- Kosmetik / Friseur
('beauty', 'inquiries', 'Mehr Termine buchen', '{"description":"Zeigt Ergebnisse und führt zur Terminbuchung.","duration_weeks":4,"channels":["instagram","tiktok","facebook"],"ideas":[{"title":"Vorher/Nachher","body":"Ein Ergebnis zeigen (mit Erlaubnis)."},{"title":"Trend der Saison","body":"Einen aktuellen Look oder eine Behandlung vorstellen."},{"title":"Pflegetipp für zuhause","body":"Ein einfacher Tipp, der sofort hilft."},{"title":"Freie Termine diese Woche","body":"Zur Buchung einladen."}]}'),
('beauty', 'recruiting', 'Verstärkung für den Salon', '{"description":"Findet Fachkräfte und Azubis für den Salon.","duration_weeks":4,"channels":["instagram","tiktok"],"ideas":[{"title":"Wir suchen dich","body":"Stelle und Vorteile kurz vorstellen."},{"title":"Ein Tag im Salon","body":"Einblick in den Arbeitsalltag."},{"title":"Weiterbildung und Trends","body":"Zeigen, wie ihr euch weiterbildet."},{"title":"Probearbeiten","body":"Einladung zum Kennenlernen."}]}'),
('beauty', 'awareness', 'Euer Salon vor Ort', '{"description":"Macht den Salon und seine Handschrift bekannt.","duration_weeks":6,"channels":["instagram","tiktok","facebook"],"ideas":[{"title":"Das Team und seine Spezialgebiete","body":"Wer macht was am liebsten?"},{"title":"Produkte, die wir verwenden","body":"Warum ihr diese Produkte gewählt habt."},{"title":"Kundenstimme","body":"Eine Rückmeldung teilen."},{"title":"Wohlfühlmoment","body":"Atmosphäre im Salon zeigen."}]}'),
('beauty', 'event', 'Aktion oder Jubiläum', '{"description":"Bewirbt eine Aktion, ein Jubiläum oder einen Beauty-Abend.","duration_weeks":3,"channels":["instagram","facebook"],"ideas":[{"title":"Ankündigung","body":"Was, wann, für wen."},{"title":"Vorgeschmack","body":"Einen Höhepunkt der Aktion zeigen."},{"title":"Jetzt noch Termin sichern","body":"Erinnerung mit Buchungshinweis."},{"title":"Danke!","body":"Rückblick und Dank."}]}');

-- Ergebnis ausgeführter Prompts speichern (gleiche Zeilenrechte wie der Prompt: post_ai_prompts_write)
grant update (result, result_at) on public.post_ai_prompts to authenticated;

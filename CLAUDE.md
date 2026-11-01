# Taktwerk – Marketing-Portal (SaaS)

## Projektziel
Webbasiertes Marketing-Portal für kleine Betriebe ohne Marketingabteilung (Handwerk, Dienstleister, Gastronomie, lokaler Handel): Kampagnen und Beiträge kanalübergreifend planen, freigeben, veröffentlichen und auswerten – online (Instagram, Facebook, YouTube, LinkedIn, TikTok) und offline (Flyer, Plakat, Fahrzeug, Messe, Anzeige). KI-Assistent für Ideen, Texte, Kanalanpassung und Monatsbericht.

## Zusammenarbeit
- Nutzer hat keine Programmiererfahrung. Antworten knapp, Deutsch, keine Einrichtungsanleitungen; Aufgaben für den Nutzer in einem Satz.
- Jede Phase beginnt mit Plan → Freigabe abwarten. Am Phasenende nur: fertig / offen / starten & testen.
- Vor Kosten oder Unumkehrbarem (Daten löschen, DB zurücksetzen, veröffentlichen) kurz warnen.
- Bei Unklarheit oder Abweichung vom Design: fragen, nicht raten.

## Tech-Stack
- Next.js (App Router), TypeScript `strict`
- Supabase: PostgreSQL, Auth, Storage – Region Frankfurt (eu-central-1)
- Tailwind CSS – Theme ausschließlich aus CSS-Variablen von `design/project/tokens.json` (keine festen Werte)
- Hell-/Dunkelmodus: `data-theme` + `prefers-color-scheme` (wie in `design/project/handoff.md`)
- PWA + Web-Push
- KI: Anthropic API, Modell über `ANTHROPIC_MODEL` (Umgebungsvariable)

### Detailentscheidungen (je eine Zeile Begründung)
- **@supabase/ssr** – offizieller Weg für Supabase-Auth mit Cookies in Server Components/Actions.
- **Server Actions + Zod** – eine Validierung für Client und Server, Rechteprüfung serverseitig.
- **React Hook Form** – Standard-Formularbibliothek, gut gepflegt, Zod-Anbindung über `@hookform/resolvers`.
- **next-intl** – verbreitetstes i18n für App Router, unterstützt Server Components.
- **lucide-react** – vom Design vorgegebene Icon-Bibliothek.
- **dnd-kit** – Drag & Drop mit Tastatur- und Touch-Unterstützung (vom Design gefordert).
- **date-fns** (Locale `de`) – leichtgewichtig, baumförmig importierbar.
- **Eigener kleiner Service Worker (`public/sw.js`) statt Serwist** – nur Push + Installierbarkeit nötig, keine Zwischenspeicherung personenbezogener Seiten; Serwist erst, falls Offline-Betrieb gebraucht wird.
- **web-push** (VAPID) – Standardbibliothek für Web-Push ohne Fremddienst.
- **Geplante Beiträge als Warteschlange** – `claim_due_posts` (DB) reserviert fällige Beiträge; lokal ruft ein Takt im Server (`src/instrumentation.ts`, jede Minute) sie ab, online später pg_cron → `/api/cron/publish` (`CRON_SECRET`).
- **Verschlüsselung AES-256-GCM (node:crypto)** – Plattform-Tokens verschlüsselt, Schlüssel nur in `TOKEN_ENCRYPTION_KEY`.
- **Recharts** – einfache, gepflegte Diagramme für Dashboard/Bericht (Phase 4).
- **Tests:** Vitest (Logik), pgTAP via `supabase test db` (RLS/Mandantentrennung), Playwright (Ende-zu-Ende).
- **Next.js 16, Cache Components aus** – fast alle Seiten sind nutzer-/mandantenbezogen; vermeidet das Risiko, Mandantendaten zu cachen. Vor neuem Next-Code die Doku in `node_modules/next/dist/docs/` lesen (siehe AGENTS.md); `middleware` heißt jetzt `src/proxy.ts`.
- **next/font (selbst gehostet)** – keine Anfragen an Google aus dem Browser (DSGVO); Variablen `--font-loaded-*` stehen vor der Design-Schriftkette.
- **Tailwind v4 aus Tokens** – `npm run tokens` erzeugt `src/styles/tokens.css` (`@theme` + Dunkelmodus + Typo-Utilities `text-h1` …). Abstände im 4-px-Raster: nur Stufen 1,2,3,4,5,6,8,10,12,16.
- **Natives `<select>`** für Einfachauswahl – Tastatur, Screenreader und Bottom-Sheet am Smartphone kommen vom System; eigene Liste erst bei Mehrfachauswahl mit Monogrammen (Phase 2).
- **`<dialog>` für Modals, Popover-API für Menüs** – Fokusfalle, Esc und Rückfokus ohne Zusatzbibliothek.
- **Supabase-Schlüssel neu benannt** – `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Browser) und `SUPABASE_SECRET_KEY` (nur Server: Einladungs-Mails und Push-Versand an andere Personen).

## Architekturregeln
- **Mandantenfähig:** jede fachliche Tabelle hat `organization_id`; Zugriff über RLS. Ausnahmen (nutzerbezogen/global) sind im Schema begründet.
- **Rechte serverseitig:** Rollen `owner`, `editor`, `external`, `viewer`; Statuswechsel nur über DB-Funktion `transition_post_status` (prüft Rolle + erlaubten Übergang).
- **Plattformen:** nur über Interface `PublishingProvider` (`publish`, `schedule`, `fetchMetrics`) in `src/server/publishing/`. Erste Umsetzung: Facebook-Seiten direkt über die Meta Graph API (Entscheidung Phase 5, statt Ayrshare: kostenlos, keine Daten bei Dritten). Weitere Anbieter = neue Klasse, keine Änderung der übrigen App.
- **KI:** nur über `src/server/ai/` (Service-Schicht); kein direkter SDK-Aufruf in UI/Actions.
- **Geheimnisse:** nur Umgebungsvariablen (`.env.local`, nie eingecheckt; Vorlage `.env.example`). Service-Role-Key nur serverseitig.
- **Verlauf:** Änderungen an Beiträgen und Freigaben per DB-Trigger in `activity_log` (wer, was, wann).
- **DB-Änderungen nur über Migrationen** in `supabase/migrations/`.
- **i18n:** alle UI-Texte in `messages/de.json`; keine Texte im Code.
- **DSGVO:** Datensparsamkeit; Export und Löschung aller Daten eines Unternehmens per Funktion.
- **UI-Zustände:** jeder Bildschirm hat Lade-, Leer- und Fehlerzustand gemäß Design.

## Design
- Quelle: `design/project/` (README, `handoff.md`, `tokens.json`, `components/*`). `components/bundle.css` (`tw-`) ist nur Referenz, kein Produktionscode.
- Statuswerte (DB) → Label: `idea` Idee · `draft` Entwurf · `in_review` Zur Freigabe · `changes_requested` Änderung gewünscht (Amber, `rotate-ccw`) · `approved` Freigegeben · `scheduled` Geplant · `published` Veröffentlicht · `evaluated` Ausgewertet. Design-Tokens `status-review`/`status-analyzed` werden für `in_review`/`evaluated` verwendet.
- Rolle `editor` = „Ersteller“ im Design. `external` sieht nur Beiträge, denen er zugewiesen ist.
- Ansprache: Voreinstellungen `du_casual` / `sie_friendly` / `sie_formal` → Spalten `address_form` + `tone`.
- Bewusste Abweichungen: Feld „Leistungen“ ergänzt (fehlt im Entwurf, laut Produktvorgabe nötig); Webseite wird noch nicht ausgelesen (Entscheidung Phase 3: später); Onboarding Schritt 2 wählt Kanäle nur aus (Verbinden folgt Phase 5); Editor mobil mit 4 Tabs (Text · Assistent · Vorschau · Verlauf), damit der Verlauf erreichbar bleibt.

## Routen
`/login` `/signup` `/forgot-password` `/set-password` `/auth/confirm` `/start` (Unternehmen wählen, Einladungen) `/organizations/new` `/invite/[token]` · App: `/o/[slug]/…` (Dashboard, calendar, campaigns, posts, approvals, reports, channels, settings/{company,team,account}), `/o/[slug]/onboarding`.

## KI
- `@anthropic-ai/sdk`, Modell aus `ANTHROPIC_MODEL` (Standard `claude-opus-5-5`, freigegeben), Schlüssel `ANTHROPIC_API_KEY`. Ohne Schlüssel: KI-Knöpfe zeigen „nicht eingerichtet“, Kampagnen kommen aus Branchenvorlagen.
- Aufbau `src/server/ai/`: `client.ts` (Modell, Fehler), `generate.ts` (Stream/Text/JSON, Ersatzmodell bei Ablehnung über `fallbacks: "default"`), `prompts.ts` (Anweisungen, Nutzereingaben in Tags), `service.ts` (Aufgaben), `usage.ts` (Protokoll), `actions.ts` (Server Actions). Editor-Text streamt über Route `/o/[slug]/ai/text`.
- Kostenbremse: `organizations.ai_daily_limit` (100/Tag); jede Anfrage über `begin_ai_request` (prüft Rolle + Limit), Verbrauch ohne Texte in `ai_requests`.
- Tests ohne Kosten: `AI_FAKE=1` (Playwright setzt es selbst) liefert feste Beispieltexte. Echte KI nie in Tests.
- Datenschutz: Beitragstexte und Unternehmensprofil gehen zur Verarbeitung an Anthropic (USA) → in den Datenschutzhinweis aufnehmen.

## Plattformen
- Facebook: eigene Meta-App, `META_APP_ID`/`META_APP_SECRET`/`META_GRAPH_VERSION` in `.env.local`. Ablauf: `/o/[slug]/channels/facebook/connect` → Meta-Anmeldung → `/auth/facebook/callback` (als Weiterleitung in der Meta-App eingetragen) → Seite wählen → Seiten-Token verschlüsselt in `channel_credentials`.
- Zugangsdaten nur über Admin-Client (Service-Rolle); Nutzer-Token zwischendurch nur verschlüsselt im Cookie (15 Min.). Aufrufe mit `appsecret_proof`.
- Fehler werden als Code gespeichert (`publish_error`, Übersetzung `posts.editor.publishErrors.*`); Token ungültig → Kanal „abgelaufen“.
- Meta-Testmodus: Posts sind evtl. nur für App-Rollen sichtbar. Öffentlich erst nach Meta-Prüfung (braucht HTTPS-Adresse + Datenschutzseite) – zusammen mit dem Online-Betrieb.
- Tests: `PUBLISH_FAKE=1` (Playwright setzt es) – simulierte Seiten, nichts wird veröffentlicht; Text „#fehler“ erzeugt eine Ablehnung.

## Push
- VAPID-Schlüssel in `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). Versand nach Server Actions per `after(() => sendPendingPushes(orgId))`; Benachrichtigungen selbst erzeugen DB-Trigger/`transition_post_status`.
- Push braucht HTTPS (oder localhost): auf dem Handy erst nach Veröffentlichung im Netz bzw. über einen HTTPS-Tunnel testbar.

## Lokale Umgebung
- Starten für den Nutzer: Doppelklick auf `Taktwerk-starten.cmd` (startet Docker Desktop falls nötig, dann `supabase start`, dann `npm run dev`, öffnet den Browser). Docker startet nach einem Neustart nicht automatisch.
- Docker-CLI liegt unter `%LOCALAPPDATA%/Programs/DockerDesktop/resources/bin` – in Shells ggf. zum PATH hinzufügen.
- `.env.local` enthält die lokalen Supabase-Werte und ein Demo-Konto (`DEMO_EMAIL`/`DEMO_PASSWORD`). Mails lokal: http://127.0.0.1:54324, DB-Oberfläche: http://127.0.0.1:54323.

## Befehle
`npm run dev` · `npm run build` · `npm test` (Vitest) · `npm run test:db` (pgTAP direkt im DB-Container, weil `supabase test db` unter Windows Laufwerk E: nicht einbindet; braucht `npm run db:start`) · `npm run test:e2e` · `npm run tokens` · `npm run check:messages` · `npm run db:types`

## Ordnerstruktur
```
design/                 Design-Übergabe (nur lesen)
messages/               Übersetzungen (de.json)
src/app/                Routen (App Router), (auth)/, (app)/[org]/…
src/components/ui/      Basiskomponenten nach Design (Button, TextField, …)
src/components/<bereich>/ Fachkomponenten
src/lib/                Hilfsfunktionen ohne Serverzugriff
src/server/             Nur-Server-Code: db/, auth/, ai/, publishing/, push/, crypto/
src/styles/tokens.css   CSS-Variablen aus tokens.json
supabase/migrations/    SQL-Migrationen
supabase/tests/         pgTAP-Tests (RLS, Rechte, Status)
tests/                  Vitest + Playwright
docs/                   Entscheidungen, Schema
```

## Namenskonventionen
- DB: `snake_case`, Tabellen im Plural, Enums im Singular (`post_status`), Fremdschlüssel `<tabelle_singular>_id`, Zeitstempel `timestamptz` `*_at`, Geld in Cent (`bigint`, `*_cents`).
- TypeScript: Komponenten `PascalCase` (Namen wie im Design), Funktionen/Variablen `camelCase`, Dateien `kebab-case.ts`, Komponenten-Dateien `PascalCase.tsx`.
- Übersetzungsschlüssel: `bereich.element.zweck` (z. B. `posts.status.in_review`).
- Commits: Deutsch, Präfix `feat:`, `fix:`, `chore:`, `test:`, `docs:`.

## Phasenplan
- [x] **0 – Vorbereitung:** Design gelesen ✓, Git ✓, GitHub ✓ (github.com/Fwlho/taktwerk, Branch `main`), CLAUDE.md ✓, DB-Schema freigegeben ✓ (`docs/datenbankschema.md`)
- [x] **1 – Fundament:** Setup, Tokens + Basiskomponenten, Registrierung/Login, Unternehmen, Einladungen, Rollen, Onboarding-Profil, Navigation Desktop/Mobil ✓ (35 DB-, 17 Unit-, 8 Browser-Tests grün)
- [x] **2 – Kern:** Kanäle (ohne Verbindung), Kampagnen, Beiträge + Status, Kanban, Kalender, Freigabe + Kommentare, Benachrichtigungen/Push ✓, Asset-Bibliothek ✓, Kanäle/Kampagnen/Beiträge/Kanban/Kalender/Freigabe ✓, **Wochenplan** ✓ (ohne Design-Entwurf aus vorhandenen Komponenten gebaut; Funktionen `copy_week`, `save_week_as_template`, `apply_week_template`, `submit_week_for_approval`, `approve_week`)
  - Wochenplan = Ansicht auf normale Beiträge (keine eigene Datenhaltung): Woche → Plattform → Tag → Beiträge, umschaltbar auf Tag → Plattformen; mehrere Beiträge je Tag/Plattform; Fortschritt je Plattform, Statuspunkt je Tag; Beitragsfelder interne Notizen + beliebig viele KI-Prompts (text/image/video/caption, Ergebnis, Reihenfolge; kopierbar, ausführbar, als Vorlage speicherbar); Wochenvorlagen + „Vorwoche kopieren“; Woche (eine/alle Plattformen) gesammelt zur Freigabe, owner gibt gesammelt oder einzeln frei; Beitrag auf andere Plattformen übertragen (KI-Anpassung in Phase 3)
- [x] **3 – KI-Assistent:** Assistent im Editor (schreiben, Schnellbefehle, Kanal-Anpassung, Übernehmen/Rückgängig), Prompts ausführen, Übertragen mit KI-Anpassung, Ideen (Übersicht, Kanban, Wochenplan), Kampagnenvorschläge aus 28 Branchenvorlagen, Onboarding Schritt 2 (Kanäle) + 3 (erstes Ziel → Kampagne mit 4 Ideen), Tageslimit ✓ (129 DB-, 51 Unit-, 12 Browser-Tests grün)
- [ ] **4 – Messen & Steuern:** Offline-Maßnahmen (QR/Rabattcode), Budget, Kennzahlen manuell, Dashboard, Monatsbericht
- [ ] **5 – Plattform-Anbindung:** Facebook-Seite verbinden/trennen, sofort und geplant veröffentlichen, Wiederholung bei Fehlern, Benachrichtigung ✓ (143 DB-, 59 Unit-, 13 Browser-Tests grün); offen: echte Meta-App einrichten + testen, Instagram, weitere Plattformen, Kennzahlen importieren, Online-Betrieb
- [ ] **6 – Abrechnung/Abo** (später)

# Übergabe an die Entwicklung

Dieses Kapitel ist die verbindliche Vorlage für die Umsetzung. Quelle aller Werte ist `tokens.json`; der Block unten ist daraus erzeugt und kann 1:1 als `tokens.css` übernommen werden.

## 1 · Tokens als CSS-Variablen

```css
/* Schriften (Google Fonts, OFL) */
@import url("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:ital,wght@0,400;0,600;0,700;1,400&family=Atkinson+Hyperlegible+Mono&family=Bricolage+Grotesque:opsz,wght@12..96,600..700&display=swap");

/* Taktwerk Tokens – Hellmodus ist Standard */
:root, [data-theme="light"] {
  --color-bg: #f6f4ef;
  --color-surface: #ffffff;
  --color-surface-sunken: #eeebe4;
  --color-surface-hover: #f2efe9;
  --color-border: #e3ded4;
  --color-border-strong: #878175;
  --color-text: #1c2321;
  --color-text-muted: #575e5b;
  --color-text-disabled: #9ca19e;
  --color-primary: #0d5e57;
  --color-primary-hover: #094a45;
  --color-primary-soft: #e1f0ed;
  --color-on-primary: #ffffff;
  --color-ai: #a64b12;
  --color-ai-soft: #fdf0e6;
  --color-on-ai: #ffffff;
  --color-accent: #e8843c;
  --color-focus: #1f66c7;
  --color-success: #146b54;
  --color-success-soft: #e0f2ea;
  --color-warning: #855600;
  --color-warning-soft: #fcf1d4;
  --color-danger: #b0261b;
  --color-danger-soft: #fce8e5;
  --color-on-danger: #ffffff;
  --color-info: #1d5ea6;
  --color-info-soft: #e4eef9;
  --color-ch-instagram: #b02e6a;
  --color-ch-instagram-soft: #fbe8f1;
  --color-ch-youtube: #bd231b;
  --color-ch-youtube-soft: #fde7e5;
  --color-ch-linkedin: #0b5b9c;
  --color-ch-linkedin-soft: #e2eef8;
  --color-ch-tiktok: #22292c;
  --color-ch-tiktok-soft: #e8ecec;
  --color-ch-facebook: #3a52c4;
  --color-ch-facebook-soft: #e8ebfb;
  --color-ch-offline: #83552a;
  --color-ch-offline-soft: #f6ede3;
  --color-on-channel: #ffffff;
  --color-status-idea: #575e5b;
  --color-status-idea-soft: #ecebe6;
  --color-status-draft: #3e5a85;
  --color-status-draft-soft: #e7ecf4;
  --color-status-review: #855600;
  --color-status-review-soft: #fcefc8;
  --color-status-approved: #146b54;
  --color-status-approved-soft: #ddf1e8;
  --color-status-scheduled: #1d5ea6;
  --color-status-scheduled-soft: #e3edf9;
  --color-status-published: #ffffff;
  --color-status-published-soft: #0d5e57;
  --color-status-analyzed: #66478a;
  --color-status-analyzed-soft: #efe9f6;
  --color-scrim: rgba(20, 26, 25, 0.48);
  --shadow-sm: 0 1px 2px rgba(28, 35, 33, 0.06);
  --shadow-md: 0 4px 16px rgba(28, 35, 33, 0.10);
  --shadow-lg: 0 16px 48px rgba(28, 35, 33, 0.18);
}

/* Dunkelmodus: explizit gewählt … */
[data-theme="dark"] {
  --color-bg: #131716;
  --color-surface: #1b201f;
  --color-surface-sunken: #0f1211;
  --color-surface-hover: #242a28;
  --color-border: #313836;
  --color-border-strong: #7a8380;
  --color-text: #edf1ef;
  --color-text-muted: #a7b0ac;
  --color-text-disabled: #5f6764;
  --color-primary: #5fcfc1;
  --color-primary-hover: #86ddd2;
  --color-primary-soft: #163330;
  --color-on-primary: #0a1f1d;
  --color-ai: #f4a66c;
  --color-ai-soft: #36241a;
  --color-on-ai: #2a1406;
  --color-accent: #e8843c;
  --color-focus: #86b9ff;
  --color-success: #62d2a9;
  --color-success-soft: #123028;
  --color-warning: #f0c157;
  --color-warning-soft: #382c0f;
  --color-danger: #ff8d80;
  --color-danger-soft: #3c1814;
  --color-on-danger: #2b0a06;
  --color-info: #8dc0ff;
  --color-info-soft: #142a41;
  --color-ch-instagram: #ff8fc1;
  --color-ch-instagram-soft: #3a1a2a;
  --color-ch-youtube: #ff8b82;
  --color-ch-youtube-soft: #3d1714;
  --color-ch-linkedin: #80bfff;
  --color-ch-linkedin-soft: #12283d;
  --color-ch-tiktok: #e1e8ea;
  --color-ch-tiktok-soft: #283234;
  --color-ch-facebook: #a3b3ff;
  --color-ch-facebook-soft: #1c2342;
  --color-ch-offline: #e2b68c;
  --color-ch-offline-soft: #33261a;
  --color-on-channel: #111514;
  --color-status-idea: #b5bdb9;
  --color-status-idea-soft: #272c2b;
  --color-status-draft: #a9c0e3;
  --color-status-draft-soft: #1e2734;
  --color-status-review: #f0c157;
  --color-status-review-soft: #3a2e10;
  --color-status-approved: #62d2a9;
  --color-status-approved-soft: #12302a;
  --color-status-scheduled: #8dc0ff;
  --color-status-scheduled-soft: #142a41;
  --color-status-published: #0a1f1d;
  --color-status-published-soft: #5fcfc1;
  --color-status-analyzed: #cdb3ea;
  --color-status-analyzed-soft: #2a2236;
  --color-scrim: rgba(0, 0, 0, 0.64);
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6);
}

/* … oder Systemeinstellung, solange nicht ausdrücklich „hell“ gewählt */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #131716;
    --color-surface: #1b201f;
    --color-surface-sunken: #0f1211;
    --color-surface-hover: #242a28;
    --color-border: #313836;
    --color-border-strong: #7a8380;
    --color-text: #edf1ef;
    --color-text-muted: #a7b0ac;
    --color-text-disabled: #5f6764;
    --color-primary: #5fcfc1;
    --color-primary-hover: #86ddd2;
    --color-primary-soft: #163330;
    --color-on-primary: #0a1f1d;
    --color-ai: #f4a66c;
    --color-ai-soft: #36241a;
    --color-on-ai: #2a1406;
    --color-accent: #e8843c;
    --color-focus: #86b9ff;
    --color-success: #62d2a9;
    --color-success-soft: #123028;
    --color-warning: #f0c157;
    --color-warning-soft: #382c0f;
    --color-danger: #ff8d80;
    --color-danger-soft: #3c1814;
    --color-on-danger: #2b0a06;
    --color-info: #8dc0ff;
    --color-info-soft: #142a41;
    --color-ch-instagram: #ff8fc1;
    --color-ch-instagram-soft: #3a1a2a;
    --color-ch-youtube: #ff8b82;
    --color-ch-youtube-soft: #3d1714;
    --color-ch-linkedin: #80bfff;
    --color-ch-linkedin-soft: #12283d;
    --color-ch-tiktok: #e1e8ea;
    --color-ch-tiktok-soft: #283234;
    --color-ch-facebook: #a3b3ff;
    --color-ch-facebook-soft: #1c2342;
    --color-ch-offline: #e2b68c;
    --color-ch-offline-soft: #33261a;
    --color-on-channel: #111514;
    --color-status-idea: #b5bdb9;
    --color-status-idea-soft: #272c2b;
    --color-status-draft: #a9c0e3;
    --color-status-draft-soft: #1e2734;
    --color-status-review: #f0c157;
    --color-status-review-soft: #3a2e10;
    --color-status-approved: #62d2a9;
    --color-status-approved-soft: #12302a;
    --color-status-scheduled: #8dc0ff;
    --color-status-scheduled-soft: #142a41;
    --color-status-published: #0a1f1d;
    --color-status-published-soft: #5fcfc1;
    --color-status-analyzed: #cdb3ea;
    --color-status-analyzed-soft: #2a2236;
    --color-scrim: rgba(0, 0, 0, 0.64);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6);
  }
}

:root {
  --font-display: "Bricolage Grotesque", "Atkinson Hyperlegible Next", system-ui, sans-serif;
  --font-sans: "Atkinson Hyperlegible Next", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Atkinson Hyperlegible Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  /* spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  /* radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 999px;
  /* size */
  --size-control-sm: 32px;
  --size-control: 44px;
  --size-control-lg: 56px;
  --size-sidebar: 248px;
  --size-sidebar-collapsed: 72px;
  --size-bottom-nav: 64px;
  --size-content-max: 1280px;
  --size-icon: 20px;
  /* duration */
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;
  /* easing */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  /* zIndex */
  --z-nav: 100;
  --z-dropdown: 200;
  --z-modal: 300;
  --z-toast: 400;
  /* breakpoint */
  --bp-mobile: 0px;
  --bp-tablet: 768px;
  --bp-desktop: 1200px;
}

/* Typo-Stile */
.text-display { font-family: var(--font-display); font-size: 40px; line-height: 44px; font-weight: 700; letter-spacing: -0.02em; }
.text-kpi { font-family: var(--font-display); font-size: 32px; line-height: 36px; font-weight: 650; letter-spacing: -0.01em; }
.text-h1 { font-family: var(--font-display); font-size: 28px; line-height: 34px; font-weight: 700; letter-spacing: -0.01em; }
.text-h2 { font-family: var(--font-display); font-size: 21px; line-height: 28px; font-weight: 650; }
.text-h3 { font-family: var(--font-sans); font-size: 17px; line-height: 24px; font-weight: 700; }
.text-body-lg { font-family: var(--font-sans); font-size: 17px; line-height: 26px; font-weight: 400; }
.text-body { font-family: var(--font-sans); font-size: 15px; line-height: 22px; font-weight: 400; }
.text-label { font-family: var(--font-sans); font-size: 14px; line-height: 20px; font-weight: 600; }
.text-small { font-family: var(--font-sans); font-size: 13px; line-height: 18px; font-weight: 400; }
.text-caption { font-family: var(--font-sans); font-size: 12px; line-height: 16px; font-weight: 600; letter-spacing: 0.01em; }
.text-mono { font-family: var(--font-mono); font-size: 13px; line-height: 20px; font-weight: 400; }

/* Fokus – überall gleich */
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }
}
```

**Benennung:** `--color-*` Farben · `--color-ch-<kanal>` / `-soft` Kanäle · `--color-status-<status>` / `-soft` Beitragsstatus · `--space-*` Abstände (4-px-Raster) · `--radius-*` · `--shadow-*` · `--size-*` feste Maße · `--duration-*` / `--ease-*` Bewegung · `--z-*` Ebenen · `--bp-*` Breakpoints (CSS-Variablen funktionieren nicht in `@media` – Werte dort als Konstanten 768px / 1200px verwenden).

**Kanal-Werte:** `instagram`, `youtube`, `linkedin`, `tiktok`, `facebook`, `offline` (Unterarten `flyer`, `poster`, `vehicle`, `fair`, `print_ad`).
**Status-Werte:** `idea` → `draft` → `review` → `approved` → `scheduled` → `published` → `analyzed`.
**Rollen:** `owner` (Inhaber/Admin, gibt frei), `creator` (Ersteller), `external` (Externe), `viewer` (Betrachter).

## 2 · Komponentenliste

Diese Namen gelten in allen Bildschirmen, in Code und Doku. Jede Komponente hat im Designsystem eine eigene Seite mit Zuständen und Props.

| Komponente | Zweck | Varianten | Zustände | Verwendet in |
|---|---|---|---|---|
| `Button` | Aktion auslösen | primary, secondary, ghost, ai, danger · sm/md/lg · icon | Standard, Hover, Fokus, Aktiv, Deaktiviert, Laden | überall |
| `TextField` | Text eingeben | einzeilig, multiline (mit Zeichenzähler) | Standard, Hover, Fokus, Fehler, Deaktiviert, Laden, Leer | Onboarding, Editor, Modals |
| `Select` | Option wählen | single, multiple (Kanäle) | Standard, Hover, Geöffnet, Fehler, Deaktiviert, Laden, Leer | Onboarding, Editor, Filter |
| `StatusBadge` | Beitragsstatus zeigen | pill, dot, steps | 7 Status, Laden | Karten, Tabellen, Kanban-Köpfe, Editor |
| `ChannelChip` | Kanal zeigen/filtern | default, compact · Monogramm sm/md/lg | Standard, Hover, Fokus, Ausgewählt, Nicht verbunden, Deaktiviert, Fehler, Laden | überall |
| `PostCard` | Beitrag kompakt | mit/ohne Bild, ohne Badge (im Kanban) | Standard, Hover, Ausgewählt, Ziehen, Fehler, Deaktiviert, Laden | Pipeline, Kalender mobil, Kampagne |
| `CampaignCard` | Kampagne kompakt | – | Standard, Hover, Ausgewählt, Budget-Warnung, Laden | Kampagnen-Übersicht |
| `KpiTile` | Kennzahl | mit/ohne Sparkline | Standard, Hover, Leer, Fehler, Laden | Dashboard, Kampagne, Bericht |
| `CalendarCell` | Tag im Monatsraster | – | Standard, Hover, Heute, Ausgewählt, Ablegen, Überlauf, Außerhalb, Laden | Kalender Monat |
| `CalendarEntry` | Beitrag im Kalender | inline, block | Standard, Hover, Fokus, Zur Freigabe, Veröffentlicht, Ziehen, Fehler, Laden | Kalender, Dashboard |
| `KanbanColumn` | Status-Spalte | – | Standard, Ablegen, Leer, Warnung, Laden | Pipeline |
| `ApprovalItem` | Kommentare & Freigabe | Comment, Decision, ApprovalBlock, Composer | wartend, Laden, Fehler/offline, erledigt | Editor, Freigabe mobil |
| `AiSuggestion` | KI-Vorschlag | text, ideas, adapt | Standard, Laden (Streaming), Fehler, Übernommen, Leer, Deaktiviert | Editor, Dashboard, Kampagne, Bericht |
| `SidebarNav` | Hauptnavigation ≥ 768px | expanded (248px), collapsed (72px) | Eintrag: Standard, Hover, Fokus, Aktiv | alle Desktop-Bildschirme |
| `MobileNav` | Hauptnavigation < 768px | Bottom-Bar, obere Leiste | inaktiv, aktiv, Fokus, gedrückt | alle Mobil-Bildschirme |
| `Modal` | Dialog | default, danger, sheet (mobil) | Öffnen, Laden, Fehler | Einplanen, Löschen, Schnell-Anlegen |
| `Toast` | Rückmeldung | success, info, warning, error, ai · Banner | erscheint, pausiert, verschwindet, dauerhaft (Fehler) | überall |
| `EmptyState` | keine Daten | first-use, done, no-results, error | – | alle Listen und Ansichten |

**Bildschirme:** `ScreenOnboarding`, `ScreenDashboard`, `ScreenDashboardMobile`, `ScreenCalendarMonth`, `ScreenCalendarWeek`, `ScreenCampaigns`, `ScreenCampaignDetail`, `ScreenPostEditor`, `ScreenPipeline`, `ScreenApprovalMobile`, `ScreenReport` – jeweils mit Aufbau und Verhalten auf ihrer Seite.

## 3 · Verhalten, das man im Bild nicht sieht

**Übergänge**
- Hover/Fokus: Farbe und Rahmen in `duration-fast` (120 ms), `ease-standard`.
- Statuswechsel einer Karte (z. B. nach Freigabe): Badge-Farbe überblendet in `duration-base`; im Kanban gleitet die Karte in die neue Spalte (`duration-slow`).
- Modal: Scrim blendet ein, Fläche skaliert von 0.96 auf 1 (`duration-slow`); Bottom-Sheet fährt von unten ein; Schließen mit `ease-exit`.
- Toast: fliegt 8px von unten ein; Erfolg/Info/KI verschwinden nach 6 s (pausiert bei Hover/Fokus), Fehler bleiben.
- Seitenwechsel: keine Animation, nur der Inhaltsbereich wird ersetzt; Navigation und Kopfzeile bleiben stehen.
- `prefers-reduced-motion`: alle Bewegungen aus, Spinner wird zu statischem Ring.

**Laden**
- Unter 300 ms: nichts anzeigen (kein Flackern). Danach Skelette (`tw-skel`) in exakt der Endgröße der Inhalte – Layout springt nicht.
- Buttons: Spinner im Button, Breite bleibt, Doppelklick gesperrt.
- KI: Text erscheint wortweise (Streaming), Kopfzeile „Schreibe Vorschlag …“, jederzeit „Stopp“.
- Speichern im Editor: automatisch 1 s nach letzter Eingabe; Anzeige „Speichert …“ → „Gespeichert“; offline „Lokal gespeichert – wird synchronisiert“.
- Bericht/Export: läuft im Hintergrund, Info-Toast mit Dauer, Ergebnis per Toast mit „Öffnen“.

**Leere Daten** (immer `EmptyState`, nie eine leere Fläche)
- Erstes Mal: Erklärung in einem Satz + Primäraktion + KI-Aktion („Ideen vorschlagen“).
- Erledigt (Freigaben): positives Häkchen, keine Aktion.
- Filter ohne Treffer: nennt den Filter, „Filter zurücksetzen“.
- Kennzahlen ohne Daten: „–“ und wann Daten kommen („24 Std. nach dem ersten Beitrag“). Erster Monat im Bericht: keine Vergleichswerte, Hinweis „Vergleich ab nächstem Monat“.

**Fehler**
- Feldfehler erst beim Verlassen des Feldes oder beim Absenden, nie während des Tippens.
- Kanal-Verbindung abgelaufen: Chip im Fehlerzustand, betroffene Beiträge rot markiert, Banner mit „Neu verbinden“ auf Dashboard.
- Netzwerkfehler: Inhalte bleiben sichtbar; Banner oben; Aktionen (v. a. Freigaben) werden gepuffert und nachgesendet.

**Freigabe & Rollen**
- „Zur Freigabe senden“ benachrichtigt alle Inhaber per Push und E-Mail; ein Tipp auf die Push öffnet direkt `ScreenApprovalMobile` (Schritt 2).
- Freigeben wirkt sofort, „Rückgängig“ 8 s lang im Toast. „Ändern“ verlangt einen Kommentar.
- Nur `owner` sieht Freigabe-Buttons und darf in „Freigegeben“ verschieben. `external` sieht nur zugeordnete Kampagnen. `viewer` liest nur (keine Composer, keine Drag-Griffe).

**Kalender & Kanban**
- Drag & Drop mit Maus, Touch (Long-Press 300 ms) und Tastatur (Leertaste anheben, Pfeile bewegen, Leertaste ablegen, Esc abbrechen).
- Nach jedem Verschieben Toast mit „Rückgängig“. Veröffentlichte Beiträge sind nicht verschiebbar.
- Kalender-Filter (Kanäle) und Ansicht (Monat/Woche/Liste) werden pro Nutzer gemerkt.

**Barrierefreiheit**
- Kontraste: alle Textpaare ≥ 4,5:1, Rahmen/Fokus/Icons ≥ 3:1, in beiden Modi geprüft.
- Kanal und Status nie nur über Farbe: Monogramm/Icon + Wort; im Kalender Statuspunkt mit `aria-label`.
- Touchziele ≥ 44×44px; Freigabe-Buttons mobil 56px.
- Diagramme zusätzlich als Tabelle („Daten anzeigen“).

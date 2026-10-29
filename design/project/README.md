**Taktwerk** ist ein Marketing-Portal für kleine Betriebe ohne Marketingabteilung – Handwerk, Dienstleister, Gastronomie, lokale Händler. Das System ist auf drei Eigenschaften ausgelegt: **ruhig** (viel Weißraum, wenige Farben gleichzeitig, flache Karten), **eindeutig** (Kanal und Status sind immer auf einen Blick erkennbar – über Farbe *und* Form/Icon/Wort) und **freundlich** (Du-Ansprache, kurze Sätze, nie Fachjargon).

## Designentscheidungen

**Name – Taktwerk.** „Takt“ steht für den verlässlichen Rhythmus, in dem Beiträge erscheinen sollen; „-werk“ verbindet ihn mit Handwerk und Werkstatt – also mit der Hauptzielgruppe. Der Name klingt nach Werkzeug, nicht nach Agentur. Das Logo-Zeichen sind drei unterschiedlich hohe Balken (ein Taktschlag, ein Balkendiagramm); der dritte Balken ist apricot.

**Farbwelt – Petrol, Apricot, Papier.** Petrol (`color-primary`) wirkt vertrauenswürdig wie Blau, ist aber wärmer und unverwechselbarer und kollidiert mit keiner Plattformfarbe. Apricot (`color-ai`, `color-accent`) ist ausschließlich die Stimme des KI-Assistenten – so erkennt man sofort, welcher Text vorgeschlagen und welcher selbst geschrieben ist. Der Hintergrund ist ein warmes Papierweiß (`color-bg`), Karten sind reinweiß (`color-surface`): das trennt Ebenen ohne Schatten. Kanäle und Status haben eigene, getrennte Paletten, damit nie eine Kanalfarbe mit einem Status verwechselt wird.

**Typografie – Atkinson Hyperlegible Next + Bricolage Grotesque.** Atkinson Hyperlegible Next wurde für maximale Lesbarkeit entwickelt (eindeutige Formen bei 1/l/I, 0/O) – richtig für Menschen, die das Tool zwischen zwei Terminen auf dem Smartphone nutzen. Bricolage Grotesque gibt Überschriften und Kennzahlen eine handfeste, freundliche Persönlichkeit, ohne verspielt zu sein. Beide sind kostenlos über Google Fonts verfügbar (OFL).

## Inhaltsgrundsätze

- Sprich die Nutzer mit **du** an; Sätze unter 15 Wörtern. „Leg deinen ersten Beitrag an“, nicht „Erstellen Sie einen neuen Content-Eintrag“.
- Keine Marketing-Fachbegriffe in der Oberfläche: „Reichweite“ statt „Impressions“, „Anfragen“ statt „Leads“, „Beitrag“ statt „Post/Content“, „Freigeben“ statt „Approve“.
- Buttons beginnen mit dem Verb: „Beitrag einplanen“, „Jetzt freigeben“, „Kanal verbinden“.
- Fehlermeldungen sagen, was passiert ist und was zu tun ist: „Nicht veröffentlicht: Instagram-Verbindung abgelaufen.“ + „Neu verbinden“.
- Zahlen deutsch formatiert: 12.480 · 1.240 € · +18 % · Di, 14. Apr · 9:00. Minus als „−“.
- Emojis nur in Beitragstexten der Nutzer bzw. KI-Vorschlägen für Instagram/TikTok – nie in der Oberfläche selbst.
- Statuslabels sind fest: Idee, Entwurf, Zur Freigabe, Freigegeben, Geplant, Veröffentlicht, Ausgewertet.

## Visuelle Grundlagen

**Farbe.** Setze Text in `color-text` auf `color-bg`/`color-surface`, Nebentext in `color-text-muted`. Pro Bildschirm genau eine Primäraktion in `color-primary`. `color-ai` nur für KI-Elemente (`AiSuggestion`, `Button ai`, KI-Toast). Rückmeldung über `color-success`, `color-warning`, `color-danger`, `color-info` – jeweils mit Icon. Alle Text/Fläche-Paare sind in Hell und Dunkel auf mindestens 4,5:1 geprüft, Rahmen interaktiver Felder (`color-border-strong`) und der Fokusring (`color-focus`) auf mindestens 3:1.

**Kanäle.** Jeder Kanal hat eine Farbe (`color-ch-<kanal>`), eine getönte Fläche (`-soft`) und ein Monogramm in eigener Kachelform (siehe `ChannelChip`). Kanalfarben färben nur Monogramme, Chips, Diagrammlinien und Kalenderbalken – nie Buttons oder Flächen.

**Status.** Sieben Statusfarben (`color-status-<status>` + `-soft`), immer zusammen mit Icon und Wort (`StatusBadge`). „Zur Freigabe“ ist bewusst Amber – der einzige Status, der zum Handeln auffordert. „Veröffentlicht“ ist der einzige gefüllte Status.

**Typografie.** `text-display` nur für Begrüßung/Onboarding-Titel; ein `text-h1` pro Seite; `text-h3` für Karten; Fließtext `text-body` (15px), längere Erklärtexte `text-body-lg`; kleinste Größe `text-caption` (12px). Kennzahlen in `text-kpi` mit tabellarischen Ziffern.

**Abstände & Raster.** 4-px-Raster (`space-1` … `space-16`). Seitenrand `space-8` Desktop / `space-4` mobil; Karten-Innenabstand `space-5` / `space-4`; Lücke zwischen Karten `space-4`. 12-Spalten-Raster, Inhalt max. `size-content-max` (1280px). Breakpoints `bp-mobile` (0), `bp-tablet` (768px), `bp-desktop` (1200px), mobile-first.

**Formen.** `radius-md` für Bedienelemente, `radius-lg` für Karten, `radius-xl` für Modals, `radius-full` für Badges/Chips. Karten liegen flach mit 1px `color-border`; Schatten (`shadow-sm/md/lg`) nur für schwebende Ebenen: Hover, Dropdown, Toast, Modal.

**Zustände.** Hover = eine Flächenstufe dunkler; Fokus = 2px `color-focus` mit 2px Abstand, auf allen Elementen gleich; Aktiv = gedrückte Fläche; Deaktiviert = `color-surface-sunken` + `color-text-disabled`; Laden = Skelett in Endgröße bzw. Spinner im Button; Fehler = `color-danger` + Icon + Satz. Mindest-Touchziel `size-control` (44px).

**Bewegung.** Dezent: `duration-fast` für Hover/Fokus, `duration-base` für Aufklappen und Statuswechsel, `duration-slow` für Modal/Sheet/Toast, Kurve `ease-standard`. Bei `prefers-reduced-motion` keine Bewegung.

## Ikonografie

- **Lucide** (ISC-Lizenz), Outline, Strichstärke 1.75, Größe `size-icon` (20px; 16px in kleinen Elementen). Icons tragen `currentColor` und erben die Textfarbe.
- Feste Zuordnungen: Status (`lightbulb`, `pencil-line`, `hourglass`, `circle-check`, `calendar-clock`, `send`, `chart-column`), KI (`sparkles`), Navigation (siehe `SidebarNav`).
- **Kanäle** haben keine Plattform-Logos, sondern eigene Monogramme (IG, YT, in, TT, FB) bzw. Piktogramme für Offline – siehe `ChannelChip`. Offizielle Logos nur dort, wo die Markenrichtlinien der Plattform es vorsehen (z. B. „Verbinden mit …“).
- Keine Emojis als Icons, keine Illustrationen mit Personen. Leerzustände nutzen eine geometrische Komposition aus drei Flächen (`EmptyState`).

## Aufbau dieses Systems

Komponenten (Gruppe in Klammern): `Button` (Aktionen) · `TextField`, `Select` (Eingaben) · `StatusBadge`, `ChannelChip` (Status & Kanäle) · `PostCard`, `CampaignCard`, `KanbanColumn` (Inhalte) · `KpiTile` (Daten) · `CalendarCell`, `CalendarEntry` (Kalender) · `ApprovalItem` (Freigabe) · `AiSuggestion` (KI-Assistent) · `SidebarNav`, `MobileNav` (Navigation) · `Modal`, `Toast` (Overlays) · `EmptyState` (Rückmeldung).

Bildschirme (`Screen…`): Onboarding, Dashboard, Dashboard mobil, Kalender Monat und Woche, Kampagnen-Übersicht und -Detail, Beitrags-Editor, Content-Pipeline, Freigabe mobil, Monatsbericht. Jede Vorschau zeigt Hell- und Dunkelmodus über den Themenschalter.

Das Kapitel **Übergabe an die Entwicklung** enthält alle Tokens als CSS-Variablen, die verbindliche Komponentenliste und das Verhalten, das man im Bild nicht sieht. Die Klassen in `components/bundle.css` (Präfix `tw-`) sind eine Referenz für Maße und Zustände der Entwürfe, kein Produktionscode.

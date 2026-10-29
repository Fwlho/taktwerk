# Button

Buttons lösen eine Aktion aus; pro Ansicht höchstens **ein** Primär-Button für die Hauptsache des Bildschirms.

**Varianten:** `primary` (Hauptaktion, `color-primary`), `secondary` (Standard, Rahmen `color-border-strong`), `ghost` (Nebenaktion, Text `color-primary`), `ai` (alles, was der KI-Assistent ausführt, `color-ai`, immer mit `sparkles`-Icon), `danger` (endgültiges Löschen, nur in Bestätigungs-Modals).

**Größen:** `sm` 32px (Tabellen, Toasts), `md` 44px (Standard = Mindest-Touchziel), `lg` 56px (Freigabe mobil, Onboarding). `icon` = quadratisch, braucht `aria-label`.

**Zustände:** Standard · Hover (Fläche eine Stufe dunkler) · Fokus (2px `color-focus`, 2px Abstand) · Aktiv/gedrückt · Deaktiviert (`color-surface-sunken`, Text `color-text-disabled`, `cursor: not-allowed`) · Laden (Label wird unsichtbar, Breite bleibt gleich, Spinner, `aria-busy`, nicht klickbar).

**Der Entwickler liefert:** `variant`, `size`, `icon` (Lucide-Name, optional, links), `label` (Verb zuerst, Satzanfang groß: „Beitrag einplanen“), `loading`, `disabled`.

- Do: Verb + Objekt („Kampagne anlegen“), max. 3 Wörter.
- Don't: „OK“, „Absenden“, Ausrufezeichen; zwei Primär-Buttons nebeneinander.

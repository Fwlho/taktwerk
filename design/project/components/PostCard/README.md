# PostCard

Kompakte Karte für einen Beitrag – in Kanban, Listen und Kampagnen-Details gleich.

**Aufbau (oben → unten):** `ChannelChip compact` links + `StatusBadge` rechts · optional Vorschaubild 96px · Titel (`text-label` 15/21 bold, max. 2 Zeilen) · Textauszug (`text-small`, `color-text-muted`, max. 2 Zeilen) · Kampagnenname (`text-caption`) · Fuß: Datum/Uhrzeit, Kommentaranzahl, Avatar der verantwortlichen Person.

**Breite:** füllt die Spalte; im Kanban 272px minus Innenabstand. Innenabstand `space-4`, `radius-lg`, Rand `color-border`.

**Zustände:** Standard · Hover (`shadow-sm`, Rand `color-border-strong`, Cursor Hand) · Ausgewählt/Fokus (2px `color-primary`) · Wird gezogen (`shadow-md`, −1,5° gedreht) · Fehler (Rand `color-danger` + Banner mit Grund und Aktion) · Deaktiviert (55 % Deckkraft, keine Rechte) · Laden (Skelett).

**Der Entwickler liefert:** `channel`, `status`, `title`, `excerpt`, `scheduledAt`, `campaignName?`, `thumbnailUrl?`, `commentCount`, `assignee{initials, isExternal}`, `error?{message, actionLabel}`.

Ganze Karte ist klickbar (öffnet den Editor); innere Buttons stoppen den Klick.

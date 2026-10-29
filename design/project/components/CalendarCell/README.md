# CalendarCell

Ein Tag im Monatsraster des Redaktionskalenders; enthält bis zu drei `CalendarEntry`, darüber „+N weitere“.

**Maße:** min. 120px hoch (Desktop), Innenabstand 6px, Trennlinien `color-border`. Datum oben links 24px-Kreis.

**Zustände:** Standard · Hover (`color-surface-hover`, „+“-Button oben rechts erscheint → neuer Beitrag an diesem Tag) · Heute (Datum in `color-primary`-Kreis) · Ausgewählt/Fokus (`color-primary-soft` + 2px Innenrahmen) · Ablegen (beim Ziehen eines Eintrags: getönt + „Hier ablegen“) · Viele Einträge (ab dem 4. → Link „+N weitere“ öffnet Tagesliste im Popover) · Außerhalb des Monats (`color-surface-sunken`, Datum gedämpft) · Vergangen (Einträge 80 % Deckkraft) · Laden (Skelett) · Leer (nur Datum – kein Text nötig).

**Der Entwickler liefert:** `date`, `entries[]`, `isToday`, `isOutsideMonth`, `isSelected`, `maxVisible` (Standard 3), `onAdd(date)`, `onDrop(entry, date)`.

Mobil wird der Monat zur Punktansicht (ein farbiger Punkt pro Kanal unter dem Datum) mit Tagesliste darunter – siehe `ScreenDashboardMobile`.

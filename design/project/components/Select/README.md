# Select

Auswahlfeld mit Dropdown-Liste; optisch identisch mit `TextField`, rechts ein Chevron.

**Zustände:** Standard · Hover · Fokus/geöffnet (Liste `tw-menu` mit `shadow-md`, Hover-Zeile `color-surface-hover`, ausgewählte Zeile `color-primary-soft` + Häkchen) · Fehler · Deaktiviert · Laden (Optionen werden geholt) · Leer (Text „Noch keine …“ + Aktion zum Anlegen).

**Varianten:** einfach; `multiple` mit Checkboxen (Feld zeigt Monogramme + „2 gewählt“); Optionen dürfen ein Icon oder Kanal-Monogramm tragen. Ab 8 Optionen erscheint oben ein Suchfeld.

**Der Entwickler liefert:** `label`, `options[{value,label,icon?}]`, `value`, `multiple`, `placeholder`, `error`, `loading`, `emptyText`, `emptyAction`.

Tastatur: Pfeiltasten bewegen, Enter wählt, Esc schließt, Tippen springt zum Anfangsbuchstaben. Mobil öffnet die Liste als `Modal`-Bottom-Sheet.

# CalendarEntry

Ein Beitrag im Kalender: Kanal-Monogramm · Titel (eine Zeile, gekürzt) · Uhrzeit · Statuspunkt.

**Kodierung:** Kanal = Monogramm links (Farbe + Buchstaben); Status = Punkt rechts in Statusfarbe, vollständiges Label im Tooltip und für Screenreader (`aria-label`). „Zur Freigabe“ zusätzlich gestrichelter Rand – fällt im Kalender sofort auf.

**Varianten:** `inline` (Monat, 26px hoch) · `block` (Woche, Höhe entspricht Dauer, mind. 44px, Titel darf umbrechen).

**Zustände:** Standard · Hover (`shadow-sm`, Vorschau-Popover nach 400 ms) · Fokus · Veröffentlicht (Fläche `color-surface-sunken`, nicht mehr ziehbar) · Wird gezogen · Fehler (`color-danger-soft`, Uhrzeit ersetzt durch „Fehlgeschlagen“) · Ohne Uhrzeit (Offline-Maßnahmen) · Laden.

**Der Entwickler liefert:** `channel`, `status`, `title`, `time?`, `durationMinutes?`, `draggable` (false ab „Veröffentlicht“), `error?`.

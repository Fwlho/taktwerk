# Modal

Dialog für kurze, abgeschlossene Aufgaben (einplanen, bestätigen, schnell anlegen). Mobil als Bottom-Sheet.

**Aufbau:** Scrim `color-scrim` · Fläche `color-surface`, `radius-xl`, `shadow-lg`, Breite 480px (klein 420px, groß 640px) · Kopf: Icon-Kreis 40px, Titel `text-h2`, Untertitel, Schließen-X · Inhalt `space-6` Innenabstand · Fuß rechtsbündig: Abbrechen (sekundär) + Hauptaktion.

**Varianten:** `default` · `danger` (`alertdialog`, Icon in `color-danger-soft`, Hauptaktion `danger`, Text nennt genau, was verloren geht; kein X, Esc = Abbrechen) · `sheet` (mobil, von unten, Griff oben, nur obere Ecken gerundet, nach unten wischen schließt).

**Zustände:** Öffnen (Scrim blendet ein, Fläche skaliert 0.96 → 1 bzw. Sheet fährt hoch, `duration-slow`, `ease-standard`) · Laden (Inhalt Skelett, Hauptaktion Spinner, Abbrechen deaktiviert) · Fehler (Banner `error` oben im Inhalt; Formularfehler an den Feldern).

Fokus springt beim Öffnen auf das erste Feld (bei Bestätigungen auf „Behalten“), bleibt im Dialog gefangen und kehrt beim Schließen zum Auslöser zurück.

**Der Entwickler liefert:** `title`, `subtitle?`, `icon?`, `variant`, `size`, `primaryAction{label,onClick,loading}`, `secondaryAction`, `children`.

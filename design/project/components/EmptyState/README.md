# EmptyState

Was erscheint, wenn eine Ansicht keine Daten hat – ein freundlicher Satz und ein nächster Schritt, nie eine leere Fläche.

**Arten:**
- `first-use` – noch nie etwas angelegt: geometrische Illustration aus drei Flächen (`color-primary-soft`, `color-accent`, `color-primary`), Titel `text-h2`, ein bis zwei Sätze, Primäraktion + KI-Aktion.
- `done` – Arbeit erledigt (Freigaben, Aufgaben): Häkchen-Kreis in `color-success-soft`, keine Aktion.
- `no-results` – Filter/Suche ohne Treffer: kompakt, Icon `search-x`, nennt den Filter, „Filter zurücksetzen“.
- `error` – Laden fehlgeschlagen: Icon `cloud-off` in `color-danger`, beruhigender Satz, „Erneut laden“.

Texte duzen, sind kurz und nennen den Nutzen. Max. Breite 440px, zentriert, Abstand oben `space-12`.

**Der Entwickler liefert:** `kind`, `title`, `text`, `primaryAction?`, `aiAction?`, `secondaryAction?`.

# KanbanColumn

Eine Spalte der Content-Pipeline je Beitragsstatus; enthält `PostCard`s in Reihenfolge des geplanten Datums.

**Aufbau:** Kopf mit `StatusBadge` (statt Text-Titel – Spalte und Karte sprechen dieselbe Sprache), Anzahl, Menü · Karten mit `space-3` Abstand · „Beitrag hinzufügen“ (nur in Idee und Entwurf). Breite 272px, Fläche `color-surface-sunken`, `radius-lg`.

**Zustände:** Standard · Ablegen (beim Ziehen: getönt + 2px Rahmen, Platzhalter in Kartenhöhe an der Einfügestelle) · Leer (ein Satz, was hier landet) · Warnung (zu viele Karten, Schwelle einstellbar; Zähler in `color-warning` + Hinweis) · Laden (Skelettkarten) · Fehler (Banner oben, Karten bleiben sichtbar).

**Regeln fürs Verschieben:** Nur Inhaber/Admin darf in „Freigegeben“ ziehen; für andere Rollen ist die Spalte beim Ziehen gesperrt (Cursor `not-allowed`, Hinweis-Toast „Nur Inhaber können freigeben“). Ziehen nach „Zur Freigabe“ öffnet optional ein Kommentarfeld.

**Der Entwickler liefert:** `status`, `posts[]`, `canAdd`, `canDropFrom(role)`, `limit?`, `state`.

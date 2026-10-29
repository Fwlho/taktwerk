# CampaignCard

Übersichtskarte einer Kampagne mit Ziel, Zeitraum, Kanälen und Budgetfortschritt.

**Aufbau:** Name (`text-h3`) + Ziel mit Icon (`target`, `users`, `handshake`, `megaphone`) · rechts Kampagnenstatus · Meta: Zeitraum, Anzahl Beiträge · Budgetbalken (8px, `color-primary`; ab 85 % `color-warning` + Text bleibt lesbar in `color-text`) · Fuß: gestapelte Kanal-Monogramme + Zielerreichung in Worten.

**Kampagnenstatus** (eigene Skala, nicht die Beitragsstatus): Entwurf (`draft`-Farben) · Läuft (`scheduled`-Farben, Icon `play`) · Pausiert (`idea`-Farben, Icon `pause`) · Abgeschlossen (`analyzed`-Farben).

**Zustände:** Standard · Hover · Ausgewählt/Fokus (2px `color-primary`) · Warnung (Budget ≥ 85 %) · Laden (Skelett). Leere Liste → `EmptyState` „Noch keine Kampagne“.

**Der Entwickler liefert:** `name`, `goal{type,label}`, `status`, `startDate`, `endDate?`, `channels[]`, `postCount`, `budgetSpent`, `budgetTotal`, `goalsReached`, `goalsTotal`. Beträge immer deutsch formatiert („1.240 €“).

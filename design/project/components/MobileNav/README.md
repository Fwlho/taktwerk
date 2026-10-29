# MobileNav

Untere Navigationsleiste unter `bp-tablet`; 64px + Safe-Area, fünf Ziele, Mitte = Schnellaktion.

**Ziele:** Start `house` · Kalender `calendar-days` · **Neu** `plus` (gefüllt `color-primary`, öffnet Bottom-Sheet: Beitrag / Idee / Kampagne) · Freigaben `circle-check-big` (Zähler-Punkt in `color-status-review`) · Mehr `menu` (Kampagnen, Beiträge, Auswertung, Kanäle, Einstellungen).

**Zustände:** inaktiv (`color-text-muted`) · aktiv (Pille `color-primary-soft`, Icon + Label `color-primary`) · Fokus (Ring um die Pille) · gedrückt (Pille kurz sichtbar, `duration-fast`).

Labels immer sichtbar (11px/600). Unterseiten nutzen die **obere Leiste** (56px): Zurück, Titel, Mehr-Menü. Die untere Leiste blendet in der Freigabe-Ansicht aus, damit die Freigabe-Buttons unten Platz haben.

**Der Entwickler liefert:** `activeRoute`, `pendingApprovals`, `onCreate`.

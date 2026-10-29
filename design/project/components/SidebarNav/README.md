# SidebarNav

Hauptnavigation ab Tablet. Desktop (≥ `bp-desktop`): 248px mit Labels; Tablet (`bp-tablet` bis `bp-desktop`): eingeklappt auf 72px, nur Icons mit Tooltip.

**Einträge (fest, diese Reihenfolge):** Dashboard `layout-dashboard` · Kalender `calendar-days` · Kampagnen `flag` · Beiträge `columns-3` (Kanban) · Freigaben `circle-check-big` (mit Zähler offener Freigaben in Amber) · Auswertung `chart-line` · Abschnitt „Unternehmen“: Kanäle `plug` · Einstellungen `settings`. Fuß: Avatar, Name, Betrieb, Rolle → Kontomenü.

**Zustände pro Eintrag:** Standard (`color-text-muted`) · Hover (`color-surface-hover`, Text `color-text`) · Fokus · Aktiv (`color-primary-soft`, Text/Icon `color-primary`, `aria-current="page"`).

Rollen: Betrachter sehen „Freigaben“ nicht; Externe sehen nur Kalender, Beiträge und Kampagnen, denen sie zugeordnet sind.

**Der Entwickler liefert:** `activeRoute`, `pendingApprovals`, `user{name, company, role}`, `collapsed`.

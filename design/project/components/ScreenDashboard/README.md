# ScreenDashboard

Startseite: „Was ist heute dran?“ in einer Bildschirmhöhe, ohne Scrollen auf 1440×900.

**Reihenfolge (Priorität):** 1. Begrüßung (`text-display`) + ein Satz zur Woche · 2. Handlungs-Banner (nur wenn Freigaben offen; Amber, Primär-Button „Jetzt freigeben“) · 3. vier `KpiTile` (Reichweite, Anfragen, veröffentlichte Beiträge, Kosten pro Anfrage) · 4. links „Diese Woche“ als 7-Tage-Streifen mit `CalendarEntry` + laufende Kampagnen mit Fortschritt · rechts `AiSuggestion` (Ideen) und letzte Aktivität.

**Raster:** 12 Spalten, Rinne 16px; Inhalt max. `size-content-max`. KPI-Reihe 4×3 Spalten, darunter 8 + 4.

**Leer (neues Konto):** KPIs zeigen „–“ mit Erklärung; „Diese Woche“ → `EmptyState first-use`; statt Kampagnen eine Checkliste (Profil ✓, Kanäle 2/5, erste Kampagne).

**Laden:** Skelette in exakt der Endgröße (keine Sprünge); Banner erscheint erst, wenn die Freigaben geladen sind.

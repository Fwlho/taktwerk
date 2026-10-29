# ScreenCampaignDetail

Detailseite einer Kampagne: Ziel, Zeitraum, Kanäle, Budget und alle zugehörigen Beiträge.

**Aufbau:** Brotkrume zurück · Titel + Bearbeiten + „Beitrag hinzufügen“ · Metazeile (Kampagnenstatus, Ziel in Klartext, Zeitraum mit Restlaufzeit, Kanal-Monogramme) · vier `KpiTile` (Zielwert „18 / 30“, Reichweite, Budget, Kosten pro Anfrage) · links Beitragstabelle (Liste/Kanban umschaltbar; Spalten Kanal, Beitrag + Termin, `StatusBadge`, Reichweite, Anfragen) · rechts gestapeltes Balkendiagramm Reichweite je Kanal und Woche (Kanalfarben, Legende mit Monogrammen) + `AiSuggestion` mit Optimierungstipp.

**Diagramm:** Balken in `color-ch-*`, 4px Radius oben, Achsenbeschriftung `text-caption` `color-text-muted`, Tooltip bei Hover mit exakten Werten. Keine Werte vor Start → Diagrammfläche mit Satz „Zahlen erscheinen nach dem ersten veröffentlichten Beitrag.“

**Bearbeiten** öffnet ein `Modal` (Name, Ziel, Zeitraum, Budget, Kanäle).

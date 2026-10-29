# StatusBadge

Zeigt den Status eines Beitrags – immer **Icon + Wort + Farbe**, damit er auch ohne Farbsehen eindeutig ist.

| Status | Wert | Icon (Lucide) | Tokens |
|---|---|---|---|
| Idee | `idea` | `lightbulb` | `color-status-idea` auf `color-status-idea-soft` |
| Entwurf | `draft` | `pencil-line` | `color-status-draft` / `-soft` |
| Zur Freigabe | `review` | `hourglass` | `color-status-review` / `-soft` – der einzige „Handlung nötig“-Status, Amber |
| Freigegeben | `approved` | `circle-check` | `color-status-approved` / `-soft` |
| Geplant | `scheduled` | `calendar-clock` | `color-status-scheduled` / `-soft` |
| Veröffentlicht | `published` | `send` | Vollton: `color-status-published` auf `color-status-published-soft` |
| Ausgewertet | `analyzed` | `chart-column` | `color-status-analyzed` / `-soft` |

**Varianten:** `pill` (Standard, 24px, `radius-full`, `text-caption`), `dot` (ohne Fläche, für Tabellen), `steps` (7-teilige Fortschrittsleiste im Editor). Laden: Skelett in Badge-Breite.

**Der Entwickler liefert:** `status` (einer der sieben Werte), `variant`. Labels sind fest und werden nie umformuliert. Ein Statuswechsel animiert die Fläche per Farb-Überblendung (`duration-base`).

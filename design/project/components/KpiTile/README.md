# KpiTile

Eine Kennzahl mit Bezeichnung, Wert, Veränderung und optionalem Verlauf.

**Aufbau:** Label mit Icon (`text-body`/14, `color-text-muted`) · Wert (`text-kpi`, tabellarische Ziffern) · Veränderung mit Pfeil-Icon (`trending-up`/`trending-down`/`minus`) + „ggü. Vormonat“ · optional Sparkline 32px in `color-primary`.

**Bewertung statt Richtung:** Grün (`color-success`) heißt *gut*, Rot (`color-danger`) heißt *schlecht* – bei „Kosten pro Anfrage“ ist ein Rückgang also grün. Immer zusätzlich Pfeil + Vorzeichen.

**Zustände:** Standard · Hover (wenn klickbar, führt zur Auswertung) · Leer („–“ + Erklärung, wann Daten kommen) · Fehler (Grund + „Erneut laden“) · Laden (Skelett).

**Der Entwickler liefert:** `label`, `icon`, `value` (formatiert), `delta`, `deltaSentiment` (`positive|negative|neutral`), `trend?[number]`, `href?`, `state`.

Zahlen: deutsch formatiert (12.480; 38 €; +18 %), Minuszeichen „−“ (U+2212).

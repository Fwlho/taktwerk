# ScreenReport

Auswertung als Monatsbericht – lesbar für Menschen ohne Marketingwissen: erst die Aussage, dann die Zahlen.

**Aufbau:** Titel mit Monatswahl, PDF-Export, Teilen (Link für Steuerberater/Partner) · **KI-Zusammenfassung** in drei Sätzen (`AiSuggestion`-Stil, quer) mit Folgeaktion · vier `KpiTile` (Reichweite, Interaktionen, Anfragen, Ausgaben – Ausgaben-Anstieg ist „schlecht“ = rot) · Liniendiagramm Reichweite je Kanal (Kanalfarben, Endpunkt markiert, Legende mit Monogrammen) · Anfragen nach Kanal als horizontale Balken · Tabelle beste Beiträge.

**Diagramm-Regeln:** Linien 2.5px in `color-ch-*`; Gitter `color-border`; Achsen `text-caption` `color-text-muted`; Tooltip mit allen Kanälen der Woche; Legende ist zugleich Filter (Klick blendet Kanal aus). Immer auch als Tabelle abrufbar („Daten anzeigen“) für Screenreader.

**Leer:** erster Monat ohne Vergleich → Veränderungen entfallen, Hinweis „Vergleich ab nächstem Monat“. **Laden:** Bericht wird erstellt → Skelette + Info-Toast mit Dauer.

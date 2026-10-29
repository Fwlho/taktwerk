# ScreenPipeline

Content-Pipeline als Kanban-Board aus `KanbanColumn` – eine Spalte pro Beitragsstatus (Idee → Entwurf → Zur Freigabe → Freigegeben → Geplant → Veröffentlicht → Ausgewertet). Auf 1440px passen sechs Spalten à 236px; „Ausgewertet“ liegt rechts im horizontalen Scrollbereich.

**In der Spalte** zeigen die `PostCard`s kein eigenes Status-Badge (die Spalte sagt es); in Listen und Kampagnen schon.

**Filterleiste:** Suche · Kampagne · Person · Kanal-Chips (Mehrfachfilter). Filter bleiben pro Nutzer gespeichert.

**Ziehen:** Karte anheben (`is-dragging`), Ziel-Spalte `is-drop` mit Platzhalter. Erlaubte Übergänge: vorwärts in den nächsten Status oder zurück; „Freigegeben“ nur Inhaber/Admin; „Geplant“ verlangt Termin (sonst öffnet `Modal` „Beitrag einplanen“); „Veröffentlicht“ und „Ausgewertet“ setzt nur das System. Nach dem Ablegen Toast mit „Rückgängig“.

**Mobil:** Spalten werden zu einer horizontal wischbaren Liste mit Status-Tabs oben; Verschieben über Menü „Status ändern“.

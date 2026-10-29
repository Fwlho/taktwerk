# ScreenPostEditor

Beitrags-Editor: links der Inhalt, rechts ein 400px-Panel mit **Assistent** und **Vorschau** (Tabs). Ab Tablet nebeneinander, mobil als Tabs „Text · Assistent · Vorschau“.

**Kopfzeile:** Zurück · Brotkrume Kampagne / Titel · `StatusBadge` · Speicherstatus („Gespeichert“, „Speichert …“, „Offline – lokal gespeichert“) · 7-Schritt-Fortschritt · `Button` „Einplanen“ (öffnet `Modal`) · `Button primary` – Beschriftung folgt dem Status: „Zur Freigabe senden“ (Ersteller) bzw. „Freigeben & einplanen“ (Inhaber).

**Inhalt:** Kampagne (`Select`), Kanäle (`Select multiple`), Termin · interner Titel · Text je Kanal: Tabs mit Monogramm (✓ = vom Nutzer bestätigte Fassung), mehrzeiliges `TextField` mit kanalbezogenem Zeichenzähler und Hinweis · Medien (Upload-Kachel gestrichelt) · Kommentare (`ApprovalItem`).

**Assistent-Panel:** Schnellbefehle (`tw-ai-prompt`: Kürzer, Lockerer, Mit Frage enden, Hashtags) · `AiSuggestion` mit Kanal-Anpassung · Kanal-Vorschau des aktiven Tabs als neutrale, vereinfachte Post-Darstellung (kein Nachbau der Plattform-Oberfläche; zeigt Bildzuschnitt, Kürzung „… mehr“, Hashtags).

**Verhalten:** Autospeichern 1 s nach der letzten Eingabe. Übernommene KI-Passagen 2 s in `color-ai-soft` hinterlegt. Ein Kanal ohne Verbindung erscheint als Tab mit `ChannelChip is-off` und Hinweis „Verbinden, um zu planen“.

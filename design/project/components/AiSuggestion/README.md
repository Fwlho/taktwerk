# AiSuggestion

Box, in der der KI-Assistent einen Vorschlag macht – Text, Ideen oder Kanal-Anpassung. Immer apricot (`color-ai`), damit KI-Inhalte von eigenen Inhalten unterscheidbar sind.

**Aufbau:** Kopf mit `sparkles`-Icon, Art des Vorschlags, Herkunft rechts („aus deinem Entwurf“) · Inhalt (Text oder Ideen-Chips `tw-ai-prompt`) · Aktionen: **Übernehmen** (`ai`-Button), Neu, Kürzer/Länger/Lockerer, Verwerfen (`ghost`) · Hinweiszeile „KI-Vorschläge vor dem Veröffentlichen bitte prüfen.“

**Zustände:** Standard · Laden (Kopf „Schreibe Vorschlag …“, Text erscheint wortweise; Stopp-Button) · Fehler (roter Rand, eigener Text bleibt unangetastet, „Nochmal versuchen“) · Übernommen (gestrichelt, 8 s lang „Rückgängig“, dann eingeklappt) · Leer (Startaufforderung mit Eingabe) · Deaktiviert (Kanal nicht verbunden).

**Regeln:** Die KI ersetzt nie ohne Klick auf „Übernehmen“ den Text. Übernommene Passagen werden im Editor 2 s lang in `color-ai-soft` hinterlegt. Emojis und Hashtags nur, wenn der Kanal sie üblicherweise nutzt (Instagram, TikTok).

**Der Entwickler liefert:** `kind` (`text|ideas|adapt`), `channel?`, `content`, `source`, `state`, `onApply`, `onRegenerate(tone?)`, `onDiscard`, `onStop`.

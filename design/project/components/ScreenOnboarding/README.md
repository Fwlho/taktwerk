# ScreenOnboarding

Geführter Einstieg in drei Schritten (Betrieb → Kanäle → erstes Ziel). Desktop zweigeteilt: links 400px Fortschritt und Vertrauenshinweis, rechts das Formular mit großzügigem Weißraum (`space-12` Rand). Mobil: Fortschritt als `steps`-Leiste oben, Formular einspaltig, Buttons `lg` unten fixiert.

**Komponenten:** `TextField`, `Select`, Auswahl-Chips (Zielgruppen, Mehrfachauswahl), Segment-Tabs (Ansprache), `Button lg`, `ChannelChip`-Monogramme `lg`, Verbindungskarten (`tw-card` mit Status), `Toast`.

**Schritt 1:** Name, Branche, Ort/Radius, Webseite (optional; wird ausgelesen → Feld zeigt Laden), Zielgruppen, Ansprache (Du/Sie). Nur Name und Branche sind Pflicht.

**Schritt 2:** Eine Karte je Kanal: nicht verbunden (Verbinden) → Laden (Plattform-Anmeldung im Pop-up) → Verbunden (ausgewählt, grüner Status, Konto-Name) oder Fehler (roter Rand, Grund, Erneut versuchen). Offline per Schalter.

**Schritt 3:** Erstes Ziel wählen (Mehr Anfragen · Neue Mitarbeitende · Bekanntheit · Veranstaltung) → der Assistent legt eine erste Kampagne mit 4 Beitragsideen an und öffnet das Dashboard mit Erfolgs-Toast.

„Später ausfüllen“ ist immer möglich; das Dashboard zeigt dann eine Checkliste.

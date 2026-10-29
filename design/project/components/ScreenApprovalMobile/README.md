# ScreenApprovalMobile

Schwerpunkt-Ansicht für den Inhaber: Freigeben auf dem Smartphone, im Idealfall direkt aus der Push-Benachrichtigung („Lena bittet um Freigabe: Vorher/Nachher – heute 9:00“) mit **einem Tipp**.

**1 · Liste:** offene Freigaben nach Veröffentlichungszeit, die dringendste mit Amber-Rahmen; jede Karte: Kanal, Termin, Titel, wer angefragt hat. „Alle ansehen & freigeben“ startet den Durchlauf.

**2 · Prüfen:** obere Leiste „1 von 3“ mit Vor/Zurück (auch Wischen) · Kanal + Status · Termin · Vorschau so, wie der Beitrag erscheint · letzter Kommentar · **fixierte Aktionsleiste** im Daumenbereich: optionaler Kommentar (mit Diktat-Mikrofon) und zwei `Button lg` (56px) – „Ändern“ links, „Freigeben“ rechts (primär). Die `MobileNav` ist hier ausgeblendet.

**3 · Ändern:** Bottom-Sheet mit Schnellgründen (Chips) und Pflicht-Kommentar; Button nennt den Empfänger („Zurück an Lena senden“).

**4 · Erledigt:** Erfolgs-`Toast` mit „Rückgängig“ (8 s), automatisch weiter zum nächsten Beitrag; nach dem letzten `EmptyState done`.

**Verhalten:** Freigeben wirkt sofort (optimistisch); offline wird die Entscheidung gepuffert und mit Banner angezeigt. Haptisches Feedback beim Tipp. Kein Doppel-Tipp-Bestätigungsdialog – stattdessen Rückgängig.

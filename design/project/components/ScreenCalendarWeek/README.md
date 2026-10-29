# ScreenCalendarWeek

Wochenansicht des Redaktionskalenders: Zeitraster 7–20 Uhr (52px pro Stunde), eine Spalte je Tag, heutige Spalte in `color-primary-soft`, rote Jetzt-Linie (`color-danger`, 2px).

**Zeilen:** Kopf mit Tagen · „Ganztägig“ für Offline-Maßnahmen ohne Uhrzeit (Flyer, Messe) · Zeitraster mit `CalendarEntry` Variante `block` an der Startzeit (Höhe mind. 44px).

**Interaktion:** Block ziehen = Uhrzeit/Tag ändern (Raster 15 Min.) · in freie Fläche klicken = neuer Beitrag zu dieser Zeit · Hinweis-Banner zeigt die beste Veröffentlichungszeit pro Kanal (aus den Auswertungen; nur wenn genug Daten).

Filter und Legende identisch mit der Monatsansicht; der gewählte Filter bleibt beim Umschalten erhalten.

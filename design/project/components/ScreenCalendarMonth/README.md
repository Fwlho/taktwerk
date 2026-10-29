# ScreenCalendarMonth

Redaktionskalender, Monatsansicht. Kopf: Titel, Ansicht-Tabs (Monat/Woche/Liste), Monatsnavigation · Filterleiste aus `ChannelChip` (ausgewählt = sichtbar; hier YouTube ausgeblendet) · Status-Legende rechts · Raster aus `CalendarCell` mit `CalendarEntry`.

**Lesen auf einen Blick:** Kanal = Monogramm links, Status = Punkt rechts, „Zur Freigabe“ gestrichelt, veröffentlicht = vertiefte Fläche, Fehler = rot hinterlegt. Heute = Petrol-Kreis.

**Interaktion:** Eintrag klicken → Editor im Seitenpanel (Kalender bleibt sichtbar) · Eintrag ziehen → anderer Tag (Uhrzeit bleibt), Ziel-Zelle zeigt „Hier ablegen“, danach Toast mit „Rückgängig“ · Hover auf Zelle → „+“ legt Beitrag an diesem Tag an · „+N weitere“ öffnet Tagesliste im Popover. Veröffentlichte Einträge sind nicht ziehbar.

**Leer:** Monat ohne Einträge zeigt das Raster plus mittig einen `EmptyState first-use` als Overlay-Karte. **Laden:** Raster sofort, Einträge als Skelette.

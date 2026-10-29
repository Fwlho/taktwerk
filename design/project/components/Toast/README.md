# Toast

Kurze Rückmeldung nach einer Aktion, unten rechts (Desktop, 24px Abstand) bzw. oben unter der Statusleiste (mobil, volle Breite minus `space-4`). Dazu `Banner` für dauerhafte Hinweise im Seiteninhalt.

**Arten:** `success` (`circle-check`) · `info` (`info`) · `warning` (`triangle-alert`) · `error` (`circle-alert`, Rand `color-danger`) · `ai` (`sparkles`). Icon-Farbe = Art, Text immer `color-text` / `color-text-muted` – nie farbiger Fließtext.

**Verhalten:** Erfolg/Info/KI verschwinden nach 6 s (Fortschrittslinie zeigt Restzeit, pausiert bei Hover/Fokus); Fehler bleiben, bis sie geschlossen oder behoben werden. Max. 3 gestapelt, neuester oben. Einfliegen von unten 8px + Einblenden (`duration-slow`), Ausblenden `ease-exit`. `role="status"` (Fehler: `role="alert"`).

Eine Aktion pro Toast (Rückgängig, Ansehen, Neu verbinden). Rückgängig ist bei Freigeben, Verschieben und Löschen von Beiträgen Pflicht.

**Der Entwickler liefert:** `kind`, `title`, `text?`, `action?{label,onClick}`, `duration` (ms oder `persistent`).

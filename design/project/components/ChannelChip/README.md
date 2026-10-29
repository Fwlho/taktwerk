# ChannelChip

Kennzeichnet einen Kanal: Monogramm-Kachel in Kanalfarbe + Name auf getönter Fläche.

**Eigener Icon-Stil:** Online-Kanäle als Zwei-Buchstaben-Monogramm in `font-display` Bold (IG, YT, in, TT, FB), Offline als Piktogramm (`printer`; Unterarten `file-text` Flyer, `image` Plakat, `truck` Fahrzeug, `tent` Messe, `newspaper` Anzeige). Zusätzlich unterscheidet die Kachelform: Instagram abgerundetes Quadrat (30 %), Facebook Kreis, alle anderen `radius-sm`. So sind Kanäle auch ohne Farbe unterscheidbar. Es werden bewusst **keine Plattform-Logos** nachgebildet; wo die Plattformen es nach ihren Markenrichtlinien erlauben (z. B. „Verbinden mit …“-Buttons im Onboarding), kann das offizielle Logo die Kachel ersetzen.

| Kanal | Wert | Farbe | Fläche |
|---|---|---|---|
| Instagram | `instagram` | `color-ch-instagram` | `color-ch-instagram-soft` |
| YouTube | `youtube` | `color-ch-youtube` | `color-ch-youtube-soft` |
| LinkedIn | `linkedin` | `color-ch-linkedin` | `color-ch-linkedin-soft` |
| TikTok | `tiktok` | `color-ch-tiktok` | `color-ch-tiktok-soft` |
| Facebook | `facebook` | `color-ch-facebook` | `color-ch-facebook-soft` |
| Offline | `offline` | `color-ch-offline` | `color-ch-offline-soft` |

Buchstaben auf der Kachel: `color-on-channel`. Monogramm-Größen: `sm` 18px (Kalender), `md` 24px (Chips), `lg` 40px (Onboarding, Vorschau).

**Zustände:** Standard · Hover (Rand in Kanalfarbe) · Fokus · Ausgewählt (2px Rand + Häkchen, Filter) · Nicht verbunden (gestrichelt, grau) · Deaktiviert · Fehler (Verbindung abgelaufen, `color-danger` + Icon) · Laden (Skelett). Varianten: `default` 32px, `compact` 24px.

**Der Entwickler liefert:** `channel`, `subtype` (nur offline), `label` (Standard = Kanalname), `state`, `size`, `onClick` (wenn als Filter benutzt).

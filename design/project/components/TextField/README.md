# TextField

Einzeiliges oder mehrzeiliges Eingabefeld mit Label, optionalem Hilfetext und Fehlermeldung.

**Aufbau:** Label (`text-label`, immer sichtbar, nie nur Platzhalter) · Feld 44px hoch, `radius-md`, Rahmen `color-border-strong` · Hilfetext oder Fehler darunter (`text-small`).

**Zustände:** Standard · Hover (Rahmen `color-text`) · Fokus (Rahmen + Ring `color-focus`) · Fehler (2px `color-danger`, Icon `circle-alert` + Text – nie nur Farbe; `aria-invalid`, Meldung per `aria-describedby`) · Deaktiviert · Laden (Spinner rechts, z. B. während die Webseite gelesen wird) · Leer (Platzhalter in `color-text-muted`, nur als Beispiel, nie als Ersatz für das Label).

**Mehrzeilig** (`multiline`): min. 112px, wächst mit dem Inhalt bis 320px. Optionaler Zeichenzähler rechts unten pro Kanal (Instagram 2.200, LinkedIn 3.000, TikTok 2.200, Facebook 63.206, YouTube-Beschreibung 5.000); ab 90 % in `color-warning`, darüber `color-danger`.

**Der Entwickler liefert:** `label`, `value`, `placeholder`, `hint`, `error`, `optional`, `disabled`, `loading`, `multiline`, `maxLength`, `leadingIcon`.

Fehlertexte sagen, was zu tun ist („Bitte vollständige E-Mail eingeben“), nie „Ungültige Eingabe“.

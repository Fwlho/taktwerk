# ApprovalItem

Kommentar- und Freigabe-Element: Verlauf aus Kommentaren und Entscheidungen plus Freigabe-Block für den Inhaber.

**Teile:** `Comment` (Avatar 36px, Name, Rolle, Zeit, Text; optional zitierte Textstelle in `color-warning-soft`) · `Decision` (Verlaufszeile „Freigegeben von …“ grün mit `circle-check` bzw. „Änderung gewünscht“ amber mit `rotate-ccw`) · `ApprovalBlock` (nur für Inhaber/Admin sichtbar, solange Status = Zur Freigabe: optionales Kommentarfeld + zwei gleich große Buttons, „Freigeben“ primär rechts) · `Composer` (Eingabe + Senden).

**Rollen:** Externe erscheinen mit Avatar in `color-ch-offline-soft` und dem Zusatz „Extern“. Betrachter sehen den Verlauf, aber keinen Composer.

**Zustände:** wartend (2px Rahmen `color-status-review`) · Laden (Button-Spinner, anderer Button deaktiviert) · Fehler/offline (Banner, Aktion wird gepuffert) · erledigt (Block wird durch `Decision`-Zeile ersetzt, Übergang `duration-base`).

„Ändern“ verlangt einen Kommentar (Feld wird Pflicht und erhält Fokus); „Freigeben“ nicht.

**Der Entwickler liefert:** `comments[]`, `decisions[]`, `canApprove`, `onApprove(comment?)`, `onRequestChanges(comment)`, `state`.

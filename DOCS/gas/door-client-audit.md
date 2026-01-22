# Door Client Auffaelligkeiten (Audit)

Scope
- Fokus: `gas/Door_Client.html` nach der Door-Modularisierung.

Auffaelligkeiten
- Doppelte `escapeHtml`-Definition in `gas/Door_Client.html` (Shadowing-Risiko, inkonsistentes Escaping).
- Veralteter Door-War-Flow `selectDoor()` erwartete `#doorwarinput`, aber kein Element im Panel.
- Orphaned UI-Flow: `renderDoorWarHotPanel()` und `insertSelectedHotIdeasToDoorWar()` erwarteten `#doorwar-hot-cache` und Checkbox-UI, das nicht mehr existiert.

Bereinigung
- Entfernt: `selectDoor()`, `renderDoorWarHotPanel()`, `insertSelectedHotIdeasToDoorWar()`, sowie die duplizierte `escapeHtml`.

Hinweis
- Falls der alte Door-War-Textarea-Flow oder das Hot-Candidate-Panel reaktiviert wird, muessen die Helferfunktionen gezielt wieder eingebracht werden.

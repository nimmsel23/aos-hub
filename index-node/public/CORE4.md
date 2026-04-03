⚠️ CORE4 STORAGE REALITY CHECK

Dieses System ist NICHT local-first.

AKTUELLER DATENFLUSS:
Telegram / WebApp / GAS
→ schreibt DIREKT nach Google Drive (.core4/events)
→ lokale Systeme (CLI, Node) PULLEN von Drive (Bridge)

👉 Google Drive ist die SOURCE OF TRUTH
👉 Lokale `.core4` ist NUR eine synchronisierte Kopie (Mirror)

---

WICHTIGES MISSVERSTÄNDNIS:
Es wirkt wie ein offline/local System mit Cloud-Sync — ist es aber nicht.

NICHT:
Local → push → Drive

SONDERN:
Drive → pull → Local

---

KONSEQUENZEN:

* Drive ist die primäre Datenbank
* Jede Log-Aktion erzeugt Drive I/O
* Skalierung = abhängig von Drive API Limits
* Konfliktlösung passiert nachgelagert (dedup), nicht beim Schreiben
* Offline-Logging ist NICHT garantiert möglich

---

WENN DU LOCAL-FIRST WILLST:
Dann muss die Architektur geändert werden:

Local `.core4/events` = Source of Truth
→ Push nach Drive (Sync Layer)
→ GAS liest NUR noch aus Drive (read-only / mirror)

---

ENTSCHEIDUNG:
Behandle dieses System bewusst als eines von:

[ ] Cloud-first (aktueller Zustand, simpler, aber Drive-abhängig)
[ ] Local-first (robuster, komplexer, braucht Sync-Design)
[ ] Hybrid (bidirektional, anspruchsvoll, aber mächtig)

---

REGEL:
Wenn du nicht aktiv umbaust, gilt immer:

👉 "Drive ist die Datenbank."
👉 "Local ist Cache."

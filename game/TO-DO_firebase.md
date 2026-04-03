Hier ist eine **klare, vollständige Checkliste**, was du aktuell noch brauchst, damit deine **PWA + GAS Bridge** wirklich funktioniert – speziell für **Firebase Spark Plan Hosting**.

### 1. Was du für die PWA selbst brauchst (Frontend)

Deine PWA muss folgendes haben (aktuell fehlt das wahrscheinlich noch teilweise):

- **Manifest.json** (im Root-Ordner)
  ```json
  {
    "name": "αOS Frame Map",
    "short_name": "FrameMap",
    "start_url": "/?clientId=DEINE_CLIENT_ID",
    "display": "standalone",
    "background_color": "#0a0a0a",
    "theme_color": "#00ff41",
    "icons": [
      { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```

- **Service Worker** (`sw.js`) für Offline-Fähigkeit + Redirect zu GAS wenn Node offline ist
  - Minimal: Cache deine HTML/CSS/JS
  - Wichtig: Wenn Node offline ist → direkt die GAS WebApp-URL aufrufen (mit `?clientId=...`)

- **HTTPS** → Firebase Hosting gibt dir das automatisch (Spark Plan reicht dafür völlig)

- **Installierbarkeit** (Add to Home Screen Prompt)

**Empfehlung:** Baue die PWA zuerst als **statische App** (HTML + JS + CSS), die nur die GAS WebApp-URL aufruft (`https://deine-gas-url/exec?clientId=xxx`). Das ist am einfachsten und stabilsten.

### 2. Firebase Spark Plan Hosting – Was du wirklich brauchst (Stand 2026)

Firebase **Spark Plan** ist für dein Use-Case (persönliche PWAs pro Client) **immer noch ausreichend**, solange du nicht massenhaft Traffic hast.

**Kostenlose Limits (Hosting):**
- 10 GB Speicher
- Ca. 360 MB Daten-Transfer pro Tag (danach wird es teuer)
- Globales CDN + kostenloses SSL

**Was du tun musst:**

1. **Firebase-Projekt anlegen**
   - Gehe zu https://console.firebase.google.com
   - Neues Projekt erstellen (z. B. `alpha-os-pwa`)

2. **Firebase CLI installieren** (einmalig auf deinem Rechner)
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

3. **Projekt initialisieren**
   - Im Ordner deiner PWA ausführen:
     ```bash
     firebase init hosting
     ```
   - Wähle dein Projekt
   - Public directory: `dist` oder `.` (je nachdem wo deine fertigen Dateien liegen)
   - Single-page app? → **Ja** (wenn du eine SPA hast) oder **Nein**

4. **Deployen**
   ```bash
   firebase deploy --only hosting
   ```
   Danach bekommst du eine URL wie `https://alpha-os-pwa.web.app`

**Wichtige Hinweise zum Spark Plan 2026:**
- Hosting ist weiterhin sehr großzügig kostenlos für kleine/mittlere Nutzung.
- Wenn du später Bilder, große Assets oder hohe Besucherzahlen hast → schnell über die 360 MB/Tag Grenze.
- Kein Problem für reine Formular-PWAs wie deine Frame Map.

### 3. Was noch fehlt / empfohlen ist (für saubere Bridge)

- **Client-ID Handling robust machen**
  - In der PWA: Speichere die `clientId` dauerhaft in `localStorage`
  - Beim Start: Wenn Node erreichbar → Node, sonst direkt GAS URL mit `?clientId=...` aufrufen

- **Offline-Fallback in der PWA**
  - Service Worker prüft, ob Node online ist → bei Fehler direkt zu GAS weiterleiten

- **GAS WebApp URL** stabil halten
  - Deploye sie als **"New deployment"** und nutze die feste Exec-URL

- **Sicherheit (wichtig!)**
  - Im GAS Script: Füge eine einfache Validierung hinzu (z. B. nur bestimmte Client-IDs erlauben oder eine geheime Key prüfen)
  - Aktuell kann jeder mit einer Client-ID ins Sheet schreiben

- **Coach-Ansicht**
  - Du brauchst später ein separates GAS-Script oder ein Dashboard, das alle `Client_*` Tabs ausliest.

### Kurzfassung: Deine To-Do-Liste (Priorität)

| Priorität | Aufgabe                              | Status     |
|-----------|--------------------------------------|------------|
| Hoch      | Manifest.json + Icons erstellen      | Fehlt      |
| Hoch      | Service Worker für Offline + Fallback| Fehlt      |
| Hoch      | Firebase CLI installieren + init     | Zu tun     |
| Mittel    | PWA so bauen, dass sie GAS direkt aufruft | Zu tun |
| Mittel    | Client-ID robust in PWA speichern    | Teilweise  |
| Niedrig   | Einfache Auth/Key im GAS hinzufügen  | Optional   |

Möchtest du als Nächstes:
- Einen **minimalen Service Worker** mit Node → GAS Fallback?
- Eine **komplette minimale PWA-Struktur** (index.html + manifest + sw)?
- Oder Hilfe beim **firebase init + deploy**?

Sag mir einfach, wo du jetzt weitermachen willst – dann gebe ich dir den nächsten konkreten Code-Block.

# Core4 Changelog

## 2026-03-28

### core4-dev (Vue+Vite standalone)

- Neues Dev-Repo `~/core4-dev` mit Vue 3 + Vite als Desktop-Frontend
- Express-Server auf Port 9728 (HOST `0.0.0.0`)
- Vanilla JS PWA aus `public/` = Mobile-View (unverändert)
- Vue SPA = Desktop-View (2-Spalten-Layout: 200px Sidebar + 1fr Main)
- `isMobile` ref → rendert `MobileView.vue` unter 768px
- Backend-Routes (`routes/core4.js`) aus `aos-hub` in `core4-dev` kopiert → Repo ist jetzt eigenständig, kein Cross-Repo-Import mehr
- Symlink `/opt/core4` → `~/core4-dev` für System-Service
- `core4.service` angelegt in `~/.dotfiles/config/systemd/system/`

### Desktop-Features (App.vue)

- Wochennavigation mit `←` / `→` (`weekOffset`)
- Day-Strip: beliebigen Tag anklicken, lädt `day-state` + `week-summary` + Journal
- Habit-Logging auf selektierten Tag (nicht nur heute)
- Heatmap (7 Tage, Punkte pro Tag)
- Journal (Habit-Select + Textarea, Ctrl+Enter speichert)
- Export → Vault Button

### Fixes

- `src/main.js`: `import '/style.css'` entfernt (Vite blockiert Public-Asset-Imports aus JS)
- `style.css` nur noch via `<link>` in `index.html`

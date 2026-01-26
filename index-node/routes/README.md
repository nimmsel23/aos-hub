# Index Node Routes

Modular router architecture for Index Node centres.

## Structure

```
routes/
├── game.js          # /game routes (mounts subroutes)
├── game.tent.js     # /game/tent - General's Tent dashboard
└── README.md
```

## Adding New Routes

### 1. Create Router File

```javascript
// routes/game.newfeature.js
import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.send('New feature');
});

export default router;
```

### 2. Mount in Parent Router

```javascript
// routes/game.js
import newFeatureRouter from './game.newfeature.js';
router.use('/newfeature', newFeatureRouter);
```

### 3. Access

```
http://127.0.0.1:8799/game/newfeature
```

## Services & Libraries

### Services (`services/`)

Business logic and external integrations.

**Example: `services/tent.service.js`**
- Orchestrates Tent weekly data
- Calls Bridge RPC
- Caches results

### Libraries (`lib/`)

Reusable utilities.

**Example: `lib/week.js`**
- ISO week helpers
- `isoWeekNow()`, `assertIsoWeek()`

## Current Routes

### /game/tent

**Router:** `routes/game.tent.js`
**Service:** `services/tent.service.js`

**Endpoints:**
- `GET /game/tent` - HTML dashboard
- `GET /game/tent/api?week=YYYY-Www` - JSON bundle

**Features:**
- TickTick weekly digest
- Tent scores (STACK/DOOR/CORE)
- Map latest entries (Frame/Freedom/Focus/Fire/Voice)

## Environment Variables

```bash
# Bridge URL (local or Tailscale Funnel)
AOS_BRIDGE_URL=http://127.0.0.1:8080

# Cache TTL for Tent data (default: 120 seconds)
AOS_TENT_CACHE_TTL_SEC=120
```

## Dependencies

Routes use ES modules (`import`/`export`).

**Required:**
- Express.js (already installed)
- Node 14+ with ES module support

**Optional:**
- Bridge service running on port 8080
- GAS Tent Centre (for TickTick integration)

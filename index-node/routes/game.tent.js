// ================================================================
// Game Tent Router - /game/tent endpoint
// ================================================================
//
// Express router for General's Tent dashboard.
//
// Routes:
// - GET /game/tent               -> HTML dashboard
// - GET /game/tent/api?week=...  -> JSON bundle
//
// Mount this router from routes/game.js
//
// ================================================================

import express from 'express';
import { makeTentService } from '../services/tent.service.js';
import { isoWeekNow, assertIsoWeek } from '../lib/week.js';

const router = express.Router();
const tent = makeTentService({ bridgeUrl: process.env.AOS_BRIDGE_URL });

router.get('/', (req, res) => {
  // Minimal HTML dashboard. Replace with your templating system if desired.
  res.type('html').send(`<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>General's Tent</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; margin:0; padding:16px;}
    .row{display:flex; gap:12px; flex-wrap:wrap;}
    .card{border:1px solid #ddd; border-radius:12px; padding:12px; min-width:280px; flex:1;}
    pre{white-space:pre-wrap;}
    input,button{padding:8px 10px;}
    button{cursor:pointer;}
  </style>
</head>
<body>
  <h1>🏕️ General's Tent</h1>
  <div class="row">
    <div class="card">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <label>Week <input id="week" placeholder="YYYY-Www"/></label>
        <label><input id="preferExport" type="checkbox"/> prefer export fallback</label>
        <button onclick="load()">Reload</button>
      </div>
      <p style="margin:8px 0 0;color:#555;">Bridge: <span id="bridge"></span></p>
    </div>
    <div class="card">
      <h3>Scores</h3>
      <pre id="scores">(loading...)</pre>
    </div>
  </div>

  <div class="row">
    <div class="card">
      <h3>Maps (latest)</h3>
      <pre id="maps">(loading...)</pre>
    </div>
    <div class="card">
      <h3>TickTick Weekly Digest</h3>
      <pre id="digest">(loading...)</pre>
    </div>
  </div>

<script>
  function isoWeekNow(){
    const d=new Date();
    const tmp=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const day=tmp.getUTCDay()||7;
    tmp.setUTCDate(tmp.getUTCDate()+4-day);
    const yStart=new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
    const w=Math.ceil((((tmp-yStart)/86400000)+1)/7);
    return \`\${tmp.getUTCFullYear()}-W\${String(w).padStart(2,'0')}\`;
  }

  async function load(){
    const wEl=document.getElementById('week');
    const week=(wEl.value||'').trim() || isoWeekNow();
    const preferExport=document.getElementById('preferExport').checked;
    const url=\`/game/tent/api?week=\${encodeURIComponent(week)}&preferExport=\${preferExport?'1':'0'}\`;

    const r=await fetch(url);
    const j=await r.json();

    document.getElementById('bridge').textContent=j.bridgeBase || '(unknown)';
    document.getElementById('scores').textContent=JSON.stringify(j.scores,null,2);
    document.getElementById('maps').textContent=JSON.stringify(j.maps,null,2);
    document.getElementById('digest').textContent=(j.ticktick && (j.ticktick.md || j.ticktick.digestMd))
      ? (j.ticktick.md || j.ticktick.digestMd)
      : JSON.stringify(j.ticktick,null,2);
  }

  document.getElementById('week').value=isoWeekNow();
  load();
</script>
</body>
</html>`);
});

router.get('/api', async (req, res) => {
  try {
    const week = req.query.week ? assertIsoWeek(String(req.query.week)) : isoWeekNow();
    const preferExport = String(req.query.preferExport || '0') === '1';

    const bundle = await tent.getWeekBundle({
      week,
      preferExport,
      // tags: ['DOOR','STACK'] // optionally restrict digest
    });

    res.json({
      ok: true,
      week: bundle.week,
      bridgeBase: tent.bridgeBase,
      maps: bundle.maps,
      scores: bundle.scores,
      ticktick: bundle.ticktick
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;

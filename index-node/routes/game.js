// ================================================================
// Game Router - /game routes
// ================================================================
//
// Mounts all game-related subroutes:
// - /game/tent -> General's Tent dashboard
//
// Add additional game routes here as needed.
//
// ================================================================

import express from 'express';
import tentRouter from './game.tent.js';

const router = express.Router();

// Mount tent subroute
router.use('/tent', tentRouter);

export default router;

import express from "express";
import { registerFileRoutes } from "./door/files.js";
import { registerPlanRoutes } from "./door/plan.js";
import { registerPotentialRoutes } from "./door/potential.js";
import { registerProductionRoutes } from "./door/production.js";
import { registerProfitRoutes } from "./door/profit.js";

const router = express.Router();

registerFileRoutes(router);
registerPotentialRoutes(router);
registerPlanRoutes(router);
registerProductionRoutes(router);
registerProfitRoutes(router);

export default router;

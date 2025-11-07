// routes/geoRoutes.js
import { Router } from "express";
import { getProvincias, getLocalidades } from "../controllers/geo.controller.js";

const router = Router();

router.get("/provincias", getProvincias);
router.get("/localidades", getLocalidades);

export default router;
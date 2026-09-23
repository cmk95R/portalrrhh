import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { getClients, createClient, deleteClient } from "../controllers/client.controller.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "rrhh"));

router.get("/", getClients);
router.post("/", createClient);
router.delete("/:id", deleteClient);

export default router;
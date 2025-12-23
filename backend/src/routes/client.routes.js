import { Router } from "express";
import { getClients, createClient, deleteClient } from "../controllers/client.controller.js";

const router = Router();

router.get("/", getClients);
router.post("/", createClient);
router.delete("/:id", deleteClient);

export default router;
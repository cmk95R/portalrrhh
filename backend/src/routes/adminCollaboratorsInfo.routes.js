import { Router } from "express";
import { requireRole } from "../middleware/role.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  listCollaboratorsInfo,
  getCollaboratorInfo,
  upsertCollaboratorInfo,
  uploadCollaboratorPhoto,
  exportCollaboratorsList,
} from "../controllers/collaboratorInfo.controller.js";

const router = Router();

// Lectura: admin y RRHH
router.get("/export/list", exportCollaboratorsList);
router.get("/", listCollaboratorsInfo);
router.get("/:userId", getCollaboratorInfo);

// Escritura: admin y rrhh
const adminOrRrhh = requireRole("admin", "rrhh");
router.put("/:userId", adminOrRrhh, upsertCollaboratorInfo);
router.post("/:userId/photo", adminOrRrhh, upload.single("foto"), uploadCollaboratorPhoto);

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
// Importa solo los controladores necesarios para las rutas de usuario
import {
  getMyCV,
  upsertMyCV,
  downloadMyCv
} from "../controllers/cv.controller.js";

const router = Router();

// --- Rutas para el Usuario Logueado (montadas bajo /api/cv) ---

// GET /api/cv/me - Obtener el CV propio del usuario
router.get("/me", requireAuth, getMyCV);

// POST /api/cv/me - Crear o actualizar el CV propio (maneja subida de archivo)
router.post("/me", requireAuth, upload.single("cvPdf"), upsertMyCV);

// GET /api/cv/me/download - Obtener la URL de descarga para el CV propio
router.get("/me/download", requireAuth, downloadMyCv);


// --- Rutas de Admin (Se moverán a adminRoutes.js después) ---
/*
import { requireRole } from "../middleware/role.middleware.js";
import { listAllCVs, downloadCvByUserId } from "../controllers/cv.controller.js";

// GET /api/admin/cvs - Listar todos los CVs
router.get("/", requireAuth, requireRole("admin"), listAllCVs);

// GET /api/admin/users/:userId/cv/download - Descargar el CV de un usuario específico
router.get("/admin/users/:userId/cv/download", requireAuth, requireRole("admin"), downloadCvByUserId);
*/

export default router;
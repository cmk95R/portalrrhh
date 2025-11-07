import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
// Importa solo los controladores necesarios para las postulaciones propias del usuario
import {
  myApplications,
  withdrawApplication,
} from "../controllers/application.controller.js";

const router = Router();

// --- Rutas para el Usuario Logueado (montadas bajo /api/applications) ---

// GET /api/applications/me - Obtener las postulaciones propias del usuario
router.get("/me", requireAuth, myApplications);

// DELETE /api/applications/:id - Retirar la postulación propia del usuario
router.delete("/:id", requireAuth, withdrawApplication);


// --- Rutas movidas o a mover a otros archivos ---
/*
// POST /api/searches/:id/apply - Movida a searchRoutes.js
import { applyToSearch } from "../controllers/application.controller.js"; // O cv.controller.js
router.post("/searches/:id/apply", requireAuth, applyToSearch);

// --- Rutas de Admin (Se moverán a adminRoutes.js después) ---
import { requireRole } from "../middleware/role.middleware.js";
import { listApplications, updateApplication } from "../controllers/application.controller.js";
import { downloadCvByApplication } from "../controllers/cv.controller.js";

// GET /api/admin/applications - Listar todas las postulaciones
router.get("/admin/applications", requireAuth, requireRole("admin", "rrhh"), listApplications);

// PATCH /api/admin/applications/:id - Actualizar el estado de una postulación
router.patch("/admin/applications/:id", requireAuth, requireRole("admin", "rrhh"), updateApplication);

// GET /api/admin/applications/:id/cv/download - Descargar CV para una postulación específica
router.get("/admin/applications/:id/cv/download", requireAuth, requireRole("admin", "rrhh"), downloadCvByApplication);
*/

export default router;
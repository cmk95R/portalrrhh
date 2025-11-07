// routes/searches.routes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js"; // Middlewares de autenticación y verificación

// Importa los controladores necesarios
import { listPublicSearches, getPublicSearch } from "../controllers/search.controller.js";
import { applyToSearch } from "../controllers/cv.controller.js"; // O application.controller.js, donde tengas la lógica

const router = Router();

// --- Rutas Públicas y de Usuario (montadas bajo /api/searches) ---

// GET /api/searches - Listar búsquedas activas (público)
// (Ej: permite filtros como ?q=...&area=...)
router.get("/", listPublicSearches);

// GET /api/searches/:id - Ver detalle de una búsqueda específica (público)
router.get("/:id", getPublicSearch);

// POST /api/searches/:id/apply - Postularse a una búsqueda (requiere login y email verificado)
router.post("/:id/apply", requireAuth, applyToSearch);

export default router;
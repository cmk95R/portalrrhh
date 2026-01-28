// routes/userRoutes.js
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
// Importa solo los controladores necesarios para las rutas de usuario
import { editUser } from "../controllers/user.controller.js";

const router = Router();

// --- Rutas para el Usuario Logueado (montadas bajo /api/users) ---

// PATCH /api/users/me - Actualizar datos del propio perfil del usuario
router.patch("/me", requireAuth, editUser);

// NOTA: La ruta GET /api/auth/me (para obtener los datos) ya está en authRoutes.js

export default router;
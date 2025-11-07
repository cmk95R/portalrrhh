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

// --- Rutas de Admin (Se moverán a adminRoutes.js después) ---
/*
import { requireRole } from "../middleware/role.middleware.js";
import {
    listUsers,
    makeAdmin,
    revokeAdmin,
    listUsersWithCv,
    adminSetUserStatus,
    adminSetUserRole
} from "../controllers/user.controller.js";
import { getDashboardData } from "../controllers/dashboard.controller.js";

// GET /api/admin/dashboard - Datos para el dashboard de admin
router.get("/dashboard", requireAuth, requireRole("admin"), getDashboardData);

// GET /api/admin/users - Listar todos los usuarios
router.get("/", requireAuth, requireRole("admin"), listUsers);

// GET /api/admin/users/with-cv - Listar usuarios con datos del CV (para grilla)
router.get("/with-cv", requireAuth, requireRole("admin", "rrhh"), listUsersWithCv); // Ruta ajustada

// PATCH /api/admin/users/:id/make-admin - Hacer admin a un usuario
router.patch("/:id/make-admin", requireAuth, requireRole("admin"), makeAdmin);

// PATCH /api/admin/users/:id/revoke-admin - Quitar rol admin a un usuario
router.patch("/:id/revoke-admin", requireAuth, requireRole("admin"), revokeAdmin);

// PATCH /api/admin/users/:id/status - Cambiar estado de un usuario (activo/inactivo)
router.patch("/:id/status", requireAuth, requireRole("admin"), adminSetUserStatus); // Ruta ajustada

// PATCH /api/admin/users/:id/role - Cambiar rol de un usuario
router.patch("/:id/role", requireAuth, requireRole("admin"), adminSetUserRole); // Ruta ajustada
*/

export default router;
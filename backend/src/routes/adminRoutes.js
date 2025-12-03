import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

// --- Importa controladores de Usuario ---
import {
  makeAdmin,
  revokeAdmin,
  adminSetUserStatus,
  adminUpdateUser,
  adminResetUserPin,
  adminSetUserRole,
  adminListUsers // <-- AÑADIDO: La función correcta para la grilla
} from "../controllers/user.controller.js";

// --- Importa controlador del Dashboard ---

// --- Importa las rutas de admin para asistencia ---
import adminAttendanceRoutes from "./adminAttendance.routes.js";

const router = Router();

// --- Middleware Global para Rutas de Admin ---
// Aplica autenticación y rol de admin/rrhh a TODAS las rutas definidas aquí.
router.use(requireAuth, requireRole("admin", "rrhh"));

// --- GET /api/admin/dashboard - Datos generales ---

// --- Gestión de Usuarios --- (/api/admin/users)
const userRouter = Router();
userRouter.get("/", adminListUsers); // <-- CORRECCIÓN: Usar el controlador correcto para la grilla
userRouter.patch("/:id/make-admin", makeAdmin);
userRouter.patch("/:id", adminUpdateUser);
userRouter.patch("/:id/reset-pin", adminResetUserPin);
userRouter.patch("/:id/revoke-admin", revokeAdmin);
userRouter.patch("/:id/status", adminSetUserStatus);
userRouter.patch("/:id/role", adminSetUserRole);
router.use("/users", userRouter);

// --- Gestión de Asistencia --- (/api/admin/attendance)
// Se monta el router importado que maneja toda la lógica de asistencia admin
router.use("/attendance", adminAttendanceRoutes);

export default router;
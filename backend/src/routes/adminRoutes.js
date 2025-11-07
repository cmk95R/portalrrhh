import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

// --- Importa TODOS los controladores necesarios para las rutas de Admin ---
import {
  listUsers,
  makeAdmin,
  revokeAdmin,
  listUsersWithCv, // Asumiendo que esta es para la grilla de admin
  adminSetUserStatus, // Asumiendo que existen
  adminSetUserRole   // Asumiendo que existen
} from "../controllers/user.controller.js";

import {
  listAllCVs,
  getCV,
  downloadCvByUserId,
  downloadCvByApplication // Asumiendo que existe o la creas
} from "../controllers/cv.controller.js";

import {
  listAdminSearches, // Asume que existe un controlador específico para admin
  createSearch,
  updateSearch,
  deleteSearch
} from "../controllers/search.controller.js";

import {
  listApplications,
  updateApplication,
  } from "../controllers/application.controller.js"; // O cv.controller.js

import { getDashboardData } from "../controllers/dashboard.controller.js";

const router = Router();

// --- Middleware Global para Rutas de Admin ---
// Aplica autenticación y rol de admin a TODAS las rutas definidas en este archivo.
router.use(requireAuth, requireRole("admin", "rrhh")); // Permite admin o rrhh

// --- Rutas Específicas de Admin ---

// GET /api/admin/dashboard - Datos para el dashboard
router.get("/dashboard", getDashboardData);

// --- Gestión de Usuarios --- (/api/admin/users)
const userRouter = Router();
userRouter.get("/", listUsers);             // GET /api/admin/users
userRouter.get("/with-cv", listUsersWithCv); // GET /api/admin/users/with-cv (Para la grilla avanzada)
userRouter.patch("/:id/make-admin", makeAdmin); // PATCH /api/admin/users/:id/make-admin
userRouter.patch("/:id/revoke-admin", revokeAdmin); // PATCH /api/admin/users/:id/revoke-admin
userRouter.patch("/:id/status", adminSetUserStatus); // PATCH /api/admin/users/:id/status
userRouter.patch("/:id/role", adminSetUserRole);     // PATCH /api/admin/users/:id/role
userRouter.get("/:userId/cv/download", downloadCvByUserId); // GET /api/admin/users/:userId/cv/download
router.use("/users", userRouter); // Monta las rutas de usuario bajo /api/admin/users

// --- Gestión de CVs --- (/api/admin/cvs)
const cvRouter = Router();
cvRouter.get("/", listAllCVs); // GET /api/admin/cvs
cvRouter.get("/:id", getCV);   // GET /api/admin/cvs/:id
router.use("/cvs", cvRouter); // Monta las rutas de CV bajo /api/admin/cvs

// --- Gestión de Búsquedas --- (/api/admin/searches)
const searchRouter = Router();
searchRouter.get("/", listAdminSearches); // GET /api/admin/searches
searchRouter.post("/", createSearch);       // POST /api/admin/searches
searchRouter.patch("/:id", updateSearch);    // PATCH /api/admin/searches/:id
searchRouter.delete("/:id", deleteSearch);   // DELETE /api/admin/searches/:id
router.use("/searches", searchRouter); // Monta las rutas de búsqueda bajo /api/admin/searches

// --- Gestión de Postulaciones --- (/api/admin/applications)
const applicationRouter = Router();
applicationRouter.get("/", listApplications);   // GET /api/admin/applications
applicationRouter.patch("/:id", updateApplication); // PATCH /api/admin/applications/:id
applicationRouter.get("/:id/cv/download", downloadCvByApplication); // GET /api/admin/applications/:id/cv/download
router.use("/applications", applicationRouter); // Monta las rutas de postulación bajo /api/admin/applications

export default router;
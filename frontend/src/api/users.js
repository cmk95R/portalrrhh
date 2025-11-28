// frontend/src/api/users.js

import api from "./client";

// --- Rutas de Usuario ---

/**
 * Actualiza el perfil del usuario logueado.
 * Soporta: nombre, apellido, email, teléfono, dirección, DNI, foto,
 * cliente, direcciónCliente, horarioLaboral, nacimiento, etc.
 * Calls PATCH /api/users/me
 */
export const editUserApi = (data) => api.patch("/users/me", data);

// --- Rutas de Administrador ---

/**
 * 🔑 ADMIN/RRHH: Lista todos los usuarios (versión básica).
 * Calls GET /api/admin/users
 */
export const listUsersApi = (params = {}) =>
  api.get("/admin/users", { params });

/**
 * 🔑 ADMIN/RRHH: Lista paginada y filtrable de usuarios (versión extendida).
 * Aunque la ruta se llama 'with-cv' por legado, ahora devuelve datos como:
 * DNI, cliente, direcciónCliente, horarioLaboral, etc.
 * Calls GET /api/admin/users/with-cv
 */
export const listUsersWithCvApi = (params) =>
  api.get("/admin/users/with-cv", { params });

/**
 * 🔑 ADMIN: Asigna el rol de admin a un usuario.
 * Calls PATCH /api/admin/users/:id/make-admin
 */
export const makeAdminApi = (id) =>
  api.patch(`/admin/users/${id}/make-admin`);

/**
 * 🔑 ADMIN: Revoca el rol de admin a un usuario (lo vuelve 'empleado').
 * Calls PATCH /api/admin/users/:id/revoke-admin
 */
export const revokeAdminApi = (id) =>
  api.patch(`/admin/users/${id}/revoke-admin`);

/**
 * 🔑 ADMIN/RRHH: Cambia el estado de un usuario (activo/inactivo).
 * Calls PATCH /api/admin/users/:id/status
 * @param {string} userId El ID del usuario.
 * @param {'activo' | 'inactivo'} estado El nuevo estado.
 */
export const adminSetUserStatusApi = (userId, estado) =>
  api.patch(`/admin/users/${userId}/status`, { estado });

/**
 * 🔑 ADMIN/RRHH: Cambia el rol de un usuario.
 * Calls PATCH /api/admin/users/:id/role
 * @param {string} userId El ID del usuario.
 * @param {'empleado' | 'admin' | 'rrhh'} rol El nuevo rol.
 */
export const adminSetUserRoleApi = (userId, rol) =>
  api.patch(`/admin/users/${userId}/role`, { rol });

/**
 * 🔑 ADMIN/RRHH: Actualiza datos de un usuario (como empleado) desde el panel admin.
 * Permite cambiar: nombre, apellido, email, dni, foto, cliente,
 * direcciónCliente, horarioLaboral, dirección, nacimiento, etc.
 * Calls PATCH /api/admin/users/:id
 */
export const adminUpdateUserApi = (userId, data) =>
  api.patch(`/admin/users/${userId}`, data);

/**
 * 🔑 ADMIN/RRHH: Resetea el PIN de un usuario.
 * El backend genera un nuevo PIN, lo guarda hasheado
 * y devuelve el PIN en texto plano en `newPin`.
 * Calls PATCH /api/admin/users/:id/reset-pin
 */
export const adminResetUserPinApi = (userId) =>
  api.patch(`/admin/users/${userId}/reset-pin`);

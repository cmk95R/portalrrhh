// controllers/user.controller.js
import User from "../models/User.js";
import { normalizeDireccion } from "../utils/normalize.js";

// --- CORRECCIÓN: La ruta ahora es PATCH /users/me ---
export const editUser = async (req, res, next) => {
  try {
    const userId = req.user._id; // Usamos el ID del usuario autenticado
    const { nombre, apellido, email, direccion, telefono, nacimiento } = req.body;
    const update = {};

    if (typeof nombre === "string")   update.nombre = nombre.trim();
    if (typeof apellido === "string") update.apellido = apellido.trim();
    if (typeof telefono === "string") update.telefono = telefono.trim();
    if (typeof email === "string")    update.email = email.trim().toLowerCase();
    if (nacimiento) update.nacimiento = nacimiento; // Asume que es una fecha válida

    const direccionNorm = normalizeDireccion(direccion);
    // Si la dirección normalizada tiene datos, la asignamos directamente.
    // Mongoose se encargará de actualizar los campos anidados.
    if (direccionNorm && Object.keys(direccionNorm).length > 0) {
      update.direccion = direccionNorm;
    }

    const u = await User.findByIdAndUpdate(
      userId, // Actualizamos al usuario correcto
      update,
      { new: true, runValidators: true, context: "query" }
    ).select("_id nombre apellido email rol telefono nacimiento direccion");

    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: "Usuario actualizado", user: u });
  } catch (e) { next(e); }
};

// GET /users  (si lo usás para admin)
export const listUsers = async (_req, res, next) => {
  try {
    // Hacemos un lookup para traer la información del CV de cada usuario
    const users = await User.aggregate([
      { $lookup: { from: 'cvs', localField: '_id', foreignField: 'user', as: 'cv' } },
      { $unwind: { path: '$cv', preserveNullAndEmptyArrays: true } },
      { $project: { nombre: 1, apellido: 1, email: 1, rol: 1, createdAt: 1, 'cv.cvFile.providerId': 1 } }
    ]);
    res.json({ users: users });
  } catch (e) { next(e); }
};

// PATCH /users/:id/make-admin
export const makeAdmin = async (req, res, next) => {
  try {
    const u = await User.findByIdAndUpdate(
      req.params.id,
      { rol: "admin" },
      { new: true, runValidators: true, context: "query" }
    ).select("_id nombre apellido email rol");
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: "Rol actualizado a admin", user: u });
  } catch (e) { next(e); }
};

// PATCH /users/:id/revoke-admin
export const revokeAdmin = async (req, res, next) => {
  try {
    const u = await User.findByIdAndUpdate(
      req.params.id,
      { rol: "user" },
      { new: true, runValidators: true, context: "query" }
    ).select("_id nombre apellido email rol");
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: "Rol revertido a user", user: u });
  } catch (e) { next(e); }
};

// ===================== Admin: Users + CV (para DataGrid) =====================
// GET /admin/users?q=&rol=user|admin&areaInteres=&nivelAcademico=&hasCv=true|false&page=1&limit=20&sortBy=updatedAt&sortDir=desc
const SAFE_SORT = new Set([
  "createdAt","updatedAt","nombre","apellido","email", "telefono","rol","cvArea","cvNivel"
]);

export const listUsersWithCv = async (req, res, next) => {
  try {
    const {
      q,                 // texto: nombre/apellido/email/publicId
      rol,               // 'user' | 'admin'
      areaInteres,       // filtro por área del CV
      nivelAcademico,    // filtro por nivel académico del CV
      hasCv,             // "true" | "false"
      page = 1,
      limit = 20,
      sortBy = "updatedAt",
      sortDir = "desc",
    } = req.query;

    const _page  = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const _sortBy = SAFE_SORT.has(sortBy) ? sortBy : "updatedAt";
    const _sortDir = String(sortDir).toLowerCase() === "asc" ? 1 : -1;

    // filtros sobre users
    const userMatch = {};
    if (rol) userMatch.rol = rol;
    if (q) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      userMatch.$or = [
        { nombre: rx },
        { apellido: rx },
        { email: rx },
        { publicId: rx },
      ];
    }

    // filtros sobre CV (después del lookup)
    const cvMatch = {};
    if (areaInteres)     cvMatch["cv.areaInteres"] = areaInteres;
    if (nivelAcademico)  cvMatch["cv.nivelAcademico"] = nivelAcademico;
    if (hasCv === "true")  cvMatch["cv._id"] = { $ne: null };
    if (hasCv === "false") cvMatch["cv._id"] = null;

    // sort
    const sortStage = {};
    if (_sortBy === "cvArea")       sortStage["cv.areaInteres"] = _sortDir;
    else if (_sortBy === "cvNivel") sortStage["cv.nivelAcademico"] = _sortDir;
    else                            sortStage[_sortBy] = _sortDir;

    const pipeline = [
      { $match: userMatch },
      {
        $lookup: {
          from: "cvs", // colección de Cv (Mongoose pluraliza 'Cv' -> 'cvs')
          let: { uid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$uid"] } } },
            {
              $project: {
                _id: 1,
                areaInteres: 1,
                nivelAcademico: 1,
                telefono: 1,
                linkedin: 1,
                habilidades: 1,   // si no existen en tu modelo hoy, vendrán undefined
                competencias: 1,
                updatedAt: 1
              }
            }
          ],
          as: "cv"
        }
      },
      { $unwind: { path: "$cv", preserveNullAndEmptyArrays: true } },
      ...(Object.keys(cvMatch).length ? [{ $match: cvMatch }] : []),
      {
        $project: {
          _id: 1,
          publicId: 1,
          nombre: 1,
          apellido: 1,
          email: 1,
          rol: 1,
          telefono: 1,
          nacimiento: 1,
          estado: 1, // <-- Añadir estado a la proyección
          createdAt: 1,
          updatedAt: 1,
          // dirección básica para "Ubicación" en el front
          direccion: {
            localidad: "$direccion.localidad",
            provincia: "$direccion.provincia",
            pais: "$direccion.pais"
          },
          // campos del CV
          cvId: "$cv._id",
          cvArea: "$cv.areaInteres",
          cvNivel: "$cv.nivelAcademico",
          cvTelefono: "$cv.telefono",
          cvLinkedin: "$cv.linkedin",
          cvHabilidades: "$cv.habilidades",
          cvCompetencias: "$cv.competencias",
          cvUpdatedAt: "$cv.updatedAt",
          hasCv: { $cond: [{ $ifNull: ["$cv._id", false] }, true, false] }
        }
      },
      { $sort: sortStage },
      {
        $facet: {
          items: [
            { $skip: (_page - 1) * _limit },
            { $limit: _limit }
          ],
          total: [{ $count: "count" }]
        }
      }
    ];

    const [agg] = await User.aggregate(pipeline).allowDiskUse(true);
    const items = agg?.items ?? [];
    const total = agg?.total?.[0]?.count ?? 0;

    res.json({
      items,
      total,
      page: _page,
      pages: Math.ceil(total / _limit)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔑 ADMIN: Cambia el estado de un usuario (activo/inactivo).
 * PATCH /admin/users/:id/status
 */
export const adminSetUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ message: "Estado no válido. Debe ser 'activo' o 'inactivo'." });
    }

    const u = await User.findByIdAndUpdate(
      id,
      { estado },
      { new: true, runValidators: true }
    ).select("_id nombre apellido email rol createdAt estado");

    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: `Usuario ahora está ${estado}`, user: u });
  } catch (e) {
    next(e);
  }
};

/**
 * 🔑 ADMIN: Cambia el rol de un usuario.
 * PATCH /admin/users/:id/role
 */
export const adminSetUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    // Lista de roles permitidos para evitar valores arbitrarios
    const allowedRoles = ['user', 'admin', 'rrhh'];
    if (!rol || !allowedRoles.includes(rol)) {
      return res.status(400).json({ message: "Rol no válido o no proporcionado." });
    }

    const u = await User.findByIdAndUpdate(
      id,
      { rol },
      { new: true, runValidators: true }
    ).select("_id nombre apellido email rol createdAt estado");

    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: `Rol del usuario actualizado a ${rol}`, user: u });
  } catch (e) { next(e); }
};

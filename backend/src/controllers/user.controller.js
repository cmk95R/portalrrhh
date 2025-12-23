import User from "../models/User.js";
import { normalizeDireccion } from "../utils/normalize.js";
import bcrypt from "bcryptjs";
// --- PATCH /users/me ---
// El usuario logueado edita SUS propios datos
export const editUser = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const { 
      nombre,
      apellido,
      email,
      direccion,
      telefono,
      nacimiento,
      dni,
      foto,
      cliente,
      direccionCliente,
      horarioLaboral 
    } = req.body;
    
    const update = {};

    // --- Campos de Texto Básicos ---
    if (typeof nombre === "string")   update.nombre = nombre.trim();
    if (typeof apellido === "string") update.apellido = apellido.trim();
    if (typeof telefono === "string") update.telefono = telefono.trim();
    if (typeof email === "string")    update.email = email.trim().toLowerCase();
    
    // 🔐 Opcional: si NO querés que el empleado cambie su propio DNI,
    // comentá esta línea y dejá el cambio de DNI solo para un endpoint admin.
    if (typeof dni === "string")              update.dni = dni.trim();

    if (typeof foto === "string")             update.foto = foto.trim();
    if (typeof cliente === "string")          update.cliente = cliente.trim();
    if (typeof direccionCliente === "string") update.direccionCliente = direccionCliente.trim();
    if (typeof horarioLaboral === "string")   update.horarioLaboral = horarioLaboral.trim();

    // --- Fecha ---
    if (nacimiento) update.nacimiento = nacimiento;

    // --- Dirección Personal ---
    const direccionNorm = normalizeDireccion(direccion);
    if (direccionNorm && Object.keys(direccionNorm).length > 0) {
      update.direccion = direccionNorm;
    }

    const u = await User.findByIdAndUpdate(
      userId,
      update,
      { new: true, runValidators: true, context: "query" }
    ).select(
      "_id nombre apellido dni email rol telefono foto cliente direccionCliente horarioLaboral nacimiento direccion"
    );

    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: "Usuario actualizado", user: u });
  } catch (e) {
    next(e);
  }
};

// GET /users (Básico)
export const listUsers = async (_req, res, next) => {
  try {
    const users = await User.aggregate([
      { 
        $lookup: { 
          from: 'cvs', 
          localField: '_id', 
          foreignField: 'user', 
          as: 'cv' 
        } 
      },
      { 
        $unwind: { 
          path: '$cv', 
          preserveNullAndEmptyArrays: true 
        } 
      },
      { 
        $project: { 
          nombre: 1,
          apellido: 1,
          dni: 1,
          email: 1,
          rol: 1,
          cliente: 1, 
          createdAt: 1,
          'cv.cvFile.providerId': 1 
        } 
      }
    ]);

    res.json({ users });
  } catch (e) {
    next(e);
  }
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
  } catch (e) {
    next(e);
  }
};

// PATCH /users/:id/revoke-admin
export const revokeAdmin = async (req, res, next) => {
  try {
    const u = await User.findByIdAndUpdate(
      req.params.id,
      { rol: "empleado" }, // 🔁 antes ponías "user", ahora usamos "empleado"
      { new: true, runValidators: true, context: "query" }
    ).select("_id nombre apellido email rol");
    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json({ message: "Rol revertido a empleado", user: u });
  } catch (e) {
    next(e);
  }
};

// ===================== Admin: Users List (DataGrid) =====================
// GET /admin/users
const SAFE_SORT = new Set([
  "createdAt",
  "updatedAt",
  "nombre",
  "apellido",
  "email",
  "telefono",
  "rol",
  "dni",
  "cliente"
]);

export const adminListUsers = async (req, res, next) => {
  try {
    const { sort, order, page, pageSize, search } = req.query;

    const filter = {};
    if (search) {
      const rx = new RegExp(search.trim(), "i");
      filter.$or = [
        { nombre: rx },
        { apellido: rx },
        { email: rx },
        { dni: rx },
        { rol: rx },
        { cliente: rx },
      ];
    }

    const items = await User.find(filter)
      .sort({ [sort]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * pageSize)  // Paginación
      .limit(pageSize)              // Paginación
      .lean();

    const total = await User.countDocuments(filter);

    res.json({ items, total });
  } catch (e) {
    next(e);
  }
};
// PATCH /admin/users/:id/status
export const adminSetUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['activo', 'inactivo'].includes(estado)) {
      return res
        .status(400)
        .json({ message: "Estado no válido. Debe ser 'activo' o 'inactivo'." });
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

// PATCH /admin/users/:id/role
export const adminSetUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;
    
    // ✅ Roles válidos en tu sistema de asistencia
    const allowedRoles = ['empleado', 'admin', 'rrhh'];
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
  } catch (e) { 
    next(e); 
  }
};

// PATCH /admin/users/:id  (Admin/RRHH editan datos de cualquier usuario)
export const adminUpdateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { 
      nombre,
      apellido,
      email,
      direccion,
      telefono,
      nacimiento,
      dni,
      foto,
      cliente,
      direccionCliente,
      horarioLaboral,
      clientes, // 👈 Capturamos el array de clientes
      // opcionales si querés permitir que el admin también toque esto acá:
      rol,
      estado,
    } = req.body;

    const update = {};

    // --- Campos básicos ---
    if (typeof nombre === "string")   update.nombre = nombre.trim();
    if (typeof apellido === "string") update.apellido = apellido.trim();
    if (typeof telefono === "string") update.telefono = telefono.trim();
    if (typeof email === "string")    update.email = email.trim().toLowerCase();

    // --- Campos laborales / extra ---
    if (typeof dni === "string")              update.dni = dni.trim();
    if (typeof foto === "string")             update.foto = foto.trim();
    if (typeof cliente === "string")          update.cliente = cliente.trim();
    if (typeof direccionCliente === "string") update.direccionCliente = direccionCliente.trim();
    if (typeof horarioLaboral === "string")   update.horarioLaboral = horarioLaboral.trim();
    
    // 👈 Guardamos el array de clientes y limpiamos los campos viejos
    if (Array.isArray(clientes)) {
      update.clientes = clientes;
      update.cliente = "";
      update.direccionCliente = "";
      update.horarioLaboral = "";
    }

    if (nacimiento) update.nacimiento = nacimiento;

    // --- Dirección ---
    const direccionNorm = normalizeDireccion(direccion);
    if (direccionNorm && Object.keys(direccionNorm).length > 0) {
      update.direccion = direccionNorm;
    }

    // --- Rol y estado (opcionales) ---
    const allowedRoles = ["empleado", "admin", "rrhh"];
    if (rol && allowedRoles.includes(rol)) {
      update.rol = rol;
    }

    if (estado && ["activo", "inactivo"].includes(estado)) {
      update.estado = estado;
    }

    const u = await User.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true, context: "query" }
    ).select(
      "_id nombre apellido dni email rol estado telefono foto cliente direccionCliente horarioLaboral clientes nacimiento direccion"
    );

    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Usuario actualizado por admin", user: u });
  } catch (e) {
    // Manejo de duplicados por email/dni
    if (e?.code === 11000) {
      if (e?.keyPattern?.email) {
        return res.status(409).json({ message: "El email ya está registrado" });
      }
      if (e?.keyPattern?.dni) {
        return res.status(409).json({ message: "El DNI ya está registrado" });
      }
    }
    next(e);
  }
};
// PATCH /admin/users/:id/reset-pin
// Genera un nuevo PIN para el usuario y lo guarda hasheado en password.
// Devuelve el PIN en texto plano SOLO en la respuesta para que RRHH se lo entregue al empleado.
// PATCH /admin/users/:id/reset-pin
export const adminResetUserPin = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Generamos un PIN nuevo de 4 dígitos
    const newPin = String(Math.floor(1000 + Math.random() * 9000));

    // Guardamos el PIN en password (el pre-save del modelo lo va a hashear)
    user.password = newPin;
    await user.save(); // 👈 IMPORTANTE: esto dispara el pre("save") y hashea

    return res.json({
      message: "PIN reseteado correctamente",
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        dni: user.dni,
        rol: user.rol,
        estado: user.estado,
      },
      newPin, // 👈 lo devolvemos para que el admin se lo pase al empleado
    });
  } catch (e) {
    next(e);
  }
};

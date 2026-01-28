import User from "../models/User.js";
import { normalizeDireccion } from "../utils/normalize.js";
import bcrypt from "bcryptjs";
import { uploadFileToOneDrive, getDownloadUrlForFile } from "../services/oneDrive.service.js";

// --- Helper para subir foto a OneDrive ---
async function handlePhotoUpload(fotoBase64, userId) {
  // Verificamos si es una cadena Base64 de imagen válida
  if (!fotoBase64 || !fotoBase64.startsWith("data:image")) return null;

  try {
    const matches = fotoBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    const fileName = `profile_${userId}_${Date.now()}.${ext}`;

    const response = await uploadFileToOneDrive(buffer, fileName, "ProfilePhotos");
    // Si la subida es exitosa, devolvemos la URL proxy con el ID del archivo
    if (response && response.id) {
      return `/api/users/photo/${response.id}`;
    }
  } catch (error) {
    console.error("Error subiendo foto a OneDrive:", error);
  }
  return null;
}

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

    // --- Manejo de Foto (OneDrive) ---
    if (foto && foto.startsWith("data:image")) {
      const photoUrl = await handlePhotoUpload(foto, userId);
      if (photoUrl) update.foto = photoUrl;
    } else if (typeof foto === "string") {
      update.foto = foto.trim();
    }

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
    const users = await User.find({})
      .select("nombre apellido dni email rol cliente createdAt")
      .lean();

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
    const { sort, order, page, pageSize, limit, search, q, rol } = req.query;

    const pageNum = parseInt(page || 1);
    const limitNum = parseInt(limit || pageSize || 10);
    const searchTerm = search || q;

    const filter = {};
    if (searchTerm) {
      const rx = new RegExp(searchTerm.trim(), "i");
      filter.$or = [
        { nombre: rx },
        { apellido: rx },
        { email: rx },
        { dni: rx },
        { rol: rx },
        { cliente: rx },
        { "clientes.nombre": rx },
      ];
    }

    if (rol && rol !== 'all') {
      filter.rol = rol;
    }

    const items = await User.find(filter)
      .sort({ [sort || 'createdAt']: order === "asc" ? 1 : -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select("-foto") // ⚡ Optimización: No traer la foto Base64 en el listado para no saturar la red
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
    
    // --- Manejo de Foto (OneDrive) ---
    if (foto && foto.startsWith("data:image")) {
      const photoUrl = await handlePhotoUpload(foto, id); // Usamos el ID del usuario editado
      if (photoUrl) update.foto = photoUrl;
    } else if (typeof foto === "string") {
      update.foto = foto.trim();
    }

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

// Cache simple en memoria para las URLs de fotos
const photoCache = new Map();
const CACHE_TTL = 1000 * 60 * 45; // 45 minutos (las URLs de OneDrive suelen durar 1h)

// GET /users/photo/:fileId
// Redirige a la URL de descarga temporal de OneDrive
export const getProfilePhoto = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    if (!fileId) return res.status(404).send("File ID missing");

    // 1. Verificar caché
    const cached = photoCache.get(fileId);
    if (cached && cached.expires > Date.now()) {
      return res.redirect(cached.url);
    }

    const downloadUrl = await getDownloadUrlForFile(fileId);
    if (downloadUrl) {
      // 2. Guardar en caché
      photoCache.set(fileId, {
        url: downloadUrl,
        expires: Date.now() + CACHE_TTL
      });
      
      // Limpieza preventiva simple para evitar fugas de memoria
      if (photoCache.size > 2000) photoCache.clear();

      return res.redirect(downloadUrl);
    } else {
      return res.status(404).send("Image not found or OneDrive error");
    }
  } catch (e) {
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

// DELETE /admin/users/:id
export const adminDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const u = await User.findByIdAndDelete(id);

    if (!u) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (e) {
    next(e);
  }
};

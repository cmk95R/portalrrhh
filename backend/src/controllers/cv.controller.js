// controllers/cv.controller.js

import User from "../models/User.js";
import Cv from "../models/Cv.js"; // Corregido a 'Cv' si tu importación es así
import Application from "../models/Application.js";
import Search from "../models/Search.js"; // Necesario para applyToSearch
import {
  uploadFileToOneDrive,
  getDownloadUrlForFile,
  deleteFileFromOneDrive // Asegúrate que esta función existe en tu servicio
} from "../services/oneDrive.service.js";

const ALLOWED_FIELDS = new Set([
  "nombre", "apellido", "nacimiento", "perfil", "telefono",
  "linkedin", "email", "areaInteres", "educacion", "experiencia",
  "direccion" // <-- AÑADIDO: 'direccion' para consistencia con User sync
]);
const OPCIONES_AREA = ["Administracion", "Recursos Humanos", "Sistemas", "Pasantia"];

// --- Función de Normalización (con sobrescritura de archivo) ---
async function normalizePayload(body, file, user) {
  const $set = {};
  const $unset = {};
  let oldFileIdToDelete = null; // Inicializamos a null por defecto

  // Parsea campos JSON que vienen como string desde FormData
  const fieldsToParse = ['direccion', 'educacion', 'experiencia'];
  for (const field of fieldsToParse) {
    if (body[field] && typeof body[field] === 'string') {
      try { body[field] = JSON.parse(body[field]); } catch (e) { /* Ignora errores */ }
    }
  }

  const put = (k, v) => {
    // Si el valor está vacío o es un array vacío, marca para eliminar ($unset)
    if (v === "" || v == null || (Array.isArray(v) && v.length === 0)) {
        $unset[k] = "";
    } else {
        $set[k] = v;
    }
  };

  for (const [k, v0] of Object.entries(body || {})) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    let v = v0;
    if (k === "areaInteres") {
      const val = String(v || "").trim();
      v = OPCIONES_AREA.includes(val) ? val : "";
    }
    // Ya no necesitamos parsear 'educacion' y 'experiencia' aquí de nuevo
    put(k, v);
  }
  
  // --- Lógica mejorada para la subida/sobrescritura de archivos ---
  if (file) {
    const existingCv = await Cv.findOne({ user: user._id }).lean();
    // Si se encontró un CV existente y tenía un archivo, guardamos su ID para una posible eliminación.
    if (existingCv?.cvFile?.providerId) {
      oldFileIdToDelete = existingCv.cvFile.providerId;
    }
    const oldFileName = existingCv?.cvFile?.fileName; // Nombre del archivo anterior
    const oldFileId = existingCv?.cvFile?.providerId; // ID del archivo anterior

    // Define el nombre del archivo: reutiliza el anterior o crea uno nuevo
    const originalName = file.originalname.split('.').slice(0, -1).join('_').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = oldFileName || `CV_${originalName}_${user._id}.pdf`;

    const uploadResult = await uploadFileToOneDrive(file.buffer, fileName, "CVs");

    $set.cvFile = {
      fileName: fileName,
      providerId: uploadResult.id, // Actualiza el ID (puede cambiar)
      url: uploadResult.webUrl,    // Actualiza la URL
      mimetype: file.mimetype,
      size: file.size,
      provider: "onedrive",
    };

    // Si el nuevo archivo tiene el mismo providerId que el anterior, significa que fue sobrescrito.
    // En este caso, no necesitamos eliminar el archivo antiguo, así que lo ponemos a null.
    // De lo contrario, si oldFileIdToDelete tiene un valor (había un archivo antiguo) y el nuevo ID es diferente,
    // mantenemos oldFileIdToDelete para que se elimine más tarde.
    if (oldFileIdToDelete && uploadResult.id === oldFileIdToDelete) {
      oldFileIdToDelete = null;
    }
  }

  return { $set, $unset, oldFileIdToDelete };
}

// --- Controladores ---

export const getMyCV = async (req, res, next) => {
  try {
    const cv = await Cv.findOne({ user: req.user._id })
      .populate("user", "publicId email nombre apellido") // Quitado telefono, direccion, nacimiento (se obtienen de /auth/me)
      .lean();
    return res.json({ cv });
  } catch (err) { next(err); }
};

export const upsertMyCV = async (req, res, next) => {
  try {
    // Obtenemos qué actualizar y el ID del archivo antiguo si existe
    const { $set, $unset, oldFileIdToDelete } = await normalizePayload(req.body, req.file, req.user);

    // Actualiza o crea el CV
    const cv = await Cv.findOneAndUpdate(
      { user: req.user._id },
      { $set, $unset, $setOnInsert: { user: req.user._id } }, // Usa $set y $unset directamente
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).populate("user", "publicId email nombre apellido"); // Quitado campos redundantes

    // Sincroniza campos clave con el modelo User (basado en lo que se actualizó en $set)
    const userUpdate = {};
    if ($set.nombre) userUpdate.nombre = $set.nombre;
    if ($set.apellido) userUpdate.apellido = $set.apellido;
    if ($set.telefono) userUpdate.telefono = $set.telefono;
    if ($set.nacimiento) userUpdate.nacimiento = $set.nacimiento;
    if ($set.direccion) userUpdate.direccion = $set.direccion; // Sincroniza dirección si se incluyó

    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(req.user._id, { $set: userUpdate }); // Usa $set para actualizar User
    }

    // Elimina el archivo antiguo de OneDrive DESPUÉS de guardar con éxito el nuevo
    if (oldFileIdToDelete && $set.cvFile?.providerId !== oldFileIdToDelete) {
       console.log(`Intentando eliminar archivo antiguo de OneDrive: ${oldFileIdToDelete}`);
       deleteFileFromOneDrive(oldFileIdToDelete); // No esperamos (fire-and-forget)
    }

    return res.json({ cv, message: "CV actualizado" });
  } catch (err) { next(err); }
};

// --- Funciones de Descarga (sin cambios, ya estaban bien) ---
export const downloadMyCv = async (req, res, next) => {
  try {
    const cv = await Cv.findOne({ user: req.user._id }).lean();
    if (!cv?.cvFile?.providerId) return res.status(404).json({ message: "No se encontró archivo." });
    const downloadUrl = await getDownloadUrlForFile(cv.cvFile.providerId);
    if (!downloadUrl) return res.status(500).json({ message: "No se pudo obtener enlace." });
    return res.json({ downloadUrl });
  } catch (e) { next(e); }
};

export const downloadCvByApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id).lean();
    const fileId = app?.cvSnapshot?.cvFile?.providerId;
    if (!fileId) return res.status(404).json({ message: "Postulación sin CV adjunto." });
    const downloadUrl = await getDownloadUrlForFile(fileId);
    if (!downloadUrl) return res.status(500).json({ message: "No se pudo obtener enlace." });
    return res.json({ downloadUrl });
  } catch (e) { next(e); }
};

export const downloadCvByUserId = async (req, res, next) => {
  try {
    const cv = await Cv.findOne({ user: req.params.userId }).lean();
    const fileId = cv?.cvFile?.providerId;
    if (!fileId) return res.status(404).json({ message: "Usuario sin CV adjunto." });
    const downloadUrl = await getDownloadUrlForFile(fileId);
    if (!downloadUrl) return res.status(500).json({ message: "No se pudo obtener enlace." });
    return res.json({ downloadUrl });
  } catch (e) { next(e); }
};


// --- Funciones de Admin (Listar/Obtener) ---
export const listAllCVs = async (req, res, next) => {
  try {
    const cvs = await Cv.find()
      .populate("user", "publicId email nombre apellido")
      .sort({ updatedAt: -1 })
      .lean(); // Usar lean para mejor rendimiento si no necesitas métodos de Mongoose
    res.json({ cvs });
  } catch (err) { next(err); }
};

export const getCV = async (req, res, next) => {
  try {
    const cv = await Cv.findById(req.params.id)
      .populate("user", "publicId email nombre apellido")
      .lean();
    if (!cv) return res.status(404).json({ message: "CV no encontrado" });
    res.json({ cv });
  } catch (err) { next(err); }
};


// --- Función applyToSearch (Revisada) ---
export const applyToSearch = async (req, res, next) => {
  try {
    const { id: searchId } = req.params;
    const { _id: userId } = req.user;

    const search = await Search.findById(searchId).lean();
    if (!search || search.estado !== "Activa") {
      return res.status(400).json({ message: "La búsqueda no está activa o no existe." });
    }
    if (await Application.exists({ search: searchId, user: userId })) {
      return res.status(409).json({ message: "Ya estás postulado a esta búsqueda." });
    }
    const cv = await Cv.findOne({ user: userId }).lean();
    if (!cv) {
      return res.status(400).json({ message: "Debes completar tu perfil (CV) antes de postularte." });
    }
    // Opcional: Requerir que el CV tenga archivo
    // if (!cv.cvFile?.providerId) {
    //     return res.status(400).json({ message: "Debes adjuntar tu CV en el perfil para postularte." });
    // }

    const cvSnapshot = { ...cv };
    delete cvSnapshot._id;
    delete cvSnapshot.user;
    delete cvSnapshot.createdAt;
    delete cvSnapshot.updatedAt;

    const app = await Application.create({
      search: searchId,
      user: userId,
      message: req.body.message || "",
      cvRef: cv._id,
      cvSnapshot: cvSnapshot,
    });

    res.status(201).json({ application: app });
  } catch (e) {
    if (e?.code === 11000) {
       return res.status(409).json({ message: "Ya estás postulado (error duplicado)." });
     }
    next(e);
  }
};
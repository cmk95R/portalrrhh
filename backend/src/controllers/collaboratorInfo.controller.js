import createError from "http-errors";
import mongoose from "mongoose";
import dayjs from "dayjs";
import XLSX from "xlsx";

import User from "../models/User.js";
import CollaboratorInfo from "../models/CollaboratorInfo.js";
import { uploadFileToOneDrive } from "../services/oneDrive.service.js";

const EXPORT_LIMIT = 5000;

function parseIntSafe(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseDate(value) {
  if (!value) return undefined;
  const d = dayjs(value);
  return d.isValid() ? d.toDate() : undefined;
}

function formatDate(d) {
  if (!d) return "";
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "";
}

async function uploadProfilePhoto(fotoBase64, userId) {
  if (!fotoBase64 || !fotoBase64.startsWith("data:image")) return null;
  const matches = fotoBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;
  const ext = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const fileName = `profile_${userId}_${Date.now()}.${ext}`;
  const response = await uploadFileToOneDrive(buffer, fileName, "ProfilePhotos");
  if (response?.id) return `/api/users/photo/${response.id}`;
  return null;
}

function getDependenciaLabel(user, info) {
  if (info?.clienteAsignado?.nombre?.trim()) return info.clienteAsignado.nombre.trim();
  if (user?.cliente?.trim()) return user.cliente.trim();
  if (user?.clientes?.length) return user.clientes.map((c) => c.nombre).filter(Boolean).join(", ");
  return "";
}

function mergeCollaboratorRow(user, info) {
  const dependencia = getDependenciaLabel(user, info);
  return {
    _id: user._id,
    publicId: user.publicId,
    nombre: user.nombre,
    apellido: user.apellido,
    segundoNombre: info?.segundoNombre || "",
    dni: user.dni,
    email: user.email,
    telefono: user.telefono,
    foto: user.foto,
    rol: user.rol,
    estado: user.estado,
    nacimiento: user.nacimiento,
    dependencia,
    posicion: info?.clienteAsignado?.posicion || "",
    tieneFicha: !!info,
    info: info || null,
    updatedAt: info?.updatedAt || user.updatedAt,
  };
}

function buildUserFilter({ q, cliente, estado }) {
  const filter = { rol: { $in: ["empleado", "rrhh"] } };
  if (estado && ["activo", "inactivo"].includes(estado)) filter.estado = estado;
  if (q) {
    const rx = new RegExp(String(q).trim(), "i");
    filter.$or = [{ nombre: rx }, { apellido: rx }, { dni: rx }, { email: rx }];
  }
  return filter;
}

function buildListPipeline({ userFilter, cliente, skip, limit }) {
  const pipeline = [
    { $match: userFilter },
    {
      $lookup: {
        from: "collaboratorinfos",
        localField: "_id",
        foreignField: "usuario",
        as: "infoDoc",
      },
    },
    { $addFields: { infoDoc: { $arrayElemAt: ["$infoDoc", 0] } } },
  ];

  if (cliente && String(cliente).trim()) {
    const rx = new RegExp(String(cliente).trim(), "i");
    pipeline.push({
      $match: {
        $or: [
          { cliente: rx },
          { "clientes.nombre": rx },
          { "infoDoc.clienteAsignado.nombre": rx },
        ],
      },
    });
  }

  pipeline.push({
    $facet: {
      items: [{ $sort: { apellido: 1, nombre: 1 } }, { $skip: skip }, { $limit: limit }],
      total: [{ $count: "count" }],
    },
  });

  return pipeline;
}

/** GET /api/admin/collaborators-info */
export const listCollaboratorsInfo = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, q, cliente, estado } = req.query;
    const _page = parseIntSafe(page, 1);
    const _limit = Math.min(parseIntSafe(limit, 20), 100);
    const skip = (_page - 1) * _limit;

    const userFilter = buildUserFilter({ q, estado });
    const [result] = await User.aggregate(buildListPipeline({ userFilter, cliente, skip, limit: _limit }));
    const users = result?.items || [];
    const total = result?.total?.[0]?.count || 0;

    const items = users.map((u) => mergeCollaboratorRow(u, u.infoDoc));
    res.json({ items, total, page: _page, pages: Math.ceil(total / _limit) });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/collaborators-info/:userId */
export const getCollaboratorInfo = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) throw createError(400, "ID inválido.");

    const user = await User.findById(userId).lean();
    if (!user) throw createError(404, "Colaborador no encontrado.");
    if (!["empleado", "rrhh"].includes(user.rol)) {
      throw createError(400, "El usuario no es un colaborador.");
    }

    const info = await CollaboratorInfo.findOne({ usuario: userId }).lean();
    res.json(mergeCollaboratorRow(user, info));
  } catch (error) {
    next(error);
  }
};

function normalizePayload(body) {
  const equipamiento = Array.isArray(body.equipamiento)
    ? body.equipamiento.slice(0, 4)
    : [{}, {}, {}, {}];
  while (equipamiento.length < 4) equipamiento.push({});

  return {
    idEmpleado: body.idEmpleado,
    segundoNombre: body.segundoNombre,
    cuil: body.cuil,
    nacionalidad: body.nacionalidad,
    lugarNacimiento: body.lugarNacimiento,
    estadoCivil: body.estadoCivil,
    domicilio: body.domicilio,
    piso: body.piso,
    departamento: body.departamento,
    localidad: body.localidad,
    provincia: body.provincia,
    codigoPostal: body.codigoPostal,
    telefonoParticular: body.telefonoParticular,
    telefonoMovil: body.telefonoMovil,
    telefonoLaboral: body.telefonoLaboral,
    emailParticular: body.emailParticular,
    emailLaboral: body.emailLaboral,
    fechaIngreso: parseDate(body.fechaIngreso),
    fechaEgreso: parseDate(body.fechaEgreso),
    estudios: body.estudios,
    titulacion: body.titulacion,
    datosMedicos: body.datosMedicos,
    contactoPrincipal: body.contactoPrincipal,
    contactoAlternativo: body.contactoAlternativo,
    datosBancarios: body.datosBancarios,
    equipamiento,
    clienteAsignado: body.clienteAsignado,
  };
}

/** PUT /api/admin/collaborators-info/:userId — admin y rrhh */
export const upsertCollaboratorInfo = async (req, res, next) => {
  try {
    if (!["admin", "rrhh"].includes(req.user.rol)) {
      throw createError(403, "Solo administradores o RRHH pueden cargar o editar fichas de colaboradores.");
    }

    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) throw createError(400, "ID inválido.");

    const user = await User.findById(userId);
    if (!user) throw createError(404, "Colaborador no encontrado.");
    if (!["empleado", "rrhh"].includes(user.rol)) {
      throw createError(400, "El usuario no es un colaborador.");
    }

    const payload = normalizePayload(req.body);

    if (req.body.nombre) user.nombre = String(req.body.nombre).trim();
    if (req.body.apellido) user.apellido = String(req.body.apellido).trim();
    if (req.body.nacimiento) user.nacimiento = parseDate(req.body.nacimiento);
    if (req.body.telefono !== undefined) user.telefono = String(req.body.telefono || "").trim();

    const dep = payload.clienteAsignado?.nombre?.trim();
    if (dep) {
      user.cliente = dep;
      user.clientes = [
        {
          nombre: dep,
          direccion: payload.clienteAsignado?.direccion || user.direccionCliente || "",
          horario: user.horarioLaboral || "",
        },
      ];
    }

    if (req.body.foto && String(req.body.foto).startsWith("data:image")) {
      const photoUrl = await uploadProfilePhoto(req.body.foto, userId);
      if (photoUrl) user.foto = photoUrl;
    }

    await user.save();

    const info = await CollaboratorInfo.findOneAndUpdate(
      { usuario: userId },
      { $set: { ...payload, usuario: userId } },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.json({
      message: "Ficha de colaborador guardada.",
      item: mergeCollaboratorRow(user.toObject(), info),
    });
  } catch (error) {
    next(error);
  }
};

/** POST /api/admin/collaborators-info/:userId/photo — admin y rrhh */
export const uploadCollaboratorPhoto = async (req, res, next) => {
  try {
    if (!["admin", "rrhh"].includes(req.user.rol)) {
      throw createError(403, "Solo administradores o RRHH pueden cargar la foto de perfil.");
    }

    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) throw createError(400, "ID inválido.");

    const user = await User.findById(userId);
    if (!user) throw createError(404, "Colaborador no encontrado.");

    let photoUrl = null;
    if (req.body?.foto && String(req.body.foto).startsWith("data:image")) {
      photoUrl = await uploadProfilePhoto(req.body.foto, userId);
    } else if (req.file?.buffer) {
      const ext = req.file.originalname?.split(".").pop() || "jpg";
      const fileName = `profile_${userId}_${Date.now()}.${ext}`;
      const response = await uploadFileToOneDrive(req.file.buffer, fileName, "ProfilePhotos");
      if (response?.id) photoUrl = `/api/users/photo/${response.id}`;
    }

    if (!photoUrl) throw createError(400, "No se recibió una imagen válida.");

    user.foto = photoUrl;
    await user.save();

    res.json({ message: "Foto actualizada.", foto: photoUrl });
  } catch (error) {
    next(error);
  }
};

function buildExportRows(users) {
  return users.map((u) => {
    const info = u.infoDoc;
    const dm = info?.datosMedicos || {};
    const cp = info?.contactoPrincipal || {};
    const ca = info?.contactoAlternativo || {};
    const db = info?.datosBancarios || {};
    const dep = getDependenciaLabel(u, info);

    return {
      ID: u.publicId || u._id?.toString(),
      Nombre: u.nombre,
      SegundoNombre: info?.segundoNombre || "",
      Apellido: u.apellido,
      DNI: u.dni,
      CUIL: info?.cuil || "",
      DependenciaCliente: dep,
      Posicion: info?.clienteAsignado?.posicion || "",
      EmailLaboral: info?.emailLaboral || u.email,
      TelefonoMovil: info?.telefonoMovil || u.telefono,
      FechaIngreso: formatDate(info?.fechaIngreso),
      FechaEgreso: formatDate(info?.fechaEgreso),
      ObraSocial: dm.obraSocial || "",
      Banco: db.banco || "",
      CBU: db.cbu || "",
      ContactoEmergencia: cp.nombre || "",
      TelefonoEmergencia: cp.telefonos || "",
      FechaActualizacionFicha: info?.updatedAt ? dayjs(info.updatedAt).format("DD/MM/YYYY HH:mm") : "",
    };
  });
}

function buildCsv(rows) {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\r\n");
}

/** GET /api/admin/collaborators-info/export/list */
export const exportCollaboratorsList = async (req, res, next) => {
  try {
    const { format = "xlsx", q, cliente, estado } = req.query;
    const fmt = String(format).toLowerCase();
    if (!["csv", "xlsx"].includes(fmt)) throw createError(400, "Formato: csv o xlsx.");

    const userFilter = buildUserFilter({ q, estado });
    const [result] = await User.aggregate(
      buildListPipeline({ userFilter, cliente, skip: 0, limit: EXPORT_LIMIT })
    );
    const users = result?.items || [];
    const rows = buildExportRows(users);

    const fecha = dayjs().format("YYYY-MM-DD");
    const filename = `${fecha}_colaboradores.${fmt}`;

    if (fmt === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(buildCsv(rows));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

import createError from "http-errors";
import mongoose from "mongoose";
import dayjs from "dayjs";
import XLSX from "xlsx";
import PDFDocument from "pdfkit";

import Asistencia from "../models/attendance.model.js";
import Solicitud from "../models/Request.js";
import User from "../models/User.js";

const EXPORT_LIMIT = 20000;

function parseIntSafe(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function buildCsv(rows) {
  const escapeCell = (value) => {
    const s = value == null ? "" : String(value);
    const needsQuotes = /[,"\r\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  if (!rows || rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines = [];
  lines.push(headers.map(escapeCell).join(","));
  for (const r of rows) {
    lines.push(headers.map((h) => escapeCell(r[h])).join(","));
  }
  return lines.join("\r\n");
}

function setContentDisposition(res, filename) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  const encoded = encodeURIComponent(filename);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`
  );
}

function sendBuffer(res, buffer, { filename, contentType }) {
  res.setHeader("Content-Type", contentType);
  setContentDisposition(res, filename);
  res.send(buffer);
}

function sendText(res, text, { filename, contentType }) {
  res.setHeader("Content-Type", contentType);
  setContentDisposition(res, filename);
  res.send(text);
}

function slugFilenamePart(value, maxLen = 40) {
  if (value == null || value === "") return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
}

async function resolveExportUserName({ usuarioId, q }) {
  if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) {
    const user = await User.findById(usuarioId).select("nombre apellido").lean();
    if (user) return `${user.nombre || ""} ${user.apellido || ""}`.trim();
  }
  if (!q || !String(q).trim()) return "Todos";
  const term = String(q).trim();
  const rx = new RegExp(term, "i");
  const users = await User.find({
    $or: [{ dni: rx }, { nombre: rx }, { apellido: rx }],
  })
    .select("nombre apellido")
    .limit(2)
    .lean();
  if (users.length === 1) {
    return `${users[0].nombre || ""} ${users[0].apellido || ""}`.trim();
  }
  return term;
}

function buildFiltersSummary({ dateFrom, dateTo, estado, tipo, motivo, q, userName }) {
  const parts = [];
  if (dateFrom || dateTo) parts.push(`Período: ${dateFrom || "—"} a ${dateTo || "—"}`);
  if (estado) parts.push(`Estado: ${estado}`);
  if (tipo) parts.push(`Tipo: ${tipo}`);
  if (motivo) parts.push(`Motivo: ${motivo}`);
  if (q) parts.push(`Búsqueda: ${q}`);
  if (userName) parts.push(`Usuario: ${userName}`);
  return parts.join(" • ");
}

/** Formato corto: {fecha}_{tipo}_{usuario}.{ext} */
function buildExportFilename({ reportKey, format, userName }) {
  const fecha = dayjs().format("YYYY-MM-DD");
  const tipo = slugFilenamePart(reportKey);
  const usuario = slugFilenamePart(userName) || "Todos";
  return `${fecha}_${tipo}_${usuario}.${format}`;
}

async function findUsersBySearch(q) {
  const rx = new RegExp(String(q).trim(), "i");
  const usersByDni = await User.find({ dni: rx }).select("_id").lean();
  return usersByDni.map((u) => u._id);
}

function normalizeDateStr(d) {
  if (!d) return null;
  const parsed = dayjs(String(d));
  if (!parsed.isValid()) return null;
  return parsed.format("YYYY-MM-DD");
}

function normalizeFormat(fmt) {
  const f = String(fmt || "").toLowerCase();
  if (["csv", "xlsx", "pdf"].includes(f)) return f;
  return null;
}

function buildPdf({ title, subtitle, rows }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { align: "left" });
    if (subtitle) {
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor("#444").text(subtitle);
      doc.fillColor("#000");
    }
    doc.moveDown(0.8);

    if (!rows || rows.length === 0) {
      doc.fontSize(12).text("Sin resultados para los filtros seleccionados.");
      doc.end();
      return;
    }

    const headers = Object.keys(rows[0]);
    const maxCols = Math.min(headers.length, 6); // PDF simple: máximo 6 columnas
    const cols = headers.slice(0, maxCols);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / maxCols;
    const rowHeight = 14;

    const drawRow = (cells, y, isHeader = false) => {
      doc.fontSize(isHeader ? 9 : 8).font(isHeader ? "Helvetica-Bold" : "Helvetica");
      cols.forEach((k, idx) => {
        const x = doc.page.margins.left + idx * colWidth;
        const text = cells[k] == null ? "" : String(cells[k]);
        doc.text(text, x, y, { width: colWidth - 6, height: rowHeight, lineBreak: false, ellipsis: true });
      });
    };

    let y = doc.y;
    drawRow(Object.fromEntries(cols.map((k) => [k, k])), y, true);
    y += rowHeight;

    for (const r of rows) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawRow(Object.fromEntries(cols.map((k) => [k, k])), y, true);
        y += rowHeight;
      }
      drawRow(r, y, false);
      y += rowHeight;
    }

    doc.end();
  });
}

// -----------------------------
// Asistencias
// -----------------------------

export const getAttendanceReport = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = "fecha",
      sortDir = "desc",
      usuarioId,
      dateFrom,
      dateTo,
      estado,
      motivo,
      q,
    } = req.query;

    const filter = {};
    if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) filter.usuario = usuarioId;
    if (estado) filter.estado = estado;

    const from = normalizeDateStr(dateFrom);
    const to = normalizeDateStr(dateTo);
    if (from || to) {
      filter.fecha = {};
      if (from) filter.fecha.$gte = from;
      if (to) filter.fecha.$lte = to;
    }

    if (motivo) {
      filter.motivo = new RegExp(String(motivo).trim(), "i");
    }

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ nombre: rx }, { apellido: rx }];
    }

    const _page = parseIntSafe(page, 1);
    const _limit = Math.min(parseIntSafe(limit, 20), 200);
    const sort = { [sortBy]: sortDir === "asc" ? 1 : -1 };

    const [items, total] = await Promise.all([
      Asistencia.find(filter).sort(sort).skip((_page - 1) * _limit).limit(_limit).lean(),
      Asistencia.countDocuments(filter),
    ]);

    res.json({ items, total, page: _page, pages: Math.ceil(total / _limit) });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceReportSummary = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, usuarioId } = req.query;

    const match = {};
    if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) match.usuario = new mongoose.Types.ObjectId(usuarioId);

    const from = normalizeDateStr(dateFrom);
    const to = normalizeDateStr(dateTo);
    if (from || to) {
      match.fecha = {};
      if (from) match.fecha.$gte = from;
      if (to) match.fecha.$lte = to;
    }

    const [byEstado, byMotivo] = await Promise.all([
      Asistencia.aggregate([
        { $match: match },
        { $group: { _id: "$estado", count: { $sum: 1 } } },
        { $project: { estado: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ]),
      Asistencia.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $cond: [{ $and: [{ $ne: ["$motivo", null] }, { $ne: ["$motivo", ""] }] }, "$motivo", "Sin motivo"],
            },
            count: { $sum: 1 },
          },
        },
        { $project: { motivo: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
    ]);

    res.json({ byEstado, byMotivo });
  } catch (error) {
    next(error);
  }
};

export const exportAttendanceReport = async (req, res, next) => {
  try {
    const {
      sortBy = "fecha",
      sortDir = "desc",
      usuarioId,
      dateFrom,
      dateTo,
      estado,
      motivo,
      q,
      format,
    } = req.query;

    const fmt = normalizeFormat(format);
    if (!fmt) throw createError(400, "Parámetro format requerido (csv|xlsx|pdf).");

    const filter = {};
    if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) filter.usuario = usuarioId;
    if (estado) filter.estado = estado;

    const from = normalizeDateStr(dateFrom);
    const to = normalizeDateStr(dateTo);
    if (from || to) {
      filter.fecha = {};
      if (from) filter.fecha.$gte = from;
      if (to) filter.fecha.$lte = to;
    }

    if (motivo) filter.motivo = new RegExp(String(motivo).trim(), "i");
    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ nombre: rx }, { apellido: rx }];
    }

    const sort = { [sortBy]: sortDir === "asc" ? 1 : -1 };
    const docs = await Asistencia.find(filter).sort(sort).limit(EXPORT_LIMIT).lean();

    const rows = docs.map((r) => ({
      id: r._id?.toString?.() || "",
      usuarioId: r.usuario?.toString?.() || "",
      nombre: r.nombre || "",
      apellido: r.apellido || "",
      fecha: r.fecha || "",
      diaSemana: r.diaSemana || "",
      estado: r.estado || "",
      motivo: r.motivo || "",
      nota: r.nota || "",
      horaEntrada: r.horaEntrada ? dayjs(r.horaEntrada).format("HH:mm") : "",
      horaSalida: r.horaSalida ? dayjs(r.horaSalida).format("HH:mm") : "",
      horasExtras: typeof r.horasExtras === "number" ? r.horasExtras : 0,
      guardia: r.guardia || "",
      horasFinDeSemana: typeof r.horasFinDeSemana === "number" ? r.horasFinDeSemana : 0,
      autoGenerado: r.autoGenerado ? "si" : "no",
    }));

    const filterMeta = {
      dateFrom: from || dateFrom || null,
      dateTo: to || dateTo || null,
      estado: estado || null,
      motivo: motivo ? String(motivo).trim() : null,
      q: q ? String(q).trim() : null,
    };
    const userName = await resolveExportUserName({ usuarioId, q: filterMeta.q });
    const exportFilename = buildExportFilename({
      reportKey: "asistencias",
      format: fmt,
      userName,
    });
    const filtersLine = buildFiltersSummary({ ...filterMeta, userName });
    const subtitle = [
      `Fecha creación: ${dayjs().format("DD/MM/YYYY HH:mm")}`,
      filtersLine,
      `Registros: ${rows.length}`,
    ]
      .filter(Boolean)
      .join(" • ");

    if (fmt === "csv") {
      const csv = buildCsv(rows);
      return sendText(res, csv, { filename: exportFilename, contentType: "text/csv; charset=utf-8" });
    }

    if (fmt === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asistencias");
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      return sendBuffer(res, buffer, {
        filename: exportFilename,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    }

    const pdfBuffer = await buildPdf({
      title: "Reporte de Asistencias",
      subtitle,
      rows,
    });
    return sendBuffer(res, pdfBuffer, { filename: exportFilename, contentType: "application/pdf" });
  } catch (error) {
    next(error);
  }
};

// -----------------------------
// Solicitudes
// -----------------------------

export const getRequestReport = async (req, res, next) => {
  try {
    const { estado, tipo, usuarioId, dateFrom, dateTo, q, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (estado) filter.estado = estado;
    if (tipo) filter.tipo = tipo;
    if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) filter.usuario = usuarioId;

    const from = dayjs(dateFrom);
    const to = dayjs(dateTo);
    if ((dateFrom && !from.isValid()) || (dateTo && !to.isValid())) {
      throw createError(400, "dateFrom/dateTo inválidos.");
    }
    if (from.isValid() || to.isValid()) {
      // Intersección por rango: [fechaInicio, fechaFin] intersecta [from, to]
      const fromD = from.isValid() ? from.startOf("day").toDate() : null;
      const toD = to.isValid() ? to.endOf("day").toDate() : null;
      if (fromD && toD) {
        filter.fechaInicio = { $lte: toD };
        filter.fechaFin = { $gte: fromD };
      } else if (fromD) {
        filter.fechaFin = { $gte: fromD };
      } else if (toD) {
        filter.fechaInicio = { $lte: toD };
      }
    }

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      const idsByDni = await findUsersBySearch(q);
      filter.$or = [{ nombre: rx }, { apellido: rx }, ...(idsByDni.length ? [{ usuario: { $in: idsByDni } }] : [])];
    }

    const _page = parseIntSafe(page, 1);
    const _limit = Math.min(parseIntSafe(limit, 20), 200);

    const [items, total] = await Promise.all([
      Solicitud.find(filter)
        .sort({ createdAt: -1 })
        .skip((_page - 1) * _limit)
        .limit(_limit)
        .populate("usuario", "nombre apellido email dni")
        .lean(),
      Solicitud.countDocuments(filter),
    ]);

    res.json({ items, total, page: _page, pages: Math.ceil(total / _limit) });
  } catch (error) {
    next(error);
  }
};

export const getRequestReportSummary = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, usuarioId } = req.query;

    const match = {};
    if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) match.usuario = new mongoose.Types.ObjectId(usuarioId);

    const from = dayjs(dateFrom);
    const to = dayjs(dateTo);
    if ((dateFrom && !from.isValid()) || (dateTo && !to.isValid())) {
      throw createError(400, "dateFrom/dateTo inválidos.");
    }
    if (from.isValid() || to.isValid()) {
      const fromD = from.isValid() ? from.startOf("day").toDate() : null;
      const toD = to.isValid() ? to.endOf("day").toDate() : null;
      if (fromD && toD) {
        match.fechaInicio = { $lte: toD };
        match.fechaFin = { $gte: fromD };
      } else if (fromD) {
        match.fechaFin = { $gte: fromD };
      } else if (toD) {
        match.fechaInicio = { $lte: toD };
      }
    }

    const [byTipo, byEstado] = await Promise.all([
      Solicitud.aggregate([
        { $match: match },
        { $group: { _id: "$tipo", count: { $sum: 1 } } },
        { $project: { tipo: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ]),
      Solicitud.aggregate([
        { $match: match },
        { $group: { _id: "$estado", count: { $sum: 1 } } },
        { $project: { estado: "$_id", count: 1, _id: 0 } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({ byTipo, byEstado });
  } catch (error) {
    next(error);
  }
};

export const exportRequestReport = async (req, res, next) => {
  try {
    const { estado, tipo, usuarioId, dateFrom, dateTo, q, format } = req.query;

    const fmt = normalizeFormat(format);
    if (!fmt) throw createError(400, "Parámetro format requerido (csv|xlsx|pdf).");

    const filter = {};
    if (estado) filter.estado = estado;
    if (tipo) filter.tipo = tipo;
    if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) filter.usuario = usuarioId;

    const from = dayjs(dateFrom);
    const to = dayjs(dateTo);
    if ((dateFrom && !from.isValid()) || (dateTo && !to.isValid())) {
      throw createError(400, "dateFrom/dateTo inválidos.");
    }
    if (from.isValid() || to.isValid()) {
      const fromD = from.isValid() ? from.startOf("day").toDate() : null;
      const toD = to.isValid() ? to.endOf("day").toDate() : null;
      if (fromD && toD) {
        filter.fechaInicio = { $lte: toD };
        filter.fechaFin = { $gte: fromD };
      } else if (fromD) {
        filter.fechaFin = { $gte: fromD };
      } else if (toD) {
        filter.fechaInicio = { $lte: toD };
      }
    }

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      const idsByDni = await findUsersBySearch(q);
      filter.$or = [{ nombre: rx }, { apellido: rx }, ...(idsByDni.length ? [{ usuario: { $in: idsByDni } }] : [])];
    }

    const docs = await Solicitud.find(filter).sort({ createdAt: -1 }).limit(EXPORT_LIMIT).lean();

    const rows = docs.map((r) => ({
      id: r._id?.toString?.() || "",
      usuarioId: r.usuario?.toString?.() || "",
      nombre: r.nombre || "",
      apellido: r.apellido || "",
      tipo: r.tipo || "",
      estado: r.estado || "",
      fechaInicio: r.fechaInicio ? dayjs(r.fechaInicio).format("YYYY-MM-DD") : "",
      fechaFin: r.fechaFin ? dayjs(r.fechaFin).format("YYYY-MM-DD") : "",
      cantidadDias: typeof r.cantidadDias === "number" ? r.cantidadDias : "",
      motivo: r.motivo || "",
      documentacionPosterior: r.documentacionPosterior ? "si" : "no",
      respuestaAdmin: r.respuestaAdmin || "",
      createdAt: r.createdAt ? dayjs(r.createdAt).format("YYYY-MM-DD HH:mm") : "",
    }));

    const filterMeta = {
      dateFrom: dateFrom && from.isValid() ? from.format("YYYY-MM-DD") : null,
      dateTo: dateTo && to.isValid() ? to.format("YYYY-MM-DD") : null,
      estado: estado || null,
      tipo: tipo || null,
      q: q ? String(q).trim() : null,
    };
    const userName = await resolveExportUserName({ usuarioId, q: filterMeta.q });
    const exportFilename = buildExportFilename({
      reportKey: "solicitudes",
      format: fmt,
      userName,
    });
    const filtersLine = buildFiltersSummary({ ...filterMeta, userName });
    const subtitle = [
      `Fecha creación: ${dayjs().format("DD/MM/YYYY HH:mm")}`,
      filtersLine,
      `Registros: ${rows.length}`,
    ]
      .filter(Boolean)
      .join(" • ");

    if (fmt === "csv") {
      const csv = buildCsv(rows);
      return sendText(res, csv, { filename: exportFilename, contentType: "text/csv; charset=utf-8" });
    }

    if (fmt === "xlsx") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Solicitudes");
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
      return sendBuffer(res, buffer, {
        filename: exportFilename,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    }

    const pdfBuffer = await buildPdf({
      title: "Reporte de Solicitudes",
      subtitle,
      rows,
    });
    return sendBuffer(res, pdfBuffer, { filename: exportFilename, contentType: "application/pdf" });
  } catch (error) {
    next(error);
  }
};


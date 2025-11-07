import Search, { AREAS, ESTADOS } from "../models/Search.js";

// GET /admin/searches
export const listAdminSearches = async (req, res, next) => {
  try {
    const { q, area, estado } = req.query;
    const filter = {};

    if (q && q.trim()) {
      // usa el text index si existe, y además un OR básico
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ titulo: rx }, { descripcion: rx }, { ubicacion: rx }];
    }
    if (area && AREAS.includes(area)) filter.area = area;
    if (estado && ESTADOS.includes(estado)) filter.estado = estado;

    const items = await Search.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ items });
  } catch (e) { next(e); }
};

// POST /admin/searches
export const createSearch = async (req, res, next) => {
  try {
    const payload = {
      titulo:     (req.body.titulo || "").trim(),
      area:       req.body.area,
      estado:     req.body.estado || "Activa",
      ubicacion:  (req.body.ubicacion || "").trim(),
      descripcion:(req.body.descripcion || "").trim(),
      createdBy:  req.user?._id,
    };

    if (!payload.titulo || !payload.area) {
      return res.status(400).json({ message: "Faltan campos requeridos (título y área)." });
    }

    const search = await Search.create(payload);
    res.status(201).json({ search });
  } catch (e) { next(e); }
};

// PATCH /admin/searches/:id
export const updateSearch = async (req, res, next) => {
  try {
    const allowed = ["titulo", "area", "estado", "ubicacion", "descripcion"];
    const update = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        update[k] = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
      }
    }

    const search = await Search.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true, context: "query" }
    );

    if (!search) return res.status(404).json({ message: "Búsqueda no encontrada" });
    res.json({ search });
  } catch (e) { next(e); }
};
export const listPublicSearches = async (req, res, next) => {
  try {
    const { q, area, estado, page = 1, limit = 50 } = req.query;

    // Filtro base
    const filter = {};

    // Estado: si viene válido lo usamos; si no, por defecto "Activa"
    const estadoValido = typeof estado === "string" && ESTADOS.includes(estado);
    filter.estado = estadoValido ? estado : "Activa";

    // Área opcional
    if (typeof area === "string" && AREAS.includes(area)) {
      filter.area = area;
    }

    // Búsqueda por texto
    if (q && q.trim()) {
      const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      filter.$or = [{ titulo: rx }, { descripcion: rx }, { ubicacion: rx }];
    }

    const _page = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    const [items, total] = await Promise.all([
      Search.find(filter)
        .sort({ updatedAt: -1 })
        .skip((_page - 1) * _limit)
        .limit(_limit)
        .lean(),
      Search.countDocuments(filter),
    ]);

    res.json({ items, total, page: _page, pages: Math.ceil(total / _limit) });
  } catch (e) {
    next(e);
  }
};
export const getPublicSearch = async (req, res, next) => {
  try {
    const s = await Search.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ message: "Búsqueda no encontrada" });
    res.json({ search: s });
  } catch (e) {
    next(e);
  }
};
// DELETE /admin/searches/:id
export const deleteSearch = async (req, res, next) => {
  try {
    const s = await Search.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ message: "Búsqueda no encontrada" });
    res.status(204).end();
  } catch (e) { next(e); }
};

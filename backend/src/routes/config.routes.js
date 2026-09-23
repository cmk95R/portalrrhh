import { Router } from "express";
import Config from "../models/Config.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

// GET /api/config/:key — lee un flag de configuracion (cualquier usuario logueado)
router.get("/:key", requireAuth, async (req, res, next) => {
  try {
    const doc = await Config.findOne({ key: req.params.key }).lean();
    if (!doc) return res.json({ key: req.params.key, value: null });
    res.json({ key: doc.key, value: doc.value });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/config/:key — actualiza un flag (solo admin / rrhh)
router.patch(
  "/:key",
  requireAuth,
  requireRole("admin", "rrhh"),
  async (req, res, next) => {
    try {
      const { value } = req.body;
      const doc = await Config.findOneAndUpdate(
        { key: req.params.key },
        { value },
        { new: true, upsert: true, runValidators: true }
      ).lean();
      res.json({ key: doc.key, value: doc.value });
    } catch (e) {
      next(e);
    }
  }
);

export default router;

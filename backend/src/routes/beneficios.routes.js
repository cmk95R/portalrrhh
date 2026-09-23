import { Router } from "express";
import {
  listBeneficios,
  getBeneficioById,
  listCategorias,
} from "../controllers/beneficios.controller.js";

const router = Router();

router.get("/categorias", listCategorias);
router.get("/", listBeneficios);
router.get("/:id", getBeneficioById);

export default router;

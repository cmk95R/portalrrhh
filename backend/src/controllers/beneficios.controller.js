import { beneficios, CATEGORIAS_BENEFICIOS } from "../data/beneficios.js";

export const listBeneficios = (req, res) => {
  const { categoria, q } = req.query;

  let lista = beneficios;
  if (categoria) {
    lista = lista.filter((b) => b.categoria === categoria);
  }
  if (q) {
    const needle = String(q).toLowerCase();
    lista = lista.filter(
      (b) =>
        b.titulo.toLowerCase().includes(needle) ||
        b.descripcionCorta.toLowerCase().includes(needle)
    );
  }

  res.json({ total: lista.length, items: lista });
};

export const getBeneficioById = (req, res) => {
  const { id } = req.params;
  const beneficio = beneficios.find((b) => b.id === id);
  if (!beneficio) {
    return res.status(404).json({ message: "Beneficio no encontrado" });
  }
  res.json(beneficio);
};

export const listCategorias = (_req, res) => {
  res.json({ items: CATEGORIAS_BENEFICIOS });
};

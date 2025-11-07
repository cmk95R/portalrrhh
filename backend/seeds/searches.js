// seeds/seed.searches.js
import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import "dotenv/config.js";

import Search, { AREAS, ESTADOS } from "../src/models/Search.js";
import User from "../src/models/User.js";

const MONGO_URI = process.env.MONGO_URI;

const titlesByArea = {
  Administracion: [
    "Analista Administrativo",
    "Asistente Contable",
    "Coordinador Administrativo",
    "Auxiliar Administrativo",
  ],
  "Recursos Humanos": [
    "Analista de RRHH",
    "Generalista de RRHH",
    "Recruiter IT",
    "Responsable de Nómina",
  ],
  Sistemas: [
    "Desarrollador Full Stack",
    "QA Manual",
    "QA Automation",
    "Soporte Técnico",
    "DevOps Jr",
  ],
  Pasantia: [
    "Pasantía Administración",
    "Pasantía RRHH",
    "Pasantía Sistemas",
  ],
};

const cities = [
  "CABA, Buenos Aires, AR",
  "La Plata, Buenos Aires, AR",
  "Córdoba, AR",
  "Rosario, Santa Fe, AR",
  "Mendoza, AR",
  "Mar del Plata, Buenos Aires, AR",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weightedEstado = () => {
  const r = Math.random();
  return r < 0.7 ? "Activa" : r < 0.9 ? "Pausada" : "Cerrada";
};

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Conectado a Mongo");

  if (process.env.SEED_CLEAR || process.env.SEED_CLEAR_SEARCHES) {
    const del = await Search.deleteMany({});
    console.log("🧹 Searches eliminadas:", del.deletedCount);
  }

  const admin = await User.findOne({ rol: "admin" }).select("_id").lean();
  const anyUser = await User.findOne().select("_id").lean();
  const creatorId = admin?._id || anyUser?._id || undefined;

  const qty = Number(process.env.SEED_SEARCHES_QTY || 25);
  const docs = Array.from({ length: qty }).map(() => {
    const area = pick(AREAS);
    const titulo = pick(titlesByArea[area]);
    return {
      titulo,
      area,
      estado: weightedEstado(),
      ubicacion: pick(cities),
      descripcion: faker.lorem.paragraphs(2),
      createdBy: creatorId,
    };
  });

  const ins = await Search.insertMany(docs);
  console.log("🔍 Searches insertadas:", ins.length);

  await mongoose.disconnect();
  console.log("✅ Seed de búsquedas OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

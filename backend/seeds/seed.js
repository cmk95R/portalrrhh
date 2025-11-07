// seeds/seed.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import User from "../src/models/User.js"; // ← ajustado a tu estructura
import CV from "../src/models/Cv.js";     // ← ajustado a tu estructura

const AREAS = ["Administracion", "Recursos Humanos", "Sistemas", "Pasantia"];
const NIVELES = [
  "Secundario completo", "Secundario incompleto", "Terciario/Técnico en curso",
  "Terciario/Técnico completo", "Universitario en curso", "Universitario completo",
  "Posgrado en curso", "Posgrado completo",
];

const PASS_PLAIN = "Secret123"; // misma pass para todos para probar

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("⛔ Falta MONGO_URI en .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Conectado a Mongo");

  // Opcional: limpiar colecciones si SEED_CLEAR=true
  if (String(process.env.SEED_CLEAR).toLowerCase() === "true") {
    await Promise.all([CV.deleteMany({}), User.deleteMany({})]);
    console.log("🧹 Colecciones limpiadas");
  }

  // Generar 30 usuarios
  const salt = await bcrypt.genSalt(10);
  const passHash = await bcrypt.hash(PASS_PLAIN, salt);

  const usersPayload = Array.from({ length: 30 }).map(() => {
    const nombre = faker.person.firstName();
    const apellido = faker.person.lastName();
    const email = faker.internet.email({ firstName: nombre, lastName: apellido }).toLowerCase();
    return {
      nombre,
      apellido,
      email,
      password: passHash, // insertMany NO ejecuta pre('save'), por eso hasheamos acá
      rol: "user",
      direccion: {
        ciudad: faker.location.city(),
        provincia: faker.location.state(),
        pais: faker.location.country(),
        codigoPostal: faker.location.zipCode(),
        linea1: faker.location.streetAddress(),
        linea2: "",
      },
    };
  });

  const users = await User.insertMany(usersPayload, { ordered: false });
  console.log(`👤 Usuarios insertados: ${users.length}`);

  // Crear CVs para ~70% de los usuarios
  const usersForCv = users.filter(() => Math.random() < 0.7);
  const cvPayload = usersForCv.map((u) => ({
    user: u._id,
    areaInteres: faker.helpers.arrayElement(AREAS),
    nivelAcademico: faker.helpers.arrayElement(NIVELES),
    telefono: faker.phone.number(),
    linkedin: `https://www.linkedin.com/in/${faker.internet.userName().toLowerCase()}`,
  }));

  const cvs = await CV.insertMany(cvPayload, { ordered: false });
  console.log(`📄 CVs insertados: ${cvs.length}`);

  await Promise.all([User.syncIndexes(), CV.syncIndexes()]);
  console.log("🔧 Índices sincronizados");

  await mongoose.disconnect();
  console.log("✅ Seed OK");
}

run().catch(async (e) => {
  console.error("❌ Seed error:", e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

// scripts/repairUsers.js
import "dotenv/config";           // carga MONGO_URI desde .env
import mongoose from "mongoose";
// ⬇️ Ajusta este import a TU estructura real
import User from "../src/models/User.js"; // si tu modelo está en src/models/User.js

function genPublicId() {
  return `USR-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
}

async function backfillPublicIds() {
  const cursor = User.find({
    $or: [
      { publicId: { $exists: false } },
      { publicId: null },
      { publicId: "" }
    ]
  }).cursor();

  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    let tries = 0;
    while (tries < 5) {
      try {
        doc.publicId = genPublicId();
        await doc.save({ validateBeforeSave: false });
        count++;
        break;
      } catch (e) {
        if (e.code === 11000) { // colisión improbable
          tries++;
          continue;
        }
        throw e;
      }
    }
  }
  return count;
}

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("Falta MONGO_URI en .env");
  await mongoose.connect(process.env.MONGO_URI);

  console.log("DB conectada:", mongoose.connection.name);
  console.log("Colección:", User.collection.name);

  // 1) Quitar campo 'id' residual en documentos (si quedó de antes)
  const unsetRes = await User.updateMany({}, { $unset: { id: "" } });
  console.log("Docs con campo 'id' limpiados:", unsetRes.modifiedCount);

  // 2) Índices ANTES
  const before = await User.collection.indexes();
  console.log("Índices ANTES:", before);

  // 3) Intentar borrar índice viejo 'id_1' (si existe)
  try {
    await User.collection.dropIndex("id_1");
    console.log("Índice 'id_1' eliminado");
  } catch (e) {
    console.log("dropIndex id_1:", e.message); // ok si dice "index not found"
  }

  // 4) Backfill de publicId faltantes (para que el índice parcial no choque)
  const filled = await backfillPublicIds();
  console.log("publicId generados:", filled);

  // 5) Sincronizar índices con tu schema actual (crea/borra lo necesario)
  const syncRes = await User.syncIndexes();
  console.log("syncIndexes:", syncRes);

  // 6) Índices DESPUÉS
  const after = await User.collection.indexes();
  console.log("Índices DESPUÉS:", after);

  await mongoose.disconnect();
  console.log("OK ✅");
};

run().catch(e => {
  console.error(e);
  process.exit(1);
});

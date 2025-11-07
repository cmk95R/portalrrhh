// src/db/db.js (ESM)
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // ✅ Desde Mongoose 7/8 no hace falta pasar opciones deprecadas
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Conexión a MongoDB Atlas exitosa");
  } catch (err) {
    console.error("Error al conectar con MongoDB:", err.message);
    process.exit(1);
  }
};

export default connectDB;

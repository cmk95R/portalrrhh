import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true, trim: true },
  direccion: { type: String, trim: true, default: "" },
  horario: { type: String, trim: true, default: "" },
}, { timestamps: true });

export default mongoose.model("Client", clientSchema);
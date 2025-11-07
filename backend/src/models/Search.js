import mongoose from "mongoose";

export const AREAS = ["Administracion", "Recursos Humanos", "Sistemas", "Pasantia"];
export const ESTADOS = ["Activa", "Pausada", "Cerrada"];

const searchSchema = new mongoose.Schema(
  {
    titulo:     { type: String, required: true, trim: true },
    area:       { type: String, enum: AREAS, required: true },
    estado:     { type: String, enum: ESTADOS, default: "Activa" },
    ubicacion:  { type: String, trim: true, default: "" },
    descripcion:{ type: String, trim: true, default: "" },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Búsqueda simple por texto (opcional, ayuda para ?q= )
searchSchema.index({ titulo: "text", descripcion: "text", ubicacion: "text" });

export default mongoose.model("Search", searchSchema);

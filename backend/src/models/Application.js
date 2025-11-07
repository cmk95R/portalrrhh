import mongoose from "mongoose";

export const APP_STATES = [
  "Enviada",
  "En revisión",
  "Preseleccionado",
  "Rechazado",
  "Contratado",
];

const appSchema = new mongoose.Schema(
  {
    search: { type: mongoose.Schema.Types.ObjectId, ref: "Search", required: true, index: true },
    user:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    state:  { type: String, enum: APP_STATES, default: "Enviada" },
    message:{ type: String, trim: true, default: "" },

    // Snapshot del CV que se postula    cvRef:  { type: mongoose.Schema.Types.ObjectId, ref: "Cv" },
    cvSnapshot: {
      nombre: String,
      apellido: String,
      email: String,
      telefono: String,
      linkedin: String,
      areaInteres: String,
      nivelAcademico: String,
      // --- CORRECCIÓN CLAVE ---
      // Añadimos la estructura para guardar la info del archivo del CV.
      cvFile: {
        filename: String,
        mimetype: String,
        size: Number,
        provider: String,
        providerId: String,
      },
    },
  },
  { timestamps: true }
);

// Un usuario NO puede postularse dos veces a la misma búsqueda
appSchema.index({ search: 1, user: 1 }, { unique: true });

export default mongoose.model("Application", appSchema);

import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true, unique: true, trim: true },
        direccion: { type: String, default: "", trim: true },
        horario: { type: String, default: "", trim: true },

        // Puedes agregar más campos útiles a futuro:
        // contacto: { type: String },
        // telefono: { type: String },
        // email: { type: String },
        // ubicacion: { lat: Number, lng: Number }, // Para geolocalización
        activo: { type: Boolean, default: true }
    },
    { timestamps: true }
);

export default mongoose.model("Client", clientSchema);
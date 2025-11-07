// models/Cv.js
import mongoose from "mongoose";

const OPCIONES_AREA = ["Administracion", "Recursos Humanos", "Sistemas", "Pasantia"];
const NIVELES = [
  "Secundario completo", "Secundario incompleto", "Terciario/Técnico en curso",
  "Terciario/Técnico completo", "Universitario en curso", "Universitario completo",
  "Posgrado en curso", "Posgrado completo",
];

// Convierte "" o null a undefined → no dispara enum si no es required
const sanitizeEmpty = v => (v === "" || v == null ? undefined : v);

const experienciaSchema = new mongoose.Schema({
  puesto: { type: String, trim: true },
  empresa: { type: String, trim: true },
  desde: { type: Date },
  hasta: { type: Date },
}, { _id: false });

const educacionSchema = new mongoose.Schema({
  nivelAcademico: { type: String, enum: NIVELES, set: sanitizeEmpty },
  carrera: { type: String, trim: true },
  institucion: { type: String, trim: true },
  desde: { type: Date },
  hasta: { type: Date },
}, { _id: false });


const cvSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },

  telefono: { type: String, trim: true, default: "" },
  linkedin: { type: String, trim: true, default: "" },

  nacimiento: { type: Date, trim: true },
  perfil: { type: String, trim: true, default: "" }, // Resumen profesional
  // El campo 'direccion' se elimina de aquí. La única fuente de verdad será el modelo User.
  
  // ❗ Sin default; permite undefined. Si llega "", lo convierte a undefined.
  areaInteres: {
    type: String,
    enum: OPCIONES_AREA,
    required: false,
    default: undefined,
    set: sanitizeEmpty
  },

  // Estructura de educación como un array de objetos
  educacion: [educacionSchema],
  experiencia: [experienciaSchema],
  cvFile: {
    filename: { type: String }, // Nombre del archivo en el servidor
    mimetype: { type: String }, // Tipo de archivo (e.g., 'application/pdf')
    size: { type: Number },     // Tamaño en bytes
    url: { type: String },      // URL para ver/descargar el archivo (en este caso, de OneDrive)
    provider: { type: String }, // Proveedor de almacenamiento (e.g., 'onedrive', 'local')
    providerId: { type: String } // ID único del archivo en el proveedor
  },
}, { timestamps: true });

cvSchema.index({ areaInteres: 1, updatedAt: -1 });

export default mongoose.model("Cv", cvSchema);

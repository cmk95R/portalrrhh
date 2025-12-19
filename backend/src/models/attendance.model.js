import mongoose from "mongoose";

const asistenciaSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    nombre: { type: String, required: true },
    apellido: { type: String, required: true },

    // Fecha del registro (un documento por día)
    fecha: {
      type: String, // Formato YYYY-MM-DD
      required: true,
      index: true,
    },

    diaSemana: {
      type: String,
      enum: [
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
        "domingo"
      ],
      required: true,
    },

    // Estado de asistencia (solo lunes a viernes)
    estado: {
      type: String,
      enum: ["presente", "ausente", "no-aplica"], 
      default: "no-aplica" 
    },

    // Motivo de ausencia (si estado es 'ausente')
    motivo: { type: String, default: null },

    // Nota adicional o observación
    nota: { type: String, default: null },

    // Para fichaje a futuro
    horaEntrada: { type: Date, default: null },
    horaSalida: { type: Date, default: null },

    // Horas extras de lunes a viernes
    horasExtras: { type: Number, default: 0 },

    // Guardias de fin de semana
    guardia: {
      type: String,
      enum: ["ninguna", "pasiva", "activa"], 
      default: "ninguna"
    },

    // Horas trabajadas si fue guardia activa
    horasFinDeSemana: { type: Number, default: 0 },

    // Cuando la semana se completa automáticamente
    autoGenerado: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Evita dos registros del mismo usuario en el mismo día
asistenciaSchema.index({ usuario: 1, fecha: 1 }, { unique: true });

const Asistencia = mongoose.model("Asistencia", asistenciaSchema);
export default Asistencia;

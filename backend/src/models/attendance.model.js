import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  // Referencia al usuario que realiza el fichaje.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Asegúrate de que tu modelo de usuario se llame 'User'
    required: true,
    index: true, // Indexamos para búsquedas rápidas por usuario.
  },
  // Guardamos el nombre y apellido para facilitar las consultas
  nombre: {
    type: String,
    required: true,
  },
  apellido: {
    type: String,
    required: true,
  },
  // Fecha y hora de entrada.
  clockInTime: {
    type: Date,
    required: true,
  },
  // IP desde donde se ficha la entrada (para auditoría).
  clockInIp: {
    type: String,
  },
  // Fecha y hora de salida (opcional hasta que se ficha).
  clockOutTime: {
    type: Date,
  },
  // IP de salida.
  clockOutIp: {
    type: String,
  },
  // Estado del registro: 'active' (solo entrada) o 'completed' (entrada y salida).
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
  // Notas que el empleado quiera añadir (ej: "Visita a cliente").
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true, // Añade createdAt y updatedAt automáticamente.
});

// Índice compuesto para asegurar que un usuario solo tenga un registro 'active' a la vez.
attendanceSchema.index({ user: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'active' }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;

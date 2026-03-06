import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nombre: { type: String }, // Desnormalizado para facilitar reportes
  apellido: { type: String },
  tipo: { 
    type: String, 
    enum: ['vacaciones', 'dia_estudio', 'mudanza', 'maternidad', 'paternidad', 'enfermedad', 'otro'], 
    required: true 
  },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true }, // Para días únicos, inicio == fin
  cantidadDias: { type: Number, required: true }, // Calculado en backend excluyendo fines de semana/feriados si aplica
  estado: { 
    type: String, 
    enum: ['pendiente', 'en_revision', 'pendiente_firma', 'aprobada', 'rechazada', 'cancelada'], 
    default: 'pendiente' 
  },
  motivo: { type: String }, // Descripción opcional del usuario
  // Si el empleado indicó que subirá la documentación más tarde
  documentacionPosterior: { type: Boolean, default: false },
  respuestaAdmin: { type: String }, // Nota del admin al aprobar/rechazar
  archivosAdjuntos: [{ 
    nombre: String, 
    oneDriveId: String, 
    url: String 
  }], // Para certificados de examen
  documentoParaFirma: { // Documento subido por Admin para que el usuario firme
    nombre: String,
    oneDriveId: String,
    url: String
  },
  comentarios: [{
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    esAdmin: { type: Boolean, default: false },
    nombreAutor: { type: String, required: true },
    texto: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('Solicitud', requestSchema);

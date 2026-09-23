import mongoose from "mongoose";

const { Schema } = mongoose;

const contactoUrgenciaSchema = new Schema(
  {
    nombre: { type: String, trim: true, default: "" },
    parentesco: { type: String, trim: true, default: "" },
    domicilio: { type: String, trim: true, default: "" },
    telefonos: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const equipoSchema = new Schema(
  {
    producto: { type: String, trim: true, default: "" },
    marca: { type: String, trim: true, default: "" },
    modeloSerie: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const collaboratorInfoSchema = new Schema(
  {
    usuario: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    idEmpleado: { type: String, trim: true, default: "" },
    segundoNombre: { type: String, trim: true, default: "" },
    cuil: { type: String, trim: true, default: "" },
    nacionalidad: { type: String, trim: true, default: "" },
    lugarNacimiento: { type: String, trim: true, default: "" },
    estadoCivil: { type: String, trim: true, default: "" },
    domicilio: { type: String, trim: true, default: "" },
    piso: { type: String, trim: true, default: "" },
    departamento: { type: String, trim: true, default: "" },
    localidad: { type: String, trim: true, default: "" },
    provincia: { type: String, trim: true, default: "" },
    codigoPostal: { type: String, trim: true, default: "" },
    telefonoParticular: { type: String, trim: true, default: "" },
    telefonoMovil: { type: String, trim: true, default: "" },
    telefonoLaboral: { type: String, trim: true, default: "" },
    emailParticular: { type: String, trim: true, default: "" },
    emailLaboral: { type: String, trim: true, default: "" },
    fechaIngreso: { type: Date },
    fechaEgreso: { type: Date },
    estudios: { type: String, trim: true, default: "" },
    titulacion: { type: String, trim: true, default: "" },

    datosMedicos: {
      obraSocialAportes: { type: String, trim: true, default: "" },
      obraSocial: { type: String, trim: true, default: "" },
      empresaCobertura: { type: String, trim: true, default: "" },
      numeroSocio: { type: String, trim: true, default: "" },
      planCobertura: { type: String, trim: true, default: "" },
      telefonoEmergenciaVida: { type: String, trim: true, default: "" },
      telefonoUrgencias: { type: String, trim: true, default: "" },
      grupoSanguineo: { type: String, trim: true, default: "" },
      alergias: { type: String, trim: true, default: "" },
      afeccionesCronicas: { type: String, trim: true, default: "" },
      empresaEmergencias: { type: String, trim: true, default: "" },
      telefonoEmpresaEmergencias: { type: String, trim: true, default: "" },
      numeroSocioEmergencias: { type: String, trim: true, default: "" },
    },

    contactoPrincipal: { type: contactoUrgenciaSchema, default: () => ({}) },
    contactoAlternativo: { type: contactoUrgenciaSchema, default: () => ({}) },

    datosBancarios: {
      banco: { type: String, trim: true, default: "" },
      tipoCuenta: { type: String, trim: true, default: "" },
      numeroCuenta: { type: String, trim: true, default: "" },
      cbu: { type: String, trim: true, default: "" },
    },

    equipamiento: {
      type: [equipoSchema],
      default: () => [{}, {}, {}, {}],
      validate: {
        validator: (v) => Array.isArray(v) && v.length <= 4,
        message: "Máximo 4 equipos",
      },
    },

    /** Dependencia (Cliente) asignado */
    clienteAsignado: {
      nombre: { type: String, trim: true, default: "" },
      posicion: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("CollaboratorInfo", collaboratorInfoSchema);

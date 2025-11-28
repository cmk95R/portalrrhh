import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

// Roles permitidos en el sistema
const roles = ["empleado", "admin", "rrhh"];

// --- Sub-esquema para Provincia ---
const provinciaSchema = new Schema(
  {
    id: { type: String, trim: true },
    nombre: { type: String, trim: true },
  },
  { _id: false }
);

// --- Sub-esquema para Dirección ---
const direccionSchema = new Schema(
  {
    pais: { type: String, trim: true, default: "Argentina" },
    provincia: { type: provinciaSchema }, // { id, nombre }
    localidad: { type: String, trim: true },
    municipio: { type: Schema.Types.Mixed, default: "" },
    calle: { type: String, trim: true },
    numero: { type: String, trim: true },
    cp: { type: String, trim: true },
  },
  { _id: false }
);

// --- Esquema principal de Usuario (Empleado/Admin/RRHH) ---
const userSchema = new Schema(
  {
    publicId: {
      type: String,
      trim: true,
      default: () =>
        `USR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    },

    // Datos personales
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },

    dni: {
      type: String,
      trim: true,
      unique: true,
      required: true, // clave principal de login
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    nacimiento: { type: Date, trim: true },

    foto: { type: String, trim: true }, // URL o path de foto de perfil

    // 🔐 PIN hasheado (se usa como "password" internamente)
    // A nivel negocio es un PIN numérico corto, pero se guarda hasheado
    password: {
      type: String,
      trim: true,
      select: false,
      required: true, // ya no dependemos de Google login en esta app
    },

    telefono: { type: String, trim: true },

    // Rol del usuario dentro del sistema
    rol: {
      type: String,
      enum: roles,
      default: "empleado",
    },

    // Estado del usuario (para activar/desactivar acceso)
    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "activo",
    },

    // Dirección personal (si la necesitás)
    direccion: {
      type: direccionSchema,
      default: () => ({}),
    },

    // --- Datos laborales / de asignación simple ---
    cliente: { type: String, trim: true }, // nombre del cliente donde trabaja
    direccionCliente: { type: String, trim: true },
    horarioLaboral: { type: String, trim: true }, // ej: "09:00-18:00"

    // Opcional: integración con proveedores externos (si más adelante lo usás)
    providers: {
      google: { id: String, email: String },
    },

    // Verificación de email (si querés usarla)
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
  },
  { timestamps: true }
);

// Índice único por publicId (por si usás el código público)
userSchema.index(
  { publicId: 1 },
  {
    unique: true,
    partialFilterExpression: { publicId: { $type: "string" } },
  }
);

// 🔐 Hasheo del PIN (password) antes de guardar
userSchema.pre("save", async function (next) {
  // Si no cambió el PIN / password, no rehashees
  if (!this.isModified("password") || !this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Token para verificación de email (si lo usás)
userSchema.methods.generateEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString("hex");

  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hs

  return verificationToken;
};

// Comparar PIN en texto plano contra hash guardado
userSchema.methods.comparePassword = function (plainPassword) {
  if (!this.password) return false;
  return bcrypt.compare(plainPassword, this.password);
};

// Ocultar campos sensibles al convertir a JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

export default mongoose.model("User", userSchema);

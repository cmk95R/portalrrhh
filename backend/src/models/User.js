import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;
const roles = ["user", "admin", "rrhh"];

// --- ✅ CORRECCIÓN 1: Definir un sub-esquema para el objeto Provincia ---
const provinciaSchema = new Schema({
    id: { type: String, trim: true },
    nombre: { type: String, trim: true }
}, { _id: false });

const direccionSchema = new Schema(
  {
    pais: { type: String, trim: true, default: "Argentina" },
    
    // --- ✅ CORRECCIÓN 2: Aplicar los tipos correctos ---
    provincia: { type: provinciaSchema }, // Provincia es un objeto que usa el sub-esquema
    localidad: { type: String, trim: true }, // Localidad es un string (esto ya lo tenías bien)
    // ---
    
    municipio: { type: Schema.Types.Mixed, default: "" },
    calle: { type: String, trim: true },
    numero: { type: String, trim: true },
    cp: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new Schema(
    {
        publicId: {
            type: String,
            trim: true,
            default: () => `USR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        },
        nombre: { type: String, required: true, trim: true },
        apellido: { type: String, required: true, trim: true },
        telefono: { type: String, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: {
            type: String,
            trim: true,
            select: false,
            required: function () {
                return !this.providers?.google?.id;
            },
        },
        nacimiento: { type: Date, trim: true },
        rol: { type: String, enum: roles, default: "user" },
        estado: {
            type: String,
            enum: ['activo', 'inactivo'],
            default: 'activo'
        },
        direccion: { type: direccionSchema, default: () => ({}) }, // Se usa el esquema corregido
        providers: {
            google: { id: String, email: String },
        },
        // Mantenemos los campos de verificación (aunque no los estés usando)
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationToken: String,
        emailVerificationExpires: Date,
    },
    { timestamps: true }
);

// --- (El resto de tus métodos, índices y hooks no cambian) ---

userSchema.index({ publicId: 1 }, { unique: true, partialFilterExpression: { publicId: { $type: "string" } } });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Añadido el método faltante generateEmailVerificationToken
userSchema.methods.generateEmailVerificationToken = function () {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    this.emailVerificationToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    return verificationToken;
};

userSchema.methods.comparePassword = function (plainPassword) {
    if (!this.password) return false;
    return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpires;
    return obj;
};

export default mongoose.model("User", userSchema);
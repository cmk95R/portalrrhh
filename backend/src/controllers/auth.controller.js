// controllers/auth.controller.js
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { normalizeDireccion } from "../utils/normalize.js"; // <-- ¡NUEVA IMPORTACIÓN!
import { validationResult } from "express-validator";

const signToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), sub: user._id.toString(), rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// POST /auth/register
export const register = async (req, res, next) => {
  try {
    // --- INICIO: VALIDACIÓN ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Si hay errores de validación, respondemos con un 400 y la lista de errores.
      return res.status(400).json({ errors: errors.array() });
    }
    // --- FIN: VALIDACIÓN ---

    let { nombre, apellido, email, password, direccion, rol, nacimiento } = req.body;

    // Evitar duplicados
    const exists = await User.exists({ email: req.body.email }); // Usamos el email ya normalizado
    if (exists) return res.status(409).json({ message: "El email ya está registrado" });

    // Seguridad: no permitir admin desde registro público
    const safeRole = rol === "admin" ? "user" : (rol || "user");

    // Normalizar dirección al formato esperado
    const direccionNorm = normalizeDireccion(direccion);

    // Construir payload (el hash lo hace el pre('save') del modelo si lo tenés)
    const payload = {
      nombre,
      apellido,
      email,
      password,
      rol: safeRole,  
      nacimiento,     
    };
    if (direccionNorm) payload.direccion = direccionNorm;

    const user = await User.create(payload);

    // El registro fue exitoso, no se envía correo.
    res.status(201).json({
      message: "Registro exitoso. ¡Bienvenido!",
    });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.email) {
      return res.status(409).json({ message: "El email ya está registrado" });
    }
    next(err);
  }
};
// POST /auth/login
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // El email ya viene normalizado por express-validator
    const user = await User.findOne({ email: email }).select("+password");
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });

    // --- ¡VERIFICACIÓN CLAVE! ---
    // Si el usuario está inactivo, denegamos el inicio de sesión.
    if (user.estado === 'inactivo') {
      return res.status(403).json({ message: "Tu cuenta está inhabilitada. Contacta al administrador." });
    }

    // --- INICIO: COMPROBACIÓN DE VERIFICACIÓN ---
    // Impedir login si el email no está verificado
    const isProviderUser = !!user.providers?.google?.id;
    if (!user.password && !isProviderUser) {
      return res.status(401).json({ message: "Esta cuenta fue creada usando Google. Por favor, inicia sesión con Google." });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Credenciales inválidas" });

    const token = signToken(user);
    return res.json({
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        estado: user.estado,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

// GET /auth/me
export const me = async (req, res) => {
  // req.user es el documento completo de Mongoose, lo convertimos a objeto plano
  const userObj = req.user.toObject();

  res.json({
    user: {
      id: userObj._id,
      nombre: userObj.nombre,
      apellido: userObj.apellido,
      email: userObj.email,
      rol: userObj.rol,
      direccion: userObj.direccion, // Devolvemos el objeto de dirección completo
      nacimiento: userObj.nacimiento, // Y la fecha de nacimiento
    },
  });
};

// POST /auth/logout (opcional)
export const logout = (_req, res) => res.status(204).end();

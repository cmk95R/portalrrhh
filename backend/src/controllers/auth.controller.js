import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { normalizeDireccion } from "../utils/normalize.js";
import { validationResult } from "express-validator";

const signToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), sub: user._id.toString(), rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// ⚠️ IMPORTANTE:
// Este "register" NO debería ser público.
// Usalo como "crear usuario" y protegelo con middleware isAdmin / isRRHH.

// POST /auth/register  (solo admin / rrhh)
export const register = async (req, res, next) => {
  try {
    // --- VALIDACIÓN ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Recibimos los datos (ahora usamos pin en vez de password a nivel negocio)
    let {
      nombre,
      apellido,
      email,
      pin,             // <- PIN en texto plano que viene del form
      direccion,
      rol,
      nacimiento,
      dni,
      foto,
      cliente,
      direccionCliente,
      horarioLaboral,
      telefono,
      clientes, // 👈 Capturamos el array de clientes del body
    } = req.body;

    // Email obligatorio (si así lo definiste)
    const emailExists = await User.exists({ email });
    if (emailExists)
      return res.status(409).json({ message: "El email ya está registrado" });

    // DNI obligatorio y único
    if (!dni) {
      return res.status(400).json({ message: "El DNI es obligatorio" });
    }
    const dniExists = await User.exists({ dni });
    if (dniExists)
      return res.status(409).json({ message: "El DNI ya está registrado" });

    // PIN obligatorio
    if (!pin) {
      return res.status(400).json({ message: "El PIN es obligatorio" });
    }

    // Podés validar que sea numérico y de cierta longitud
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        message: "El PIN debe ser numérico y tener entre 4 y 6 dígitos",
      });
    }

    // Roles permitidos en la app
    const allowedRoles = ["empleado", "admin", "rrhh"];
    const safeRole = allowedRoles.includes(rol) ? rol : "empleado";

    // Normalizar dirección (si viene algo)
    const direccionNorm = normalizeDireccion(direccion);

    // Construir payload para User.create
    const payload = {
      nombre,
      apellido,
      email,
      password: pin, // ⚠️ acá guardamos el PIN, el pre-save del modelo lo hashea
      rol: safeRole,

      nacimiento: nacimiento || null,
      dni,
      foto: foto || "",
      cliente: cliente || "",
      direccionCliente: direccionCliente || "",
      horarioLaboral: horarioLaboral || "",
      telefono: telefono || "",
      clientes: clientes || [], // 👈 Lo agregamos al payload de creación
    };

    if (direccionNorm) payload.direccion = direccionNorm;

    const user = await User.create(payload);

    res.status(201).json({
      message: "Usuario creado correctamente",
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        dni: user.dni,
        rol: user.rol,
        cliente: user.cliente,
        clientes: user.clientes,
      },
    });
  } catch (err) {
    // Manejo de errores de índice único (Duplicados)
    if (err?.code === 11000) {
      if (err?.keyPattern?.email) {
        return res.status(409).json({ message: "El email ya está registrado" });
      }
      if (err?.keyPattern?.dni) {
        return res.status(409).json({ message: "El DNI ya está registrado" });
      }
    }
    next(err);
  }
};

// POST /auth/login
// Ahora el login es por DNI + PIN
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dni, pin } = req.body;

    if (!dni || !pin) {
      return res
        .status(400)
        .json({ message: "DNI y PIN son obligatorios para iniciar sesión" });
    }

    // Buscamos por DNI y traemos el password (PIN hasheado)
    const user = await User.findOne({ dni }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    if (user.estado === "inactivo") {
      return res.status(403).json({
        message:
          "Tu cuenta está inhabilitada. Contacta al administrador o RRHH.",
      });
    }

    // Comparamos PIN plano vs hash (usa comparePassword del model)
    const ok = await user.comparePassword(pin);
    if (!ok) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = signToken(user);

    return res.json({
      user: {
        id: user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        dni: user.dni,
        foto: user.foto,
        cliente: user.cliente,
        direccionCliente: user.direccionCliente,
        horarioLaboral: user.horarioLaboral,
        clientes: user.clientes,
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
  // req.user es el documento completo de Mongoose (lo setea un middleware de auth)
  const userObj = req.user.toObject();

  res.json({
    user: {
      id: userObj._id,
      nombre: userObj.nombre,
      apellido: userObj.apellido,
      email: userObj.email,
      dni: userObj.dni,
      foto: userObj.foto,
      cliente: userObj.cliente,
      direccionCliente: userObj.direccionCliente,
      horarioLaboral: userObj.horarioLaboral,
      clientes: userObj.clientes,
      rol: userObj.rol,
      direccion: userObj.direccion,
      nacimiento: userObj.nacimiento,
      estado: userObj.estado,
    },
  });
};

// POST /auth/logout (opcional)
export const logout = (_req, res) => res.status(204).end();

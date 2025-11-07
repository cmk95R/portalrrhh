import { Router } from "express";
// Importa los controladores necesarios
import { register, login, me, logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import passport from "passport";
import { body } from "express-validator";

// --- Validaciones (sin cambios) ---
const registerValidations = [
  body("nombre").trim().notEmpty().withMessage("El nombre es requerido.").isLength({ min: 2 }).withMessage("Mínimo 2 caracteres.").matches(/^[a-zA-ZÀ-ÿ\s']+$/).withMessage("Nombre inválido."),
  body("apellido").trim().notEmpty().withMessage("El apellido es requerido.").isLength({ min: 2 }).withMessage("Mínimo 2 caracteres.").matches(/^[a-zA-ZÀ-ÿ\s']+$/).withMessage("Apellido inválido."),
  body("email", "El email no es válido").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres.").matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,])/).withMessage("La contraseña debe incluir mayúscula, minúscula, número y símbolo."),
];
const loginValidations = [
  body("email", "El email no es válido").isEmail().normalizeEmail(),
  body("password", "La contraseña es requerida").notEmpty(),
];

const router = Router();

// --- Rutas Estándar (montadas bajo /api/auth) ---

// POST /api/auth/register - Registro de nuevo usuario
router.post("/register", registerValidations, register);

// POST /api/auth/login - Inicio de sesión
router.post("/login", loginValidations, login);

// GET /api/auth/me - Obtener datos del usuario logueado
router.get("/me", requireAuth, me); // <-- CAMBIO: Se usa /me en lugar de /profile

// POST /api/auth/logout - Cierre de sesión (opcional, depende de tu manejo de tokens en el front)
router.post("/logout", logout);

// GET /api/auth/verify-email - Endpoint para validar el token del correo
// router.get("/verify-email", verifyEmail); // <-- AÑADIDO: Asegura que esta ruta exista

// --- Rutas de Google OAuth (montadas bajo /api/auth) ---

// GET /api/auth/google - Iniciar flujo de Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], prompt: "consent" }));

// GET /api/auth/google/callback - Callback de Google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false, // Usamos JWT, no sesiones de Passport
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`, // URL de error más específica
  }),
  (req, res) => {
    // Redirige al frontend con el token para que procese el login
    const token = req.user?.token;
    if (!token) {
        // Si por alguna razón no hay token, redirige con error
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_generation_failed`);
    }
    const url = new URL(`${process.env.FRONTEND_URL}/login/sso`); // Ruta del frontend que procesa el token
    url.searchParams.set("token", token);
    return res.redirect(url.toString());
  }
);

export default router;
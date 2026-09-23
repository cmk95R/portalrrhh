import { Router } from "express";
import { register, login, me, logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js"; // 👈 ojo con la 's'
import { requireRole } from "../middleware/role.middleware.js";
import passport from "passport";
import { body } from "express-validator";

// --- Validaciones de REGISTER (las podés ajustar luego si querés usar PIN también acá) ---
const registerValidations = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es requerido.")
    .isLength({ min: 2 }).withMessage("Mínimo 2 caracteres.")
    // Permitimos letras, números, espacios y '
    .matches(/^[a-zA-ZÀ-ÿ0-9\s']+$/).withMessage("Nombre inválido."),
  
  body("apellido")
    .trim()
    .notEmpty().withMessage("El apellido es requerido.")
    .isLength({ min: 2 }).withMessage("Mínimo 2 caracteres.")
    .matches(/^[a-zA-ZÀ-ÿ0-9\s']+$/).withMessage("Apellido inválido."),
  
  body("email", "El email no es válido")
    .isEmail()
    .normalizeEmail(),

  // ✅ Ahora validamos DNI
  body("dni")
    .notEmpty().withMessage("El DNI es obligatorio.")
    .isLength({ min: 6, max: 9 }).withMessage("El DNI debe tener entre 6 y 9 dígitos.")
    .matches(/^\d+$/).withMessage("El DNI debe ser numérico."),

  // ✅ Y validamos PIN (en lugar de password)
  body("pin")
    .notEmpty().withMessage("El PIN es obligatorio.")
    .isLength({ min: 4, max: 6 }).withMessage("El PIN debe tener entre 4 y 6 dígitos.")
    .matches(/^\d+$/).withMessage("El PIN debe ser numérico."),
];


// --- ✅ VALIDACIONES DE LOGIN: AHORA CON DNI + PIN ---
const loginValidations = [
  body("dni")
    .notEmpty().withMessage("El DNI es requerido.")
    .isLength({ min: 6, max: 9 }).withMessage("El DNI debe tener entre 6 y 9 dígitos.")
    .matches(/^\d+$/).withMessage("El DNI debe ser numérico."),
  body("pin")
    .notEmpty().withMessage("El PIN es requerido.")
    .isLength({ min: 4, max: 6 }).withMessage("El PIN debe tener entre 4 y 6 dígitos.")
    .matches(/^\d+$/).withMessage("El PIN debe ser numérico."),
];

const router = Router();

// --- Rutas Estándar (montadas bajo /api/auth) ---

// POST /api/auth/register - Solo admin/rrhh pueden crear usuarios. Cierre de registro público.
router.post("/register", requireAuth, requireRole("admin", "rrhh"), registerValidations, register);

// POST /api/auth/login - Inicio de sesión con DNI + PIN
router.post("/login", loginValidations, login);

// GET /api/auth/me - Obtener datos del usuario logueado
router.get("/me", requireAuth, me);

// POST /api/auth/logout
router.post("/logout", logout);

// --- Rutas de Google OAuth (si después no las usás, se pueden borrar) ---

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    const token = req.user?.token;
    if (!token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=token_generation_failed`
      );
    }
    const url = new URL(`${process.env.FRONTEND_URL}/login/sso`);
    url.searchParams.set("token", token);
    return res.redirect(url.toString());
  }
);

export default router;

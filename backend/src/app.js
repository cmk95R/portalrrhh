// backend/src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import cookieParser from "cookie-parser";

import connectDB from "./db/db.js";

// --- 1. Importaciones de Rutas (Mantenemos todas por ahora) ---
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";   // 👈 NUEVO

import adminRoutes from "./routes/adminRoutes.js"; // <-- CORRECCIÓN: Importamos el router de admin centralizado
import geoRoutes from "./routes/geoRoutes.js"; // Rutas públicas
import attendanceRoutes from "./routes/attendance.routes.js"; // <-- NUEVO: Rutas de asistencia para usuarios
import { initGooglePassport } from "./auth/google.strategy.js"; 

dotenv.config();

const app = express();
const IS_PROD = process.env.NODE_ENV === "production";

app.set("trust proxy", IS_PROD ? 1 : 0);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- 2. Configuración de CORS (¡IMPORTANTE! La ajustaremos después) ---
// Por ahora la dejamos como estaba, pero RECUERDA que necesitarás
// permitir tu FRONTEND_URL en producción aquí.
const allowedOrigins = [];
const FRONTEND_URL_PROD = "https://portalrrhh.vercel.app";

if (IS_PROD) {
    // En producción, solo permitimos el frontend de Vercel.
    allowedOrigins.push(FRONTEND_URL_PROD);
} else {
    allowedOrigins.push("http://localhost:5173"); // En desarrollo, solo el local.
}

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS bloqueado para el origen: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Responder a preflight requests

// --- 3. Sesión y Passport (Sin cambios) ---
if (!process.env.SESSION_SECRET) {
    console.warn("⚠️ Falta SESSION_SECRET en .env");
}
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cambia-esto-en-.env",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: IS_PROD, sameSite: "lax" },
  })
);
app.use(passport.initialize());
initGooglePassport();

// --- Ruta Health Check (Sin cambios) ---
app.get("/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "dev" });
});

// --- 4. Montaje de Rutas API con prefijo /api ---
const apiRouter = express.Router(); // Router principal para /api
apiRouter.use("/users", userRoutes);  // 👈 NUEVO (para /api/users/me)

// Montamos las rutas relevantes para usuarios bajo /api
apiRouter.use("/auth", authRoutes);            // /api/auth/... (Registro, Login, Google, Verify, Me)
; // /api/applications/... (Rutas /me y /:id para postulaciones del usuario)
apiRouter.use("/geo", geoRoutes);              // /api/geo/... (Provincias, Localidades - públicas)
apiRouter.use("/attendance", attendanceRoutes); // <-- NUEVO: /api/attendance/... (Clock-in, Clock-out, etc.)
// Montamos TODAS las rutas de admin bajo /api/admin
apiRouter.use("/admin", adminRoutes);
// Finalmente, montamos el router principal de la API en la app
app.use("/api", apiRouter);

// --- 5. Manejadores de 404 y Errores (Sin cambios) ---
app.use((req, res) => {
  // Si ninguna ruta API coincidió, devuelve 404 JSON
  if (req.originalUrl.startsWith('/api')) {
      return res.status(404).json({ message: "Endpoint de API no encontrado" });
  }
  // Si no es una ruta API, podrías servir tu index.html aquí o dejar que Nginx lo maneje
  // (Depende de tu configuración de despliegue)
  res.status(404).send('Not Found'); // O envía tu index.html
});

app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);
  res.status(err.status || 500).json({ message: err.message || "Error interno del servidor" });
});

// --- 6. Conexión DB y Arranque (Sin cambios) ---
const PORT = process.env.PORT || (IS_PROD ? 4000 : 3000);
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ API lista en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err?.message || err);
    process.exit(1);
  });

export default app;
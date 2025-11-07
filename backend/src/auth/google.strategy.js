// src/auth/google.strategy.js

import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

export function initGooglePassport() {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BASE_URL } = process.env;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !BASE_URL) {
        console.warn("🔸 Google OAuth deshabilitado (faltan envs)");
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                // --- CORRECCIÓN: La callbackURL debe apuntar a la ruta del backend ---
                // No debe depender del BASE_URL del frontend.
                callbackURL: `/api/auth/google/callback`,
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    // 1. Extrae todos los datos del perfil de Google
                    const email = profile?.emails?.[0]?.value?.toLowerCase() || null;
                    const googleId = profile?.id;
                    const nombre = profile?.name?.givenName || profile?.displayName || "Usuario";
                    const apellido = profile?.name?.familyName || "";
                    const avatar = profile?.photos?.[0]?.value || null;

                    let user =
                        (await User.findOne({ "providers.google.id": googleId })) ||
                        (email && (await User.findOne({ email })));

                    if (!user) {
                        // 2. Pasa todos los datos necesarios para crear el usuario
                        user = await User.create({
                            email,
                            nombre,
                            apellido,
                            avatar, // Campo opcional pero bueno tenerlo
                            rol: "user",
                            providers: { google: { id: googleId, email } },
                        });
                    } else if (!user.providers?.google?.id) {
                        // Si el usuario existe pero no tiene el proveedor de Google, lo añade
                        user.providers = user.providers || {};
                        user.providers.google = { id: googleId, email };
                        await user.save();
                    }

                    // Crea el payload y firma el token (sin cambios aquí)
                    const payload = { id: user._id.toString(), rol: user.rol };
                    const token = jwt.sign(payload, process.env.JWT_SECRET, {
                        expiresIn: "1d",
                    });

                    return done(null, { token });

                } catch (err) {
                    return done(err);
                }
            }
        )
    );
}
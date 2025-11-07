import Application from "../models/Application.js";
import Search from "../models/Search.js";
import User from "../models/User.js";

export const getDashboardData = async (req, res) => {
    try {
        // Ejecuta todas las consultas en paralelo para máxima eficiencia
        const [
            newApplicationsCount,
            activeSearchesCount,
            totalUsersCount,
            pendingApplicationsCount,
            recentApplications
        ] = await Promise.all([
            // Cuenta postulaciones de los últimos 7 días
            Application.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
            // Cuenta búsquedas con estado "Activa"
            Search.countDocuments({ estado: "Activa" }),
            // Cuenta todos los usuarios con rol 'user'
            User.countDocuments({ rol: "user" }),
            // Cuenta postulaciones con estado pendiente
            Application.countDocuments({ state: "pending" }), // O el estado que uses
            // Obtiene las 5 últimas postulaciones
            Application.find().sort({ createdAt: -1 }).limit(5).populate("user", "nombre apellido").populate("search", "titulo")
        ]);

        res.json({
            stats: {
                newApplications: newApplicationsCount,
                activeSearches: activeSearchesCount,
                totalUsers: totalUsersCount,
                pendingApplications: pendingApplicationsCount,
            },
            recentApplications: recentApplications,
        });

    } catch (error) {
        res.status(500).json({ message: "Error al cargar los datos del dashboard." });
    }
};
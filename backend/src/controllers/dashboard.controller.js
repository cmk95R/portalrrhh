import User from "../models/User.js";
import Asistencia from "../models/attendance.model.js";
import Client from "../models/Client.js";
import dayjs from "dayjs";

export const getDashboardData = async (req, res, next) => {
  try {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const sevenDaysAgo = dayjs().subtract(6, 'day').format('YYYY-MM-DD'); // Hoy y 6 días atrás

    // 2. Ejecutar consultas en paralelo para optimizar tiempo de respuesta
    const [
      totalUsers,
      activeEmployees,
      attendanceToday,
      totalClients,
      employees,
      clients,
      attendanceTrend,
      clientDistribution,
      latestAttendances
    ] = await Promise.all([
      // Total usuarios (excluyendo admins)
      User.countDocuments({ rol: { $ne: 'admin' } }),

      // Empleados activos para calcular ausentes
      User.countDocuments({ estado: 'activo', rol: { $ne: 'admin' } }),
      
      // Asistencias de hoy
      Asistencia.countDocuments({ fecha: todayStr }),

      // Total Clientes
      Client.countDocuments(),

      // Lista de empleados
      User.find({ rol: { $ne: 'admin' } }).select('nombre apellido email foto rol estado').lean(),

      // Lista de clientes
      Client.find().lean(),

      // Tendencia de asistencia de los últimos 7 días
      Asistencia.aggregate([
        { $match: { fecha: { $gte: sevenDaysAgo, $lte: todayStr } } },
        { $group: {
            _id: '$fecha',
            count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } },
        { $project: {
            date: '$_id',
            asistencias: '$count',
            _id: 0
        }} 
      ]),

      // Distribución por cliente
      User.aggregate([
        { $match: { rol: { $ne: 'admin' } } }, // Excluimos administradores
        // Etapa 1: Crear un campo unificado 'clientAssignments' que será la fuente de verdad
        {
          $addFields: {
            clientAssignments: {
              $cond: {
                // Condición 1: ¿Es 'clientes' un array?
                if: { $isArray: "$clientes" },
                // Si es un array, procesarlo
                then: {
                  $cond: {
                    // Si el array no está vacío, usar los nombres
                    if: { $gt: [{ $size: "$clientes" }, 0] },
                    then: "$clientes.nombre",
                    // Si el array está vacío, el empleado está "Sin Asignar"
                    else: ["Sin Asignar"]
                  }
                },
                // Si no es un array (o no existe), usar la lógica legacy
                else: {
                  $cond: {
                    if: { $and: ["$cliente", { $ne: ["$cliente", ""] }] },
                    then: ["$cliente"],
                    else: ["Sin Asignar"]
                  }
                }
              }
            }
          }
        },
        // Etapa 2: Desenrollar la lista de asignaciones
        { $unwind: "$clientAssignments" },
        // Etapa 3: Agrupar por nombre de cliente y contar
        { $group: { _id: "$clientAssignments", count: { $sum: 1 } } },
        // Etapa 4: Formatear la salida para el gráfico
        { $project: {
            name: { $ifNull: ["$_id", "Sin Asignar"] },
            value: "$count",
            _id: 0
        }},
        // Etapa 5: Ordenar de mayor a menor
        { $sort: { value: -1 } }
      ]),

      // Últimas asistencias
      Asistencia.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('nombre apellido fecha estado')
        .lean()
    ]);

    res.json({
      stats: {
        totalUsers,
        attendanceToday,
        absentToday: Math.max(0, activeEmployees - attendanceToday), // Empleados activos - presentes hoy
        totalClients
      },
      employees,
      clients,
      attendanceTrend,
      clientDistribution,
      latestAttendances
    });
  } catch (error) {
    next(error);
  }
};
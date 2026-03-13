import Asistencia from '../models/attendance.model.js';
import User from '../models/User.js';
import createError from 'http-errors';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import { sendAttendanceReminderEmail } from '../services/email.services.js';

// --- Helper para obtener el día de la semana en español ---
const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

// @desc    Listar todos los registros de asistencia para el admin (con filtros y paginación)
// @route   GET /api/admin/attendance
// @access  Private (Admin/RRHH)
export const getAllAttendance = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'fecha',
            sortDir = 'desc',
            usuarioId,    // Filtrar por un usuario específico
            dateFrom,     // Formato YYYY-MM-DD
            dateTo,       // Formato YYYY-MM-DD
            estado,       // 'presente', 'ausente', etc.
            q,            // Búsqueda por nombre/apellido
        } = req.query;

        const filter = {};
        if (usuarioId && mongoose.Types.ObjectId.isValid(usuarioId)) {
            filter.usuario = usuarioId;
        }
        if (estado) {
            filter.estado = estado;
        }
        if (dateFrom || dateTo) {
            filter.fecha = {};
            if (dateFrom) filter.fecha.$gte = dateFrom;
            if (dateTo) filter.fecha.$lte = dateTo;
        }
        if (q) {
            const rx = new RegExp(q.trim(), 'i');
            filter.$or = [{ nombre: rx }, { apellido: rx }];
        }

        const _page = parseInt(page, 10);
        const _limit = parseInt(limit, 10);
        const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

        const [items, total] = await Promise.all([
            Asistencia.find(filter)
                .sort(sort)
                .skip((_page - 1) * _limit)
                .limit(_limit)
                .lean(),
            Asistencia.countDocuments(filter)
        ]);

        res.json({
            items,
            total,
            page: _page,
            pages: Math.ceil(total / _limit)
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Admin crea un registro de asistencia manualmente
// @route   POST /api/admin/attendance
// @access  Private (Admin/RRHH)
export const createAttendanceRecord = async (req, res, next) => {
    try {
        const { usuario, fecha, estado, motivo, nota } = req.body;

        if (!usuario || !fecha || !estado) {
            throw createError(400, "Usuario, fecha y estado son obligatorios.");
        }

        const userExists = await User.findById(usuario).lean();
        if (!userExists) {
            throw createError(404, "El usuario especificado no existe.");
        }

        const diaSemana = diasSemana[dayjs(fecha).day()];

        const newRecord = await Asistencia.create({
            usuario,
            fecha,
            estado,
            diaSemana,
            nombre: userExists.nombre,
            apellido: userExists.apellido,
            autoGenerado: false, // Es un registro manual
            motivo: estado === 'ausente' ? motivo : null,
            nota: nota,
        });

        res.status(201).json({ message: "Registro de asistencia creado manualmente.", record: newRecord });

    } catch (error) {
        if (error.code === 11000) {
            return next(createError(409, 'Ya existe un registro para este usuario en esa fecha.'));
        }
        next(error);
    }
};

// @desc    Admin actualiza un registro de asistencia
// @route   PATCH /api/admin/attendance/:id
// @access  Private (Admin/RRHH)
export const updateAttendanceRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Campos que el admin puede modificar
        const { estado, horasExtras, guardia, horasFinDeSemana, horaEntrada, horaSalida, motivo, nota } = req.body;

        const record = await Asistencia.findById(id);
        if (!record) {
            throw createError(404, "Registro de asistencia no encontrado.");
        }

        if (estado) record.estado = estado;
        if (typeof horasExtras === 'number') record.horasExtras = horasExtras;
        if (guardia) record.guardia = guardia;
        if (typeof horasFinDeSemana === 'number') record.horasFinDeSemana = horasFinDeSemana;
        if (horaEntrada) record.horaEntrada = horaEntrada;
        if (horaSalida) record.horaSalida = horaSalida;
        if (motivo !== undefined) record.motivo = motivo;
        if (nota !== undefined) record.nota = nota;

        // Aseguramos que diaSemana siempre esté presente para pasar la validación del modelo
        if (!record.diaSemana && record.fecha) {
            record.diaSemana = diasSemana[dayjs(record.fecha).day()];
        }

        await record.save();
        res.json({ message: "Registro actualizado.", record });

    } catch (error) {
        next(error);
    }
};

// @desc    Admin elimina un registro de asistencia
// @route   DELETE /api/admin/attendance/:id
// @access  Private (Admin/RRHH)
export const deleteAttendanceRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const record = await Asistencia.findByIdAndDelete(id);

        if (!record) {
            throw createError(404, "Registro de asistencia no encontrado.");
        }

        res.status(200).json({ message: "Registro de asistencia eliminado correctamente." });
    } catch (error) {
        next(error);
    }
};

// @desc    Obtener un resumen de asistencias agrupado por usuario
// @route   GET /api/admin/attendance/summary
// @access  Private (Admin/RRHH)
export const getAttendanceSummary = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'apellido',
            sortDir = 'asc',
            q, // Búsqueda por nombre/apellido
        } = req.query;

        const _page = parseInt(page, 10);
        const _limit = parseInt(limit, 10);
        
        // 1. Obtener los IDs de los usuarios que tienen el rol 'empleado'
        const employeeUsers = await User.find({ rol: 'empleado' }).select('_id').lean();
        const employeeUserIds = employeeUsers.map(user => user._id);

        const aggregationPipeline = [];

        // 2. Etapa inicial para filtrar solo las asistencias de los empleados
        aggregationPipeline.push({
            $match: {
                usuario: { $in: employeeUserIds }
            }
        });

        // Etapa de filtrado por nombre/apellido si existe 'q'
        if (q) {
            const rx = new RegExp(q.trim(), 'i');
            aggregationPipeline.push({ // Este $match se añade después del filtro de rol
                $match: { $or: [{ nombre: rx }, { apellido: rx }] }
            });
        }

        // Etapa de agrupación para calcular estadísticas
        aggregationPipeline.push({
            $group: {
                _id: '$usuario',
                nombre: { $first: '$nombre' },
                apellido: { $first: '$apellido' },
                presentes: { $sum: { $cond: [{ $eq: ['$estado', 'presente'] }, 1, 0] } },
                ausentes: { $sum: { $cond: [{ $eq: ['$estado', 'ausente'] }, 1, 0] } },
                ultimaAsistencia: { $max: '$fecha' }
            }
        });

        // Conteo total de usuarios después de agrupar y filtrar
        const countPipeline = [...aggregationPipeline, { $count: 'total' }];
        const totalResult = await Asistencia.aggregate(countPipeline);
        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        // Etapa de ordenamiento y paginación
        const sortField = ['nombre', 'apellido', 'ultimaAsistencia'].includes(sortBy) ? sortBy : 'apellido';
        aggregationPipeline.push({ $sort: { [sortField]: sortDir === 'asc' ? 1 : -1 } });
        aggregationPipeline.push({ $skip: (_page - 1) * _limit });
        aggregationPipeline.push({ $limit: _limit });

        const items = await Asistencia.aggregate(aggregationPipeline);

        res.json({
            items,
            total,
            page: _page,
            pages: Math.ceil(total / _limit)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Empleados que NO registraron asistencia en una fecha (para recordatorio)
// @route   GET /api/admin/attendance/without-registration
// @access  Private (Admin/RRHH)
export const getWithoutRegistration = async (req, res, next) => {
    try {
        const { fecha } = req.query;
        if (!fecha) {
            throw createError(400, 'Parámetro fecha (YYYY-MM-DD) es obligatorio.');
        }
        const dateStr = dayjs(fecha).format('YYYY-MM-DD');
        if (dateStr !== fecha) {
            throw createError(400, 'Fecha inválida.');
        }

        const conRegistro = await Asistencia.distinct('usuario', { fecha: dateStr });
        const users = await User.find({
            rol: 'empleado',
            estado: 'activo',
            _id: { $nin: conRegistro }
        })
            .select('_id nombre apellido email')
            .sort({ apellido: 1, nombre: 1 })
            .lean();

        res.json({ fecha: dateStr, users });
    } catch (error) {
        next(error);
    }
};

// @desc    Enviar recordatorio de asistencia a uno o más empleados (Admin/RRHH)
// @route   POST /api/admin/attendance/send-reminder
// @access  Private (Admin/RRHH)
export const sendAttendanceReminder = async (req, res, next) => {
    try {
        const { fecha, fechaDesde, fechaHasta, userIds, subject, body } = req.body;

        const fromRaw = fechaDesde || fecha;
        const toRaw = fechaHasta || fechaDesde || fecha;

        if (!fromRaw || !Array.isArray(userIds) || userIds.length === 0) {
            throw createError(400, 'fechaDesde (o fecha) y userIds (array) son obligatorios.');
        }

        const from = dayjs(fromRaw);
        const to = dayjs(toRaw);
        if (!from.isValid() || !to.isValid()) {
            throw createError(400, 'Fechas inválidas para el recordatorio.');
        }
        if (to.isBefore(from, 'day')) {
            throw createError(400, 'La fecha \"hasta\" no puede ser anterior a la fecha \"desde\".');
        }

        const fechaDesdeLegible = from.format('DD/MM/YYYY');
        const fechaHastaLegible = to.format('DD/MM/YYYY');

        const emailOptions = {};
        if (subject != null && String(subject).trim()) emailOptions.subject = String(subject).trim();
        if (body != null && String(body).trim()) emailOptions.body = String(body).trim();

        const users = await User.find({ _id: { $in: userIds } })
            .select('email nombre apellido')
            .lean();

        const results = { sent: 0, failed: [] };
        for (const u of users) {
            if (!u.email) {
                results.failed.push({ userId: u._id, reason: 'Sin email' });
                continue;
            }
            const nombreEmpleado = [u.nombre, u.apellido].filter(Boolean).join(' ') || 'Empleado/a';
            const { success } = await sendAttendanceReminderEmail(
                u.email,
                nombreEmpleado,
                fechaDesdeLegible,
                fechaHastaLegible,
                Object.keys(emailOptions).length ? emailOptions : undefined
            );
            if (success) results.sent++;
            else results.failed.push({ userId: u._id, reason: 'Error envío' });
        }

        res.json({
            message: `Recordatorio enviado a ${results.sent} empleado(s).`,
            sent: results.sent,
            failed: results.failed.length
        });
    } catch (error) {
        next(error);
    }
};
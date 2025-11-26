import Attendance from '../models/attendance.model.js';
import User from '../models/User.js';
import createError from 'http-errors';
import mongoose from 'mongoose';

// @desc    Listar todos los registros de asistencia (con filtros y paginación)
// @route   GET /api/admin/attendance
// @access  Private (Admin/RRHH)
export const getAllAttendance = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'clockInTime',
            sortDir = 'desc',
            userId,       // Filtrar por un usuario específico
            dateFrom,     // Formato YYYY-MM-DD
            dateTo,       // Formato YYYY-MM-DD
            status,       // 'active' o 'completed'
        } = req.query;

        const filter = {};
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            filter.user = userId;
        }
        if (status && ['active', 'completed'].includes(status)) {
            filter.status = status;
        }
        if (dateFrom || dateTo) {
            filter.clockInTime = {};
            if (dateFrom) filter.clockInTime.$gte = new Date(dateFrom);
            if (dateTo) filter.clockInTime.$lte = new Date(`${dateTo}T23:59:59.999Z`);
        }

        const _page = parseInt(page, 10);
        const _limit = parseInt(limit, 10);
        const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

        const [items, total] = await Promise.all([
            Attendance.find(filter)
                .populate('user', 'nombre apellido email')
                .sort(sort)
                .skip((_page - 1) * _limit)
                .limit(_limit)
                .lean(),
            Attendance.countDocuments(filter)
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

// @desc    Crear un registro de asistencia manualmente
// @route   POST /api/admin/attendance
// @access  Private (Admin/RRHH)
export const createAttendanceRecord = async (req, res, next) => {
    try {
        const { user, clockInTime, clockOutTime, notes } = req.body;

        if (!user || !clockInTime) {
            throw createError(400, "El usuario y la hora de entrada son obligatorios.");
        }

        const userExists = await User.findById(user);
        if (!userExists) {
            throw createError(404, "El usuario especificado no existe.");
        }

        const newRecord = new Attendance({
            user,
            clockInTime: new Date(clockInTime),
            clockOutTime: clockOutTime ? new Date(clockOutTime) : undefined,
            status: clockOutTime ? 'completed' : 'active',
            notes: `Registro manual por ${req.user.nombre}. Nota original: ${notes || ''}`.trim()
        });

        await newRecord.save();
        res.status(201).json({ message: "Registro de asistencia creado manualmente.", record: newRecord });

    } catch (error) {
        next(error);
    }
};

// @desc    Actualizar un registro de asistencia
// @route   PATCH /api/admin/attendance/:id
// @access  Private (Admin/RRHH)
export const updateAttendanceRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { clockInTime, clockOutTime, notes } = req.body;

        const record = await Attendance.findById(id);
        if (!record) {
            throw createError(404, "Registro de asistencia no encontrado.");
        }

        if (clockInTime) record.clockInTime = new Date(clockInTime);
        if (clockOutTime) {
            record.clockOutTime = new Date(clockOutTime);
            record.status = 'completed';
        } else {
            // Si se elimina la hora de salida, el estado vuelve a activo
            record.clockOutTime = undefined;
            record.status = 'active';
        }

        if (notes) record.notes = notes;

        await record.save();
        res.json({ message: "Registro actualizado.", record });

    } catch (error) {
        next(error);
    }
};

// @desc    Eliminar un registro de asistencia
// @route   DELETE /api/admin/attendance/:id
// @access  Private (Admin/RRHH)
export const deleteAttendanceRecord = async (req, res, next) => {
    try {
        const { id } = req.params;
        const record = await Attendance.findByIdAndDelete(id);

        if (!record) {
            throw createError(404, "Registro de asistencia no encontrado.");
        }

        res.status(200).json({ message: "Registro de asistencia eliminado correctamente." });
    } catch (error) {
        next(error);
    }
};
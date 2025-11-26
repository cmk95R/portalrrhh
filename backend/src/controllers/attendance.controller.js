import Attendance from '../models/attendance.model.js';
import createError from 'http-errors';
import XLSX from 'xlsx';
import { uploadFileToOneDrive } from '../services/oneDrive.service.js';

// @desc    Enviar la asistencia diaria de un solo clic.
// @route   POST /api/attendance/submit-daily
// @access  Private (Usuario logueado)
export const submitDailyAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Verificar si ya se registró la asistencia para hoy.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingRecord = await Attendance.findOne({ user: userId, clockInTime: { $gte: todayStart, $lte: todayEnd } });
    if (existingRecord) {
      throw createError(409, 'Ya has enviado tu asistencia por hoy.');
    }

    // 2. Crear el nuevo registro con hora de salida a las 18:00 hs.
    const clockInTime = new Date();
    const clockOutTime = new Date(clockInTime);
    clockOutTime.setHours(18, 0, 0, 0); // Fija la hora de salida a las 18:00

    const newRecord = new Attendance({
      user: userId,
      nombre: req.user.nombre, // <-- AÑADIDO
      apellido: req.user.apellido, // <-- AÑADIDO
      clockInTime,
      clockOutTime,
      clockInIp: req.ip,
      status: 'completed', // El registro nace completo
      notes: 'Asistencia diaria registrada.'
    });

    await newRecord.save();

    // --- NUEVO: Guardar en Excel de OneDrive después de confirmar en la DB ---
    await saveAttendanceToOneDrive(newRecord);

    res.status(201).json({
      message: 'Asistencia enviada correctamente.',
      record: newRecord,
    });

  } catch (error) {
    next(error);
  }
};

// --- NUEVA FUNCIÓN HELPER PARA GUARDAR EN ONEDRIVE ---

/**
 * Toma un registro de asistencia, lo añade a un archivo Excel mensual
 * y lo sube/actualiza en OneDrive.
 * @param {object} record - El documento de asistencia de Mongoose.
 */
async function saveAttendanceToOneDrive(record) {
  try {
    // 1. Definir el nombre del archivo (ej: Asistencias_2025-11.xlsx)
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const fileName = `Asistencias_${year}-${month}.xlsx`;

    // 2. Obtener todos los registros del mes actual de la base de datos
    const monthStart = new Date(year, now.getMonth(), 1);
    const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);

    const allRecordsThisMonth = await Attendance.find({
      createdAt: { $gte: monthStart, $lte: monthEnd }
    }).sort({ createdAt: 'asc' }).lean();

    // 3. Formatear los datos para el Excel
    const dataForExcel = allRecordsThisMonth.map(rec => ({
      'ID Registro': rec._id.toString(),
      'ID Usuario': rec.user.toString(),
      'Nombre': rec.nombre,
      'Apellido': rec.apellido,
      'Fecha Entrada': new Date(rec.clockInTime).toLocaleDateString('es-AR'),
      'Hora Entrada': new Date(rec.clockInTime).toLocaleTimeString('es-AR'),
      'Fecha Salida': new Date(rec.clockOutTime).toLocaleDateString('es-AR'),
      'Hora Salida': new Date(rec.clockOutTime).toLocaleTimeString('es-AR'),
      'IP': rec.clockInIp,
      'Notas': rec.notes,
    }));

    // 4. Crear el libro de Excel en memoria
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Asistencias ${year}-${month}`);

    // 5. Convertir el libro a un buffer de datos
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    // 6. Subir el buffer a OneDrive usando tu servicio existente
    // El servicio de OneDrive se encargará de sobrescribir el archivo si ya existe.
    await uploadFileToOneDrive(buffer, fileName, "Asistencias"); // Sube a una carpeta "Asistencias"

    console.log(`✅ Asistencia guardada/actualizada en OneDrive: /Asistencias/${fileName}`);

  } catch (excelError) {
    // La operación principal (guardar en DB) fue exitosa.
    // Este error solo se registra en el servidor para no afectar al usuario.
    console.error("❌ Error al escribir el archivo de Excel en OneDrive:", excelError);
  }
}

// @desc    Fichar la entrada de un usuario.
// @route   POST /api/attendance/clock-in
// @access  Private (Usuario logueado)
export const clockIn = async (req, res, next) => {
  try {
    const userId = req.user.id; // Suponiendo que tienes el usuario en req.user

    // El índice único en el modelo ya previene esto, pero una verificación explícita da un mejor mensaje de error.
    const existingActiveRecord = await Attendance.findOne({ user: userId, status: 'active' });
    if (existingActiveRecord) {
      throw createError(409, 'Ya tienes una jornada activa. Debes fichar la salida primero.');
    }

    const newRecord = new Attendance({
      user: userId,
      clockInTime: new Date(),
      clockInIp: req.ip, // express guarda la IP en req.ip
    });

    await newRecord.save();

    res.status(201).json({
      message: 'Entrada registrada correctamente.',
      record: newRecord,
    });
  } catch (error) {
    // Si el error es por el índice único, será un código 11000.
    if (error.code === 11000) {
        return next(createError(409, 'Ya tienes una jornada activa.'));
    }
    next(error);
  }
};

// @desc    Fichar la salida de un usuario.
// @route   POST /api/attendance/clock-out
// @access  Private (Usuario logueado)
export const clockOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notes } = req.body;

    const activeRecord = await Attendance.findOne({ user: userId, status: 'active' });

    if (!activeRecord) {
      throw createError(404, 'No se encontró una jornada activa para registrar la salida.');
    }

    activeRecord.clockOutTime = new Date();
    activeRecord.clockOutIp = req.ip;
    activeRecord.status = 'completed';
    if (notes) {
      activeRecord.notes = notes;
    }

    await activeRecord.save();

    res.status(200).json({
      message: 'Salida registrada correctamente.',
      record: activeRecord,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener el historial de asistencia del usuario logueado.
// @route   GET /api/attendance/me
// @access  Private (Usuario logueado)
export const getMyAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Podríamos añadir paginación aquí en el futuro
    const records = await Attendance.find({ user: userId }).sort({ clockInTime: -1 });
    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener el estado actual del usuario (si está fichado o no).
// @route   GET /api/attendance/status
// @access  Private (Usuario logueado)
export const getMyCurrentStatus = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
        // CORRECCIÓN: Ahora buscamos si existe CUALQUIER registro para el día de hoy.
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todaysRecord = await Attendance.findOne({ user: userId, clockInTime: { $gte: todayStart, $lte: todayEnd } });

        if (todaysRecord) {
            // Si se encuentra un registro para hoy, se lo devolvemos al frontend.
            res.status(200).json({ status: 'clocked-in', record: todaysRecord });
        } else {
            // Si no, informamos que no ha fichado.
            res.status(200).json({ status: 'clocked-out' });
        }
    } catch (error) {
        next(error);
    }
};

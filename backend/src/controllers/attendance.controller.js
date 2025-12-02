import Attendance from '../models/attendance.model.js';
import createError from 'http-errors';
import XLSX from 'xlsx';
import { uploadFileToOneDrive } from '../services/oneDrive.service.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

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
    // --- CORRECCIÓN: Usar la fecha del registro, no la fecha actual del servidor ---
    // Esto asegura que si se modifica un registro antiguo, se actualice el Excel del mes correcto.
    const recordDate = record.date || record.clockInTime || new Date();
    const year = recordDate.getFullYear();
    const monthJs = recordDate.getMonth(); // 0-11
    const month = (monthJs + 1).toString().padStart(2, '0');
    const fileName = `Asistencias_${year}-${month}.xlsx`;

    // 2. Obtener todos los registros del mes actual de la base de datos
    const monthStart = new Date(year, monthJs, 1);
    const monthEnd = new Date(year, monthJs + 1, 0, 23, 59, 59);

    // CORRECCIÓN: Buscamos por 'date' o 'clockInTime' para incluir ambos tipos de registros
    const allRecordsThisMonth = await Attendance.find({
      $or: [
        { date: { $gte: monthStart, $lte: monthEnd } },
        { clockInTime: { $gte: monthStart, $lte: monthEnd } }
      ]
    }).sort({ date: 'asc', clockInTime: 'asc' }).lean();

    // 3. Formatear los datos para el Excel
    const dataForExcel = allRecordsThisMonth.map(rec => ({
      'ID Registro': rec._id.toString(),
      'ID Usuario': rec.user.toString(),
      'Nombre': rec.nombre,
      'Apellido': rec.apellido,
      // CORRECCIÓN: Usamos 'date' como fallback si 'clockInTime' no existe
      'Fecha Entrada': rec.clockInTime ? new Date(rec.clockInTime).toLocaleDateString('es-AR') : (rec.date ? new Date(rec.date).toLocaleDateString('es-AR') : 'N/A'),
      'Hora Entrada': rec.clockInTime ? new Date(rec.clockInTime).toLocaleTimeString('es-AR') : 'N/A',
      'Fecha Salida': rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleDateString('es-AR') : 'N/A',
      'Hora Salida': rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleTimeString('es-AR') : 'N/A',
      'IP': rec.clockInIp,
      'Estado': rec.status, // <-- AÑADIDO: Columna de estado
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

/**
 * @desc    Marcar la asistencia de un día completo (Presente/Ausente)
 * @route   POST /api/attendance/daily
 * @access  Private (Empleado)
 */
export const setDailyAttendance = async (req, res, next) => {
    try {
        const { date, status } = req.body;
        const userId = req.user._id;

        if (!date || !['presente', 'ausente'].includes(status)) {
            return res.status(400).json({ message: 'Fecha y estado (presente/ausente) son requeridos.' });
        }

        const targetDate = dayjs.utc(date).startOf('day').toDate();

        const attendanceRecord = await Attendance.findOneAndUpdate(
            { user: userId, date: targetDate },
            { 
                $set: { 
                    status: status, 
                    source: 'empleado', 
                    date: targetDate, 
                    user: userId, 
                    nombre: req.user.nombre, 
                    apellido: req.user.apellido 
                } 
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            message: `Asistencia para el día ${dayjs(date).format('DD/MM/YYYY')} marcada como ${status}.`,
            record: attendanceRecord,
        });

        // --- AÑADIDO: Llamamos a la función de guardado en Excel ---
        // Lo hacemos después de responder al usuario para no retrasar la respuesta.
        await saveAttendanceToOneDrive(attendanceRecord);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Obtener todos los registros de asistencia de un mes para el usuario logueado
 * @route   GET /api/attendance/monthly
 * @access  Private (Empleado)
 */
export const getMyMonthlyAttendance = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const userId = req.user._id;

        if (!year || !month) {
            return res.status(400).json({ message: 'Año y mes son requeridos.' });
        }

        const startDate = dayjs.utc(`${year}-${month}-01`).startOf('month').toDate();
        const endDate = dayjs.utc(`${year}-${month}-01`).endOf('month').toDate();

        const records = await Attendance.find({
            user: userId,
            date: { $gte: startDate, $lte: endDate }
        }).lean();

        res.status(200).json(records);

    } catch (error) {
        next(error);
    }
};

import Asistencia from '../models/attendance.model.js'; // <-- CAMBIO: Usamos el nuevo modelo
import createError from 'http-errors';
import XLSX from 'xlsx';
import { uploadFileToOneDrive } from '../services/oneDrive.service.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);

// --- Helper para obtener el día de la semana en español ---
const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];


// @desc    Enviar la asistencia diaria de un solo clic.
// @route   POST /api/attendance/submit-daily
// @access  Private (Usuario logueado)
export const submitDailyAttendance = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Verificar si ya se registró la asistencia para hoy usando el formato YYYY-MM-DD
    const hoy = dayjs().format('YYYY-MM-DD');
    const existingRecord = await Asistencia.findOne({ usuario: userId, fecha: hoy });
    if (existingRecord) {
      throw createError(409, 'Ya has enviado tu asistencia por hoy.');
    }

    // 2. Crear el nuevo registro
    const clockInTime = new Date();
    const clockOutTime = new Date(clockInTime);
    clockOutTime.setHours(18, 0, 0, 0); // Fija la hora de salida a las 18:00

    const newRecord = new Asistencia({
      usuario: userId,
      nombre: req.user.nombre, // <-- AÑADIDO
      apellido: req.user.apellido, // <-- AÑADIDO
      fecha: hoy,
      diaSemana: diasSemana[dayjs().day()],
      estado: 'presente',
      horaEntrada: clockInTime,
      horaSalida: clockOutTime,
      autoGenerado: true,
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
    // 1. Usar la fecha del registro para determinar el mes y año del archivo
    const recordDate = dayjs(record.fecha);
    const year = recordDate.year();
    const month = recordDate.format('MM');
    const fileName = `Asistencias_${year}-${month}.xlsx`;

    // 2. Obtener todos los registros del mes
    const allRecordsThisMonth = await Asistencia.find({
      fecha: { $regex: `^${year}-${month}` }
    }).sort({ fecha: 'asc' }).lean();

    // 3. Formatear los datos para el Excel
    const dataForExcel = allRecordsThisMonth.map(rec => ({
      'ID Registro': rec._id.toString(),
      'ID Usuario': rec.usuario.toString(),
      'Nombre': rec.nombre,
      'Apellido': rec.apellido,
      'Fecha': rec.fecha,
      'Día': rec.diaSemana,
      'Estado': rec.estado,
      'Hora Entrada': rec.horaEntrada ? dayjs(rec.horaEntrada).format('HH:mm') : 'N/A',
      'Hora Salida': rec.horaSalida ? dayjs(rec.horaSalida).format('HH:mm') : 'N/A',
      'Horas Extras': rec.horasExtras,
      'Guardia': rec.guardia,
      'Horas Fin de Semana': rec.horasFinDeSemana,
    }));

    // 4. Crear el libro de Excel en memoria
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    // Ajustar anchos de columna (opcional, pero mejora la legibilidad)
    worksheet['!cols'] = [
      { wch: 24 }, { wch: 24 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, `Asistencias`);

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
    const existingActiveRecord = await Asistencia.findOne({ usuario: userId, estado: 'presente', horaSalida: null });
    if (existingActiveRecord) {
      throw createError(409, 'Ya tienes una jornada activa. Debes fichar la salida primero.');
    }

    const newRecord = new Asistencia({
      usuario: userId,
      horaEntrada: new Date(),
      // ... otros campos del nuevo modelo
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

    const activeRecord = await Asistencia.findOne({ usuario: userId, estado: 'presente', horaSalida: null });

    if (!activeRecord) {
      throw createError(404, 'No se encontró una jornada activa para registrar la salida.');
    }

    activeRecord.horaSalida = new Date();
    if (notes) {
      // El nuevo modelo no tiene 'notes', puedes agregarlo si lo necesitas
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
    const records = await Asistencia.find({ usuario: userId }).sort({ fecha: -1 });
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
        
        const hoy = dayjs().format('YYYY-MM-DD');
        const todaysRecord = await Asistencia.findOne({ usuario: userId, fecha: hoy });

        if (todaysRecord) {
            // Si se encuentra un registro para hoy, se lo devolvemos al frontend.
            res.status(200).json({ status: todaysRecord.estado, record: todaysRecord });
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
        const { fecha, estado } = req.body; // <-- CORRECCIÓN
        const { _id: userId, nombre, apellido } = req.user;

        if (!fecha || !['presente', 'ausente'].includes(estado)) { // <-- CORRECCIÓN
            return res.status(400).json({ message: 'Fecha y estado (presente/ausente) son requeridos.' });
        }

        const diaSemana = diasSemana[dayjs(fecha).day()]; // <-- CORRECCIÓN

        const attendanceRecord = await Asistencia.findOneAndUpdate(
            { usuario: userId, fecha: fecha }, // <-- CORRECCIÓN
            { 
                $set: { 
                    estado: estado,
                    nombre: nombre, // <-- AÑADIDO: Asegura que siempre esté presente
                    apellido: apellido, // <-- AÑADIDO: Asegura que siempre esté presente
                } 
            },
            { 
              new: true, 
              upsert: true, 
              setDefaultsOnInsert: true,
              // Añadimos los campos que solo se deben crear si el documento es nuevo
              $setOnInsert: { usuario: userId, fecha: fecha, diaSemana }
            }
        );

        res.status(200).json({
            message: `Asistencia para el día ${dayjs(fecha).format('DD/MM/YYYY')} marcada como ${estado}.`, // <-- CORRECCIÓN
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
        const { _id: userId } = req.user;

        if (!year || !month) {
            return res.status(400).json({ message: 'Año y mes son requeridos.' });
        }

        const records = await Asistencia.find({
            usuario: userId,
            fecha: { $regex: `^${year}-${String(month).padStart(2, '0')}` }
        }).lean();

        res.status(200).json(records);

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Actualizar un registro de asistencia propio (ej. para horas extras, guardias).
 * @route   PATCH /api/attendance/:id
 * @access  Private (Empleado)
 */
export const updateMyAttendance = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Campos que el usuario puede modificar
        const { horasExtras, guardia, horasFinDeSemana } = req.body;

        const record = await Asistencia.findOne({ _id: id, usuario: userId });

        if (!record) {
            return res.status(404).json({ message: "Registro de asistencia no encontrado o no te pertenece." });
        }

        // Aplicar actualizaciones de forma segura
        if (typeof horasExtras === 'number') record.horasExtras = horasExtras;
        if (['ninguna', 'pasiva', 'activa'].includes(guardia)) record.guardia = guardia;
        if (typeof horasFinDeSemana === 'number') record.horasFinDeSemana = horasFinDeSemana;

        const updatedRecord = await record.save();

        res.status(200).json({
            message: "Registro de asistencia actualizado.",
            record: updatedRecord,
        });

    } catch (error) {
        next(error);
    }
};

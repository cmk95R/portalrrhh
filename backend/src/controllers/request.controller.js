import Solicitud from '../models/Request.js';
import Asistencia from '../models/attendance.model.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import createError from 'http-errors';
import { uploadFileToOneDrive, moveFileInOneDrive, deleteFileFromOneDrive, getDownloadUrlForFile } from '../services/oneDrive.service.js';
import { sendRequestStatusUpdateEmail, sendRequestCreatedEmail, sendCertificateReminderEmail, sendUploadNotificationEmail, getHrRequestNotifyEmails, sendRequestCreatedNotificationToHR } from '../services/email.services.js';

dayjs.extend(isSameOrBefore);

const diasSemana = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

// Mapa para nombres de carpetas en OneDrive (Capitalizados)
const FOLDER_NAMES = {
  vacaciones: 'Vacaciones',
  dia_estudio: 'Día de Estudio',
  maternidad: 'Maternidad',
  paternidad: 'Paternidad',
  enfermedad: 'Enfermedad',
  mudanza: 'Mudanza',
  otro: 'Otro'
};

// Carpeta por empleado: "Nombre Apellido" para guardar todos sus documentos juntos
const getEmployeeFolderName = (nombre, apellido) =>
  `${nombre || ''} ${apellido || ''}`.trim() || 'Sin nombre';

// @desc    Crear una nueva solicitud (Vacaciones, Día de estudio, etc.)
// @route   POST /api/requests
// @access  Private (Cualquier usuario autenticado)
export const createRequest = async (req, res, next) => {
  try {
    const { tipo, fechaInicio, fechaFin, motivo, adjuntarCliente, documentacionPosterior } = req.body;
    const userId = req.user._id;

    // Validaciones básicas de fechas
    const inicio = dayjs(fechaInicio);
    const fin = dayjs(fechaFin);

    if (!inicio.isValid() || !fin.isValid()) {
      throw createError(400, 'Las fechas proporcionadas no son válidas.');
    }

    if (fin.isBefore(inicio, 'day')) {
      throw createError(400, 'La fecha de fin no puede ser anterior a la fecha de inicio.');
    }

    // Verificar que no exista otra solicitud del mismo empleado con fechas que se solapan
    const solapada = await Solicitud.findOne({
      usuario: userId,
      estado: { $nin: ['rechazada', 'cancelada'] },
      $or: [
        { fechaInicio: { $lte: fin.toDate() }, fechaFin: { $gte: inicio.toDate() } }
      ]
    });
    if (solapada) {
      throw createError(400, `Esas fechas ya están incluidas en otra solicitud. Revisa tus solicitudes o elige otras fechas.`);
    }

    // Calcular cantidad de días (puedes refinar esto para excluir fines de semana si es política de la empresa)
    const cantidadDias = fin.diff(inicio, 'day') + 1;

    // Regla de negocio: Mudanza solo puede ser de 1 día
    if (tipo === 'mudanza' && cantidadDias !== 1) {
      throw createError(400, 'Para las solicitudes de Mudanza solo podés seleccionar un (1) día.');
    }

    // --- LÓGICA DE SUBIDA A ONEDRIVE ---
    let archivosAdjuntos = [];
    
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      // Formato: Nombre Apellido - Tipo - FechaSolicitud.ext
      let fileName = `${req.user.nombre} ${req.user.apellido} - ${FOLDER_NAMES[tipo] || tipo} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      
      if (tipo === 'vacaciones' && adjuntarCliente === 'true') {
        fileName = `Aprobacion Previa Cliente - ${req.user.nombre} ${req.user.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }
      if (tipo === 'enfermedad') {
        fileName = `Certificado Médico - ${req.user.nombre} ${req.user.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }
      
      // Estructura: Comprobantes ASYTEC / [Tipo] / [Nombre Empleado]
      const folderPath = `Comprobantes ASYTEC/${FOLDER_NAMES[tipo] || tipo}/${getEmployeeFolderName(req.user.nombre, req.user.apellido)}`;

      const uploadResult = await uploadFileToOneDrive(req.file.buffer, fileName, folderPath);
      
      // Guardamos la referencia devuelta por OneDrive
      archivosAdjuntos.push({ nombre: fileName, url: uploadResult.webUrl, oneDriveId: uploadResult.id });
    }

    const nuevaSolicitud = new Solicitud({
      usuario: userId,
      nombre: req.user.nombre,
      apellido: req.user.apellido,
      tipo,
      fechaInicio: inicio.toDate(),
      fechaFin: fin.toDate(),
      cantidadDias,
      motivo,
      documentacionPosterior: documentacionPosterior === 'true',
      archivosAdjuntos, 
      estado: 'pendiente'
    });

    await nuevaSolicitud.save();

    // Notificación interna por documento cargado (solo si hay archivo y está configurado el mail)
    const notifyEmail = process.env.UPLOAD_NOTIFY_EMAIL;
    if (notifyEmail && archivosAdjuntos.length > 0) {
      const archivo = archivosAdjuntos[0];
      const nombreEmpleado = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || 'Empleado/a';
      const lowerName = (archivo.nombre || '').toLowerCase();
      const isRelevante =
        lowerName.includes('aprobacion previa cliente') ||
        lowerName.includes('documento firmado') ||
        lowerName.includes('certificado médico') ||
        tipo === 'dia_estudio';

      if (isRelevante) {
        sendUploadNotificationEmail(notifyEmail, {
          nombreEmpleado,
          tipo,
          nombreArchivo: archivo.nombre,
          solicitudId: nuevaSolicitud._id,
        }).catch((err) => console.error('Error enviando email de nuevo documento (creación):', err));
      }
    }

    // Paso 2: enviar correo de confirmación al empleado (en segundo plano)
    const nombreEmpleado = [req.user.nombre, req.user.apellido].filter(Boolean).join(' ') || 'Empleado/a';
    const fechaInicioStr = dayjs(nuevaSolicitud.fechaInicio).format('DD/MM/YYYY');
    const fechaFinStr = dayjs(nuevaSolicitud.fechaFin).format('DD/MM/YYYY');

    if (req.user?.email) {
      sendRequestCreatedEmail(
        req.user.email,
        nombreEmpleado,
        tipo,
        fechaInicioStr,
        fechaFinStr,
        nuevaSolicitud.cantidadDias,
        motivo
      ).catch((err) => console.error('Error enviando email de confirmación:', err));
    }

    // Paso 3: notificación a RRHH si hay correos configurados
    const hrEmails = getHrRequestNotifyEmails();
    if (hrEmails.length > 0) {
      sendRequestCreatedNotificationToHR(hrEmails, {
        nombreEmpleado,
        tipo,
        fechaInicio: fechaInicioStr,
        fechaFin: fechaFinStr,
        cantidadDias: nuevaSolicitud.cantidadDias,
        motivo,
      }).catch((err) =>
        console.error('Error enviando email de nueva solicitud a RRHH:', err)
      );
    }

    res.status(201).json({
      message: 'Solicitud creada correctamente.',
      request: nuevaSolicitud
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Crear una solicitud en nombre de un empleado (Admin/RRHH)
// @route   POST /api/admin/requests
// @access  Private (Admin/RRHH)
export const adminCreateRequest = async (req, res, next) => {
  try {
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos para crear solicitudes en nombre de empleados.');
    }

    const { usuarioId, tipo, fechaInicio, fechaFin, motivo, adjuntarCliente, documentacionPosterior } = req.body;

    if (!usuarioId) {
      throw createError(400, 'Debes seleccionar un empleado para crear la solicitud.');
    }

    const empleado = await User.findById(usuarioId).select('nombre apellido email');
    if (!empleado) {
      throw createError(404, 'Empleado no encontrado.');
    }

    // Validaciones básicas de fechas
    const inicio = dayjs(fechaInicio);
    const fin = dayjs(fechaFin);

    if (!inicio.isValid() || !fin.isValid()) {
      throw createError(400, 'Las fechas proporcionadas no son válidas.');
    }

    if (fin.isBefore(inicio, 'day')) {
      throw createError(400, 'La fecha de fin no puede ser anterior a la fecha de inicio.');
    }

    // Verificar que no exista otra solicitud del mismo empleado con fechas que se solapan
    const solapada = await Solicitud.findOne({
      usuario: empleado._id,
      estado: { $nin: ['rechazada', 'cancelada'] },
      $or: [
        { fechaInicio: { $lte: fin.toDate() }, fechaFin: { $gte: inicio.toDate() } }
      ]
    });
    if (solapada) {
      throw createError(400, `Esas fechas ya están incluidas en otra solicitud de este empleado. Revisa sus solicitudes o elige otras fechas.`);
    }

    // Calcular cantidad de días
    const cantidadDias = fin.diff(inicio, 'day') + 1;

    // Regla de negocio: Mudanza solo puede ser de 1 día
    if (tipo === 'mudanza' && cantidadDias !== 1) {
      throw createError(400, 'Para las solicitudes de Mudanza solo podés seleccionar un (1) día.');
    }

    // --- LÓGICA DE SUBIDA A ONEDRIVE ---
    let archivosAdjuntos = [];
    
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      // Formato: Nombre Apellido - Tipo - FechaSolicitud.ext
      let fileName = `${empleado.nombre || ''} ${empleado.apellido || ''} - ${FOLDER_NAMES[tipo] || tipo} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      
      if (tipo === 'vacaciones' && adjuntarCliente === 'true') {
        fileName = `Aprobacion Previa Cliente - ${empleado.nombre || ''} ${empleado.apellido || ''} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }
      if (tipo === 'enfermedad') {
        fileName = `Certificado Médico - ${empleado.nombre || ''} ${empleado.apellido || ''} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }
      
      // Estructura: Comprobantes ASYTEC / [Tipo] / [Nombre Empleado]
      const folderPath = `Comprobantes ASYTEC/${FOLDER_NAMES[tipo] || tipo}/${getEmployeeFolderName(empleado.nombre, empleado.apellido)}`;

      const uploadResult = await uploadFileToOneDrive(req.file.buffer, fileName, folderPath);
      
      // Guardamos la referencia devuelta por OneDrive
      archivosAdjuntos.push({ nombre: fileName, url: uploadResult.webUrl, oneDriveId: uploadResult.id });
    }

    const nuevaSolicitud = new Solicitud({
      usuario: empleado._id,
      nombre: empleado.nombre,
      apellido: empleado.apellido,
      tipo,
      fechaInicio: inicio.toDate(),
      fechaFin: fin.toDate(),
      cantidadDias,
      motivo,
      documentacionPosterior: documentacionPosterior === 'true',
      archivosAdjuntos, 
      estado: 'pendiente'
    });

    await nuevaSolicitud.save();

    // Notificación interna por documento cargado (solo si hay archivo y está configurado el mail)
    const notifyEmail = process.env.UPLOAD_NOTIFY_EMAIL;
    if (notifyEmail && archivosAdjuntos.length > 0) {
      const archivo = archivosAdjuntos[0];
      const nombreEmpleado = [empleado.nombre, empleado.apellido].filter(Boolean).join(' ') || 'Empleado/a';
      const lowerName = (archivo.nombre || '').toLowerCase();
      const isRelevante =
        lowerName.includes('aprobacion previa cliente') ||
        lowerName.includes('documento firmado') ||
        lowerName.includes('certificado médico') ||
        tipo === 'dia_estudio';

      if (isRelevante) {
        sendUploadNotificationEmail(notifyEmail, {
          nombreEmpleado,
          tipo,
          nombreArchivo: archivo.nombre,
          solicitudId: nuevaSolicitud._id,
        }).catch((err) => console.error('Error enviando email de nuevo documento (creación por admin):', err));
      }
    }

    // Paso 2: enviar correo de confirmación al empleado (en segundo plano)
    const nombreEmpleado = [empleado.nombre, empleado.apellido].filter(Boolean).join(' ') || 'Empleado/a';
    const fechaInicioStr = dayjs(nuevaSolicitud.fechaInicio).format('DD/MM/YYYY');
    const fechaFinStr = dayjs(nuevaSolicitud.fechaFin).format('DD/MM/YYYY');

    if (empleado.email) {
      sendRequestCreatedEmail(
        empleado.email,
        nombreEmpleado,
        tipo,
        fechaInicioStr,
        fechaFinStr,
        nuevaSolicitud.cantidadDias,
        motivo
      ).catch((err) => console.error('Error enviando email de confirmación (admin):', err));
    }

    // Paso 3: notificación a RRHH si hay correos configurados
    const hrEmails = getHrRequestNotifyEmails();
    if (hrEmails.length > 0) {
      sendRequestCreatedNotificationToHR(hrEmails, {
        nombreEmpleado,
        tipo,
        fechaInicio: fechaInicioStr,
        fechaFin: fechaFinStr,
        cantidadDias: nuevaSolicitud.cantidadDias,
        motivo,
      }).catch((err) =>
        console.error('Error enviando email de nueva solicitud a RRHH (admin):', err)
      );
    }

    res.status(201).json({
      message: 'Solicitud creada correctamente para el empleado.',
      request: nuevaSolicitud
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Obtener archivo adjunto (Redirige a URL temporal de descarga)
// @route   GET /api/requests/file/:fileId
// @access  Private
export const getRequestFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    // Validar que fileId exista
    if (!fileId) throw createError(400, 'ID de archivo requerido');

    const downloadUrl = await getDownloadUrlForFile(fileId);
    
    if (downloadUrl) {
      return res.redirect(downloadUrl);
    } else {
      throw createError(404, 'No se pudo obtener el archivo.');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener mis solicitudes
// @route   GET /api/requests/me
// @access  Private
export const getMyRequests = async (req, res, next) => {
  try {
    const requests = await Solicitud.find({ usuario: req.user._id })
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

// @desc    Obtener todas las solicitudes (Para Admin/RRHH)
// @route   GET /api/requests
// @access  Private (Admin/RRHH)
export const getAllRequests = async (req, res, next) => {
  try {
    // Verificar rol
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos para ver todas las solicitudes.');
    }

    const { estado, usuarioId, page = 1, limit = 20, q } = req.query;
    const filter = {};

    if (estado) filter.estado = estado;
    if (usuarioId) filter.usuario = usuarioId;

    // Búsqueda por Nombre, Apellido o DNI
    if (q) {
      const regex = new RegExp(q, 'i');
      // Buscamos usuarios que coincidan con el DNI (ya que DNI no está desnormalizado en Solicitud)
      const usersByDni = await User.find({ dni: regex }).select('_id');
      const userIds = usersByDni.map(u => u._id);

      // Filtramos por nombre/apellido (en Solicitud) o por usuario (DNI encontrado)
      filter.$or = [{ nombre: regex }, { apellido: regex }, { usuario: { $in: userIds } }];
    }

    const requests = await Solicitud.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('usuario', 'nombre apellido email dni'); // Traer datos frescos del usuario

    const total = await Solicitud.countDocuments(filter);

    res.json({
      items: requests,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Aprobar o Rechazar solicitud
// @route   PATCH /api/requests/:id/status
// @access  Private (Admin/RRHH)
export const updateRequestStatus = async (req, res, next) => {
  try {
    // Verificar rol
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos para gestionar solicitudes.');
    }

    const { id } = req.params;
    const { estado, respuestaAdmin } = req.body; // estado: 'aprobada' | 'rechazada'

    if (!['aprobada', 'rechazada', 'pendiente_firma', 'en_revision'].includes(estado)) {
      throw createError(400, 'Estado inválido.');
    }

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) throw createError(404, 'Solicitud no encontrada.');

    // Permitir cambios si está pendiente O si está esperando firma (para aprobarla finalmente)
    if (!['pendiente', 'pendiente_firma', 'en_revision'].includes(solicitud.estado)) {
      throw createError(400, `La solicitud ya está ${solicitud.estado}.`);
    }

    // 1. Actualizar la solicitud
    solicitud.estado = estado;
    solicitud.respuestaAdmin = respuestaAdmin;

    // Si se adjunta un documento para firma (Solo en estado pendiente_firma)
    if (req.file && estado === 'pendiente_firma') {
      const ext = req.file.originalname.split('.').pop();
      const fileName = `PARA_FIRMA - ${solicitud.nombre} ${solicitud.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      // Misma carpeta que el empleado: Comprobantes ASYTEC / [Tipo] / [Nombre Empleado]
      const folderPath = `Comprobantes ASYTEC/${FOLDER_NAMES[solicitud.tipo] || solicitud.tipo}/${getEmployeeFolderName(solicitud.nombre, solicitud.apellido)}`;

      const uploadResult = await uploadFileToOneDrive(req.file.buffer, fileName, folderPath);
      
      solicitud.documentoParaFirma = {
        nombre: fileName,
        url: uploadResult.webUrl,
        oneDriveId: uploadResult.id
      };
    }

    await solicitud.save();

    // Enviar email al empleado (fire-and-forget)
    User.findById(solicitud.usuario)
      .select('email')
      .lean()
      .then((user) => {
        if (user?.email) {
          const nombreEmpleado = [solicitud.nombre, solicitud.apellido].filter(Boolean).join(' ') || 'Empleado/a';
          sendRequestStatusUpdateEmail(user.email, nombreEmpleado, solicitud.tipo, estado, respuestaAdmin, solicitud.motivo).catch((err) =>
            console.error('Error enviando email de actualización:', err)
          );
        }
      })
      .catch((err) => console.error('Error obteniendo email del usuario:', err));

    // 2. Si es APROBADA, generar registros en Asistencia
    if (estado === 'aprobada') {
      let cursor = dayjs(solicitud.fechaInicio);
      const fin = dayjs(solicitud.fechaFin);
      const asistenciaOps = [];

      while (cursor.isSameOrBefore(fin, 'day')) {
        const diaIndex = cursor.day(); // 0=Domingo, 6=Sábado
        const isWeekend = diaIndex === 0 || diaIndex === 6;

        // Solo generamos asistencia si NO es fin de semana (ajustar según política)
        if (!isWeekend) {
          asistenciaOps.push({
            updateOne: {
              filter: { 
                usuario: solicitud.usuario, 
                fecha: cursor.format('YYYY-MM-DD') 
              },
              update: {
                $set: {
                  estado: 'ausente',
                  motivo:
                    solicitud.tipo === 'dia_estudio'
                      ? 'Día de estudio'
                      : solicitud.tipo === 'enfermedad'
                      ? 'Enfermedad'
                      : solicitud.tipo === 'vacaciones'
                      ? 'Vacaciones'
                      : solicitud.tipo === 'mudanza'
                      ? 'Mudanza'
                      : solicitud.tipo === 'maternidad' || solicitud.tipo === 'paternidad'
                      ? 'Maternidad / Paternidad'
                      : 'Ausencia justificada',
                  nota: `Solicitud aprobada #${solicitud._id.toString().slice(-6)}: ${respuestaAdmin || ''}`,
                  autoGenerado: true,
                  nombre: solicitud.nombre,
                  apellido: solicitud.apellido,
                  diaSemana: diasSemana[diaIndex]
                },
                $setOnInsert: { 
                  // Campos que solo se ponen si se crea nuevo
                }
              },
              upsert: true // Crea si no existe, actualiza si existe
            }
          });
        }
        cursor = cursor.add(1, 'day');
      }

      if (asistenciaOps.length > 0) {
        await Asistencia.bulkWrite(asistenciaOps);
      }
    }

    res.json({ message: `Solicitud ${estado} correctamente.`, solicitud });

  } catch (error) {
    next(error);
  }
};

// @desc    Editar solicitud propia (Solo pendiente)
// @route   PUT /api/requests/:id
// @access  Private
export const editRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tipo, fechaInicio, fechaFin, motivo, eliminarArchivo, adjuntarCliente, documentacionPosterior } = req.body;
    const userId = req.user._id;

    const solicitud = await Solicitud.findOne({ _id: id, usuario: userId });

    if (!solicitud) {
      throw createError(404, 'Solicitud no encontrada.');
    }

    // Permitimos editar si está pendiente, en revisión (enfermedad: subir certificado más tarde), esperando firma,
    // o día de estudio aprobada (para subir certificado posterior)
    const isStudyDayApproved = solicitud.tipo === 'dia_estudio' && solicitud.estado === 'aprobada';
    const isEnfermedadEnRevision = solicitud.tipo === 'enfermedad' && solicitud.estado === 'en_revision';
    const tiposDocsPosterior = ['otro', 'paternidad', 'maternidad', 'mudanza'];
    const isDocsPosteriorEnRevision =
      solicitud.estado === 'en_revision' &&
      tiposDocsPosterior.includes(solicitud.tipo) &&
      solicitud.documentacionPosterior === true;

    if (!['pendiente', 'pendiente_firma', 'en_revision'].includes(solicitud.estado) && !isStudyDayApproved) {
      throw createError(400, 'Solo se pueden editar solicitudes pendientes, en revisión (para adjuntar certificado), en espera de firma o días de estudio aprobados (para adjuntar certificado).');
    }
    // En en_revision permitir edición solo para:
    // - enfermedad (certificado médico)
    // - día de estudio (certificado examen)
    // - otros tipos SOLO si se habilitó documentación posterior al crear (para subir comprobante)
    if (solicitud.estado === 'en_revision' && !['enfermedad', 'dia_estudio'].includes(solicitud.tipo) && !isDocsPosteriorEnRevision) {
      throw createError(400, 'Solo se pueden editar solicitudes en trámite para adjuntar documentación pendiente.');
    }

    // Detectar si el tipo cambió para mover archivos
    const tipoCambio = tipo && tipo !== solicitud.tipo;

    // Actualizar campos si vienen en el body
    // Si está aprobada, NO permitimos cambiar el tipo ni las fechas
    if (solicitud.estado !== 'aprobada' && tipo) solicitud.tipo = tipo;
    
    if (motivo) solicitud.motivo = motivo;

    // Permitir setear documentacionPosterior sólo mientras no esté aprobada
    if (solicitud.estado !== 'aprobada' && documentacionPosterior !== undefined) {
      solicitud.documentacionPosterior = documentacionPosterior === 'true';
    }
    
    // Si se pide eliminar el archivo explícitamente, borramos los anteriores
    const shouldDelete = (eliminarArchivo === 'true');

    if (shouldDelete && solicitud.archivosAdjuntos && solicitud.archivosAdjuntos.length > 0) {
      for (const adjunto of solicitud.archivosAdjuntos) {
        if (adjunto.oneDriveId) {
          await deleteFileFromOneDrive(adjunto.oneDriveId);
        }
      }
      solicitud.archivosAdjuntos = [];
    }

    // Para notificar internamente si se sube un nuevo archivo relevante
    let uploadedFileForNotification = null;

    // Si se sube un nuevo archivo
    if (req.file) {
      // Plazo para cargar documentación posterior (desde fechaInicio de la solicitud)
      const tipoActual = solicitud.tipo;
      const tiposDocsPosterior = ['otro', 'paternidad', 'maternidad', 'mudanza'];
      let plazoDias = null;
      if (tipoActual === 'dia_estudio') {
        plazoDias = 7; // certificado de examen: 7 días calendario desde el día solicitado
      } else if (
        tipoActual === 'enfermedad' ||
        (tiposDocsPosterior.includes(tipoActual) && solicitud.documentacionPosterior === true)
      ) {
        plazoDias = 2;
      }

      if (plazoDias !== null) {
        const baseDate = solicitud.fechaInicio ? dayjs(solicitud.fechaInicio) : dayjs(solicitud.createdAt);
        const limite = baseDate.add(plazoDias, 'day').endOf('day');

        if (dayjs().isAfter(limite)) {
          const mensaje =
            tipoActual === 'dia_estudio'
              ? 'El plazo de 7 días para cargar el certificado de examen venció. Por favor, contactate con RRHH para regularizar tu solicitud.'
              : 'El plazo de 48 horas para cargar la documentación venció. Por favor, contactate con RRHH para regularizar tu solicitud.';
          throw createError(400, mensaje);
        }
      }

      const ext = req.file.originalname.split('.').pop();
      let fileName = `${req.user.nombre} ${req.user.apellido} - ${FOLDER_NAMES[solicitud.tipo] || solicitud.tipo} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      
      const currentTipo = (solicitud.estado !== 'aprobada' && tipo) ? tipo : solicitud.tipo;
      if (currentTipo === 'vacaciones' && adjuntarCliente === 'true') {
        fileName = `Aprobacion Previa Cliente - ${req.user.nombre} ${req.user.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }
      if (currentTipo === 'enfermedad') {
        fileName = `Certificado Médico - ${req.user.nombre} ${req.user.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }

      if (solicitud.estado === 'pendiente_firma') {
        fileName = `Documento Firmado - ${req.user.nombre} ${req.user.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }

      // Comprobantes ASYTEC / [Tipo] / [Nombre Empleado] (mismo empleado que la solicitud)
      const folderPath = `Comprobantes ASYTEC/${FOLDER_NAMES[solicitud.tipo] || solicitud.tipo}/${getEmployeeFolderName(solicitud.nombre, solicitud.apellido)}`;

      const uploadResult = await uploadFileToOneDrive(req.file.buffer, fileName, folderPath);
      
      const newFile = { 
        nombre: fileName, 
        url: uploadResult.webUrl, 
        oneDriveId: uploadResult.id 
      };

      uploadedFileForNotification = newFile;

      // En pendiente_firma el empleado sube el documento firmado: AGREGAR sin borrar los anteriores
      // (así se conservan aprobación previa del cliente + documento firmado; documentoParaFirma ya está aparte)
      if (solicitud.estado === 'pendiente_firma') {
        if (!solicitud.archivosAdjuntos) solicitud.archivosAdjuntos = [];
        solicitud.archivosAdjuntos.push(newFile);
      } else {
        // En otros estados: reemplazar adjuntos (no acumular)
        if (solicitud.archivosAdjuntos && solicitud.archivosAdjuntos.length > 0) {
          for (const adjunto of solicitud.archivosAdjuntos) {
            if (adjunto.oneDriveId) {
              try {
                await deleteFileFromOneDrive(adjunto.oneDriveId);
              } catch (error) {
                console.error('Error eliminando archivo anterior:', error);
              }
            }
          }
        }
      solicitud.archivosAdjuntos = [newFile];
      }
    } else if (tipoCambio && solicitud.archivosAdjuntos && solicitud.archivosAdjuntos.length > 0) {
      // Si NO hay archivo nuevo, pero cambió el TIPO, movemos el archivo existente
      const adjunto = solicitud.archivosAdjuntos[0]; // Asumimos 1 archivo por ahora
      
      // Extraer extensión del nombre anterior
      const ext = adjunto.nombre.split('.').pop();
      
      // Generar nuevo nombre y ruta (carpeta por empleado)
      let newFileName = `${req.user.nombre} ${req.user.apellido} - ${FOLDER_NAMES[solicitud.tipo] || solicitud.tipo} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      if (solicitud.tipo === 'enfermedad') {
        newFileName = `Certificado Médico - ${req.user.nombre} ${req.user.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }
      const newFolderPath = `Comprobantes ASYTEC/${FOLDER_NAMES[solicitud.tipo] || solicitud.tipo}/${getEmployeeFolderName(solicitud.nombre, solicitud.apellido)}`;

      // Mover en OneDrive
      const moveResult = await moveFileInOneDrive(adjunto.oneDriveId, newFileName, newFolderPath);

      // Actualizar referencia en BD
      solicitud.archivosAdjuntos = [{
        nombre: newFileName,
        url: moveResult.webUrl,
        oneDriveId: moveResult.id
      }];
    }
    
    if (solicitud.estado !== 'aprobada' && fechaInicio && fechaFin) {
      const inicio = dayjs(fechaInicio);
      const fin = dayjs(fechaFin);
      
      if (!inicio.isValid() || !fin.isValid()) throw createError(400, 'Fechas inválidas.');
      if (fin.isBefore(inicio, 'day')) throw createError(400, 'La fecha fin no puede ser anterior a inicio.');

      // Verificar que no exista otra solicitud del mismo empleado (excluyendo esta) con fechas que se solapan
      const solapada = await Solicitud.findOne({
        usuario: userId,
        _id: { $ne: solicitud._id },
        estado: { $nin: ['rechazada', 'cancelada'] },
        fechaInicio: { $lte: fin.toDate() },
        fechaFin: { $gte: inicio.toDate() }
      });
      if (solapada) {
        throw createError(400, `Esas fechas ya están incluidas en otra solicitud (del ${dayjs(solapada.fechaInicio).format('DD/MM/YYYY')} al ${dayjs(solapada.fechaFin).format('DD/MM/YYYY')}). Revisa tus solicitudes o elige otras fechas.`);
      }
      
      solicitud.fechaInicio = inicio.toDate();
      solicitud.fechaFin = fin.toDate();
      solicitud.cantidadDias = fin.diff(inicio, 'day') + 1;
    }

    await solicitud.save();

    // Notificación interna por documento cargado (solo si hay archivo relevante y está configurado el mail)
    const notifyEmail = process.env.UPLOAD_NOTIFY_EMAIL;
    if (notifyEmail && uploadedFileForNotification) {
      const archivo = uploadedFileForNotification;
      const nombreEmpleado = [solicitud.nombre, solicitud.apellido].filter(Boolean).join(' ') || 'Empleado/a';
      const lowerName = (archivo.nombre || '').toLowerCase();
      const isRelevante =
        lowerName.includes('aprobacion previa cliente') ||
        lowerName.includes('documento firmado') ||
        lowerName.includes('certificado médico') ||
        solicitud.tipo === 'dia_estudio';

      if (isRelevante) {
        sendUploadNotificationEmail(notifyEmail, {
          nombreEmpleado,
          tipo: solicitud.tipo,
          nombreArchivo: archivo.nombre,
          solicitudId: solicitud._id,
        }).catch((err) => console.error('Error enviando email de nuevo documento (edición):', err));
      }
    }

    res.json({ message: 'Solicitud actualizada.', request: solicitud });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar solicitud propia (Solo pendiente)
// @route   DELETE /api/requests/:id
// @access  Private
export const deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const solicitud = await Solicitud.findOne({ _id: id, usuario: userId });

    if (!solicitud) {
      throw createError(404, 'Solicitud no encontrada.');
    }

    if (!['pendiente', 'pendiente_firma'].includes(solicitud.estado)) {
      throw createError(400, 'Solo se pueden eliminar solicitudes pendientes o en espera de firma.');
    }

    await solicitud.deleteOne();

    res.json({ message: 'Solicitud eliminada correctamente.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Editar solicitud completa (Admin/RRHH)
// @route   PUT /api/admin/requests/:id
// @access  Private (Admin/RRHH)
export const adminUpdateRequest = async (req, res, next) => {
  try {
    // Verificar rol
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos para editar solicitudes.');
    }

    const { id } = req.params;
    const { tipo, fechaInicio, fechaFin, motivo, estado, respuestaAdmin } = req.body;

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) throw createError(404, 'Solicitud no encontrada.');

    if (tipo) solicitud.tipo = tipo;
    if (motivo) solicitud.motivo = motivo;
    if (estado) solicitud.estado = estado;
    if (respuestaAdmin !== undefined) solicitud.respuestaAdmin = respuestaAdmin;

    if (fechaInicio && fechaFin) {
      const inicio = dayjs(fechaInicio);
      const fin = dayjs(fechaFin);
      
      if (!inicio.isValid() || !fin.isValid()) throw createError(400, 'Fechas inválidas.');
      if (fin.isBefore(inicio, 'day')) throw createError(400, 'La fecha fin no puede ser anterior a inicio.');
      
      const nuevaCantidadDias = fin.diff(inicio, 'day') + 1;

      // Regla de negocio: Mudanza solo puede ser de 1 día
      if (solicitud.tipo === 'mudanza' && nuevaCantidadDias !== 1) {
        throw createError(400, 'Para las solicitudes de Mudanza solo podés seleccionar hasta un (1) día.');
      }

      solicitud.fechaInicio = inicio.toDate();
      solicitud.fechaFin = fin.toDate();
      solicitud.cantidadDias = nuevaCantidadDias;
    }

    // Si el admin adjunta un nuevo documento, reemplazamos los adjuntos actuales
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      let fileName = `${solicitud.nombre} ${solicitud.apellido} - ${FOLDER_NAMES[solicitud.tipo] || solicitud.tipo} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;

      if (solicitud.tipo === 'enfermedad') {
        fileName = `Certificado Médico - ${solicitud.nombre} ${solicitud.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }

      if (solicitud.estado === 'pendiente_firma') {
        fileName = `Documento Firmado - ${solicitud.nombre} ${solicitud.apellido} - ${dayjs().format('YYYY-MM-DD')}.${ext}`;
      }

      const folderPath = `Comprobantes ASYTEC/${FOLDER_NAMES[solicitud.tipo] || solicitud.tipo}/${getEmployeeFolderName(solicitud.nombre, solicitud.apellido)}`;

      // Eliminar archivos anteriores si existen
      if (solicitud.archivosAdjuntos && solicitud.archivosAdjuntos.length > 0) {
        for (const adjunto of solicitud.archivosAdjuntos) {
          if (adjunto.oneDriveId) {
            try {
              await deleteFileFromOneDrive(adjunto.oneDriveId);
            } catch (err) {
              console.error('Error eliminando archivo anterior (adminUpdateRequest):', err);
            }
          }
        }
      }

      const uploadResult = await uploadFileToOneDrive(req.file.buffer, fileName, folderPath);

      solicitud.archivosAdjuntos = [{
        nombre: fileName,
        url: uploadResult.webUrl,
        oneDriveId: uploadResult.id
      }];
    }

    await solicitud.save();

    res.json({ message: 'Solicitud actualizada correctamente.', request: solicitud });
  } catch (error) {
    next(error);
  }
};

// @desc    Eliminar solicitud (Admin/RRHH)
// @route   DELETE /api/admin/requests/:id
// @access  Private (Admin/RRHH)
export const adminDeleteRequest = async (req, res, next) => {
  try {
    // Verificar rol
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos para eliminar solicitudes.');
    }

    const { id } = req.params;
    const solicitud = await Solicitud.findById(id);

    if (!solicitud) {
      throw createError(404, 'Solicitud no encontrada.');
    }

    // Eliminar archivos adjuntos de OneDrive si existen
    if (solicitud.archivosAdjuntos && solicitud.archivosAdjuntos.length > 0) {
      for (const archivo of solicitud.archivosAdjuntos) {
        if (archivo.oneDriveId) {
          await deleteFileFromOneDrive(archivo.oneDriveId);
        }
      }
    }
    if (solicitud.documentoParaFirma && solicitud.documentoParaFirma.oneDriveId) {
      await deleteFileFromOneDrive(solicitud.documentoParaFirma.oneDriveId);
    }

    await solicitud.deleteOne();

    res.json({ message: 'Solicitud eliminada correctamente.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Enviar recordatorio al empleado para subir certificado/documento (Admin/RRHH)
// @route   POST /api/admin/requests/:id/send-reminder
// @access  Private (Admin/RRHH)
export const sendRequestReminder = async (req, res, next) => {
  try {
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos para enviar recordatorios.');
    }

    const { id } = req.params;
    const solicitud = await Solicitud.findById(id).lean();
    if (!solicitud) throw createError(404, 'Solicitud no encontrada.');

    const tieneDocFirmado = solicitud.archivosAdjuntos?.some((f) => f.nombre?.includes('Documento Firmado'));
    const tieneCertificado = solicitud.archivosAdjuntos?.length > 0;
    const tiposDocsPosterior = ['otro', 'paternidad', 'maternidad', 'mudanza'];

    let mensajeTipo = null;
    if (solicitud.estado === 'pendiente_firma' && solicitud.documentoParaFirma && !tieneDocFirmado) {
      mensajeTipo = 'documento firmado';
    } else if (solicitud.estado === 'en_revision' && !tieneCertificado) {
      if (solicitud.tipo === 'enfermedad') mensajeTipo = 'certificado médico';
      else if (solicitud.tipo === 'dia_estudio') mensajeTipo = 'certificado de examen';
      else if (solicitud.documentacionPosterior === true && tiposDocsPosterior.includes(solicitud.tipo)) {
        mensajeTipo = 'Documento posterior';
      }
    }

    if (!mensajeTipo) {
      throw createError(400, 'Esta solicitud no tiene documentación pendiente para recordar.');
    }

    const user = await User.findById(solicitud.usuario).select('email nombre apellido').lean();
    if (!user?.email) {
      throw createError(400, 'El empleado no tiene email registrado.');
    }

    const nombreEmpleado = [user.nombre, user.apellido].filter(Boolean).join(' ') || 'Empleado/a';
    await sendCertificateReminderEmail(
      user.email,
      nombreEmpleado,
      solicitud.tipo,
      mensajeTipo,
      solicitud.motivo || ""
    );

    res.json({ message: 'Recordatorio enviado correctamente.' });
  } catch (error) {
    next(error);
  }
};

// --- Comentarios (empleado) ---

// @desc    Obtener comentarios de una solicitud propia
// @route   GET /api/requests/:id/comments
// @access  Private (solo dueño de la solicitud)
export const getRequestComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const solicitud = await Solicitud.findOne({ _id: id, usuario: userId }).select('comentarios');
    if (!solicitud) throw createError(404, 'Solicitud no encontrada.');

    const comentarios = (solicitud.comentarios || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ comments: comentarios });
  } catch (error) {
    next(error);
  }
};

// @desc    Añadir comentario a una solicitud propia
// @route   POST /api/requests/:id/comments
// @access  Private (solo dueño de la solicitud)
export const addRequestComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { texto } = req.body;
    const userId = req.user._id;

    if (!texto || !texto.trim()) throw createError(400, 'El texto del comentario es requerido.');

    const solicitud = await Solicitud.findOne({ _id: id, usuario: userId });
    if (!solicitud) throw createError(404, 'Solicitud no encontrada.');

    const nombreAutor = `${req.user.nombre || ''} ${req.user.apellido || ''}`.trim() || 'Empleado';
    const nuevoComentario = {
      autor: userId,
      esAdmin: false,
      nombreAutor,
      texto: texto.trim(),
      createdAt: new Date()
    };

    if (!solicitud.comentarios) solicitud.comentarios = [];
    solicitud.comentarios.push(nuevoComentario);
    await solicitud.save();

    const comentarios = solicitud.comentarios.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.status(201).json({ message: 'Comentario agregado.', comments: comentarios });
  } catch (error) {
    next(error);
  }
};

// --- Comentarios (admin/RRHH) ---

// @desc    Obtener comentarios de una solicitud (admin)
// @route   GET /api/admin/requests/:id/comments
// @access  Private (Admin/RRHH)
export const getAdminRequestComments = async (req, res, next) => {
  try {
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos.');
    }
    const { id } = req.params;
    const solicitud = await Solicitud.findById(id).select('comentarios');
    if (!solicitud) throw createError(404, 'Solicitud no encontrada.');

    const comentarios = (solicitud.comentarios || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ comments: comentarios });
  } catch (error) {
    next(error);
  }
};

// @desc    Añadir comentario a una solicitud (admin)
// @route   POST /api/admin/requests/:id/comments
// @access  Private (Admin/RRHH)
export const addAdminRequestComment = async (req, res, next) => {
  try {
    if (!['admin', 'rrhh'].includes(req.user.rol)) {
      throw createError(403, 'No tienes permisos.');
    }
    const { id } = req.params;
    const { texto } = req.body;

    if (!texto || !texto.trim()) throw createError(400, 'El texto del comentario es requerido.');

    const solicitud = await Solicitud.findById(id);
    if (!solicitud) throw createError(404, 'Solicitud no encontrada.');

    const nombreAutor = 'Recursos Humanos';
    const nuevoComentario = {
      autor: req.user._id,
      esAdmin: true,
      nombreAutor,
      texto: texto.trim(),
      createdAt: new Date()
    };

    if (!solicitud.comentarios) solicitud.comentarios = [];
    solicitud.comentarios.push(nuevoComentario);
    await solicitud.save();

    const comentarios = solicitud.comentarios.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.status(201).json({ message: 'Comentario agregado.', comments: comentarios });
  } catch (error) {
    next(error);
  }
};
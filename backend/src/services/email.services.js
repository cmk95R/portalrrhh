import { Resend } from "resend";

// Remitente: dominio verificado asytec.ar (configurado directo aquí)
const FROM_EMAIL = "noreply@asytec.ar";
const FROM_NAME = "Portal Colaboradores ASYTEC";

let resend;

const getResendClient = () => {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

/**
 * Envía un correo genérico.
 * @param {string} to - Email del destinatario
 * @param {string} subject - Asunto
 * @param {string} html - Cuerpo HTML
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY no configurada, no se envía email.");
    return { success: false, error: "Email no configurado" };
  }
  try {
    const { error } = await getResendClient().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error("Error enviando email:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("Error enviando email:", err);
    return { success: false, error: err?.message || "Error desconocido" };
  }
}

const ESTADO_LABELS = {
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  pendiente_firma: "Pendiente de firma",
  en_revision: "En trámite",
};

// Etiquetas legibles para los tipos de solicitud
const TIPO_LABELS = {
  dia_estudio: "Día de Estudio",
  mudanza: "Mudanza",
  enfermedad: "Licencia Médica por Enfermedad",
  maternidad: "Licencia Médica por Maternidad",
  paternidad: "Licencia Médica por Paternidad",
  otro: "Otro",
  vacaciones: "Vacaciones",
};

const getTipoLabel = (tipo) => {
  const rawTipo = String(tipo || "").toLowerCase();
  if (!rawTipo) return "";
  if (TIPO_LABELS[rawTipo]) return TIPO_LABELS[rawTipo];

  return rawTipo
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
};

/**
 * Envía correo al empleado cuando RRHH actualiza el estado de su solicitud.
 * @param {string} to - Email del empleado
 * @param {string} nombreEmpleado - Nombre (o nombre + apellido)
 * @param {string} tipo - Tipo de solicitud (vacaciones, enfermedad, etc.)
 * @param {string} estado - Nuevo estado
 * @param {string} [respuestaAdmin] - Nota de RRHH
 */
export async function sendRequestStatusUpdateEmail(to, nombreEmpleado, tipo, estado, respuestaAdmin = "", motivo = "") {
  const estadoLabel = ESTADO_LABELS[estado] || estado;
  const tipoLabel = getTipoLabel(tipo);
  const subject = `Tu solicitud por ${tipoLabel} fue actualizada`;
  const bodyHtml = `
    <p style="margin:0 0 16px 0; font-size:16px; color:#173487; font-weight:bold;">
      Hola <strong>${nombreEmpleado}</strong>,
    </p>
    <p style="margin:0 0 16px 0; font-size:14px; color:#475569;">
      Tu solicitud por <strong>${tipoLabel}</strong> ha sido actualizada por el equipo de Recursos Humanos.
    </p>
    ${
      motivo
        ? `<p style="margin:0 0 16px 0; font-size:14px; color:#475569;">
             <strong>Motivo:</strong> ${String(motivo).replace(/\n/g, "<br/>")}
           </p>`
        : ""
    }
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 12px 0; font-size:13px; color:#64748b;">
            <strong>Nuevo estado</strong>
          </p>
          <p style="margin:0; font-size:18px; font-weight:bold; color:#173487; background-color:#e8eef7; padding:10px 14px; border-left:4px solid #173487; border-radius:4px;">
            ${(estadoLabel || '').toUpperCase()}
          </p>
          ${
            respuestaAdmin
              ? `<p style="margin:12px 0 0 0; font-size:13px; color:#475569;">
                   <strong>Nota de Recursos Humanos:</strong><br/>${respuestaAdmin.replace(/\n/g, "<br/>")}
                 </p>`
              : ""
          }
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0; font-size:12px; color:#64748b;">
      Podés ver el detalle en el portal de colaboradores.
      <a href="https://colaboradores.asytec.ar" style="color:#173487; text-decoration:none; font-weight:bold;">Ingresar</a>
    </p>
  `;
  const html = EMAIL_TEMPLATE_WRAPPER("Solicitud actualizada", bodyHtml);
  return sendEmail({ to, subject, html });
}

/**
 * Paso 2: Envía correo al empleado cuando CREA una solicitud (confirmación de recepción).
 * @param {string} to - Email del empleado
 * @param {string} nombreEmpleado - Nombre (o nombre + apellido)
 * @param {string} tipo - Tipo de solicitud (vacaciones, enfermedad, etc.)
 * @param {string} fechaInicio - Fecha inicio (formato legible)
 * @param {string} fechaFin - Fecha fin (formato legible)
 * @param {number} cantidadDias - Cantidad de días
 */
export async function sendRequestCreatedEmail(to, nombreEmpleado, tipo, fechaInicio, fechaFin, cantidadDias, motivo = "") {
  const tipoLabel = getTipoLabel(tipo);
  const subject = `Recibimos tu solicitud por ${tipoLabel}`;
  const bodyHtml = `
    <p style="margin:0 0 16px 0; font-size:16px; color:#173487; font-weight:bold;">
      Hola <strong>${nombreEmpleado}</strong>,
    </p>
    <p style="margin:0 0 16px 0; font-size:14px; color:#475569;">
      Confirmamos que hemos recibido tu solicitud por <strong>${tipoLabel}</strong> correctamente.
    </p>
    ${
      motivo
        ? `<p style="margin:0 0 16px 0; font-size:14px; color:#475569;">
             Con el motivo: <strong>${String(motivo).replace(/\n/g, "<br/>")}</strong>
           </p>`
        : ""
    }
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0; font-size:13px; color:#1e293b;">
            <strong>Período:</strong> ${fechaInicio} al ${fechaFin}
          </p>
          <p style="margin:5px 0 0 0; font-size:13px; color:#173487;">
            <strong>Total:</strong> ${cantidadDias} día${cantidadDias !== 1 ? "s" : ""}
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0; font-size:12px; color:#64748b;">
      Te notificaremos en cuanto el equipo de Recursos Humanos la revise.
      Podés ver el detalle en el portal de colaboradores:
      <a href="https://colaboradores.asytec.ar" style="color:#173487; text-decoration:none; font-weight:bold;">Ingresar</a>
    </p>
  `;
  const html = EMAIL_TEMPLATE_WRAPPER("Solicitud recibida", bodyHtml);
  return sendEmail({ to, subject, html });
}

const EMAIL_TEMPLATE_WRAPPER = (titulo, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif; color:#1e293b;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; width:100%; background-color:#ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#173487; padding:24px 20px; text-align:center;">
              <img src="https://colaboradores.asytec.ar/logo_blanco.png" alt="ASYTEC" width="140" height="40" style="display:block; margin:0 auto 10px auto; max-width:120px; height:auto;">
              <p style="margin:0; color:#ffffff; font-size:16px; font-weight:bold; letter-spacing:0.5px; text-transform:uppercase;">
                ${titulo}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px; border-top:1px solid #eeeeee; text-align:center;">
              <p style="margin:0; font-size:12px; color:#64748b;">© 2026 ASYTEC Sistemas S.R.L.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Recordatorio para subir certificado / documento firmado (RRHH lo dispara).
 * `motivo` es opcional y se muestra si viene informado.
 */
export async function sendCertificateReminderEmail(to, nombreEmpleado, tipo, mensajeTipo, motivo = "") {
  const tipoLabel = getTipoLabel(tipo);
  const subject = `Recordatorio: ${tipoLabel} pendiente`;
  const bodyHtml = `
    <p style="margin:0 0 16px 0; font-size:16px; color:#173487; font-weight:bold;">
      Hola <strong>${nombreEmpleado}</strong>,
    </p>
    <p style="margin:0 0 16px 0; font-size:14px; color:#475569;">
      Te recordamos que tu solicitud por <strong>${tipoLabel}</strong> requiere que subas el <strong>${mensajeTipo}</strong>.
    </p>
    ${
      motivo
        ? `<p style="margin:0 0 16px 0; font-size:14px; color:#475569;">
             <strong>Motivo informado:</strong> ${String(motivo).replace(/\n/g, "<br/>")}
           </p>`
        : ""
    }
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0; font-size:13px; color:#1e293b;">
            Ingresá al sistema y completá la carga del documento para que podamos continuar con la gestión de tu solicitud.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0; font-size:12px; color:#64748b;">
      <a href="https://colaboradores.asytec.ar" style="color:#173487; text-decoration:none; font-weight:bold;">
        Ingresar al portal
      </a>
    </p>
  `;
  const html = EMAIL_TEMPLATE_WRAPPER("Recordatorio de documentación", bodyHtml);
  return sendEmail({ to, subject, html });
}

/**
 * Notificación interna cuando un empleado sube un documento relevante (doc firmado, certificado, etc.).
 * Se envía típicamente a RRHH / casilla de notificaciones.
 * Plantilla en tablas + estilos inline para mejor compatibilidad con Outlook en PC.
 */
export async function sendUploadNotificationEmail(to, { nombreEmpleado, tipo, nombreArchivo, solicitudId }) {
  if (!to) {
    return { success: false, error: "Destinatario no configurado" };
  }

  const tipoLabel = getTipoLabel(tipo);
  const subject = `Nuevo documento en solicitud por ${tipoLabel}`;

  const bodyHtml = `
    <p style="margin:0 0 16px 0; font-size:16px; color:#173487; font-weight:bold;">
      Hola equipo de Recursos Humanos,
    </p>
    <p style="margin:0 0 20px 0; font-size:14px; color:#475569; line-height:1.5;">
      El empleado <strong>${nombreEmpleado}</strong> ha cargado un nuevo documento en una solicitud por <strong>${tipoLabel}</strong>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px 0; font-size:13px; color:#1e293b;"><strong>Archivo:</strong> ${nombreArchivo}</p>
          ${solicitudId ? `<p style="margin:0; font-size:13px; color:#1e293b;"><strong>ID de solicitud:</strong> ${solicitudId}</p>` : ""}
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0; font-size:13px; color:#64748b;">
      Podés revisar el detalle desde el panel de administración del portal de colaboradores.
    </p>
  `;

  const html = EMAIL_TEMPLATE_WRAPPER("Nuevo documento cargado", bodyHtml);
  return sendEmail({ to, subject, html });
}

/** Convierte cuerpo en texto plano a HTML; reemplaza {{nombre}}, {{fecha}}, {{fecha_desde}} y {{fecha_hasta}}. */
function buildAttendanceReminderBody(bodyPlain, nombreEmpleado, fechas) {
  const fechaLegible = typeof fechas === "string" ? fechas : fechas?.fechaLegible;
  const fechaDesdeLegible = typeof fechas === "string" ? fechas : (fechas?.fechaDesdeLegible || fechaLegible);
  const fechaHastaLegible = typeof fechas === "string" ? fechas : (fechas?.fechaHastaLegible || fechaLegible);

  const text = (bodyPlain || "")
    .replace(/\{\{nombre\}\}/gi, nombreEmpleado)
    .replace(/\{\{fecha_desde\}\}/gi, fechaDesdeLegible)
    .replace(/\{\{fecha_hasta\}\}/gi, fechaHastaLegible)
    .replace(/\{\{fecha\}\}/gi, fechaLegible);
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="color: #475569; font-size: 14px; font-family: 'Poppins', sans-serif;">${p.replace(/\n/g, "<br/>")}</p>`
    )
    .join("");
  const linkHtml = `<p style="font-size: 13px; color: #64748b; font-family: 'Poppins', sans-serif;"><a href="https://colaboradores.asytec.ar" style="color: #173487; text-decoration: none; font-weight: 600;">Ingresar al portal</a></p>`;
  return bodyHtml + linkHtml;
}

/**
 * Recordatorio para registrar asistencia (RRHH lo dispara).
 * Soporta plantillas con {{nombre}}, {{fecha}}, {{fecha_desde}} y {{fecha_hasta}}.
 */
export async function sendAttendanceReminderEmail(to, nombreEmpleado, fechaDesdeLegible, fechaHastaLegible, options = {}) {
  const fechaDesde = fechaDesdeLegible;
  const fechaHasta = fechaHastaLegible || fechaDesdeLegible;
  const fechaLegible = fechaDesde === fechaHasta ? fechaDesde : `${fechaDesde} al ${fechaHasta}`;

  const subjectTemplate = options.subject != null ? options.subject : `Recordatorio: Registrar Asistencia del {{fecha}}`;
  const subject = subjectTemplate
    .replace(/\{\{nombre\}\}/gi, nombreEmpleado)
    .replace(/\{\{fecha_desde\}\}/gi, fechaDesde)
    .replace(/\{\{fecha_hasta\}\}/gi, fechaHasta)
    .replace(/\{\{fecha\}\}/gi, fechaLegible);

  const defaultBodySingle = `Hola {{nombre}},\n\nTe recordamos que registres tu asistencia del día {{fecha}}.\n\nIngresá al portal de colaboradores y marcá presente o ausente según corresponda.`;
  const defaultBodyRange = `Hola {{nombre}},\n\nTe recordamos que registres tu asistencia desde el día {{fecha_desde}} hasta el {{fecha_hasta}}.\n\nIngresá al portal de colaboradores y marcá presente o ausente según corresponda.`;

  const bodyPlain = options.body != null
    ? options.body
    : (fechaDesde === fechaHasta ? defaultBodySingle : defaultBodyRange);

  const bodyHtml = buildAttendanceReminderBody(bodyPlain, nombreEmpleado, {
    fechaLegible,
    fechaDesdeLegible: fechaDesde,
    fechaHastaLegible: fechaHasta,
  });
  const html = EMAIL_TEMPLATE_WRAPPER("Recordatorio de asistencia", bodyHtml);
  return sendEmail({ to, subject, html });
}
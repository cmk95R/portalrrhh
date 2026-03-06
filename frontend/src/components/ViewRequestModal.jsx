import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Chip,
  Divider,
  Paper,
  TextField,
  CircularProgress
} from '@mui/material';
import {
  AttachFile,
  School,
  BeachAccess,
  LocalShipping,
  HelpOutline,
  LocalHospital,
  ChildFriendly,
  Chat as ChatIcon,
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { getRequestFileApi, getAdminRequestCommentsApi, postAdminRequestCommentApi } from '../api/request';
import FilePreviewModal from './FilePreviewModal';

// Configuraciones visuales
const REQUEST_TYPES_CONFIG = {
  vacaciones: { label: 'Vacaciones', icon: BeachAccess, color: 'success' },
  dia_estudio: { label: 'Día de Estudio', icon: School, color: 'primary' },
  mudanza: { label: 'Mudanza', icon: LocalShipping, color: 'info' },
  enfermedad: { label: 'Enfermedad', icon: LocalHospital, color: 'error' },
  maternidad: { label: 'Maternidad', icon: ChildFriendly, color: 'secondary' },
  paternidad: { label: 'Paternidad', icon: ChildFriendly, color: 'secondary' },
  otro: { label: 'Otro', icon: HelpOutline, color: 'default' },
};

const STATUS_CONFIG = {
  pendiente: { label: 'RECIBIDA', color: 'warning', bg: 'rgba(237, 108, 2, 0.1)' },
  en_revision: { label: 'EN TRÁMITE', color: 'info', bg: 'rgba(2, 136, 209, 0.1)' },
  pendiente_firma: { label: 'PEND. DE FIRMA', color: 'info', bg: 'rgba(2, 136, 209, 0.1)' },
  aprobada: { label: 'REGISTRADA', color: 'success', bg: 'rgba(46, 125, 50, 0.1)' },
  rechazada: { label: 'NO PROCEDE', color: 'error', bg: 'rgba(211, 47, 47, 0.1)' },
  cancelada: { label: 'CANCELADA', color: 'default', bg: 'rgba(0, 0, 0, 0.08)' },
};

export default function ViewRequestModal({ open, onClose, request, showNotification }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  useEffect(() => {
    if (open && request?._id) {
      setComments([]);
      setCommentText('');
      setCommentsLoading(true);
      getAdminRequestCommentsApi(request._id)
        .then((res) => setComments(res.data?.comments || []))
        .catch(() => setComments([]))
        .finally(() => setCommentsLoading(false));
    }
  }, [open, request?._id]);

  const handleSendComment = async () => {
    if (!request?._id || !commentText?.trim() || commentSending) return;
    setCommentSending(true);
    try {
      const res = await postAdminRequestCommentApi(request._id, { texto: commentText.trim() });
      setComments(res.data?.comments || []);
      setCommentText('');
      if (showNotification) showNotification('Comentario enviado.', 'success');
    } catch (err) {
      if (showNotification) showNotification(err.response?.data?.message || 'Error al enviar el comentario.', 'error');
    } finally {
      setCommentSending(false);
    }
  };

  if (!request) return null;

  const handleViewFile = async (file) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewName(file.nombre);
    setPreviewUrl('');

    try {
      let url = file.url;
      let type = '';

      if (file.oneDriveId) {
        const response = await getRequestFileApi(file.oneDriveId);
        type = response.headers['content-type'];
        url = window.URL.createObjectURL(new Blob([response.data], { type }));
      } else {
         if (file.nombre?.toLowerCase().endsWith('.pdf')) type = 'application/pdf';
         else if (file.nombre?.match(/\.(jpg|jpeg|png)$/i)) type = 'image/jpeg';
      }
      setPreviewUrl(url);
      setPreviewType(type);
    } catch (error) {
      console.error("Error al abrir archivo:", error);
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const typeConfig = REQUEST_TYPES_CONFIG[request.tipo] || REQUEST_TYPES_CONFIG.otro;
  const statusConfig = STATUS_CONFIG[request.estado] || STATUS_CONFIG.pendiente;

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Detalles de la Solicitud</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Información del Usuario (si existe) */}
          {request.usuario && (request.usuario.nombre || request.nombre) && (
             <Box>
                <Typography variant="subtitle2" color="text.secondary">Empleado</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {request.usuario.nombre || request.nombre} {request.usuario.apellido || request.apellido}
                </Typography>
                {(request.usuario.dni || request.dni) && (
                   <Typography variant="caption" color="text.secondary">
                     DNI: {request.usuario.dni || request.dni}
                   </Typography>
                )}
             </Box>
          )}

          <Box display="flex" justifyContent="space-between">
             <Box>
                <Typography variant="subtitle2" color="text.secondary">ID</Typography>
                <Typography variant="body2" fontFamily="monospace">#{request._id.slice(-6).toUpperCase()}</Typography>
             </Box>
             <Box textAlign="right">
                <Typography variant="subtitle2" color="text.secondary">Fecha Solicitud</Typography>
                <Typography variant="body2">{dayjs(request.createdAt).format('DD/MM/YYYY')}</Typography>
             </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Tipo</Typography>
            <Box display="flex" alignItems="center" gap={1}>
               {typeConfig.icon && <typeConfig.icon color={typeConfig.color} fontSize="small" />}
               <Typography variant="body1" fontWeight={500}>
                 {typeConfig.label}
               </Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Estado</Typography>
            <Chip
              label={statusConfig.label}
              size="small"
              sx={{
                bgcolor: statusConfig.bg,
                color: `${statusConfig.color}.main`,
                fontWeight: 'bold',
                mt: 0.5,
                border: '1px solid',
                borderColor: `${statusConfig.color}.main`
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Periodo</Typography>
            <Typography variant="body1">
              Del <strong>{dayjs(request.fechaInicio).format('DD/MM/YYYY')}</strong> al <strong>{dayjs(request.fechaFin).format('DD/MM/YYYY')}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">Duración: {request.cantidadDias} días</Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">Motivo</Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{request.motivo || 'Sin motivo especificado.'}</Typography>
            </Paper>
          </Box>

          {request.documentoParaFirma ? (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Documento Enviado</Typography>
                <Paper variant="outlined" sx={{ p: 1, mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
                  <Box display="flex" alignItems="center" gap={1} overflow="hidden">
                    <AttachFile fontSize="small" color="action" />
                    <Typography variant="body2" noWrap title={request.documentoParaFirma.nombre}>
                      {request.documentoParaFirma.nombre}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => handleViewFile(request.documentoParaFirma)}>Ver</Button>
                </Paper>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">Documento Recibido</Typography>
                {request.archivosAdjuntos && request.archivosAdjuntos.length > 0 ? (
                  <Stack spacing={1} mt={0.5}>
                    {request.archivosAdjuntos.map((file, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
                        <Box display="flex" alignItems="center" gap={1} overflow="hidden">
                          <AttachFile fontSize="small" color="action" />
                          <Typography variant="body2" noWrap title={file.nombre}>
                            {file.nombre || `Archivo ${index + 1}`}
                          </Typography>
                        </Box>
                        <Button size="small" onClick={() => handleViewFile(file)}>Ver</Button>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="error" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                    El usuario no cargó el documento.
                  </Typography>
                )}
              </Box>
            </>
          ) : (
            request.archivosAdjuntos && request.archivosAdjuntos.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                {request.tipo === 'vacaciones' ? 'Documentación Previa' : 'Documentación Adjunta'}
              </Typography>
              <Stack spacing={1} mt={1}>
                {request.archivosAdjuntos.map((file, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
                    <Box display="flex" alignItems="center" gap={1} overflow="hidden">
                      <AttachFile fontSize="small" color="action" />
                      <Typography variant="body2" noWrap title={file.nombre}>
                        {file.nombre || `Archivo ${index + 1}`}
                      </Typography>
                    </Box>
                    <Button size="small" onClick={() => handleViewFile(file)}>Ver</Button>
                  </Paper>
                ))}
              </Stack>
            </Box>
            )
          )}

          {request.respuestaAdmin && (
            <Box>
                  <Typography variant="subtitle2" color="text.secondary">Respuesta Recursos Humanos</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'info.lighter', borderColor: 'info.light' }}>
                <Typography variant="body2" color="info.dark">{request.respuestaAdmin}</Typography>
              </Paper>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle2" color="text.primary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
              <ChatIcon fontSize="small" /> Comentarios
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Intercambio de mensajes con el empleado sobre esta solicitud.
            </Typography>
            {commentsLoading ? (
              <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <Stack spacing={1.5} sx={{ mb: 2, maxHeight: 220, overflowY: 'auto' }}>
                {comments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Aún no hay comentarios. Escribe uno abajo.
                  </Typography>
                ) : (
                  comments.map((c) => (
                    <Paper
                      key={c._id || c.createdAt}
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        alignSelf: c.esAdmin ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        bgcolor: c.esAdmin ? 'info.lighter' : 'grey.50',
                        borderColor: c.esAdmin ? 'info.light' : 'divider'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        {c.esAdmin ? (
                          <BusinessIcon sx={{ fontSize: 16, color: 'info.main' }} />
                        ) : (
                          <PersonIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        )}
                        <Typography variant="caption" fontWeight="bold" color={c.esAdmin ? 'info.main' : 'primary.main'}>
                          {c.nombreAutor}{c.esAdmin ? ' (RRHH)' : ' (Empleado)'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          • {dayjs(c.createdAt).format('DD/MM/YYYY HH:mm')}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        {c.texto}
                      </Typography>
                    </Paper>
                  ))
                )}
              </Stack>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Escribe un comentario..."
                multiline
                maxRows={3}
                variant="outlined"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={commentSending}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleSendComment}
                disabled={!commentText.trim() || commentSending}
              >
                {commentSending ? 'Enviando...' : 'Enviar'}
              </Button>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>

    <FilePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewUrl}
        fileType={previewType}
        fileName={previewName}
        loading={previewLoading}
      />
    </>
  );
}
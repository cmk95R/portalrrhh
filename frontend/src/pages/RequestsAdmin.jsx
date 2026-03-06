import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputLabel,
  Menu,
  LinearProgress
} from '@mui/material';
import { 
  Add as AddIcon,
  Refresh as RefreshIcon, 
  CheckCircle as CheckIcon, 
  Cancel as CancelIcon, 
  Visibility as VisibilityIcon,
  Create as SignIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  RateReview as RateReviewIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteFileIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { getAllRequestsApi, updateRequestStatusApi, getRequestFileApi, adminDeleteRequestApi, sendRequestReminderApi } from '../api/request';
import ViewRequestModal from '../components/ViewRequestModal';
import AdminEditRequestModal from '../components/AdminEditRequestModal';
import FilePreviewModal from '../components/FilePreviewModal';
import AdminCreateRequestModal from '../components/AdminCreateRequestModal';

const REQUEST_TYPES = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'dia_estudio', label: 'Día de Estudio' },
  { value: 'mudanza', label: 'Mudanza' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'paternidad', label: 'Paternidad' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'otro', label: 'Otro' },
];

const STATUS_COLORS = {
  pendiente: 'warning',
  pendiente_firma: 'info',
  en_revision: 'secondary',
  aprobada: 'success',
  rechazada: 'error',
  cancelada: 'default',
};

export default function RequestsAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState(null);

  // Estado para el menú de acciones
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuRequest, setMenuRequest] = useState(null);
  // Confirmación de recordatorio
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderRequest, setReminderRequest] = useState(null);
  const [reminderInfo, setReminderInfo] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleMenuOpen = (event, req) => {
    setAnchorEl(event.currentTarget);
    setMenuRequest(req);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRequest(null);
  };

  const handleMenuAction = (type) => {
    if (type === 'delete') {
      handleDeleteRequest(menuRequest);
      handleMenuClose();
    } else if (type === 'reminder') {
      handleOpenReminderDialog(menuRequest);
      handleMenuClose();
    } else {
      handleOpenActionDialog(menuRequest, type);
      handleMenuClose();
    }
  };

  const requestNeedsReminder = (req) => {
    if (!req) return false;
    const tieneDocFirmado = req.archivosAdjuntos?.some((f) => f.nombre?.includes('Documento Firmado'));
    const tieneCertificado = req.archivosAdjuntos?.length > 0;
    const tiposDocsPosterior = ['otro', 'paternidad', 'maternidad', 'mudanza'];
    if (req.estado === 'pendiente_firma' && req.documentoParaFirma && !tieneDocFirmado) return true;
    if (req.estado === 'en_revision' && !tieneCertificado && ['enfermedad', 'dia_estudio'].includes(req.tipo)) return true;
    if (req.estado === 'en_revision' && !tieneCertificado && req.documentacionPosterior === true && tiposDocsPosterior.includes(req.tipo)) return true;
    return false;
  };

  const getReminderInfo = (req) => {
    if (!req) return null;
    const tieneDocFirmado = req.archivosAdjuntos?.some((f) => f.nombre?.includes('Documento Firmado'));
    const tieneCertificado = req.archivosAdjuntos?.length > 0;
    const tiposDocsPosterior = ['otro', 'paternidad', 'maternidad', 'mudanza'];

    let mensajeTipo = null;
    if (req.estado === 'pendiente_firma' && req.documentoParaFirma && !tieneDocFirmado) {
      mensajeTipo = 'documento firmado';
    } else if (req.estado === 'en_revision' && !tieneCertificado) {
      if (req.tipo === 'enfermedad') mensajeTipo = 'certificado médico';
      else if (req.tipo === 'dia_estudio') mensajeTipo = 'certificado de examen';
      else if (req.documentacionPosterior === true && tiposDocsPosterior.includes(req.tipo)) {
        mensajeTipo = 'documento posterior';
      }
    }
    if (!mensajeTipo) return null;

    const tipoLabel = REQUEST_TYPES.find((t) => t.value === req.tipo)?.label || req.tipo;
    const empleadoNombre = [req.usuario?.nombre, req.usuario?.apellido].filter(Boolean).join(' ') || 'Empleado/a';
    const empleadoEmail = req.usuario?.email || '';

    return { mensajeTipo, tipoLabel, empleadoNombre, empleadoEmail, motivo: req.motivo };
  };

  const handleOpenReminderDialog = (req) => {
    const info = getReminderInfo(req);
    setReminderRequest(req);
    setReminderInfo(info);
    setReminderDialogOpen(true);
  };

  const handleCloseReminderDialog = () => {
    if (sendingReminder) return;
    setReminderDialogOpen(false);
    setReminderRequest(null);
    setReminderInfo(null);
  };

  const handleSendReminder = async () => {
    if (!reminderRequest?._id) return;
    setSendingReminder(true);
    try {
      await sendRequestReminderApi(reminderRequest._id);
      showNotification('Recordatorio enviado al empleado.', 'success');
      fetchRequests();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Error al enviar recordatorio.', 'error');
    } finally {
      setSendingReminder(false);
      handleCloseReminderDialog();
    }
  };

  // Estado para previsualización
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Estado para diálogo de acción (Aprobar/Rechazar)
  const [actionDialog, setActionDialog] = useState({ open: false, type: '', request: null });
  const [adminResponse, setAdminResponse] = useState('');
  const [fileToSign, setFileToSign] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Estado para notificaciones
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.estado = filterStatus;
      if (searchTerm) params.q = searchTerm;
      
      const response = await getAllRequestsApi(params);
      setRequests(response.data.items || []);
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
      showNotification('Error al cargar las solicitudes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleOpenViewDialog = (req) => {
    setSelectedRequest(req);
    setViewModalOpen(true);
  };

  const handleCloseViewDialog = () => {
    setViewModalOpen(false);
    setSelectedRequest(null);
  };

  const handleOpenEditDialog = (req) => {
    setRequestToEdit(req);
    setEditModalOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditModalOpen(false);
    setRequestToEdit(null);
  };

  const handleOpenActionDialog = (req, type) => {
    setActionDialog({ open: true, type, request: req });
    setAdminResponse('');
    setFileToSign(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleCloseActionDialog = () => {
    setActionDialog({ open: false, type: '', request: null });
    setFileToSign(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleSubmitAction = async () => {
    if (!actionDialog.request) return;

    try {
      let newState = '';
      if (actionDialog.type === 'approve') newState = 'aprobada';
      if (actionDialog.type === 'reject') newState = 'rechazada';
      if (actionDialog.type === 'review') newState = 'en_revision';
      if (actionDialog.type === 'sign') newState = 'pendiente_firma';

      // Usamos FormData para enviar archivo si es necesario
      const formData = new FormData();
      formData.append('estado', newState);
      formData.append('respuestaAdmin', adminResponse);
      
      const hasFile = fileToSign && newState === 'pendiente_firma';
      if (hasFile) {
        formData.append('archivo', fileToSign);
        setIsUploading(true);
        setUploadProgress(0);
      }

      // Configuración para mostrar progreso de subida
      const config = hasFile ? {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      } : {};

      await updateRequestStatusApi(actionDialog.request._id, formData, config);

      const estadoLabel = { aprobada: 'registrada', rechazada: 'no procede', en_revision: 'en trámite', pendiente_firma: 'pendiente de firma' }[newState] || newState.replace('_', ' ');
      showNotification(`Solicitud ${estadoLabel} correctamente.`);
      handleCloseActionDialog();
      fetchRequests();
    } catch (error) {
      console.error("Error actualizando solicitud:", error);
      showNotification(error.response?.data?.message || 'Error al actualizar la solicitud.', 'error');
      setIsUploading(false);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteRequest = (req) => {
    Swal.fire({
      title: '¿Eliminar solicitud?',
      text: `¿Estás seguro de que deseas eliminar la solicitud de ${req.usuario?.nombre || 'este usuario'}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await adminDeleteRequestApi(req._id);
          return true;
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error.response?.data?.message || 'No se pudo eliminar'}`);
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: '¡Eliminado!',
          text: 'La solicitud ha sido eliminada correctamente.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        fetchRequests();
      }
    });
  };

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
      console.error(error);
      showNotification('Error al abrir el archivo', 'error');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Encabezado */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Solicitudes
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            label="Buscar (Nombre, DNI)"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchRequests()}
            InputProps={{ endAdornment: <SearchIcon color="action" /> }}
          />
          <TextField
            select
            label="Filtrar por Estado"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="pendiente">Recibida</MenuItem>
            <MenuItem value="en_revision">En trámite</MenuItem>
            <MenuItem value="pendiente_firma">Pendiente de firma</MenuItem>
            <MenuItem value="aprobada">Registrada</MenuItem>
            <MenuItem value="rechazada">No procede</MenuItem>
          </TextField>
          <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchRequests}
              disabled={loading}
              sx={{ bgcolor: "theme.pallete.primary.main", '&:hover': { bgcolor: 'theme.pallete.primary.dark' } }}
            >
              Actualizar
            </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateModalOpen(true)}
          >
            Crear solicitud
          </Button>
        </Box>
      </Box>

      {/* Tabla de Solicitudes */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell>Empleado</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Fechas</TableCell>
                <TableCell>Días</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Adjuntos</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="textSecondary">
                      No se encontraron solicitudes.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {req.usuario?.nombre} {req.usuario?.apellido}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {req.usuario?.dni}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {REQUEST_TYPES.find(t => t.value === req.tipo)?.label || req.tipo}
                    </TableCell>
                    <TableCell>
                      {dayjs(req.fechaInicio).format('DD/MM/YYYY')} - {dayjs(req.fechaFin).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>{req.cantidadDias}</TableCell>
                    <TableCell>
                      <Chip 
                        label={req.estado.replace('_', ' ').toUpperCase()} 
                        color={STATUS_COLORS[req.estado] || 'default'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={req.motivo}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {req.motivo}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {req.archivosAdjuntos?.length > 0 ? (
                        <IconButton size="small" onClick={() => handleViewFile(req.archivosAdjuntos[0])}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      ) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver Detalles">
                        <IconButton color="primary" onClick={() => handleOpenViewDialog(req)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton color="default" onClick={() => handleOpenEditDialog(req)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton color="error" onClick={() => handleDeleteRequest(req)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                      <IconButton onClick={(e) => handleMenuOpen(e, req)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Diálogo de Acción */}
      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'approve' ? 'Registrar solicitud' : 
           actionDialog.type === 'reject' ? 'Marcar como no procede' : 
           actionDialog.type === 'review' ? 'Poner en trámite' : 'Solicitar firma'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            {actionDialog.type === 'sign' 
              ? 'La solicitud pasará a "Pendiente de firma". El empleado deberá subir el documento firmado.' 
              : 'Puedes agregar una nota o motivo para esta acción:'}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Nota / Respuesta (Opcional)"
            fullWidth
            multiline
            rows={3}
            value={adminResponse}
            onChange={(e) => setAdminResponse(e.target.value)}
            sx={{ mt: 2 }}
            disabled={isUploading}
            inputProps={{ spellCheck: false }}
          />
          
          {actionDialog.type === 'sign' && (
            <Box sx={{ mt: 3 }}>
              <InputLabel shrink sx={{ mb: 1, fontWeight: 500, fontSize: '0.9rem', color: '#333' }}>
                Adjuntar documento para firmar (PDF)
              </InputLabel>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: fileToSign ? 'success.main' : 'grey.300',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: fileToSign ? 'success.50' : 'grey.50',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFileToSign(e.target.files[0])}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                  id="file-upload-sign"
                />
                <label htmlFor="file-upload-sign">
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      opacity: isUploading ? 0.6 : 1,
                    }}
                  >
                    {fileToSign ? (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CloudUploadIcon color="success" />
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {fileToSign.name}
                          </Typography>
                          {!isUploading && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileToSign(null);
                                document.getElementById('file-upload-sign').value = '';
                              }}
                              sx={{ ml: 1 }}
                            >
                              <DeleteFileIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {(fileToSign.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </>
                    ) : (
                      <>
                        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" fontWeight="bold" color="text.primary">
                          Click para seleccionar archivo
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Solo archivos PDF
                        </Typography>
                      </>
                    )}
                  </Box>
                </label>
              </Box>

              {/* Barra de progreso */}
              {isUploading && (
                <Box sx={{ mt: 2, width: '100%' }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={uploadProgress} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Subiendo archivo...
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" color="primary.main">
                      {uploadProgress}%
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseActionDialog}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmitAction} 
            variant="contained" 
            color={actionDialog.type === 'reject' ? 'error' : 'primary'}
            disabled={isUploading || (actionDialog.type === 'sign' && !fileToSign)}
            startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isUploading ? 'Subiendo...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de recordatorio */}
      <Dialog open={reminderDialogOpen} onClose={handleCloseReminderDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar envío de recordatorio</DialogTitle>
        <DialogContent>
          {reminderInfo ? (
            <>
              <Typography variant="body2" gutterBottom>
                Se enviará el siguiente recordatorio al empleado:
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2">
                  <strong>Empleado:</strong> {reminderInfo.empleadoNombre}
                  {reminderInfo.empleadoEmail && ` (${reminderInfo.empleadoEmail})`}
                </Typography>
                <Typography variant="body2">
                  <strong>Tipo de solicitud:</strong> {reminderInfo.tipoLabel}
                </Typography>
                <Typography variant="body2">
                  <strong>Documento pendiente:</strong> {reminderInfo.mensajeTipo}
                </Typography>
                {reminderInfo.motivo && (
                  <Typography variant="body2">
                    <strong>Motivo informado por el empleado:</strong> {reminderInfo.motivo}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Asunto del correo:</strong> {`Recordatorio: ${reminderInfo.tipoLabel} pendiente`}
                </Typography>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Esta solicitud no parece tener documentación pendiente detectada, pero se intentará enviar el recordatorio.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReminderDialog} disabled={sendingReminder}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<EmailIcon />}
            onClick={handleSendReminder}
            disabled={sendingReminder}
          >
            {sendingReminder ? 'Enviando...' : 'Enviar recordatorio'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificaciones */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
      <AdminCreateRequestModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={fetchRequests}
        showNotification={showNotification}
      />

      {/* Modal de Ver Detalles */}
      <ViewRequestModal
        open={viewModalOpen}
        onClose={handleCloseViewDialog}
        request={selectedRequest}
        showNotification={showNotification}
      />

      {/* Modal de Edición Admin */}
      <AdminEditRequestModal
        open={editModalOpen}
        onClose={handleCloseEditDialog}
        request={requestToEdit}
        onSuccess={fetchRequests}
        showNotification={showNotification}
      />

      {/* Modal de Previsualización */}
      <FilePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewUrl}
        fileType={previewType}
        fileName={previewName}
        loading={previewLoading}
      />

      {/* Menú de Acciones */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {menuRequest && [
            <MenuItem key="approve" onClick={() => handleMenuAction('approve')}>
              <CheckIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} /> 
              Registrar
            </MenuItem>,
            <MenuItem key="review" onClick={() => handleMenuAction('review')}>
              <RateReviewIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} /> 
              En trámite
            </MenuItem>,
            <MenuItem key="reject" onClick={() => handleMenuAction('reject')}>
              <CancelIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> 
              No procede
            </MenuItem>,
          (menuRequest.estado === 'en_revision') && (
            <MenuItem key="sign" onClick={() => handleMenuAction('sign')}>
              <SignIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} /> 
              Solicitar Firma
            </MenuItem>
          ),
          requestNeedsReminder(menuRequest) && (
            <MenuItem key="reminder" onClick={() => handleMenuAction('reminder')}>
              <EmailIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} /> 
              Enviar recordatorio
            </MenuItem>
          )
        ]}
      </Menu>
    </Container>
  );
}
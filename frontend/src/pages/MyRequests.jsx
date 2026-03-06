import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Paper,
  Divider,
  useTheme,
  Dialog,
  DialogTitle,
  TextField,
  DialogContent,
  DialogActions,
  LinearProgress,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  School,
  BeachAccess,
  LocalShipping,
  HelpOutline,
  CalendarToday,
  DeleteOutline,
  Edit,
  EventAvailable,
  PendingActions,
  Info as InfoIcon,
  Visibility,
  AttachFile,
  LocalHospital,
  ChildFriendly,
  Download,
  CloudUpload,
  Delete as DeleteIcon,
  CheckCircle,
  Chat as ChatIcon,
  Person as PersonIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { useSearchParams } from 'react-router-dom';
import { getMyRequestsApi, deleteRequestApi, getRequestFileApi, editRequestApi, getRequestCommentsApi, postRequestCommentApi } from '../api/request'; 
import CreateRequestModal from '../components/CreateRequestModal';
import FilePreviewModal from '../components/FilePreviewModal';

// --- CONFIGURACIÓN Y UTILIDADES ---

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

// Componente para Tarjeta Estadística (Top)
const StatCard = ({ title, value, icon, color }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}
  >
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
      >
        {title}
      </Typography>
      <Box sx={{ color: color }}>{icon}</Box>
    </Box>
    <Typography variant="h4" fontWeight={700} color="text.primary">
      {value}
    </Typography>
  </Paper>
);

// Tipos por sección (para filtros desde home)
const FILTER_TIPOS = {
  licencias_medicas: ['enfermedad', 'paternidad', 'maternidad'],
  estudios_vacaciones: ['vacaciones', 'dia_estudio'],
};

export default function MyRequests() {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter') || '';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);

  // Estados para el diálogo de subir documento firmado
  const [uploadDialog, setUploadDialog] = useState(false);
  const [requestToSign, setRequestToSign] = useState(null);
  const [signedFile, setSignedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Comentarios del modal de detalle
  const [viewComments, setViewComments] = useState([]);
  const [viewCommentsLoading, setViewCommentsLoading] = useState(false);
  const [viewCommentText, setViewCommentText] = useState('');
  const [viewCommentSending, setViewCommentSending] = useState(false);
  
  // Estado para notificaciones
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Cálculos de estadísticas simples
  const pendingCount = useMemo(() => requests.filter(r => r.estado === 'pendiente').length, [requests]);

  // Solicitudes filtradas según ?filter= (licencias_medicas | estudios_vacaciones)
  const filteredRequests = useMemo(() => {
    const tipos = FILTER_TIPOS[filterParam];
    if (!tipos) return requests;
    return requests.filter(r => tipos.includes(r.tipo));
  }, [requests, filterParam]);
  
  // Fetch de datos
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await getMyRequestsApi();
      setRequests(response.data);
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
      showNotification('Error al cargar las solicitudes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenDialog = () => {
    setEditingRequest(null); // Reseteamos para crear nueva
    setOpenDialog(true);
  };

  const handleEditRequest = (req) => {
    setEditingRequest(req); // Pasamos la solicitud a editar
    setOpenDialog(true);
  };

  const handleOpenViewDialog = (req) => {
    setViewingRequest(req);
    setViewComments([]);
    setViewCommentText('');
    setViewDialog(true);
    if (req?._id) {
      setViewCommentsLoading(true);
      getRequestCommentsApi(req._id)
        .then((res) => setViewComments(res.data?.comments || []))
        .catch(() => setViewComments([]))
        .finally(() => setViewCommentsLoading(false));
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialog(false);
    setViewingRequest(null);
    setViewComments([]);
    setViewCommentText('');
  };

  const handleSendComment = async () => {
    if (!viewingRequest?._id || !viewCommentText?.trim() || viewCommentSending) return;
    setViewCommentSending(true);
    try {
      const res = await postRequestCommentApi(viewingRequest._id, { texto: viewCommentText.trim() });
      setViewComments(res.data?.comments || []);
      setViewCommentText('');
      showNotification('Comentario enviado.', 'success');
    } catch (err) {
      showNotification(err.response?.data?.message || 'Error al enviar el comentario.', 'error');
    } finally {
      setViewCommentSending(false);
    }
  };

  const handleCloseDialog = () => setOpenDialog(false);
  
  const handleSuccessCreate = () => {
    setOpenDialog(false);
    showNotification(editingRequest ? 'Solicitud actualizada' : 'Solicitud creada correctamente');
    fetchRequests();
  };

  const handleOpenUploadDialog = (req) => {
    setRequestToSign(req);
    setSignedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadedFileInfo(null);
    setUploadDialog(true);
  };

  const handleUploadSignedFile = async () => {
    if (!signedFile || !requestToSign) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('archivo', signedFile);
    
    try {
        const response = await editRequestApi(requestToSign._id, formData, {
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            }
        });
        
        // Capturar información del archivo subido
        const uploadedFile = response.data?.request?.archivosAdjuntos?.slice(-1)[0];
        const uploadDate = new Date();
        const fileName = uploadedFile?.nombre || signedFile.name;
        
        // Guardar información del archivo subido
        setUploadedFileInfo({
          nombre: fileName,
          fecha: uploadDate
        });
        
        setIsUploading(false);
        setUploadProgress(100);
        
        // Mostrar confirmación mejorada en SweetAlert
        Swal.fire({
            icon: 'success',
            title: '¡Documento cargado exitosamente!',
            html: `
              <div style="text-align: left; margin-top: 1rem;">
                <p style="margin-bottom: 0.5rem;"><strong>Archivo:</strong> ${fileName}</p>
                <p style="margin-bottom: 0;"><strong>Fecha de subida:</strong> ${dayjs(uploadDate).format('DD/MM/YYYY [a las] HH:mm')}</p>
              </div>
            `,
            timer: 5000,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar'
        }).then(() => {
          // Cerrar el diálogo después de que el usuario cierre el SweetAlert
          setUploadDialog(false);
          setUploadedFileInfo(null);
          setSignedFile(null);
          setUploadProgress(0);
        });
        
        fetchRequests();
    } catch (error) {
        console.error(error);
        showNotification('Error al subir el documento.', 'error');
        setIsUploading(false);
        setUploadProgress(0);
    }
  };

  const handleDeleteRequest = (id) => {
    Swal.fire({
      title: '¿Eliminar solicitud?',
      text: "¿Estás seguro de que deseas eliminar esta solicitud? Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await deleteRequestApi(id);
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

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => setNotification({ ...notification, open: false });

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

  // Renderizado de una tarjeta individual
  const renderRequestCard = (req) => {
    const typeConfig = REQUEST_TYPES_CONFIG[req.tipo] || REQUEST_TYPES_CONFIG.otro;
    const statusConfig = STATUS_CONFIG[req.estado] || STATUS_CONFIG.pendiente;
    const IconComponent = typeConfig.icon;
    
    // Estilos dinámicos basados en el tipo
    const iconBgColor = req.tipo === 'dia_estudio' ? 'rgba(25, 118, 210, 0.1)' : 
                        req.tipo === 'vacaciones' ? 'rgba(46, 125, 50, 0.1)' : 
                        req.tipo === 'enfermedad' ? 'rgba(211, 47, 47, 0.1)' :
                        ['maternidad', 'paternidad'].includes(req.tipo) ? 'rgba(156, 39, 176, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return (
      <Grid size={{ xs: 12, md: 6, lg: 4 }} key={req._id}>
        <Card
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            transition: 'all 0.2s',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
          }}
        >
          <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
            {/* Header de la Tarjeta */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box display="flex" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: iconBgColor,
                    color: `${typeConfig.color}.main`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 'fit-content'
                  }}
                >
                  <IconComponent />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                    {typeConfig.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                    ID: #{req._id.slice(-6).toUpperCase()}
                  </Typography>
                </Box>
              </Box>
              
              <Chip
                label={statusConfig.label}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  bgcolor: statusConfig.bg,
                  color: `${statusConfig.color}.main`,
                  border: '1px solid',
                  borderColor: 'transparent'
                }}
              />
            </Box>

            {/* Detalles de Fechas */}
            <Stack spacing={2}>
              <Box display="flex" alignItems="center" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.disabled' }} />
                <span>
                   {dayjs(req.fechaInicio).format('DD/MM/YYYY')} — {dayjs(req.fechaFin).format('DD/MM/YYYY')}
                </span>
                <Box sx={{ ml: 'auto', bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
                  <Typography variant="caption" fontWeight={700} color="text.primary">
                    {req.cantidadDias} día(s)
                  </Typography>
                </Box>
              </Box>

              <Divider />

              {/* Motivo y Respuesta */}
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.disabled"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}
                >
                  Motivo
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5
                  }}
                >
                  {req.motivo}
                </Typography>
                
                {req.respuestaAdmin && (
                  <Box mt={1} p={1} bgcolor="info.lighter" borderRadius={1} display="flex" gap={1}>
                    <InfoIcon fontSize="small" color="info" sx={{ mt: 0.2 }} />
                    <Typography variant="caption" color="info.main">
                      <strong>Respuesta Recursos Humanos:</strong> {req.respuestaAdmin}
                    </Typography>
                  </Box>
                )}

                {req.archivosAdjuntos?.length > 0 && (
                  <Box mt={1} display="flex" alignItems="center" gap={0.5}>
                    <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" color="text.secondary" fontStyle="italic">
                      Último archivo cargado: {[...(req.archivosAdjuntos || [])].pop()?.nombre}
                    </Typography>
                  </Box>
                )}
              </Box>
                  
              {/* Documento para firmar (Si existe y está pendiente de firma, y aún NO subió el firmado) */}
              {req.estado === 'pendiente_firma' && req.documentoParaFirma && !(req.archivosAdjuntos?.some(f => f.nombre?.includes('Documento Firmado'))) && (
                <Box mt={2}>
                  <Alert severity="info" icon={<InfoIcon />}>
                    <Typography variant="subtitle2" fontWeight="bold">Acción Requerida</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Por favor descarga el documento, fírmalo y súbelo editando la solicitud.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<Download />}
                        onClick={() => handleViewFile(req.documentoParaFirma)}
                        color="info"
                      >
                        Descargar
                      </Button>
                      <Button 
                        variant="contained" 
                        size="small" 
                        startIcon={<CloudUpload />}
                        onClick={() => handleOpenUploadDialog(req)}
                        color="primary"
                      >
                        Subir 
                      </Button>
                    </Stack>
                  </Alert>
                </Box>
              )}

              {/* Botón para cargar certificado médico cuando es enfermedad y no hay archivo */}
              {req.tipo === 'enfermedad' && (!req.archivosAdjuntos || req.archivosAdjuntos.length === 0) && ['pendiente', 'en_revision'].includes(req.estado) && (
                <Box mt={2}>
                  <Alert severity="warning" icon={<InfoIcon />}>
                    <Typography variant="subtitle2" fontWeight="bold">Certificado Médico Pendiente</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Por favor carga el certificado médico para completar tu solicitud.
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<CloudUpload />}
                      onClick={() => handleEditRequest(req)}
                      color="primary"
                    >
                      Cargar Documento
                    </Button>
                  </Alert>
                </Box>
              )}
              {/* Botón para cargar certificado de examen cuando es día de estudio en trámite y no hay archivo */}
              {req.tipo === 'dia_estudio' && (!req.archivosAdjuntos || req.archivosAdjuntos.length === 0) && req.estado === 'en_revision' && (
                <Box mt={2}>
                  <Alert severity="warning" icon={<InfoIcon />}>
                    <Typography variant="subtitle2" fontWeight="bold">Certificado de Examen Pendiente</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Por favor carga el certificado de examen una vez rendido para completar tu solicitud.
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<CloudUpload />}
                      onClick={() => handleEditRequest(req)}
                      color="primary"
                    >
                      Cargar Documento
                    </Button>
                  </Alert>
                </Box>
              )}

              {/* Documentación pendiente (otros tipos) SOLO si el empleado marcó "cargar documentación más tarde" */}
              {['otro', 'paternidad', 'maternidad', 'mudanza'].includes(req.tipo) &&
                req.documentacionPosterior === true &&
                (!req.archivosAdjuntos || req.archivosAdjuntos.length === 0) &&
                req.estado === 'en_revision' && (
                <Box mt={2}>
                  <Alert severity="warning" icon={<InfoIcon />}>
                    <Typography variant="subtitle2" fontWeight="bold">Documentación Pendiente</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Tenés documentación pendiente de carga para completar tu solicitud.
                    </Typography>
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<CloudUpload />}
                      onClick={() => handleEditRequest(req)}
                      color="primary"
                    >
                      Cargar Documento
                    </Button>
                  </Alert>
                </Box>
              )}
            </Stack>
          </CardContent>

          {/* Acciones (Footer) */}
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              bgcolor: 'action.hover', // Gris muy suave
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
            }}
          >
             <Tooltip title="Ver detalles">
                <IconButton 
                  size="small" 
                  onClick={() => handleOpenViewDialog(req)}
                >
                  <Visibility fontSize="small" />
                </IconButton>
             </Tooltip>
             <Tooltip title="Editar">
                <IconButton 
                  size="small" 
                  onClick={() => handleEditRequest(req)}
                  disabled={
                    !['pendiente', 'pendiente_firma'].includes(req.estado) && 
                    !(req.tipo === 'dia_estudio' && (req.estado === 'aprobada' || req.estado === 'en_revision')) &&
                    !(req.tipo === 'enfermedad' && req.estado === 'en_revision') &&
                    !(['otro', 'paternidad', 'maternidad', 'mudanza'].includes(req.tipo) && req.estado === 'en_revision' && req.documentacionPosterior === true && (!req.archivosAdjuntos || req.archivosAdjuntos.length === 0))
                  }
                >
                  <Edit fontSize="small" />
                </IconButton>
             </Tooltip>
             <Tooltip title="Eliminar">
                <IconButton 
                  size="small" 
                  onClick={() => handleDeleteRequest(req._id)}
                  sx={{ '&:hover': { color: 'error.main' } }}
                  disabled={req.estado !== 'pendiente'}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
             </Tooltip>
          </Box>
        </Card>
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {/* 1. Encabezado */}
      <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={2}
          mb={4}
        >
        <Box>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom sx={{ mb: 0 }}>
              Mis Solicitudes
            </Typography>
            {filterParam === 'licencias_medicas' && (
              <Chip
                label="Licencias médicas"
                size="small"
                onDelete={() => setSearchParams({})}
                sx={{ fontWeight: 600 }}
              />
            )}
            {filterParam === 'estudios_vacaciones' && (
              <Chip
                label="Días de estudio y vacaciones"
                size="small"
                onDelete={() => setSearchParams({})}
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>
          <Typography variant="body1" color="text.secondary">
            {filterParam === 'licencias_medicas'
              ? 'Enfermedad, maternidad y paternidad.'
              : filterParam === 'estudios_vacaciones'
              ? 'Vacaciones y días de estudio.'
              : 'Gestiona tus permisos y días de estudio.'}
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchRequests} 
            color="inherit"
            sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}
          >
            Actualizar
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />} 
            onClick={handleOpenDialog}
            sx={{ boxShadow: 2 }}
          >
            Nueva Solicitud
          </Button>
        </Box>
      </Stack>

      
      {/* 3. Grid de Solicitudes */}
      <Grid container spacing={3}>
        
        {loading ? (
           <Box width="100%" display="flex" justifyContent="center" p={5}>
             <CircularProgress />
           </Box>
        ) : (
          <>
            {filteredRequests.map(renderRequestCard)}

            {/* Botón Grande "Crear Nueva" al final de la lista */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Box
                component="button"
                onClick={handleOpenDialog}
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                    '& .icon-circle': { bgcolor: 'primary.main', color: 'white' },
                    '& .text-label': { color: 'primary.main' },
                  },
                }}
              >
                <Box
                  className="icon-circle"
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'action.selected',
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    transition: 'colors 0.2s',
                  }}
                >
                  <AddIcon fontSize="large" />
                </Box>
                <Typography className="text-label" variant="subtitle1" fontWeight={600} color="text.secondary">
                  Crear nueva solicitud
                </Typography>
              </Box>
            </Grid>
          </>
        )}
      </Grid>

      {/* Modales y Notificaciones */}
      <CreateRequestModal 
        open={openDialog} 
        onClose={handleCloseDialog} 
        onSuccess={handleSuccessCreate}
        showNotification={showNotification}
        requestToEdit={editingRequest}
      />

      {/* Modal de Ver Detalles */}
      <Dialog open={viewDialog} onClose={handleCloseViewDialog} maxWidth="md" fullWidth>
        <DialogTitle>Detalles de la Solicitud</DialogTitle>
        <DialogContent dividers>
          {viewingRequest && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">ID</Typography>
                <Typography variant="body2" fontFamily="monospace">#{viewingRequest._id}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Tipo</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {REQUEST_TYPES_CONFIG[viewingRequest.tipo]?.label || viewingRequest.tipo}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Estado</Typography>
                <Chip 
                  label={STATUS_CONFIG[viewingRequest.estado]?.label} 
                  size="small" 
                  sx={{ 
                    bgcolor: STATUS_CONFIG[viewingRequest.estado]?.bg, 
                    color: `${STATUS_CONFIG[viewingRequest.estado]?.color}.main`,
                    fontWeight: 'bold',
                    mt: 0.5
                  }} 
                />
              </Box>
              <Divider />
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Periodo</Typography>
                <Typography variant="body1">
                  Del <strong>{dayjs(viewingRequest.fechaInicio).format('DD/MM/YYYY')}</strong> al <strong>{dayjs(viewingRequest.fechaFin).format('DD/MM/YYYY')}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">Duración: {viewingRequest.cantidadDias} días</Typography>
              </Box>
              
             
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Motivo</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewingRequest.motivo}</Typography>
                </Paper>
              </Box>
              
              {viewingRequest.documentoParaFirma ? (
                <>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Documentación Previa Aprobación</Typography>
                    {(() => {
                      const docsPrevios = (viewingRequest.archivosAdjuntos || []).filter(f => !f.nombre?.includes('Documento Firmado'));
                      return docsPrevios.length > 0 ? (
                        <Stack spacing={1} mt={0.5}>
                          {docsPrevios.map((file, index) => (
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
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                          No hay documentación previa.
                        </Typography>
                      );
                    })()}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Documentación a Firmar</Typography>
                    <Paper variant="outlined" sx={{ p: 1, mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
                      <Box display="flex" alignItems="center" gap={1} overflow="hidden">
                        <AttachFile fontSize="small" color="action" />
                        <Typography variant="body2" noWrap title={viewingRequest.documentoParaFirma.nombre}>
                          {viewingRequest.documentoParaFirma.nombre}
                        </Typography>
                      </Box>
                      <Button size="small" onClick={() => handleViewFile(viewingRequest.documentoParaFirma)}>Ver</Button>
                    </Paper>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Documento Firmado</Typography>
                    {(() => {
                      const docsFirmados = (viewingRequest.archivosAdjuntos || []).filter(f => f.nombre?.includes('Documento Firmado'));
                      return docsFirmados.length > 0 ? (
                        <Stack spacing={1} mt={0.5}>
                          {docsFirmados.map((file, index) => (
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
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                          El usuario aún no cargó el documento firmado.
                        </Typography>
                      );
                    })()}
                  </Box>
                </>
              ) : (
                viewingRequest.archivosAdjuntos && viewingRequest.archivosAdjuntos.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {viewingRequest.tipo === 'vacaciones' ? 'Documentación Previa' : 'Documentación Adjunta'}
                  </Typography>
                  <Stack spacing={1} mt={1}>
                    {viewingRequest.archivosAdjuntos.map((file, index) => (
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

              {viewingRequest.respuestaAdmin && (
                <Box>
                  <Typography variant="subtitle2" color="info.main">Respuesta Recursos Humanos </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'info.lighter', borderColor: 'info.light' }}>
                    <Typography variant="body2" color="info.dark">{viewingRequest.respuestaAdmin}</Typography>
                  </Paper>
                </Box>
              )}

              {/* Sección Comentarios */}
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                  <ChatIcon fontSize="small" /> Comentarios
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Intercambio de mensajes con Recursos Humanos sobre esta solicitud.
                </Typography>
                {viewCommentsLoading ? (
                  <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : (
                  <Stack spacing={1.5} sx={{ mb: 2, maxHeight: 220, overflowY: 'auto' }}>
                    {viewComments.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Aún no hay comentarios. Escribe uno abajo.
                      </Typography>
                    ) : (
                      viewComments.map((c) => (
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
                              {c.nombreAutor}{c.esAdmin ? '' : ' (Empleado)'}
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
                    value={viewCommentText}
                    onChange={(e) => setViewCommentText(e.target.value)}
                    disabled={viewCommentSending}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSendComment}
                    disabled={!viewCommentText.trim() || viewCommentSending}
                  >
                    {viewCommentSending ? 'Enviando...' : 'Enviar'}
                  </Button>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo Específico para Subir Documento Firmado */}
      <Dialog open={uploadDialog} onClose={() => !isUploading && setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subir Documento Firmado</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1">
              Sube tu documento firmado para completar el proceso.
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <InputLabel shrink sx={{ mb: 1, fontWeight: 500, fontSize: '0.9rem', color: '#333' }}>
                Seleccionar documento firmado (PDF, JPG, PNG)
              </InputLabel>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: signedFile ? 'success.main' : 'grey.300',
                  borderRadius: 2,
                  p: 2,
                  backgroundColor: signedFile ? 'success.50' : 'grey.50',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setSignedFile(e.target.files[0])}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                  id="file-upload-signed"
                />
                <label htmlFor="file-upload-signed">
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      opacity: isUploading ? 0.6 : 1,
                    }}
                  >
                    {signedFile ? (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <CloudUpload color="success" />
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {signedFile.name}
                          </Typography>
                          {!isUploading && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSignedFile(null);
                                document.getElementById('file-upload-signed').value = '';
                              }}
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {(signedFile.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </>
                    ) : (
                      <>
                        <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="body2" fontWeight="bold" color="text.primary">
                          Click para seleccionar archivo
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          PDF, JPG o PNG
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

              {/* Confirmación de archivo subido */}
              {uploadedFileInfo && !isUploading && (
                <Box sx={{ mt: 2 }}>
                  <Alert 
                    severity="success" 
                    icon={<CheckCircle />}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-icon': {
                        fontSize: 28
                      }
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      Documento subido exitosamente
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Archivo:</strong> {uploadedFileInfo.nombre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        <strong>Fecha de subida:</strong> {dayjs(uploadedFileInfo.fecha).format('DD/MM/YYYY [a las] HH:mm')}
                      </Typography>
                    </Box>
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUploadDialog(false)} 
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleUploadSignedFile} 
            variant="contained" 
            disabled={!signedFile || isUploading}
            startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isUploading ? 'Subiendo...' : 'Subir Documento'}
          </Button>
        </DialogActions>
      </Dialog>

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

      <FilePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewUrl}
        fileType={previewType}
        fileName={previewName}
        loading={previewLoading}
      />
    </Container>
  );
}
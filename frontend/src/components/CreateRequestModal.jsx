import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  MenuItem,
  Grid, // En MUI v6 esto suele ser Grid2, pero si usas el Grid normal con estos errores, usa la sintaxis nueva
  Button,
  Box,
  InputLabel,
  Select,
  FormControl,
  CircularProgress,
  Alert,
  Typography, // Asegúrate de importar Typography si lo usas fuera del título
  Checkbox,
  FormControlLabel,
  Paper,
  LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { createRequestApi, editRequestApi, getRequestFileApi } from '../api/request';
import { AuthContext } from '../context/AuthContext';

dayjs.locale('es');
const REQUEST_TYPES = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'paternidad', label: 'Paternidad' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'mudanza', label: 'Mudanza'},
  { value: 'dia_estudio', label: 'Día de Estudio' },
  { value: 'otro', label: 'Otro' },
];

export default function CreateRequestModal({ open, onClose, onSuccess, showNotification, requestToEdit }) {
  useContext(AuthContext);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [deletedExistingFile, setDeletedExistingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const tiposDocsPosterior = ['otro', 'paternidad', 'maternidad', 'mudanza'];
  const isStudyExamPendingUpload =
    !!requestToEdit &&
    requestToEdit.tipo === 'dia_estudio' &&
    (!requestToEdit.archivosAdjuntos || requestToEdit.archivosAdjuntos.length === 0) &&
    ['en_revision', 'aprobada'].includes(requestToEdit.estado);
  const isDocsPosteriorPendingUpload =
    !!requestToEdit &&
    tiposDocsPosterior.includes(requestToEdit.tipo) &&
    requestToEdit.documentacionPosterior === true &&
    (!requestToEdit.archivosAdjuntos || requestToEdit.archivosAdjuntos.length === 0) &&
    requestToEdit.estado === 'en_revision';
  const isOnlyFileUploadMode = isStudyExamPendingUpload || isDocsPosteriorPendingUpload;

  const [formData, setFormData] = useState({
    tipo: 'vacaciones',
    fechaInicio: dayjs().format('YYYY-MM-DD'),
    fechaFin: dayjs().format('YYYY-MM-DD'),
    motivo: '',
    certificadoPosterior: false,
    adjuntarCliente: false,
    certificadoMedicoPosterior: false,
    documentacionPosterior: false,
  });

  useEffect(() => {
    if (open) {
      if (requestToEdit) {
        // MODO EDICIÓN: Cargar datos existentes
        const isEnfermedad = requestToEdit.tipo === 'enfermedad';
        const hasDocPosterior = !!requestToEdit.documentacionPosterior;

        setFormData({
          tipo: requestToEdit.tipo || 'vacaciones',
          fechaInicio: dayjs(requestToEdit.fechaInicio).format('YYYY-MM-DD'),
          fechaFin: dayjs(requestToEdit.fechaFin).format('YYYY-MM-DD'),
          motivo: requestToEdit.motivo || '',
          certificadoPosterior: false, // día de estudio: se controla solo por front
          adjuntarCliente: false,
          // Si viene de admin como "documentacionPosterior" pero el tipo es enfermedad,
          // lo interpretamos como "cargar certificado médico más tarde".
          certificadoMedicoPosterior: isEnfermedad && hasDocPosterior,
          // Para el resto de tipos, documentacionPosterior mantiene su semántica original.
          documentacionPosterior: !isEnfermedad && hasDocPosterior,
        });
      } else {
        // MODO CREACIÓN: Resetear formulario
        setFormData({
          tipo: 'vacaciones',
          fechaInicio: dayjs().format('YYYY-MM-DD'),
          fechaFin: dayjs().format('YYYY-MM-DD'),
          motivo: '',
          certificadoPosterior: false,
          adjuntarCliente: false,
          certificadoMedicoPosterior: false,
          documentacionPosterior: false,
        });
      }
      setDeletedExistingFile(false);
      setSelectedFile(null);
      setUploadProgress(0);
    }
  }, [open, requestToEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Validación de tamaño (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('El archivo es demasiado grande. Máximo 5MB.', 'warning');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    if (selectedFile) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (requestToEdit && requestToEdit.archivosAdjuntos?.length > 0) {
      setDeletedExistingFile(true);
    }
  };

  const handlePreviewFile = async (e, fileData) => {
    e.stopPropagation();
    if (fileData && fileData.oneDriveId) {
      try {
        const response = await getRequestFileApi(fileData.oneDriveId);
        const url = window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] }));
        window.open(url, '_blank');
      } catch (error) {
        console.error(error);
        showNotification('Error al abrir el archivo', 'error');
      }
    } else if (fileData && fileData.url) {
      window.open(fileData.url, '_blank');
    } else if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      window.open(objectUrl, '_blank');
    }
  };

  const handleSubmit = async () => {
    // En modo "solo subir certificado de examen" no permitimos editar el resto de campos.
    // Aun así enviamos los valores actuales para mantener el contrato con el backend.
    if (!isOnlyFileUploadMode) {
      if (dayjs(formData.fechaFin).isBefore(dayjs(formData.fechaInicio))) {
        showNotification('La fecha de fin no puede ser anterior a la de inicio.', 'warning');
        return;
      }
      if (!formData.motivo && formData.tipo === 'otro') {
        showNotification('Por favor detalla el motivo.', 'warning');
        return;
      }
    }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      // Usamos FormData para poder enviar el archivo
      const formDataToSend = new FormData();
      formDataToSend.append('tipo', formData.tipo);
      formDataToSend.append('fechaInicio', formData.fechaInicio);
      formDataToSend.append('fechaFin', formData.fechaFin);
      formDataToSend.append('motivo', formData.motivo);

      // Para enfermedad, la bandera real de "cargar más tarde" es certificadoMedicoPosterior.
      // Para el resto de tipos, usamos documentacionPosterior como hasta ahora.
      const docPosteriorFlag =
        formData.tipo === 'enfermedad'
          ? !!formData.certificadoMedicoPosterior
          : !!formData.documentacionPosterior;
      formDataToSend.append('documentacionPosterior', docPosteriorFlag ? 'true' : 'false');
      if (formData.adjuntarCliente) {
        formDataToSend.append('adjuntarCliente', 'true');
      }
      if (selectedFile) {
        formDataToSend.append('archivo', selectedFile);
      }
      if (deletedExistingFile) {
        formDataToSend.append('eliminarArchivo', 'true');
      }

      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      };
      
      if (requestToEdit) {
        await editRequestApi(requestToEdit._id, formDataToSend, config);
        showNotification(isOnlyFileUploadMode ? 'Documento cargado con éxito.' : 'Solicitud actualizada con éxito.', 'success');
      } else {
        await createRequestApi(formDataToSend, config);
        showNotification('Solicitud creada con éxito.', 'success');
      }
      onSuccess();
    } catch (error) {
      console.error("Error creando solicitud:", error);
      showNotification(error.response?.data?.message || 'Error al crear la solicitud.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Estilos
  const labelStyle = { mb: 1, fontWeight: 500, fontSize: '0.9rem', color: '#333' };
  const uploadBoxStyles = {
    border: '2px dashed #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#fafafa',
    color: '#6e6e6e',
    marginTop: '8px',
    transition: '0.2s',
    '&:hover': { backgroundColor: '#f5f5f5', borderColor: '#bdbdbd' },
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, padding: 1 } }}
    >
      {/* CORRECCIÓN 1: DialogTitle sin Typography anidado incorrectamente */}
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, fontWeight: 'bold', fontSize: '1.25rem' }}>
        {isStudyExamPendingUpload ? 'Cargar Certificado de Examen' : (isDocsPosteriorPendingUpload ? 'Cargar Documentación' : (requestToEdit ? 'Editar Solicitud' : 'Nueva Solicitud'))}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ overflowY: 'visible' }}>
        {isStudyExamPendingUpload && (
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            Esta solicitud es <strong>Día de Estudio</strong> y el <strong>certificado de examen</strong> está pendiente.
            En este paso solo se permite cargar el archivo.
          </Alert>
        )}
        {isDocsPosteriorPendingUpload && (
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            Esta solicitud está <strong>En trámite</strong> y tiene <strong>documentación pendiente</strong>.
            En este paso solo se permite cargar el archivo.
          </Alert>
        )}
        
        <Box sx={{ mt: 1, mb: 3, display: isOnlyFileUploadMode ? 'none' : 'block' }}>
          <InputLabel sx={labelStyle}>Tipo de Solicitud</InputLabel>
          <FormControl fullWidth size="small">
            <Select
              name="tipo"
              value={formData.tipo}
              onChange={handleInputChange}
              displayEmpty
              autoFocus
              disabled={requestToEdit?.estado === 'aprobada'}
            >
              {REQUEST_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3, display: isOnlyFileUploadMode ? 'none' : 'flex' }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InputLabel sx={labelStyle}>Fecha Inicio</InputLabel>
            <TextField
              fullWidth
              type="date"
              size="small"
              name="fechaInicio"
              value={formData.fechaInicio}
              onChange={handleInputChange}
              sx={{ '& input': { color: '#555' } }} 
              disabled={requestToEdit?.estado === 'aprobada'}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InputLabel sx={labelStyle}>Fecha Fin</InputLabel>
            <TextField
              fullWidth
              type="date"
              size="small"
              name="fechaFin"
              value={formData.fechaFin}
              onChange={handleInputChange}
              sx={{ '& input': { color: '#555' } }}
              disabled={requestToEdit?.estado === 'aprobada'}
            />
          </Grid>
        </Grid>

        <Box sx={{ mb: 3, display: isOnlyFileUploadMode ? 'none' : 'block' }}>
          <InputLabel sx={labelStyle}>Motivo / Comentarios</InputLabel>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Describe brevemente el motivo..."
            variant="outlined"
            size="small"
            name="motivo"
            value={formData.motivo}
            onChange={handleInputChange}
          />
        </Box>

        {!isOnlyFileUploadMode && formData.tipo === 'dia_estudio' && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Recuerda que deberás presentar el certificado de examen.
            </Alert>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.certificadoPosterior || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificadoPosterior: e.target.checked }))}
                  size="small"
                />
              }
              label={<Typography variant="body2">Presentaré el certificado posterior al examen</Typography>}
            />
          </Box>
        )}

        {!isOnlyFileUploadMode && formData.tipo === 'enfermedad' && (
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.certificadoMedicoPosterior || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificadoMedicoPosterior: e.target.checked }))}
                  size="small"
                />
              }
              label={<Typography variant="body2">Cargar certificado médico más tarde</Typography>}
            />
          </Box>
        )}

        {!isOnlyFileUploadMode && formData.tipo === 'vacaciones' && requestToEdit?.estado !== 'pendiente_firma' && (
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.adjuntarCliente || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, adjuntarCliente: e.target.checked }))}
                  size="small"
                />
              }
              label={<Typography variant="body2">Cargar documentación de confirmación previa con cliente</Typography>}
            />
          </Box>
        )}

        {/* Documentación posterior (Otros tipos) */}
        {!isOnlyFileUploadMode && tiposDocsPosterior.includes(formData.tipo) && (
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.documentacionPosterior || false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, documentacionPosterior: e.target.checked }))}
                  size="small"
                />
              }
              label={<Typography variant="body2">Cargar documentación más tarde</Typography>}
            />
          </Box>
        )}

        {((formData.tipo !== 'vacaciones' && formData.tipo !== 'enfermedad') || formData.adjuntarCliente || requestToEdit?.estado === 'pendiente_firma' || (formData.tipo === 'enfermedad' && requestToEdit) || (formData.tipo === 'enfermedad' && !formData.certificadoMedicoPosterior)) && (
        <Box sx={{ mb: 1 }}>
          <InputLabel sx={labelStyle}>
            {requestToEdit?.estado === 'pendiente_firma' ? 'Documento Firmado' : (formData.tipo === 'vacaciones' ? 'Aprobación del Cliente' : (formData.tipo === 'enfermedad' ? 'Certificado Médico' : (formData.tipo === 'dia_estudio' ? 'Certificado de Examen' : 'Comprobantes - Certificados')))}
          </InputLabel>
          <input
            type="file"
            hidden
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={(!isOnlyFileUploadMode) && (formData.certificadoPosterior || (formData.tipo === 'enfermedad' && formData.certificadoMedicoPosterior) || formData.documentacionPosterior)}
          />
          <Box 
            sx={{ 
              ...uploadBoxStyles,
              opacity: ((!isOnlyFileUploadMode) && (formData.certificadoPosterior || (formData.tipo === 'enfermedad' && formData.certificadoMedicoPosterior) || formData.documentacionPosterior)) ? 0.5 : 1,
              cursor: ((!isOnlyFileUploadMode) && (formData.certificadoPosterior || (formData.tipo === 'enfermedad' && formData.certificadoMedicoPosterior) || formData.documentacionPosterior)) ? 'default' : 'pointer'
            }} 
            onClick={() => {
              if (isOnlyFileUploadMode) return fileInputRef.current.click();
              if (formData.certificadoPosterior) return;
              if (formData.tipo === 'enfermedad' && formData.certificadoMedicoPosterior) return;
              if (formData.documentacionPosterior) return;
              fileInputRef.current.click();
            }}
          >
            <Box 
              sx={{ 
                width: 40, height: 40, 
                backgroundColor: '#e3f2fd', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                margin: '0 auto 10px auto' 
              }}
            >
              <CloudUploadIcon sx={{ color: '#1976d2' }} />
            </Box>
            
            {selectedFile ? (
               <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', px: 1 }}>
                 <Typography variant="body2" fontWeight="bold" color="success.main" noWrap sx={{ maxWidth: '70%' }}>
                   {selectedFile.name}
                 </Typography>
                 <Box>
                   <IconButton size="small" onClick={(e) => handlePreviewFile(e)} title="Previsualizar">
                     <VisibilityIcon fontSize="small" />
                   </IconButton>
                   <IconButton size="small" color="error" onClick={handleRemoveFile} title="Eliminar">
                     <DeleteIcon fontSize="small" />
                   </IconButton>
                 </Box>
               </Box>
            ) : (
              requestToEdit && requestToEdit.archivosAdjuntos && requestToEdit.archivosAdjuntos.length > 0 && !deletedExistingFile ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', px: 1 }}>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight="bold" color="primary" noWrap sx={{ maxWidth: 200 }}>
                      {requestToEdit.archivosAdjuntos[0].nombre || 'Adjunto'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Click para reemplazar
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton size="small" onClick={(e) => handlePreviewFile(e, requestToEdit.archivosAdjuntos[0])} title="Previsualizar">
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={handleRemoveFile} title="Eliminar">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <>
                  <Typography variant="body2" fontWeight="bold" color="textPrimary">
                    Click para subir o arrastrar
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {requestToEdit?.estado === 'pendiente_firma'
                      ? 'Adjuntar documento firmado (PDF, JPG)'
                      : (formData.tipo === 'vacaciones' 
                        ? 'Adjuntar aprobación (Screenshot, PDF, JPG)' 
                        : (formData.tipo === 'dia_estudio' ? 'Certificado de examen (PDF, JPG)' : (formData.tipo === 'enfermedad' ? 'Certificado médico (PDF, JPG)' : 'Certificados, constancias (PDF, JPG)')))}
                  </Typography>
                </>
              )
            )}
          </Box>
        </Box>
        )}

        {submitting && (
          <Box sx={{ mt: 2, width: '100%' }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="caption" color="textSecondary" align="center" display="block" sx={{ mt: 0.5 }}>
              {uploadProgress < 100 ? `Subiendo... ${uploadProgress}%` : 'Procesando...'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          color="inherit" 
          disabled={submitting}
          sx={{mr: 1, color: "#2A4DB8"} }
             
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={submitting}
          sx={{color: "#ffffff",bgcolor: "#173487", '&:hover': { bgcolor: '#2A4DB8' } }}
        >
          {submitting ? <CircularProgress size={24} color="inherit" /> : (requestToEdit ? 'Guardar Cambios' : 'Enviar Solicitud')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Box,
  CircularProgress,
  Typography,
  IconButton
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { adminUpdateRequestApi } from '../api/request';

const REQUEST_TYPES = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'dia_estudio', label: 'Día de Estudio' },
  { value: 'mudanza', label: 'Mudanza' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'paternidad', label: 'Paternidad' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'otro', label: 'Otro' },
];

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Recibida' },
  { value: 'en_revision', label: 'En trámite' },
  { value: 'pendiente_firma', label: 'Pendiente de firma' },
  { value: 'aprobada', label: 'Registrada' },
  { value: 'rechazada', label: 'No procede' },
  { value: 'cancelada', label: 'Cancelada' },
];

export default function AdminEditRequestModal({ open, onClose, request, onSuccess, showNotification }) {
  const [formData, setFormData] = useState({
    tipo: '',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
    estado: '',
    respuestaAdmin: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (request) {
      setFormData({
        tipo: request.tipo || '',
        fechaInicio: dayjs(request.fechaInicio).format('YYYY-MM-DD'),
        fechaFin: dayjs(request.fechaFin).format('YYYY-MM-DD'),
        motivo: request.motivo || '',
        estado: request.estado || 'pendiente',
        respuestaAdmin: request.respuestaAdmin || ''
      });
    }
  }, [request, open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showNotification('El archivo es demasiado grande. Máximo 5MB.', 'warning');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('tipo', formData.tipo);
      formDataToSend.append('fechaInicio', formData.fechaInicio);
      formDataToSend.append('fechaFin', formData.fechaFin);
      formDataToSend.append('motivo', formData.motivo);
      formDataToSend.append('estado', formData.estado);
      formDataToSend.append('respuestaAdmin', formData.respuestaAdmin || '');
      if (selectedFile) {
        formDataToSend.append('archivo', selectedFile);
      }

      await adminUpdateRequestApi(request._id, formDataToSend);
      showNotification('Solicitud actualizada  correctamente.', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      showNotification(error.response?.data?.message || 'Error al actualizar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Solicitud (RRHH)</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="admin-edit-request-type"
                select
                fullWidth
                label="Tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                size="small"
                slotProps={{
                  input: { id: 'admin-edit-request-type-input' },
                  inputLabel: { htmlFor: 'admin-edit-request-type-input' },
                }}
              >
                {REQUEST_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>   
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="admin-edit-request-status"
                select
                fullWidth
                label="Estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                size="small"
                slotProps={{
                  input: { id: 'admin-edit-request-status-input' },
                  inputLabel: { htmlFor: 'admin-edit-request-status-input' },
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Inicio"
                name="fechaInicio"
                value={formData.fechaInicio}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Fin"
                name="fechaFin"
                value={formData.fechaFin}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                id="admin-edit-request-motivo"
                fullWidth
                multiline
                rows={2}
                label="Motivo del Empleado"
                name="motivo"
                value={formData.motivo}
                onChange={handleChange}
                size="small"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                id="admin-edit-request-respuesta"
                fullWidth
                multiline
                rows={2}
                label="Respuesta Recursos Humanos"
                name="respuestaAdmin"
                value={formData.respuestaAdmin}
                onChange={handleChange}
                size="small"
                placeholder="Escribe una respuesta o nota interna..."
                inputProps={{ spellCheck: false }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Adjuntar documento (opcional)
                </Typography>
                <Box
                  sx={{
                    border: '1px dashed #bdbdbd',
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#173487' },
                  }}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                    <CloudUploadIcon sx={{ color: '#173487' }} />
                    <Typography variant="body2" noWrap sx={{ maxWidth: 260 }}>
                      {selectedFile ? selectedFile.name : 'Click para seleccionar archivo (PDF, JPG, PNG)'}
                    </Typography>
                  </Box>
                  {selectedFile && (
                    <IconButton size="small" color="error" onClick={handleRemoveFile}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
        
        sx={{color: "#2A4DB8"} }
        variant="outlined"  
        onClick={onClose} color="inherit">Cancelar</Button>
        <Button
        
        sx={{color: "#ffffff",bgcolor: "#173487", '&:hover': { bgcolor: '#2A4DB8' } }}
        onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

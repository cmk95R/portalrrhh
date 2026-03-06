import React, { useState, useEffect } from 'react';
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
  CircularProgress
} from '@mui/material';
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await adminUpdateRequestApi(request._id, formData);
      showNotification('Solicitud actualizada correctamente.', 'success');
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
                select
                fullWidth
                label="Tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                size="small"
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
                select
                fullWidth
                label="Estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                size="small"
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
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

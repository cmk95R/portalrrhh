import React, { useState, useEffect } from 'react';
import {
  Box, Modal, Typography, Stack, TextField, FormControl, InputLabel, Select, MenuItem, Button, Autocomplete, CircularProgress, Switch, FormControlLabel, Grid, Alert, IconButton, Divider, Avatar
} from '@mui/material';
import { DateRange, Person, EventNote, Notes, Close } from '@mui/icons-material';
import dayjs from 'dayjs';
import { createAttendanceApi } from '../../api/adminAttendanceApi';
import { listUsersApi } from '../../api/users';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95vw', sm: 500 },
  maxWidth: '95vw',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 3,
  maxHeight: '90vh',
  overflowY: 'auto',
  outline: 'none', // Remove default outline for better look
};

const absenceTypes = [
  { value: 'Sin justificación', label: 'Sin justificación' },
  { value: 'Día de estudio', label: 'Día de estudio' },
  { value: 'Maternidad / Paternidad', label: 'Por Maternidad / Paternidad' },
  { value: 'Enfermedad', label: 'Enfermedad / Certificado Médico' },
  { value: 'Mudanza', label: 'Mudanza' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Fallecimiento Familiar', label: 'Fallecimiento Familiar' },
  { value: 'Otro', label: 'Otro' },
];

export default function CreateAttendanceModal({ open, onClose, onCreated, showNotification }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [fecha, setFecha] = useState(dayjs().format('YYYY-MM-DD'));
  const [fechaHasta, setFechaHasta] = useState(dayjs().format('YYYY-MM-DD'));
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [estado, setEstado] = useState('presente');
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    if (open) {
      // Resetear campos al abrir
      setFecha(dayjs().format('YYYY-MM-DD'));
      setFechaHasta(dayjs().format('YYYY-MM-DD'));
      setIsRangeMode(false);
      setEstado('presente');
      setNota('');
      setMotivo('');
      setSelectedUser(null);
      setError('');
      setDateError('');
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Traemos usuarios activos (ajustar límite si tienes muchos usuarios)
      const { data } = await listUsersApi({ limit: 1000, estado: 'activo' }); 
      setUsers(data.items || []);
    } catch (error) {
      console.error("Error cargando usuarios", error);
      setError("Error al cargar usuarios. Inténtalo de nuevo.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const validateDates = () => {
    if (isRangeMode) {
      const start = dayjs(fecha);
      const end = dayjs(fechaHasta);
      if (end.isBefore(start)) {
        setDateError("La fecha 'Hasta' debe ser posterior a la fecha 'Desde'.");
        return false;
      }
    }
    setDateError('');
    return true;
  };

  const handleSave = async () => {
    if (!selectedUser) {
      setError("Debes seleccionar un usuario.");
      return;
    }
    if (!validateDates()) return;

    setSaving(true);
    setError('');
    try {
      if (isRangeMode) {
        const start = dayjs(fecha);
        const end = dayjs(fechaHasta);

        const promises = [];
        let current = start;
        while (current.isBefore(end) || current.isSame(end, 'day')) {
          promises.push(createAttendanceApi({
            usuario: selectedUser.id || selectedUser._id,
            fecha: current.format('YYYY-MM-DD'),
            estado,
            nota,
            motivo: estado === 'ausente' ? motivo : undefined
          }));
          current = current.add(1, 'day');
        }
        await Promise.all(promises);
      } else {
        await createAttendanceApi({
          usuario: selectedUser.id || selectedUser._id,
          fecha,
          estado,
          nota,
          motivo: estado === 'ausente' ? motivo : undefined
        });
      }

      const count = isRangeMode ? dayjs(fechaHasta).diff(dayjs(fecha), 'day') + 1 : 1;
      const msg = count > 1
        ? `Se registraron ${count} asistencias correctamente.`
        : 'La asistencia se registró correctamente.';
      if (showNotification) showNotification(msg, 'success');
      if (onCreated) onCreated();
      onClose();
    } catch (error) {
      console.error("Error al crear asistencia:", error);
      setError(error.response?.data?.message || "Error al crear asistencia. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#173487',
                color: '#fff',
              }}
            >
              <EventNote />
            </Avatar>
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1 }}
              >
                Crear asistencia
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                Registrar asistencia manual
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Seleccioná el empleado, las fechas y el estado de asistencia.
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Grid container spacing={3}>
          <Grid size={12}>
            <Autocomplete
              options={users}
              loading={loadingUsers}
              getOptionLabel={(option) => `${option.nombre} ${option.apellido} (${option.dni || 'Sin DNI'})`}
              value={selectedUser}
              onChange={(event, newValue) => setSelectedUser(newValue)}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Buscar Usuario" 
                  placeholder="Nombre o Apellido"
                  required
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                    endAdornment: (
                      <>
                        {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          <Grid size={12}>
            <FormControlLabel
              control={<Switch checked={isRangeMode} onChange={(e) => setIsRangeMode(e.target.checked)} />}
              label={
                <Box display="flex" alignItems="center">
                  <DateRange sx={{ mr: 1, color: 'action.active'   }} />
                  Crear Rango de Fechas
                </Box>
              }
            />
          </Grid>

          <Grid size={{ xs: 12, sm: isRangeMode ? 6 : 12 }}>
            <TextField
              fullWidth 
              type="date" 
              label={isRangeMode ? "Desde" : "Fecha"}
              value={fecha} 
              onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <EventNote sx={{ mr: 1, color: 'action.active' }} />,
              }}
              required
            />
          </Grid>
          {isRangeMode && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth 
                type="date" 
                label="Hasta"
                value={fechaHasta} 
                onChange={(e) => setFechaHasta(e.target.value)}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <EventNote sx={{ mr: 1, color: 'action.active' }} />,
                }}
                error={!!dateError}
                helperText={dateError}
                required
              />
            </Grid>
          )}

          <Grid size={12}>
            <FormControl fullWidth required>
              <InputLabel>Estado</InputLabel>
              <Select value={estado} label="Estado" onChange={(e) => setEstado(e.target.value)}>
                <MenuItem value="presente">Presente</MenuItem>
                <MenuItem value="ausente">Ausente</MenuItem>
                <MenuItem value="no-aplica">No Aplica</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {estado === 'ausente' && (
            <Grid size={12}>
              <FormControl fullWidth required>
                <InputLabel>Motivo de Ausencia</InputLabel>
                <Select
                  value={motivo}
                  label="Motivo de Ausencia"
                  onChange={(e) => setMotivo(e.target.value)}
                >
                  {absenceTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={12}>
            <TextField
              fullWidth 
              label="Nota / Observación"
              multiline 
              rows={3}
              value={nota} 
              onChange={(e) => setNota(e.target.value)}
              InputProps={{
                startAdornment: <Notes sx={{ mr: 1, color: 'action.active', alignSelf: 'flex-start', mt: 1 }} />,
              }}
              placeholder="Agrega una nota opcional..."
            />
          </Grid>

          <Grid size={12}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
              
              sx={{color: "#2A4DB8"} } 
              variant="outlined"
              onClick={onClose} color="inherit" disabled={saving}>
                Cancelar
              </Button>
              <Button 

              sx={{color: "#ffffff",bgcolor: "#173487", '&:hover': { bgcolor: '#2A4DB8' } }}
                variant="contained" 
                onClick={handleSave} 
                disabled={!selectedUser || saving}
                startIcon={saving ? <CircularProgress size={20} /> : null}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}
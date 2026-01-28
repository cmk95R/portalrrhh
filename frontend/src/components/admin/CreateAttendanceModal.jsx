import React, { useState, useEffect } from 'react';
import {
  Box, Modal, Typography, Stack, TextField, FormControl, InputLabel, Select, MenuItem, Button, Autocomplete, CircularProgress
} from '@mui/material';
import dayjs from 'dayjs';
import { createAttendanceApi } from '../../api/adminAttendanceApi';
import { listUsersApi } from '../../api/users';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  maxWidth: '95vw',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  overflowY: 'auto'
};

const absenceTypes = [
  { value: 'Sin justificación', label: 'Sin justificación' },
  { value: 'Día de estudio', label: 'Dia de estudio' },
  { value: 'Maternidad / Paternidad', label: 'Por Maternidad / Paternidad' },
  { value: 'Enfermedad', label: 'Enfermedad / Certificado Medico' },
  { value: 'Mudanza', label: 'Mudanza' },
  { value: 'Vacaciones', label: 'Vacaciones' },
  { value: 'Fallecimiento Familiar', label: 'Fallecimiento Familiar' },
  { value: 'Otro', label: 'Otro' },
];

export default function CreateAttendanceModal({ open, onClose, onCreated }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [fecha, setFecha] = useState(dayjs().format('YYYY-MM-DD'));
  const [estado, setEstado] = useState('presente');
  const [nota, setNota] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (open) {
      // Resetear campos al abrir
      setFecha(dayjs().format('YYYY-MM-DD'));
      setEstado('presente');
      setNota('');
      setMotivo('');
      setSelectedUser(null);
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
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    try {
      await createAttendanceApi({
        usuario: selectedUser.id || selectedUser._id,
        fecha,
        estado,
        nota,
        motivo: estado === 'ausente' ? motivo : undefined
      });
      if (onCreated) onCreated();
      onClose();
    } catch (error) {
      console.error("Error al crear asistencia:", error);
      alert(error.response?.data?.message || "Error al crear asistencia.");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" gutterBottom>Crear Asistencia Manual</Typography>
        
        <Stack spacing={3} mt={2}>
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
                InputProps={{
                  ...params.InputProps,
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

          <TextField
            fullWidth type="date" label="Fecha"
            value={fecha} onChange={(e) => setFecha(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select value={estado} label="Estado" onChange={(e) => setEstado(e.target.value)}>
              <MenuItem value="presente">Presente</MenuItem>
              <MenuItem value="ausente">Ausente</MenuItem>
              <MenuItem value="no-aplica">No Aplica</MenuItem>
            </Select>
          </FormControl>

          {estado === 'ausente' && (
            <FormControl fullWidth>
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
          )}

          <TextField
            fullWidth label="Nota / Observación"
            multiline rows={2}
            value={nota} onChange={(e) => setNota(e.target.value)}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose} color="inherit">Cancelar</Button>
            <Button variant="contained" onClick={handleSave} disabled={!selectedUser}>
              Guardar
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
}
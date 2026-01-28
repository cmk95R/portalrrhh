import React, { useState, useEffect } from 'react';
import {
  Box, Modal, Typography, Stack, TextField, FormControl, InputLabel, Select, MenuItem, Button
} from '@mui/material';
import dayjs from 'dayjs';
import { updateAttendanceApi } from '../../api/adminAttendanceApi';

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

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  maxWidth: '95vw',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  overflowY: 'auto'
};

export default function EditAttendanceModal({ open, onClose, employee, onApplied }) {
  const [fecha, setFecha] = useState(dayjs().format('YYYY-MM-DD'));
  const [estado, setEstado] = useState('presente');
  const [motivo, setMotivo] = useState('');
  const [nota, setNota] = useState('');

  useEffect(() => {
    if (open && employee) {
        setFecha(dayjs(employee.fecha).format('YYYY-MM-DD'));
        setEstado(employee.estado || 'presente');
        setMotivo(employee.motivo || '');
        setNota(employee.nota || '');
    }
  }, [open, employee]);

  const handleApply = async () => {
    try {
      await updateAttendanceApi(employee._id, {
        estado,
        motivo: estado === 'ausente' ? motivo : '',
        nota
      });
      
      if (onApplied) onApplied();
      onClose();
    } catch (error) {
      console.error("Error al actualizar asistencia:", error);
      alert(error.response?.data?.message || "No se pudo actualizar la asistencia.");
    }
  };

  if (!employee) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h6" gutterBottom>Editar Asistencia</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
            Empleado: {employee.nombre} {employee.apellido}
        </Typography>
        <Stack spacing={3} mt={2}>
            <TextField
                fullWidth type="date" label="Fecha"
                value={fecha} 
                disabled // Solo se edita el día seleccionado (no modificable)
                InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select value={estado} label="Estado" onChange={(e) => setEstado(e.target.value)}>
                <MenuItem value="presente">Presente</MenuItem>
                <MenuItem value="ausente">Ausente</MenuItem>
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
                <Button variant="contained" color="warning" onClick={handleApply}>Guardar</Button>
            </Stack>
        </Stack>
      </Box>
    </Modal>
  );
}
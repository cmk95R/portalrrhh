import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  Button,
  Box,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Avatar,
  Typography,
  Stack,
} from '@mui/material';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import { Autocomplete } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { adminCreateRequestApi } from '../api/request';
import { listUsersApi } from '../api/users';

dayjs.locale('es');

const REQUEST_TYPES = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'paternidad', label: 'Paternidad' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'mudanza', label: 'Mudanza' },
  { value: 'dia_estudio', label: 'Día de Estudio' },
  { value: 'otro', label: 'Otro' },
];

export default function AdminCreateRequestModal({ open, onClose, onSuccess, showNotification }) {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    tipo: 'vacaciones',
    fechaInicio: dayjs().format('YYYY-MM-DD'),
    fechaFin: dayjs().format('YYYY-MM-DD'),
    motivo: '',
    adjuntarCliente: false,
    documentacionPosterior: false,
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const { data } = await listUsersApi({ limit: 1000 });
        setEmployees(data?.items || data?.users || data || []);
      } catch (error) {
        console.error('Error cargando empleados:', error);
        showNotification?.('Error al cargar la lista de empleados.', 'error');
      } finally {
        setLoadingEmployees(false);
      }
    };

    if (open) {
      fetchEmployees();
      setFormData({
        tipo: 'vacaciones',
        fechaInicio: dayjs().format('YYYY-MM-DD'),
        fechaFin: dayjs().format('YYYY-MM-DD'),
        motivo: '',
        adjuntarCliente: false,
        documentacionPosterior: false,
      });
      setSelectedEmployee(null);
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open, showNotification]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showNotification?.('El archivo es demasiado grande. Máximo 5MB.', 'warning');
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
    if (!selectedEmployee) {
      showNotification?.('Seleccioná un empleado para crear la solicitud.', 'warning');
      return;
    }

    if (dayjs(formData.fechaFin).isBefore(dayjs(formData.fechaInicio))) {
      showNotification?.('La fecha de fin no puede ser anterior a la de inicio.', 'warning');
      return;
    }

    if (!formData.motivo && formData.tipo === 'otro') {
      showNotification?.('Por favor detalla el motivo.', 'warning');
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('usuarioId', selectedEmployee._id);
      formDataToSend.append('tipo', formData.tipo);
      formDataToSend.append('fechaInicio', formData.fechaInicio);
      formDataToSend.append('fechaFin', formData.fechaFin);
      formDataToSend.append('motivo', formData.motivo);
      formDataToSend.append('documentacionPosterior', formData.documentacionPosterior ? 'true' : 'false');
      if (formData.adjuntarCliente) {
        formDataToSend.append('adjuntarCliente', 'true');
      }
      if (selectedFile) {
        formDataToSend.append('archivo', selectedFile);
      }

      const config = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      };

      await adminCreateRequestApi(formDataToSend, config);
      showNotification?.('Solicitud creada con éxito para el empleado.', 'success');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Error creando solicitud por admin:', error);
      showNotification?.(error.response?.data?.message || 'Error al crear la solicitud.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, padding: 1, maxHeight: '80vh' } }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: '#173487',
              color: '#fff',
            }}
          >
            <CreateNewFolderIcon />
          </Avatar>
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 1 }}
            >
              Crear solicitud
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              Nueva solicitud para empleado
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Seleccioná el empleado, el tipo de solicitud y, si aplica, adjuntá documentación.
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ overflowY: 'auto', pt: 1 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta solicitud será creada en nombre del empleado seleccionado.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <InputLabel sx={labelStyle}>Empleado</InputLabel>
          <Autocomplete
            options={employees}
            loading={loadingEmployees}
            getOptionLabel={(option) => {
              if (!option) return '';
              return `${option.nombre || ''} ${option.apellido || ''}${option.dni ? ` - ${option.dni}` : ''}`.trim() || 'Sin nombre';
            }}
            isOptionEqualToValue={(option, value) => (option?._id || option?.id) === (value?._id || value?.id)}
            value={selectedEmployee}
            onChange={(_, value) => setSelectedEmployee(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder={loadingEmployees ? 'Cargando empleados...' : 'Buscar por nombre o DNI'}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingEmployees ? <CircularProgress color="inherit" size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InputLabel sx={labelStyle}>Tipo de Solicitud</InputLabel>
            <FormControl fullWidth size="small">
              <TextField
                select
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                size="small"
              >
                {REQUEST_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <InputLabel sx={labelStyle}>Fecha inicio</InputLabel>
            <TextField
              type="date"
              name="fechaInicio"
              size="small"
              fullWidth
              value={formData.fechaInicio}
              onChange={handleInputChange}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <InputLabel sx={labelStyle}>Fecha fin</InputLabel>
            <TextField
              type="date"
              name="fechaFin"
              size="small"
              fullWidth
              value={formData.fechaFin}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid size={12}>
            <InputLabel sx={labelStyle}>Motivo</InputLabel>
            <TextField
              name="motivo"
              multiline
              minRows={2}
              fullWidth
              size="small"
              value={formData.motivo}
              onChange={handleInputChange}
              inputProps={{ spellCheck: false }}
            />
          </Grid>

          <Grid size={12}>
            <FormControlLabel
              control={
                <Checkbox
                  name="documentacionPosterior"
                  checked={formData.documentacionPosterior}
                  onChange={handleCheckboxChange}
                  size="small"
                />
              }
              label="Cargar documentación respaldatoria más tarde (si aplica)"
            />
          </Grid>

          {formData.tipo === 'vacaciones' && (
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="adjuntarCliente"
                    checked={formData.adjuntarCliente}
                    onChange={handleCheckboxChange}
                    size="small"
                  />
                }
                label="Adjuntar Aprobación Previa de Cliente"
              />
            </Grid>
          )}

          <Grid size={12}>
            <InputLabel sx={labelStyle}>Adjuntar archivo (opcional)</InputLabel>
            <Box
              sx={uploadBoxStyles}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <CloudUploadIcon sx={{ fontSize: 40, mb: 1 }} />
              <Box>
                <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                  <span>{selectedFile ? selectedFile.name : 'Click para seleccionar archivo'}</span>
                  {selectedFile && (
                    <IconButton size="small" onClick={handleRemoveFile}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Box sx={{ fontSize: 12, color: '#999', mt: 0.5 }}>Máx. 5MB</Box>
              </Box>
            </Box>
            {submitting && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Box sx={{ mt: 0.5, fontSize: 12, color: '#666' }}>
                  Subiendo archivo... {uploadProgress}%
                </Box>
              </Box>
            )}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button
          sx={{ color: "#2A4DB8" }}
          variant="outlined"
          onClick={onClose}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          sx={{
            color: "#ffffff",
            bgcolor: "#173487",
            '&:hover': { bgcolor: '#2A4DB8' }
          }}
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
        >
          {submitting ? 'Guardando...' : 'Crear solicitud'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


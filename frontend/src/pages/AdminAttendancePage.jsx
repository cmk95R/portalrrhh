import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  TextField,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Avatar,
  Snackbar,
  Alert,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Grid,
} from '@mui/material';

// --- ICONOS ---
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import EmailIcon from '@mui/icons-material/Email';
import DateRange from '@mui/icons-material/DateRange';
import EventNote from '@mui/icons-material/EventNote';

import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { getAllAttendanceApi, deleteAttendanceApi, sendAttendanceReminderApi } from '../api/adminAttendanceApi';
import { listUsersApi } from '../api/users';

// --- Componentes Reutilizables ---
import ViewAttendanceModal from '../components/admin/ViewAttendanceModal';
import EditAttendanceModal from '../components/admin/EditAttendanceModal';
import CreateAttendanceModal from '../components/admin/CreateAttendanceModal';

// Configuración global de Dayjs
dayjs.locale('es');

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

const formatTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).utc().format('HH:mm');
};

// --- Componente Principal ---
export default function AdminAttendancePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const [queryOptions] = useState({});
  const [filters, setFilters] = useState({ q: '', dateFrom: '', dateTo: '' });
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const DEFAULT_REMINDER_SUBJECT = 'Recordatorio: registrar asistencia del {{fecha_desde}} al {{fecha_hasta}}';
  const DEFAULT_REMINDER_BODY = 'Hola {{nombre}},\n\nTe recordamos que registres tu asistencia desde el día {{fecha_desde}} hasta el {{fecha_hasta}}.\n\nIngresá al portal de colaboradores y marcá presente o ausente según corresponda.';

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderDateFrom, setReminderDateFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [reminderDateTo, setReminderDateTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [reminderRangeMode, setReminderRangeMode] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsersReminder, setSelectedUsersReminder] = useState([]);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSubject, setReminderSubject] = useState(DEFAULT_REMINDER_SUBJECT);
  const [reminderBody, setReminderBody] = useState(DEFAULT_REMINDER_BODY);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        ...queryOptions,
        q: filters.q || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      };
      const { data } = await getAllAttendanceApi(params);
      setRows(data.items || []);
      setRowCount(data.total || 0);
    } catch (error) {
      console.error("Error al cargar las asistencias:", error);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, queryOptions, filters]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel]); 

  const handleFilterSubmit = () => {
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFilterSubmit();
    }
  };

  const handleDeleteClick = (row) => {
    setRowToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete?._id) return;
    setDeleting(true);
    try {
      await deleteAttendanceApi(rowToDelete._id);
      await fetchData();
      setSnackbar({
        open: true,
        message: 'Registro de asistencia eliminado correctamente.',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'No se pudo eliminar el registro.',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    if (deleting) return;
    setDeleteDialogOpen(false);
    setRowToDelete(null);
  };

  const handleOpenModal = (row, type) => {
    setSelectedEmployee(row);
    if (type === 'view') setViewModalOpen(true);
    if (type === 'apply') setApplyModalOpen(true);
  };

  const handleOpenReminderModal = () => {
    const today = dayjs().format('YYYY-MM-DD');
    setReminderModalOpen(true);
    setSelectedUsersReminder([]);
    setReminderDateFrom(today);
    setReminderDateTo(today);
    setReminderRangeMode(false);
    setReminderSubject(DEFAULT_REMINDER_SUBJECT);
    setReminderBody(DEFAULT_REMINDER_BODY);
    setUsersList([]);
    setLoadingUsers(true);
    listUsersApi({ limit: 500, rol: 'empleado' })
      .then(({ data }) => setUsersList(data.items || []))
      .catch(() => setSnackbar({ open: true, message: 'Error al cargar empleados.', severity: 'error' }))
      .finally(() => setLoadingUsers(false));
  };

  const handleSendAttendanceReminder = async () => {
    const userIds = selectedUsersReminder.map((u) => u._id);
    if (!userIds.length) {
      setSnackbar({ open: true, message: 'Seleccioná al menos un empleado.', severity: 'warning' });
      return;
    }

    const fechaHasta = reminderRangeMode ? reminderDateTo : reminderDateFrom;
    if (reminderRangeMode && dayjs(reminderDateTo).isBefore(dayjs(reminderDateFrom), 'day')) {
      setSnackbar({ open: true, message: 'La fecha "hasta" no puede ser anterior a la fecha "desde".', severity: 'warning' });
      return;
    }

    setSendingReminder(true);
    try {
      const { data } = await sendAttendanceReminderApi(reminderDateFrom, fechaHasta, userIds, { subject: reminderSubject, body: reminderBody });
      setSnackbar({ open: true, message: data.message || 'Recordatorios enviados.', severity: 'success' });
      setReminderModalOpen(false);
      setSelectedUsersReminder([]);
    } catch (error) {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Error al enviar recordatorios.', severity: 'error' });
    } finally {
      setSendingReminder(false);
    }
  };

  const columns = [
    { 
      field: 'nombre', headerName: 'Empleado', flex: 1, minWidth: 180,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ height: '100%' }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: '#2A4DB8' }}>
                {params.row.nombre ? params.row.nombre[0] : ''}
            </Avatar>
            <Typography variant="body2">{`${params.row.nombre} ${params.row.apellido}`}</Typography>
        </Stack>
      )
    },
    { field: 'fecha', headerName: 'Fecha', width: 120, valueGetter: (v, row) => formatDate(row.fecha) },
    { field: 'horaEntrada', headerName: 'Entrada', width: 100, valueGetter: (v, row) => formatTime(row.horaEntrada) },
    { field: 'horaSalida', headerName: 'Salida', width: 100, valueGetter: (v, row) => formatTime(row.horaSalida) },
    
    { 
      field: 'estado', headerName: 'Estado', width: 130, 
      renderCell: (params) => ( // Corregido
        <Chip 
            label={(params.value || 'N/A').toUpperCase()} 
            color={params.value?.toLowerCase() === 'presente' ? 'success' : 'error'} 
            variant="outlined" size="small" 
            sx={{ fontWeight: 'bold' }}
        />
      )
    },
    { 
      field: 'motivo', 
      headerName: 'Motivo | Nota', 
      width: 200,
      valueGetter: (v, row) => {
        if (row.estado === 'presente') return row.nota || '';
        return row.motivo || '';
      }
    },
    { field: 'actions', headerName: 'Acciones', width: 180, sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Ver">
            <IconButton
              size="small"
              onClick={() => handleOpenModal(params.row, 'view')}
              sx={{
                color: '#173487',
                '&:hover': { color: '#2A4DB8' },
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => handleOpenModal(params.row, 'apply')}
              sx={{
                color: '#173487',
                '&:hover': { color: '#2A4DB8' },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              color="error"
              onClick={() => handleDeleteClick(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" mb={3} spacing={2} flexWrap="wrap">
        <Box>
             <Typography variant="h5" sx={{ fontWeight: 500 }}>
                      Gestión de Asistencias
                    </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
        <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              disabled={loading}
              sx={{ bgcolor: "#173487", '&:hover': { bgcolor: '#2A4DB8 ' } }}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              onClick={handleOpenReminderModal}
              sx={{ bgcolor: "#173487", '&:hover': { bgcolor: '#2A4DB8 ' } }}
            >
              Enviar Recordatorio
            </Button>
           
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              
              onClick={() => setCreateModalOpen(true)}
              sx={{ bgcolor: "#173487", '&:hover': { bgcolor: '#2A4DB8 '} }}
            >
              Crear Asistencia
            </Button>
        </Stack>
      </Stack>

      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">FILTROS</Typography>
          <Stack direction="row" spacing={2}>
            <TextField 
              label="Buscar..." 
              size="small" 
              value={filters.q} 
              onChange={(e) => setFilters(p => ({ ...p, q: e.target.value }))} 
              onKeyDown={handleKeyDown}
              fullWidth 
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#6B85D6',
                  },
                  '&:hover fieldset': {
                    borderColor: '#6B85D6',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#6B85D6',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#6B85D6',
                },
              }}
            />
            <TextField
              label="Desde"
              type="date"
              size="small"
              value={filters.dateFrom}
              onChange={(e) => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
              onKeyDown={handleKeyDown}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#173487',
                  },
                  '&:hover fieldset': {
                    borderColor: '#132966',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#173487',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#173487',
                },
              }}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              value={filters.dateTo}
              onChange={(e) => setFilters(p => ({ ...p, dateTo: e.target.value }))}
              onKeyDown={handleKeyDown}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: '#2A4DB8',
                  },
                  '&:hover fieldset': {
                    borderColor: '#2A4DB8',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2A4DB8',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#2A4DB8',
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleFilterSubmit}
              sx={{
                bgcolor: '#173487',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: '#2A4DB8',
                },
              }}
            >
              BUSCAR
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2, height: 700, overflow: 'hidden' }}>
        <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            rowCount={rowCount}
            pageSizeOptions={[10, 25]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            getRowId={(row) => row._id}
            localeText={esES.components.MuiDataGrid.defaultProps.localeText}
            slots={{ toolbar: GridToolbar }}
        />
      </Card>

      <ViewAttendanceModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        employee={selectedEmployee}
        initialDate={selectedEmployee?.fecha}
      />
      <EditAttendanceModal
        open={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        employee={selectedEmployee}
        onApplied={fetchData}
        showNotification={(msg, severity = 'success') => setSnackbar({ open: true, message: msg, severity })}
      />
      <CreateAttendanceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={fetchData}
        showNotification={(msg, severity = 'success') => setSnackbar({ open: true, message: msg, severity })}
      />
{/* Diálogo para enviar recordatorio de asistencia */}
      <Dialog open={reminderModalOpen} onClose={() => !sendingReminder && setReminderModalOpen(false)} maxWidth="md" fullWidth
        Paperprops={{ sx: { borderRadius: 3, padding: 1, maxHeight: '80vh' } }}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#173487',
                color: '#fff',
              }}
            >
              <EmailIcon />
            </Avatar>
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Recordatorio de asistencia
              </Typography>
              <Typography variant="h6" fontWeight={600}>
                Enviar correo a empleados
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Seleccioná empleados, fechas y mensaje antes de enviar.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Autocomplete
              multiple
              options={usersList}
              getOptionLabel={(u) => `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email || ''}
              value={selectedUsersReminder}
              onChange={(_, newValue) => setSelectedUsersReminder(newValue)}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              loading={loadingUsers}
              renderInput={(params) => (
                <TextField {...params} label="Empleados" placeholder="Seleccionar uno o más" />
              )}
              filterSelectedOptions
            />
            <Grid container spacing={2}>
              <Grid size={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={reminderRangeMode}
                      onChange={(e) => setReminderRangeMode(e.target.checked)}
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <DateRange sx={{ mr: 1, color: 'action.active' }} />
                      Rango de fechas (desde / hasta)
                    </Box>
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: reminderRangeMode ? 6 : 12 }}>
                <TextField
                  label={reminderRangeMode ? 'Desde' : 'Fecha a recordar'}
                  type="date"
                  fullWidth
                  value={reminderDateFrom}
                  onChange={(e) => {
                    const v = e.target.value;
                    setReminderDateFrom(v);
                    if (!reminderRangeMode) setReminderDateTo(v);
                  }}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: <EventNote sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              {reminderRangeMode && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Hasta"
                    type="date"
                    fullWidth
                    value={reminderDateTo}
                    onChange={(e) => setReminderDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: <EventNote sx={{ mr: 1, color: 'action.active' }} />,
                    }}
                  />
                </Grid>
              )}
            </Grid>
            <TextField
              label="Asunto del correo"
              fullWidth
              value={reminderSubject}
              onChange={(e) => setReminderSubject(e.target.value)}
              placeholder="Podés usar {{fecha_desde}} y {{fecha_hasta}}"
              inputProps={{ spellCheck: false }}
            />
            <TextField
              label="Cuerpo del mensaje"
              fullWidth
              multiline
              minRows={4}
              value={reminderBody}
              onChange={(e) => setReminderBody(e.target.value)}
              placeholder="Podés usar {{nombre}}, {{fecha}}, {{fecha_desde}} y {{fecha_hasta}}"
              helperText="{{nombre}}, {{fecha}}, {{fecha_desde}} y {{fecha_hasta}} se reemplazan por cada destinatario."
              inputProps={{ spellCheck: false }}
            />
            
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
          sx={{color: "#2A4DB8"} } 
          variant="outlined"
          onClick={() => setReminderModalOpen(false)} disabled={sendingReminder}>Cancelar</Button>
          <Button 
          
          sx={{color: "#ffffff",bgcolor: "#173487", '&:hover': { bgcolor: '#2A4DB8' } }}
          variant="contained" startIcon={<EmailIcon />} onClick={handleSendAttendanceReminder} disabled={sendingReminder || selectedUsersReminder.length === 0}>
            {sendingReminder ? 'Enviando...' : 'Enviar recordatorio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>


{/* Diálogo para eliminar registro de asistencia */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        {rowToDelete && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: '#173487',
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 18,
                  }}
                >
                  {rowToDelete.nombre?.[0]?.toUpperCase() || ''}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Eliminar registro de asistencia
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {rowToDelete.nombre} {rowToDelete.apellido}
                  </Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 2 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Detalle del registro
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Día:{' '}
                    <strong>{formatDate(rowToDelete.fecha)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Estado:{' '}
                    <strong>{(rowToDelete.estado || 'N/A').toUpperCase()}</strong>
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    ¿Estás seguro de que querés eliminar este registro de
                    asistencia? Esta acción no se puede deshacer.
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button 
              sx={{color: "#2A4DB8"} }
              variant="outlined"
              onClick={handleCancelDelete} disabled={deleting}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                variant="contained"
                color="error"
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
}
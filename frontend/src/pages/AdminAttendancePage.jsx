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
import Swal from 'sweetalert2';

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
  const [queryOptions, setQueryOptions] = useState({});
  const [filters, setFilters] = useState({ q: '', dateFrom: '', dateTo: '' });
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

  const handleDelete = (id) => {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: "¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          await deleteAttendanceApi(id);
          return true;
        } catch (error) {
          Swal.showValidationMessage(`Error: ${error.message || 'No se pudo eliminar'}`);
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        fetchData();
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El registro ha sido eliminado.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    });
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
            <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: 'primary.light' }}>
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
          <Tooltip title="Ver"><IconButton size="small" color="primary" onClick={() => handleOpenModal(params.row, 'view')}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Corregir"><IconButton size="small" color="warning" onClick={() => handleOpenModal(params.row, 'apply')}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(params.row._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
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
              sx={{ bgcolor: "theme.pallete.primary.main", '&:hover': { bgcolor: 'theme.pallete.primary.dark' } }}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<EmailIcon />}
              onClick={handleOpenReminderModal}
              sx={{ bgcolor: "theme.pallete.primary.main", '&:hover': { bgcolor: 'theme.pallete.primary.dark' } }}
            >
              Enviar Recordatorio
            </Button>
           
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              
              onClick={() => setCreateModalOpen(true)}
              sx={{ bgcolor: "theme.pallete.primary.main", '&:hover': { bgcolor: 'theme.pallete.primary.dark' } }}
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
            />
            <TextField
              label="Desde" type="date" size="small"
              value={filters.dateFrom}
              onChange={(e) => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
              onKeyDown={handleKeyDown}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hasta" type="date" size="small"
              value={filters.dateTo}
              onChange={(e) => setFilters(p => ({ ...p, dateTo: e.target.value }))}
              onKeyDown={handleKeyDown}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" onClick={handleFilterSubmit}>BUSCAR</Button>
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

      <ViewAttendanceModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} employee={selectedEmployee} />
      <EditAttendanceModal open={applyModalOpen} onClose={() => setApplyModalOpen(false)} employee={selectedEmployee} onApplied={fetchData} />
      <CreateAttendanceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={fetchData}
        showNotification={(msg, severity = 'success') => setSnackbar({ open: true, message: msg, severity })}
      />

      <Dialog open={reminderModalOpen} onClose={() => !sendingReminder && setReminderModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enviar recordatorio de asistencia</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
          <Button onClick={() => setReminderModalOpen(false)} disabled={sendingReminder}>Cancelar</Button>
          <Button variant="contained" startIcon={<EmailIcon />} onClick={handleSendAttendanceReminder} disabled={sendingReminder || selectedUsersReminder.length === 0}>
            {sendingReminder ? 'Enviando...' : 'Enviar recordatorio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
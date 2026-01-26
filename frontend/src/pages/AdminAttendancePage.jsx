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
  Modal,
  Grid,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper
} from '@mui/material';

// --- ICONOS ---
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MessageIcon from '@mui/icons-material/Message';
import EventIcon from '@mui/icons-material/Event';

import dayjs from 'dayjs';
import 'dayjs/locale/es';

import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { getAllAttendanceApi, deleteAttendanceApi, createAttendanceApi, updateAttendanceApi } from '../api/adminAttendanceApi';
import Swal from 'sweetalert2';

// Configuración global de Dayjs
dayjs.locale('es');

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 900,
  maxWidth: '95vw',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  maxHeight: '90vh',
  overflowY: 'auto'
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).format('DD/MM/YYYY');
};

const formatTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  return dayjs(dateStr).utc().format('HH:mm');
};

// --- Componentes Modales ---

function ViewModal({ open, onClose, employee }) {
  const [asistencias, setAsistencias] = useState({});
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  useEffect(() => {
    const userId = employee?.usuario?._id || employee?.usuario;
    if (open && userId) {
      const fetchUserAttendance = async (date) => {
        const dateFrom = date.startOf('month').format('YYYY-MM-DD');
        const dateTo = date.endOf('month').format('YYYY-MM-DD');
        const { data } = await getAllAttendanceApi({ usuarioId: userId, page: 1, limit: 100, dateFrom, dateTo });
        const mapped = (data.items || []).reduce((acc, rec) => {
          const dateKey = dayjs(rec.fecha).format('YYYY-MM-DD');
          acc[dateKey] = rec.estado;
          return acc;
        }, {});
        setAsistencias(mapped);
      };
      fetchUserAttendance(currentMonth);
    }
  }, [open, employee, currentMonth]);

  if (!employee) return null;

  const CustomDay = (props) => {
    const { day, ...other } = props;
    const dateStr = day.format('YYYY-MM-DD');
    const estado = asistencias[dateStr];
    
    let backgroundColor = 'transparent';
    let textColor = 'inherit';

    if (estado) {
      if (estado === 'presente') {
          backgroundColor = '#2e7d32'; 
          textColor = 'white';
      } else if (estado === 'ausente') {
          backgroundColor = '#d32f2f'; 
          textColor = 'white';
      } else {
          backgroundColor = '#ed6c02';
          textColor = 'white';
      }
    }

    return (
      <PickersDay
        {...other}
        day={day}
        sx={{
          backgroundColor,
          color: textColor,
          '&:hover': { backgroundColor },
        }}
      />
    );
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                {employee.nombre ? employee.nombre[0] : 'U'}
            </Avatar>
            <Box>
                <Typography variant="h5" fontWeight="bold">
                    {employee.nombre} {employee.apellido}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Historial de Asistencias
                </Typography>
            </Box>
        </Stack>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
                <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <EventIcon color="action" />
                        <Typography variant="subtitle1" fontWeight="bold">Vista Calendario</Typography>
                    </Stack>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DateCalendar
                        slots={{ day: CustomDay }}
                        readOnly
                        onMonthChange={(newMonth) => setCurrentMonth(newMonth)}
                    />
                    </LocalizationProvider>
                </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Últimos registros</Typography>
                    <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {Object.entries(asistencias).map(([fecha, estado]) => (
                        <ListItem key={fecha} divider>
                        <ListItemText
                            primary={dayjs(fecha).format('dddd, DD [de] MMMM')}
                            secondary={
                                <Chip 
                                    label={estado} 
                                    size="small" 
                                    color={estado === 'presente' ? 'success' : 'error'} 
                                    sx={{ mt: 0.5 }}
                                />
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                        />
                        </ListItem>
                    ))}
                    </List>
                </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}

function MessageModal({ open, onClose, employee, onSent }) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    console.log(`Enviando notificación a ${employee.nombre}: ${message}`);
    setMessage('');
    onClose();
    onSent();
  };

  if (!employee) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ ...modalStyle, width: 500 }}>
        <Typography variant="h6" gutterBottom>Enviar Notificación</Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
            Empleado: {employee.nombre} {employee.apellido}
        </Typography>
        <TextField
          fullWidth multiline rows={4}
          label="Mensaje"
          placeholder="Escribe el motivo..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ mb: 3 }}
        />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
             <Button onClick={onClose} color="inherit">Cancelar</Button>
             <Button variant="contained" endIcon={<MessageIcon />} onClick={handleSend}>Enviar</Button>
        </Stack>
      </Box>
    </Modal>
  );
}

function ApplyAttendanceModal({ open, onClose, employee, onApplied }) {
  const [fecha, setFecha] = useState(dayjs().format('YYYY-MM-DD'));
  const [estado, setEstado] = useState('presente');

  const handleApply = async () => {
    const userId = employee?.usuario?._id || employee?.usuario;
    try {
      if (estado === 'quitar') {
        // 1. Buscar si existe un registro ese día para el usuario
        const { data } = await getAllAttendanceApi({ 
            usuarioId: userId, 
            dateFrom: fecha, 
            dateTo: fecha 
        });
        // 2. Si existe, eliminarlo
        if (data.items && data.items.length > 0) {
            await deleteAttendanceApi(data.items[0]._id);
        }
      } else {
        await createAttendanceApi({ usuario: userId, fecha, estado });
      }
      onApplied();
      onClose();
    } catch (error) {
      console.error("Error al aplicar asistencia:", error);
      alert(error.response?.data?.message || "No se pudo aplicar la asistencia.");
    }
  };

  if (!employee) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{ ...modalStyle, width: 400 }}>
        <Typography variant="h6" gutterBottom>Corrección Manual</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
            Empleado: {employee.nombre} {employee.apellido}
        </Typography>
        <Stack spacing={3} mt={2}>
            <TextField
                fullWidth type="date" label="Fecha"
                value={fecha} onChange={(e) => setFecha(e.target.value)}
                InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
            <InputLabel>Nuevo Estado</InputLabel>
            <Select value={estado} label="Nuevo Estado" onChange={(e) => setEstado(e.target.value)}>
                <MenuItem value="presente">Presente</MenuItem>
                <MenuItem value="ausente">Ausente</MenuItem>
                <MenuItem value="no-aplica">No Aplica</MenuItem>
                <MenuItem value="quitar" sx={{ color: 'error.main', borderTop: '1px solid #e0e0e0' }}>
                  Quitar Asistencia (Limpiar día)
                </MenuItem>
            </Select>
            </FormControl>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button variant="contained" color="warning" onClick={handleApply}>Guardar</Button>
            </Stack>
        </Stack>
      </Box>
    </Modal>
  );
}

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
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);

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
    if (type === 'message') setMessageModalOpen(true);
    if (type === 'apply') setApplyModalOpen(true);
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
          <Tooltip title="Mensaje"><IconButton size="small" color="info" onClick={() => handleOpenModal(params.row, 'message')}><MessageIcon fontSize="small" /></IconButton></Tooltip>
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
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>Actualizar</Button>
      </Stack>

      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">FILTROS</Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Buscar..." size="small" value={filters.q} onChange={(e) => setFilters(p => ({ ...p, q: e.target.value }))} fullWidth />
            <TextField
              label="Desde" type="date" size="small"
              value={filters.dateFrom}
              onChange={(e) => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hasta" type="date" size="small"
              value={filters.dateTo}
              onChange={(e) => setFilters(p => ({ ...p, dateTo: e.target.value }))}
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

      <ViewModal open={viewModalOpen} onClose={() => setViewModalOpen(false)} employee={selectedEmployee} />
      <MessageModal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} employee={selectedEmployee} />
      <ApplyAttendanceModal open={applyModalOpen} onClose={() => setApplyModalOpen(false)} employee={selectedEmployee} onApplied={fetchData} />
    </Container>
  );
}
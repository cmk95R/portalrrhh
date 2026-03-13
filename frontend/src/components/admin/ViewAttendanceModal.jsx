import React, { useState, useEffect } from 'react';
import {
  Box, Modal, Stack, Avatar, Typography, Grid, Card, CardContent,
  List, ListItem, ListItemText, Chip, IconButton, Divider, useTheme
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { getAllAttendanceApi } from '../../api/adminAttendanceApi';

dayjs.locale('es');

const capitalizeFirst = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : str);
const formatTime = (dateStr) => (dateStr ? dayjs(dateStr).utc().format('HH:mm') : '—');
const getDisplayNote = (nota) => {
  if (!nota) return '';
  if (nota.startsWith('Solicitud aprobada')) {
    const parts = nota.split(':');
    const comentario = parts.slice(1).join(':').trim();
    if (comentario) {
      return `Solicitud aprobada: ${comentario}`;
    }
    return 'Solicitud aprobada';
  }
  return nota;
};

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 750,
  maxWidth: '95vw',
  bgcolor: 'background.paper',
  boxShadow: 24,
  borderRadius: 2,
  maxHeight: '90vh',
  overflowY: 'auto',
  outline: 'none',
  
};

export default function ViewAttendanceModal({ open, onClose, employee, initialDate }) {
  const theme = useTheme();
  const [asistencias, setAsistencias] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const userId = employee?.usuario?._id || employee?.usuario;
    if (open && userId) {
      setLoading(true);
      const fetchUserAttendance = async (date) => {
        const dateFrom = date.startOf('month').format('YYYY-MM-DD');
        const dateTo = date.endOf('month').format('YYYY-MM-DD');
        try {
          const { data } = await getAllAttendanceApi({ usuarioId: userId, page: 1, limit: 100, dateFrom, dateTo });
          const mapped = (data.items || []).reduce((acc, rec) => {
            const dateKey = dayjs(rec.fecha).format('YYYY-MM-DD');
            acc[dateKey] = rec;
            return acc;
          }, {});
          setAsistencias(mapped);
        } catch (error) {
          console.error("Error fetching attendance:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchUserAttendance(currentMonth);
    }
  }, [open, employee, currentMonth]);

  useEffect(() => {
    if (open && initialDate) {
      const d = dayjs(initialDate);
      setCurrentMonth(d);
      setSelectedDate(d);
    }
    if (!open) {
      setSelectedDate(null);
    }
  }, [open, initialDate]);

  if (!employee) return null;

  const CustomDay = (props) => {
    const { day, ...other } = props;
    const dateStr = day.format('YYYY-MM-DD');
    const record = asistencias[dateStr];
    const estado = record?.estado;

    let bg = 'transparent';
    let color = 'inherit';
    if (estado === 'presente') {
      bg = theme.palette.success.main;
      color = theme.palette.success.contrastText;
    } else if (estado === 'ausente') {
      bg = theme.palette.error.main;
      color = theme.palette.error.contrastText;
    } else if (estado) {
      bg = theme.palette.warning.main;
      color = theme.palette.warning.contrastText;
    }

    return (
      <PickersDay
        {...other}
        day={day}
        sx={{
          backgroundColor: bg,
          color,
          fontWeight: estado ? 600 : 400,
          '&:hover': { backgroundColor: bg, opacity: 0.9 },
          '&.Mui-selected': { border: `2px solid ${theme.palette.primary.main}` },
        }}
      />
    );
  };

  const selectedRecord = selectedDate ? asistencias[selectedDate.format('YYYY-MM-DD')] : null;
  const sortedEntries = Object.entries(asistencias).sort(([a], [b]) => dayjs(b).valueOf() - dayjs(a).valueOf());
  const hasRecords = sortedEntries.length > 0;

  return (
    <Modal open={open} onClose={onClose} >
      <Box sx={modalStyle} >
        {/* Header con cierre */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, pt: 3, pb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                bgcolor: '#173487',
                width: 52,
                height: 52,
                fontSize: '1.25rem',
                fontWeight: 'bold',
              }}
            >
              {employee.nombre ? employee.nombre[0].toUpperCase() : 'U'}
            </Avatar>
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1 }}
              >
                Historial de asistencias
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {employee.nombre} {employee.apellido}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentMonth.format('MMMM YYYY').toUpperCase()}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="medium" sx={{ color: 'text.secondary' }} aria-label="Cerrar">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider sx={{ mx: 3 }} />

        <Box sx={{ p: 3 }}>
          <Grid container spacing={3} justifyContent="center" alignItems="center">
            {/* Calendario */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ overflow: 'visible' }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <EventIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                      Calendario
                    </Typography>
                  </Stack>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DateCalendar
                      value={selectedDate}
                      onChange={setSelectedDate}
                      slots={{ day: CustomDay }}
                      onMonthChange={setCurrentMonth}
                      sx={{
                        width: '100%',
                        maxWidth: 360,
                        '& .MuiPickersCalendarHeader-label': { textTransform: 'capitalize' },
                      }}
                    />
                  </LocalizationProvider>
                </CardContent>
              </Card>
            </Grid>

            {/* Lista de registros */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ height: '100%', minHeight: 340 }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Registros del mes
                  </Typography>
                  {loading ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                      Cargando…
                    </Typography>
                  ) : !hasRecords ? (
                    <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                      <EventIcon sx={{ fontSize: 48, opacity: 0.4, mb: 1 }} />
                      <Typography variant="body2">No hay registros en este mes.</Typography>
                    </Box>
                  ) : (
                    <List dense sx={{ flex: 1, maxHeight: 320, overflow: 'auto', py: 0 }}>
                      {sortedEntries.map(([fecha, record]) => {
                        const isSelected = selectedDate && selectedDate.format('YYYY-MM-DD') === fecha;
                        return (
                          <ListItem
                            key={fecha}
                            divider
                            onClick={() => setSelectedDate(dayjs(fecha))}
                            selected={isSelected}
                            sx={{
                              cursor: 'pointer',
                              borderRadius: 1,
                              mx: -1,
                              px: 1.5,
                              '&.Mui-selected': { bgcolor: 'action.selected' },
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                                  {capitalizeFirst(dayjs(fecha).format('dddd'))}, {dayjs(fecha).format('DD')} de {capitalizeFirst(dayjs(fecha).format('MMMM'))}
                                </Typography>
                              }
                              secondary={
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                                  {record.estado === 'presente' ? (
                                    <CheckCircleIcon color="success" fontSize="small" />
                                  ) : (
                                    <CancelIcon color="error" fontSize="small" />
                                  )}
                                  <Chip
                                    label={record.estado === 'presente' ? 'Presente' : 'Ausente'}
                                    size="small"
                                    color={record.estado === 'presente' ? 'success' : 'error'}
                                    variant="outlined"
                                  />
                                </Stack>
                              }
                              secondaryTypographyProps={{ component: 'div' }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detalle del día seleccionado */}
          <Card variant="outlined" sx={{ mt: 3, bgcolor: 'grey.50' }}>
            <CardContent>
              {selectedDate ? (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {capitalizeFirst(selectedDate.format('dddd'))} {selectedDate.format('DD')} de {capitalizeFirst(selectedDate.format('MMMM'))}
                  </Typography>
                  {selectedRecord ? (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 4 }}>
                        <Typography variant="caption" color="text.secondary" display="block">Estado</Typography>
                        <Chip
                          icon={selectedRecord.estado === 'presente' ? <CheckCircleIcon /> : <CancelIcon />}
                          label={selectedRecord.estado === 'presente' ? 'Presente' : 'Ausente'}
                          color={selectedRecord.estado === 'presente' ? 'success' : 'error'}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Grid>
                      {(selectedRecord.horaEntrada || selectedRecord.horaSalida) && (
                        <>
                          <Grid item xs={6} sm={4}>
                            <Typography variant="caption" color="text.secondary" display="block">Entrada</Typography>
                            <Typography variant="body2">{formatTime(selectedRecord.horaEntrada)}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={4}>
                            <Typography variant="caption" color="text.secondary" display="block">Salida</Typography>
                            <Typography variant="body2">{formatTime(selectedRecord.horaSalida)}</Typography>
                          </Grid>
                        </>
                      )}
                      {selectedRecord.motivo && (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Motivo de ausencia</Typography>
                          <Typography variant="body2">{selectedRecord.motivo}</Typography>
                        </Grid>
                      )}
                      {selectedRecord.nota && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="caption" color="text.secondary" display="block">Nota</Typography>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'background.paper', p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            {getDisplayNote(selectedRecord.nota)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay registro de asistencia para este día.
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Seleccioná un día en el calendario o en la lista para ver el detalle.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Modal>
  );
}
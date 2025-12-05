import React, { useState, useEffect, useCallback } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { 
  Box, Button, Typography, List, ListItem, ListItemText, Paper, 
  Snackbar, Alert, Tooltip, Grid, Divider, Stack, Chip, useTheme, useMediaQuery 
} from '@mui/material';
import { CheckCircle, Cancel, EventNote, Today } from '@mui/icons-material';

// --- Importaciones de API ---
import { setDailyAttendanceApi, getMyMonthlyAttendanceApi } from '../api/attendanceApi';
import { getHolidaysApi } from '../api/apiCalendar';

dayjs.locale('es');

const AttendanceCalendar = () => {
  const theme = useTheme();
  // Detectar si es móvil para ajustar tamaños
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // --- Estados ---
  const [attendances, setAttendances] = useState({});
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [currentMonthView, setCurrentMonthView] = useState(dayjs());
  const [holidays, setHolidays] = useState({});

  // --- Fetch Data ---
  const fetchMonthlyData = useCallback(async (date) => {
    setLoading(true);
    try {
      const year = date.year();
      const month = date.month() + 1;
      const [{ data }, { data: holidaysData }] = await Promise.all([
        getMyMonthlyAttendanceApi({ year, month }),
        getHolidaysApi(year)
      ]);

      const newAttendances = (data || []).reduce((acc, record) => {
        acc[record.fecha] = record.estado;
        return acc;
      }, {});
      setAttendances(newAttendances);

      const holidaysMap = (holidaysData || []).reduce((acc, holiday) => {
        acc[holiday.date] = holiday.name;
        return acc;
      }, {});
      setHolidays(holidaysMap);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      setSnack({ open: true, msg: 'No se pudieron cargar los datos.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthlyData(currentMonthView);
  }, [currentMonthView, fetchMonthlyData]);

  // --- Lógica de Negocio ---
  const markAttendance = async (date, present) => {
    const dateKey = date.format('YYYY-MM-DD');
    const estado = present ? 'presente' : 'ausente';
    setLoading(true);
    try {
      await setDailyAttendanceApi({ fecha: dateKey, estado: estado });
      setAttendances((prev) => ({ ...prev, [dateKey]: estado }));
      setSnack({ open: true, msg: `Asistencia marcada como ${estado}`, severity: 'success' });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al marcar asistencia.';
      setSnack({ open: true, msg: errorMsg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const markWeekAttendances = async () => {
    setLoading(true);
    try {
      const startOfWeek = selectedDate.startOf('week');
      const weekDates = [];
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const date = startOfWeek.add(i, 'day');
        const dateKey = date.format('YYYY-MM-DD');
        weekDates.push(dateKey);
        promises.push(setDailyAttendanceApi({ fecha: dateKey, estado: 'presente' }));
      }
      await Promise.all(promises);
      setAttendances(prev => {
        const newAttendances = { ...prev };
        weekDates.forEach(dateKey => { newAttendances[dateKey] = 'presente'; });
        return newAttendances;
      });
      setSnack({ open: true, msg: 'Semana completa marcada.', severity: 'success' });
    } catch (error) {
      setSnack({ open: true, msg: 'Error al marcar la semana.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers de Renderizado ---
  const isHoliday = (date) => holidays[date.format('YYYY-MM-DD')];
  const isDateHighlighted = (date) => attendances[date.format('YYYY-MM-DD')];
  const isWeekday = (date) => date.day() >= 1 && date.day() <= 5;

  const CustomDay = (props) => {
    const { day, selected, ...other } = props;
    const holidayName = isHoliday(day);
    const status = isDateHighlighted(day);

    if (holidayName) {
      return (
        <Tooltip title={holidayName} arrow>
          <PickersDay {...other} day={day} disabled 
            sx={{ backgroundColor: '#ff980030', color: 'warning.main', border: '1px solid #ff9800' }} 
          />
        </Tooltip>
      );
    }

    let bg = 'transparent';
    let color = 'inherit';
    let hoverBg = 'action.hover';

    if (status === 'presente') {
      bg = 'success.light'; color = 'success.contrastText'; hoverBg = 'success.main';
    } else if (status === 'ausente') {
      bg = 'error.light'; color = 'error.contrastText'; hoverBg = 'error.main';
    }

    return (
      <PickersDay {...other} day={day} selected={selected}
        sx={{
          backgroundColor: bg, color: color,
          '&:hover': { backgroundColor: hoverBg },
          ...(selected && { border: `2px solid ${theme.palette.primary.main}` })
        }}
      />
    );
  };

  const holidaysOfMonth = Object.entries(holidays)
    .filter(([date]) => dayjs(date).isSame(currentMonthView, 'month'))
    .sort(([a], [b]) => dayjs(a).date() - dayjs(b).date());

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        
        {/* Encabezado */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
           <EventNote color="primary" fontSize="large" />
           <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold">
             Control de Asistencias
           </Typography>
        </Box>

        <Grid container spacing={3}>
          
          {/* === COLUMNA IZQUIERDA: Calendario y Controles === */}
          <Grid item xs={12} md={7} lg={8}>
            <Stack spacing={3}>
              
              {/* Calendario */}
              <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <DateCalendar
                  value={selectedDate}
                  onChange={setSelectedDate}
                  onMonthChange={setCurrentMonthView}
                  shouldDisableDate={(date) => !isWeekday(date) || isHoliday(date)}
                  slots={{ day: CustomDay }}
                  sx={{ width: '100%', maxWidth: 400 }} // Evita que se deforme en pantallas grandes
                />
              </Paper>

              {/* Controles de Acción */}
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                  <Today /> {selectedDate.format('dddd, DD [de] MMMM')}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* Botones Responsivos */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button 
                    variant="contained" 
                    color="success" 
                    fullWidth 
                    startIcon={<CheckCircle />} 
                    disabled={loading} 
                    onClick={() => markAttendance(selectedDate, true)}
                  >
                    Presente
                  </Button>
                  <Button 
                    variant="contained" 
                    color="error" 
                    fullWidth 
                    startIcon={<Cancel />} 
                    disabled={loading} 
                    onClick={() => markAttendance(selectedDate, false)}
                  >
                    Ausente
                  </Button>
                </Stack>
                
                <Button 
                  variant="outlined" 
                  fullWidth 
                  sx={{ mt: 2 }} 
                  disabled={loading} 
                  onClick={markWeekAttendances}
                >
                  Marcar Semana Completa
                </Button>
              </Paper>
            </Stack>
          </Grid>

          {/* === COLUMNA DERECHA: Listados e Información === */}
          <Grid item xs={12} md={5} lg={4}>
            <Stack spacing={3}>
              
              {/* Estado del Mes */}
              <Paper elevation={2} sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom stickyHeader>
                  Resumen Mensual
                </Typography>
                <Divider />
                <List dense>
                  {Object.entries(attendances).length > 0 ? (
                    Object.entries(attendances)
                    .sort(([a], [b]) => dayjs(b).diff(dayjs(a))) // Ordenar descendente
                    .map(([date, status]) => (
                      <ListItem key={date} divider>
                        <ListItemText 
                          primary={dayjs(date).format('dddd DD')} 
                          secondary={dayjs(date).format('MMMM YYYY')} 
                        />
                        <Chip 
                          label={status.toUpperCase()} 
                          color={status === 'presente' ? 'success' : 'error'} 
                          size="small" 
                          variant="outlined"
                        />
                      </ListItem>
                    ))
                  ) : (
                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                      No hay registros este mes
                    </Box>
                  )}
                </List>
              </Paper>

              {/* Feriados */}
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ color: 'warning.dark' }}>
                  Feriados del Mes
                </Typography>
                <Divider sx={{ mb: 1 }} />
                <List dense>
                  {holidaysOfMonth.length > 0 ? (
                    holidaysOfMonth.map(([date, name]) => (
                      <ListItem key={date}>
                        <ListItemText 
                          primary={name} 
                          secondary={dayjs(date).format('dddd DD')} 
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                      </ListItem>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                      No hay feriados este mes.
                    </Typography>
                  )}
                </List>
              </Paper>

            </Stack>
          </Grid>

        </Grid>

        {/* Snackbar */}
        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnack(prev => ({ ...prev, open: false }))} severity={snack.severity} sx={{ width: '100%' }}>
            {snack.msg}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
};

export default AttendanceCalendar;
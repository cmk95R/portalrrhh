import React, { useState, useEffect, useCallback } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Box, Button, Typography, List, ListItem, ListItemText, Paper,
  Snackbar, Alert, Tooltip, Grid, Divider, Stack, Chip, useTheme, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem
} from '@mui/material';
import { CheckCircle, Cancel, EventNote, Today } from '@mui/icons-material';

// --- Importaciones de API ---
import { setDailyAttendanceApi, getMyMonthlyAttendanceApi } from '../api/attendanceApi';
import { getHolidaysApi } from '../api/apiCalendar';

dayjs.locale('es');

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

  // --- Estados para el Diálogo de Ausencia ---
  const [openAbsenceDialog, setOpenAbsenceDialog] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceNote, setAbsenceNote] = useState('');

  // --- Estados para Trabajo en Feriado/Fin de Semana ---
  const [openExtraDialog, setOpenExtraDialog] = useState(false);
  const [extraData, setExtraData] = useState({
    horasExtras: '',
    guardia: 'ninguna',
    horasFinDeSemana: ''
  });

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
  const executeMarkPresent = async (date, extraFields = {}) => {
    const dateKey = date.format('YYYY-MM-DD');
    setLoading(true);
    try {
      await setDailyAttendanceApi({ 
        fecha: dateKey, 
        estado: 'presente',
        ...extraFields
      });
      setAttendances((prev) => ({ ...prev, [dateKey]: 'presente' }));
      setSnack({ open: true, msg: 'Asistencia marcada como presente', severity: 'success' });
      setOpenExtraDialog(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al marcar asistencia.';
      setSnack({ open: true, msg: errorMsg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const markPresent = (date) => {
    const isWeekend = date.day() === 0 || date.day() === 6;
    const isHol = !!isHoliday(date);

    if (isWeekend || isHol) {
      setExtraData({ horasExtras: '', guardia: 'ninguna', horasFinDeSemana: '' });
      setOpenExtraDialog(true);
    } else {
      executeMarkPresent(date);
    }
  };

  const submitExtraWork = () => {
    const payload = {
      horasExtras: Number(extraData.horasExtras) || 0,
      horasFinDeSemana: Number(extraData.horasFinDeSemana) || 0,
      guardia: extraData.guardia
    };
    executeMarkPresent(selectedDate, payload);
  };

  const handleAbsentClick = () => {
    setAbsenceReason('');
    setAbsenceNote('');
    setOpenAbsenceDialog(true);
  };

  const submitAbsence = async () => {
    const dateKey = selectedDate.format('YYYY-MM-DD');
    setLoading(true);
    try {
      await setDailyAttendanceApi({
        fecha: dateKey,
        estado: 'ausente',
        motivo: absenceReason || 'Sin especificar',
        nota: absenceNote
      });
      setAttendances((prev) => ({ ...prev, [dateKey]: 'ausente' }));
      setSnack({ open: true, msg: 'Ausencia registrada correctamente', severity: 'success' });
      setOpenAbsenceDialog(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al registrar ausencia.';
      setSnack({ open: true, msg: errorMsg, severity: 'error' });
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
          <PickersDay {...other} day={day}
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
                  // shouldDisableDate eliminado para permitir selección
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
                    onClick={() => markPresent(selectedDate)}
                  >
                    Presente
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    startIcon={<Cancel />}
                    disabled={loading}
                    onClick={handleAbsentClick}
                  >
                    Ausente
                  </Button>

                </Stack>



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

        {/* Diálogo para Justificar Ausencia */}
        <Dialog open={openAbsenceDialog} onClose={() => setOpenAbsenceDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Registrar Ausencia</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Fecha: {selectedDate.format('DD/MM/YYYY')}
              </Typography>

              <TextField
                select
                label="Motivo de ausencia"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                fullWidth
              >
                {absenceTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Nota / Observación (Opcional)"
                value={absenceNote}
                onChange={(e) => setAbsenceNote(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAbsenceDialog(false)} color="inherit">Cancelar</Button>
            <Button onClick={submitAbsence} variant="contained" color="error">Confirmar Ausencia</Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo para Trabajo en Feriado/Fin de Semana */}
        <Dialog open={openExtraDialog} onClose={() => setOpenExtraDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Registro de Horas </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Estás registrando asistencia en un día no laborable ({selectedDate.format('DD/MM/YYYY')}).
                Por favor, especifica los detalles:
              </Typography>

              <TextField
                label="Horas Extras"
                type="number"
                value={extraData.horasExtras}
                onChange={(e) => setExtraData({ ...extraData, horasExtras: e.target.value })}
                fullWidth
              />

              <TextField
                label="Horas Fin de Semana"
                type="number"
                value={extraData.horasFinDeSemana}
                onChange={(e) => setExtraData({ ...extraData, horasFinDeSemana: e.target.value })}
                fullWidth
              />

              <TextField
                select
                label="Guardia"
                value={extraData.guardia}
                onChange={(e) => setExtraData({ ...extraData, guardia: e.target.value })}
                fullWidth
              >
                <MenuItem value="ninguna">Ninguna</MenuItem>
                <MenuItem value="pasiva">Pasiva</MenuItem>
                <MenuItem value="activa">Activa</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenExtraDialog(false)} color="inherit">Cancelar</Button>
            <Button onClick={submitExtraWork} variant="contained" color="success">Confirmar</Button>
          </DialogActions>
        </Dialog>

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
import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';

import dayjs from 'dayjs';
import 'dayjs/locale/es'; // 1. Importar el locale de español para dayjs
dayjs.locale('es'); // 2. Establecer el idioma globalmente para dayjs

import { Box, Button, Typography, List, ListItem, ListItemText, Paper, Snackbar, Alert, Tooltip, Grid, Divider } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
// --- 1. Importar la API y hooks necesarios ---
import { setDailyAttendanceApi, getMyMonthlyAttendanceApi } from '../api/attendanceApi'; // Asegúrate que esta API exista
import { getHolidaysApi } from '../api/apiCalendar'; // <-- 1. Importar la API de feriados
import { useEffect, useCallback } from 'react';


const AttendanceCalendar = () => {
  // Estado para las asistencias: objeto con claves de fecha (formato 'YYYY-MM-DD') y valores booleanos (true = presente)
  const [attendances, setAttendances] = useState({});
  // Fecha seleccionada en el calendario
  const [selectedDate, setSelectedDate] = useState(dayjs());
  // --- 2. Estados para feedback y carga ---
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  // --- 3. Estado para la vista del mes actual ---
  const [currentMonthView, setCurrentMonthView] = useState(dayjs());
  // --- Nuevo estado para los feriados ---
  const [holidays, setHolidays] = useState({});

  // --- 4. Función para cargar asistencias del mes ---
  const fetchMonthlyData = useCallback(async (date) => {
    setLoading(true);
    try {
      const year = date.year();
      const month = date.month() + 1; // dayjs month es 0-11, la API espera 1-12
      const [{ data }, { data: holidaysData }] = await Promise.all([
        getMyMonthlyAttendanceApi({ year, month }),
        getHolidaysApi(year) // <-- 2. Llamar a la API de feriados en paralelo
      ]);

      // Convertimos el array de la API a un objeto para el estado local
      const newAttendances = (data || []).reduce((acc, record) => {
        const dateKey = record.fecha; // El backend ahora devuelve 'fecha' en formato YYYY-MM-DD
        acc[dateKey] = record.estado; // CORRECCIÓN: El campo en el modelo es 'estado'
        return acc;
      }, {});

      setAttendances(newAttendances);

      // Convertimos los feriados a un mapa para fácil acceso
      const holidaysMap = (holidaysData || []).reduce((acc, holiday) => {
        acc[holiday.date] = holiday.name; // 'YYYY-MM-DD': 'Nombre del feriado'
        return acc;
      }, {});
      setHolidays(holidaysMap);
    } catch (error) {
      console.error("Error al cargar asistencias del mes:", error);
      setSnack({ open: true, msg: 'No se pudieron cargar las asistencias.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setAttendances, setHolidays, setLoading, setSnack]); // <-- CORRECCIÓN: Añadir dependencias

  // --- 5. useEffect para cargar datos al cambiar de mes ---
  useEffect(() => {
    fetchMonthlyData(currentMonthView);
  }, [currentMonthView, fetchMonthlyData]);

  // Función para marcar asistencia de una fecha específica
  const markAttendance = async (date, present) => {
    const dateKey = date.format('YYYY-MM-DD');
    const estado = present ? 'presente' : 'ausente';

    setLoading(true);
    try {
      await setDailyAttendanceApi({ fecha: dateKey, estado: estado }); // <-- CORRECCIÓN: Usamos 'fecha' y 'estado'
      setAttendances((prev) => ({
        ...prev,
        [dateKey]: estado, // CORRECCIÓN: Usar la variable 'estado'
      }));
      setSnack({ open: true, msg: `Asistencia marcada como ${estado}`, severity: 'success' }); // CORRECCIÓN: Usar la variable 'estado'
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'No se pudo marcar la asistencia.';
      setSnack({ open: true, msg: errorMsg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Función para marcar asistencias de lunes a viernes de la semana de la fecha seleccionada
  const markWeekAttendances = async () => {
    setLoading(true);
    try {
      const startOfWeek = selectedDate.startOf('week'); // Con locale 'es', esto ya es Lunes
      const weekDates = [];
      const promises = [];

      // 1. Preparamos todas las llamadas a la API
      for (let i = 0; i < 5; i++) { // Lunes a viernes
        const date = startOfWeek.add(i, 'day');
        const dateKey = date.format('YYYY-MM-DD');
        weekDates.push(dateKey);
        promises.push(setDailyAttendanceApi({ fecha: dateKey, estado: 'presente' })); // <-- CORRECCIÓN
      }

      // 2. Ejecutamos todas las promesas en paralelo
      await Promise.all(promises);

      // 3. Si todo fue exitoso, actualizamos el estado local de una vez
      setAttendances(prev => {
        const newAttendances = { ...prev };
        weekDates.forEach(dateKey => { newAttendances[dateKey] = 'presente'; });
        return newAttendances;
      });

      setSnack({ open: true, msg: 'Semana marcada como presente con éxito.', severity: 'success' });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al marcar la semana.';
      setSnack({ open: true, msg: errorMsg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Función para determinar si una fecha debe resaltarse (tiene asistencia)
  const isDateHighlighted = (date) => {
    const dateKey = date.format('YYYY-MM-DD');
    return attendances[dateKey];
  };

  // Función para determinar si una fecha es lunes a viernes (para resaltar en el calendario)
  const isWeekday = (date) => {
    const day = date.day(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    return day >= 1 && day <= 5; // Lunes a viernes
  };

  // --- Nueva función para verificar si es feriado ---
  const isHoliday = (date) => {
    const dateKey = date.format('YYYY-MM-DD');
    return holidays[dateKey];
  };

  // Componente personalizado para los días del calendario
  const CustomDay = (props) => {
    const { day, selected, outsideCurrentMonth, ...other } = props; // Destructure para evitar props inválidas
    const holidayName = isHoliday(day);

    if (holidayName) {
      return (
        <Tooltip title={holidayName} placement="top">
          <PickersDay 
            {...other} 
            day={day} 
            disabled 
            sx={{ 
              backgroundColor: 'warning.light', 
              color: 'warning.contrastText' 
            }} />
        </Tooltip>
      );
    }

    return (
      <PickersDay
        {...other}
        day={day}
        selected={selected}
        outsideCurrentMonth={outsideCurrentMonth}
        sx={{
          // Estilo para días con asistencia 'presente'
          ...(isDateHighlighted(day) === 'presente' && {
            backgroundColor: 'success.light',
            color: 'success.contrastText',
            '&:hover': {
              backgroundColor: 'success.main',
            },
          }),
          // Estilo para días con asistencia 'ausente'
          ...(isDateHighlighted(day) === 'ausente' && {
            backgroundColor: 'error.light',
            color: 'error.contrastText',
            '&:hover': {
              backgroundColor: 'error.main',
            },
          }),
        }}
      />
    );
  };

  // --- Filtra los feriados para el mes actual ---
  const holidaysOfMonth = Object.entries(holidays)
    .filter(([date]) => dayjs(date).isSame(currentMonthView, 'month'))
    .sort(([dateA], [dateB]) => dayjs(dateA).date() - dayjs(dateB).date());

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: 3, maxWidth: '100%', mx: 'auto' }}>
        <Typography variant="h4" gutterBottom>
          Calendario de Asistencias
        </Typography>
        
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'auto',
            gap: 2,
          }}
        >
          {/* Calendario */}
          <Paper elevation={3} sx={{ gridColumn: { xs: 'span 5', md: '1 / span 3' }, gridRow: { xs: '1', md: '1 / span 4' }, p: 2 }}>
            <DateCalendar
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              onMonthChange={(newMonth) => setCurrentMonthView(newMonth)}
              shouldDisableDate={(date) => !isWeekday(date) || isHoliday(date)}
              slots={{ day: CustomDay }}
            />
          </Paper>
            {/* Estado de Asistencias */}
          <Paper elevation={3} sx={{ gridColumn: { xs: 'span 5', md: '4 / span 2' }, gridRow: { xs: '2', md: '1/ span 2' }, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Estado de Asistencias del Mes
            </Typography>
            <List dense sx={{ maxHeight: 350, overflow: 'auto' }}>
              {Object.entries(attendances).length > 0 ? (
                Object.entries(attendances).map(([date, status]) => (
                  <ListItem key={date}>
                    <ListItemText 
                      primary={`${dayjs(date).format('DD/MM/YYYY')}: ${status ? status.charAt(0).toUpperCase() + status.slice(1) : 'No definido'}`}
                    />
                  </ListItem>
                ))
              ) : (
                <ListItem><ListItemText primary="No hay asistencias registradas." /></ListItem>
              )}
            </List>
          </Paper>
          {/* Feriados */}
          <Paper elevation={3} sx={{ gridColumn: { xs: 'span 5', md: '4 / span 2' }, gridRow: { xs: '3', md: '3 / span 3' }, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Feriados de {currentMonthView.format('MMMM')}
            </Typography>
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {holidaysOfMonth.length > 0 ? (
                holidaysOfMonth.map(([date, name]) => (
                  <ListItem key={date} disablePadding>
                    <ListItemText primary={name} secondary={dayjs(date).format('dddd DD')} />
                  </ListItem>
                ))
              ) : (
                <ListItem><ListItemText secondary="No hay feriados este mes." /></ListItem>
              )}
            </List>
          </Paper>

          {/* Controles */}
          <Paper elevation={3} sx={{ gridColumn: { xs: 'span 5', md: '1 / span 3' }, gridRow: { xs: '4', md: '5' }, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Asistencia para {selectedDate.format('dddd, DD/MM/YYYY')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Button variant="contained" color="success" startIcon={<CheckCircle />} disabled={loading} onClick={() => markAttendance(selectedDate, true)}>
                Marcar Presente
              </Button>
              <Button variant="contained" color="error" disabled={loading} startIcon={<Cancel />} onClick={() => markAttendance(selectedDate, false)}>
                Marcar Ausente
              </Button>
            </Box>
            <Button variant="outlined" disabled={loading} onClick={markWeekAttendances}>
              Marcar Semana como Presente
            </Button>
          </Paper>

          
        </Box>

        {/* --- 3. Snackbar para notificaciones --- */}
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

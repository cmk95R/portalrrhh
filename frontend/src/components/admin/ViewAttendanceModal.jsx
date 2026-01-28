import React, { useState, useEffect } from 'react';
import {
  Box, Modal, Stack, Avatar, Typography, Grid, Card, CardContent,
  List, ListItem, ListItemText, Chip
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { getAllAttendanceApi } from '../../api/adminAttendanceApi';

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

export default function ViewAttendanceModal({ open, onClose, employee }) {
  const [asistencias, setAsistencias] = useState({});
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const userId = employee?.usuario?._id || employee?.usuario;
    if (open && userId) {
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
        }
      };
      fetchUserAttendance(currentMonth);
    }
  }, [open, employee, currentMonth]);

  if (!employee) return null;

  const CustomDay = (props) => {
    const { day, ...other } = props;
    const dateStr = day.format('YYYY-MM-DD');
    const record = asistencias[dateStr];
    const estado = record?.estado;
    
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

  const selectedRecord = selectedDate ? asistencias[selectedDate.format('YYYY-MM-DD')] : null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Stack direction="row" alignItems="center"  spacing={2} mb={3}>
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

        <Grid container spacing={4} alignContent= "center" justifyContent="space-between">
          <Grid item xs={12} md={6} >
            <Card variant="outlined">
                <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                        <EventIcon color="action" />
                        <Typography variant="subtitle1" fontWeight="bold">Vista Calendario</Typography>
                    </Stack>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DateCalendar
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        slots={{ day: CustomDay }}
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
                    {Object.entries(asistencias).map(([fecha, record]) => (
                        <ListItem key={fecha} divider>
                        <ListItemText
                            primary={dayjs(fecha).format('dddd, DD [de] MMMM')}
                            secondary={
                                <Chip 
                                    label={record.estado} 
                                    size="small" 
                                    color={record.estado === 'presente' ? 'success' : 'error'} 
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

        {selectedDate && (
            <Card variant="outlined" sx={{ mt: 3, bgcolor: 'grey.50',  alignContent: 'center', justifyContent: 'center'}}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Detalle del día: {selectedDate.format('dddd DD [de] MMMM')}
                    </Typography>
                    {selectedRecord ? (
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary">Estado</Typography>
                                <Chip 
                                    label={selectedRecord.estado.toUpperCase()} 
                                    color={selectedRecord.estado === 'presente' ? 'success' : 'error'} 
                                    size="small" 
                                    sx={{ mt: 0.5 }}
                                />
                            </Grid>
                            {selectedRecord.motivo && (
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary">Motivo de Ausencia</Typography>
                                    <Typography variant="body2">{selectedRecord.motivo}</Typography>
                                </Grid>
                            )}
                            {selectedRecord.nota && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">Nota / Observación</Typography>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eee' }}>
                                        "{selectedRecord.nota}"
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No hay registros de asistencia para este día.
                        </Typography>
                    )}
                </CardContent>
            </Card>
        )}
      </Box>
    </Modal>
  );
}
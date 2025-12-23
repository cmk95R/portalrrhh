import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, TextField, Button, Stack,
  List, ListItem, ListItemText, IconButton, Divider, Alert, Snackbar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getClientsApi, createClientApi, deleteClientApi } from '../api/clients';

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ nombre: '', direccion: '', horario: '' });
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const fetchClients = async () => {
    try {
      const { data } = await getClientsApi();
      setClients(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre) return;
    try {
      await createClientApi(form);
      setSnack({ open: true, msg: 'Cliente creado', severity: 'success' });
      setForm({ nombre: '', direccion: '', horario: '' });
      fetchClients();
    } catch (error) {
      setSnack({ open: true, msg: 'Error al crear cliente', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    try {
      await deleteClientApi(id);
      setSnack({ open: true, msg: 'Cliente eliminado', severity: 'success' });
      fetchClients();
    } catch (error) {
      setSnack({ open: true, msg: 'Error al eliminar', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">Gestión de Clientes</Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Agregar Nuevo Cliente</Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
            <TextField 
              label="Nombre Empresa" name="nombre" 
              value={form.nombre} onChange={handleChange} required fullWidth 
            />
            <TextField 
              label="Dirección" name="direccion" 
              value={form.direccion} onChange={handleChange} fullWidth 
            />
            <TextField 
              label="Horario Default" name="horario" 
              value={form.horario} onChange={handleChange} fullWidth 
            />
            <Button variant="contained" type="submit" startIcon={<AddIcon />} sx={{ minWidth: 120 }}>
              Agregar
            </Button>
          </Stack>
        </form>
      </Paper>

      <Paper>
        <List>
          {clients.map((client, index) => (
            <React.Fragment key={client._id}>
              <ListItem
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleDelete(client._id)}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText 
                  primary={<Typography fontWeight="bold">{client.nombre}</Typography>}
                  secondary={
                    <>
                      <Typography variant="body2" component="span" display="block">
                        Dirección: {client.direccion || 'N/A'}
                      </Typography>
                      <Typography variant="body2" component="span" display="block">
                        Horario: {client.horario || 'N/A'}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < clients.length - 1 && <Divider />}
            </React.Fragment>
          ))}
          {clients.length === 0 && (
            <Box p={3} textAlign="center">
              <Typography color="text.secondary">No hay clientes registrados.</Typography>
            </Box>
          )}
        </List>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled">
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
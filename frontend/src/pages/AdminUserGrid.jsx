import * as React from "react";
import {
  Box, Stack, Button, Chip, TextField, MenuItem,Container,
  Snackbar, Alert, Paper, Typography, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select,
  IconButton, Tooltip
} from "@mui/material";
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import { DataGrid } from "@mui/x-data-grid";
// Usamos la API que soporta paginación y filtros
import { listUsersWithCvApi, adminSetUserRoleApi, adminSetUserStatusApi } from "../api/users";

export default function AdminUsersGrid() {
  // Estado para manejar la paginación y datos del servidor
  const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = React.useState(0);
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [snack, setSnack] = React.useState({ open: false, severity: "success", msg: "" });

  // Estado para el modal de cambio de rol
  const [roleModalOpen, setRoleModalOpen] = React.useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [newRole, setNewRole] = React.useState('');
  
  // Estado para filtros
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [queryTimeout, setQueryTimeout] = React.useState(null);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      // Preparamos los parámetros para la API
      const params = {
        page: paginationModel.page + 1, // La API espera página base 1
        limit: paginationModel.pageSize,
        q: query,
        rol: roleFilter === "all" ? undefined : roleFilter,
      };

      const { data } = await listUsersWithCvApi(params);
      
      const mapped = (data?.items ?? []).map((u) => ({
        id: u._id || u.id,
        nombre: u.nombre ?? "",
        apellido: u.apellido ?? "",
        email: u.email ?? "",
        rol: u.rol ?? "user",
        estado: u.estado ?? 'activo',
        createdAt: u.createdAt,
           // El backend ya lo provee en el campo correcto
      }));

      setRows(mapped);
      setRowCount(data?.total ?? 0);

    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: e?.response?.data?.message || "No se pudieron cargar los usuarios" });
      // En caso de error, reseteamos el estado
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, query, roleFilter]);

  React.useEffect(() => {
    // Usamos un debounce para no llamar a la API en cada tecla presionada
    if (queryTimeout) clearTimeout(queryTimeout);
    const timeoutId = setTimeout(() => fetchUsers(), 500);
    setQueryTimeout(timeoutId);

    return () => clearTimeout(timeoutId);
  }, [fetchUsers]); // fetchUsers ya depende de los filtros y paginación

  // --- Lógica del modal de cambio de rol ---
  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.rol);
    setRoleModalOpen(true);
  };

  const handleCloseRoleModal = () => {
    setRoleModalOpen(false);
    setSelectedUser(null);
    setNewRole('');
  };

  // --- Lógica del modal de detalles ---
  const handleOpenDetailsModal = (user) => {
    setSelectedUser(user);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedUser(null);
  };

  const handleRoleChange = async () => {
    if (!selectedUser || selectedUser.rol === newRole) {
      handleCloseRoleModal();
      return;
    }
    try {
      await adminSetUserRoleApi(selectedUser.id, newRole);
      setRows(prev => prev.map(r => r.id === selectedUser.id ? { ...r, rol: newRole } : r));
      // CORRECCIÓN: Asignamos un color según el rol.
      const severity = newRole === 'admin' || newRole === 'rrhh' ? 'info' : 'success';
      setSnack({
        open: true,
        severity: severity,
        msg: `Rol de ${selectedUser.nombre} cambiado a ${newRole}`
      });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: e?.response?.data?.message || "No se pudo cambiar el rol" });
    } finally {
      handleCloseRoleModal();
    }
  };  

  const handleToggleStatus = async (user) => {
    if (!user) return;
    const newStatus = user.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await adminSetUserStatusApi(user.id, newStatus);
      setRows(prev => prev.map(r => r.id === user.id ? { ...r, estado: newStatus } : r));
      // CORRECCIÓN: Cambiamos el color de la notificación según el estado.
      setSnack({ open: true, severity: newStatus === 'activo' ? 'success' : 'warning', msg: `${user.nombre} ahora está ${newStatus}` });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: e?.response?.data?.message || "No se pudo cambiar el estado" });
    }
  };

  const columns = [
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 150,align: "center", headerAlign: "center"},
    { field: "apellido", headerName: "Apellido", flex: 1, minWidth: 150,align: "center", headerAlign: "center" },
    { field: "email", headerName: "Email", flex: 1.5, minWidth: 220, align: "center", headerAlign: "center" },
    {
      field: "rol",
      headerName: "Rol",
      align: "center", headerAlign: "center",
      flex: 1,
      minWidth: 100,
      
      renderCell: (params) => (
        <Chip label={params.value} color={params.value === "admin" ? "success" : params.value === 'rrhh' ? 'info' : "default"} size="small" />
      ),
    },
    {
      field: "estado",
      headerName: "Estado",
      flex: 1,
      minWidth: 100,
      
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const isActivo = params.value === 'activo';
        return (
          <Tooltip title={isActivo ? 'Deshabilitar Usuario' : 'Habilitar Usuario'} >
            <IconButton onClick={() => handleToggleStatus(params.row)} color={isActivo ? 'success' : 'error'} size="large">
              {isActivo ? <ToggleOnIcon fontSize="large" /> : <ToggleOffIcon fontSize="large" />}
            </IconButton> 
          </Tooltip>
        );
      }
    },
    {
      field: "createdAt",
      headerName: "Creado",
      type: "dateTime", // 1. Indicamos que es una columna de fecha/hora
      flex: 1,
      minWidth: 150,
      align: "center", headerAlign: "center",
      width: 150,
      // 2. valueGetter devuelve un objeto Date para que el ordenamiento funcione
      valueGetter: (value) => {
        return value ? new Date(value) : null;
      },
      // 3. valueFormatter se encarga solo de la presentación visual
      valueFormatter: (value) => {
        return value ? value.toLocaleDateString('es-AR') : '';
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      flex: 1,
      minWidth: 120,
      align: "center", headerAlign: "center",
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Ver Detalles">
            <IconButton onClick={() => handleOpenDetailsModal(params.row)} size="small">
              <VisibilityIcon fontSize="large" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cambiar Rol">
            <IconButton onClick={() => handleOpenRoleModal(params.row)} size="small">
              <ManageAccountsIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 400 }}>
        Gestión de Usuarios
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }} elevation={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Buscar (nombre, apellido o email)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Rol"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={{ width: 200 }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="rrhh">RRHH</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <Paper sx={{ height: 520, borderRadius: 2 }} elevation={2}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          // Configuración para paginación del lado del servidor
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          // Opciones de tamaño de página
          pageSizeOptions={[5, 10, 25, 50]}
          // Otras props
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>

      {/* Modal para cambiar el rol */}
      <Dialog open={roleModalOpen} onClose={handleCloseRoleModal} fullWidth maxWidth="xs">
        <DialogTitle>Cambiar rol de {selectedUser?.nombre}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="role-select-label">Rol</InputLabel>
            <Select
              labelId="role-select-label"
              value={newRole}
              label="Rol"
              onChange={(e) => setNewRole(e.target.value)}
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="rrhh">RRHH</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleModal}>Cerrar</Button>
          <Button
            onClick={handleRoleChange}
            variant="contained"
            disabled={!selectedUser || selectedUser.rol === newRole}
          >
            Cambiar Rol
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para ver detalles del usuario */}
      <Dialog open={detailsModalOpen} onClose={handleCloseDetailsModal} fullWidth maxWidth="xs">
        <DialogTitle>Detalles de {selectedUser?.nombre}</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography><strong>ID:</strong> {selectedUser.id}</Typography>
              <Typography><strong>Nombre:</strong> {selectedUser.nombre} {selectedUser.apellido}</Typography>
              <Typography><strong>Email:</strong> {selectedUser.email}</Typography>
              <Typography><strong>Rol:</strong> <Chip label={selectedUser.rol} size="small" color={selectedUser.rol === 'admin' ? 'secondary' : selectedUser.rol === 'rrhh' ? 'info' : 'default'} /></Typography>
              <Typography><strong>Estado:</strong> <Chip label={selectedUser.estado} size="small" color={selectedUser.estado === 'activo' ? 'success' : 'error'} /></Typography>
              <Typography><strong>Fecha de Creación:</strong> {new Date(selectedUser.createdAt).toLocaleDateString('es-AR')}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

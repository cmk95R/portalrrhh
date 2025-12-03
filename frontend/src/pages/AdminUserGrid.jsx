// frontend/src/pages/AdminUsersGrid.jsx
import * as React from "react";
import {
  Box,
  Stack,
  Button,
  Chip,
  TextField,
  MenuItem,
  Container,
  Snackbar,
  Alert,
  Paper,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
} from "@mui/material";

import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import VpnKeyIcon from "@mui/icons-material/VpnKey";

import { DataGrid } from "@mui/x-data-grid";

import {
  listUsersApi,
  adminSetUserRoleApi,
  adminSetUserStatusApi,
  adminUpdateUserApi,
  adminResetUserPinApi,
} from "../api/users";
import { registerApi } from "../api/auth";

export default function AdminUsersGrid() {
  // -------------------- Estado general --------------------
  const [paginationModel, setPaginationModel] = React.useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = React.useState(0);
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [snack, setSnack] = React.useState({
    open: false,
    severity: "success",
    msg: "",
  });

  // Filtros
  const [query, setQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [queryTimeout, setQueryTimeout] = React.useState(null);

  // Usuario seleccionado (para detalles / editar / rol / pin)
  const [selectedUser, setSelectedUser] = React.useState(null);

  // -------------------- Modales --------------------
  const [roleModalOpen, setRoleModalOpen] = React.useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [pinDialog, setPinDialog] = React.useState({
    open: false,
    pin: "",
    userName: "",
  });

  const [newRole, setNewRole] = React.useState("");

  // Formulario de creación de empleado
  const [createForm, setCreateForm] = React.useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
    cliente: "",
    direccionCliente: "",
    horarioLaboral: "",
    rol: "empleado",
  });
  const [createErrors, setCreateErrors] = React.useState({});
  const [createLoading, setCreateLoading] = React.useState(false);

  // Formulario de edición de empleado
  const [editForm, setEditForm] = React.useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
    cliente: "",
    direccionCliente: "",
    horarioLaboral: "",
    rol: "",
  });
  const [editErrors, setEditErrors] = React.useState({});
  const [editLoading, setEditLoading] = React.useState(false);

  // -------------------- Fetch usuarios --------------------
  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: paginationModel.page + 1, // API usa base 1
        limit: paginationModel.pageSize,
        q: query,
        rol: roleFilter === "all" ? undefined : roleFilter,
      };

      const { data } = await listUsersApi(params);

      const mapped = (data?.items ?? []).map((u) => ({
        id: u._id || u.id,
        nombre: u.nombre ?? "",
        apellido: u.apellido ?? "",
        email: u.email ?? "",
        dni: u.dni ?? "",
        rol: u.rol ?? "empleado",
        estado: u.estado ?? "activo",
        cliente: u.cliente ?? "",
        direccionCliente: u.direccionCliente ?? "",
        horarioLaboral: u.horarioLaboral ?? "",
        createdAt: u.createdAt,
      }));

      setRows(mapped);
      setRowCount(data?.total ?? 0);
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        severity: "error",
        msg:
          e?.response?.data?.message ||
          "No se pudieron cargar los usuarios",
      });
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, query, roleFilter]);

  React.useEffect(() => {
    if (queryTimeout) clearTimeout(queryTimeout);
    const timeoutId = setTimeout(() => fetchUsers(), 400);
    setQueryTimeout(timeoutId);

    return () => clearTimeout(timeoutId);
  }, [fetchUsers]);

  // -------------------- Modales: Rol --------------------
  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setNewRole(user.rol);
    setRoleModalOpen(true);
  };

  const handleCloseRoleModal = () => {
    setRoleModalOpen(false);
    setSelectedUser(null);
    setNewRole("");
  };

  const handleRoleChange = async () => {
    if (!selectedUser || selectedUser.rol === newRole) {
      handleCloseRoleModal();
      return;
    }
    try {
      await adminSetUserRoleApi(selectedUser.id, newRole);
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedUser.id ? { ...r, rol: newRole } : r
        )
      );
      const severity =
        newRole === "admin" || newRole === "rrhh" ? "info" : "success";
      setSnack({
        open: true,
        severity,
        msg: `Rol de ${selectedUser.nombre} cambiado a ${newRole}`,
      });
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        severity: "error",
        msg:
          e?.response?.data?.message || "No se pudo cambiar el rol",
      });
    } finally {
      handleCloseRoleModal();
    }
  };

  // -------------------- Modales: Detalles --------------------
  const handleOpenDetailsModal = (user) => {
    setSelectedUser(user);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setSelectedUser(null);
  };

  // -------------------- Cambiar estado --------------------
  const handleToggleStatus = async (user) => {
    if (!user) return;
    const newStatus = user.estado === "activo" ? "inactivo" : "activo";
    try {
      await adminSetUserStatusApi(user.id, newStatus);
      setRows((prev) =>
        prev.map((r) =>
          r.id === user.id ? { ...r, estado: newStatus } : r
        )
      );
      setSnack({
        open: true,
        severity: newStatus === "activo" ? "success" : "warning",
        msg: `${user.nombre} ahora está ${newStatus}`,
      });
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        severity: "error",
        msg:
          e?.response?.data?.message ||
          "No se pudo cambiar el estado",
      });
    }
  };

  // -------------------- Crear empleado --------------------
  const handleOpenCreateModal = () => {
    setCreateForm({
      nombre: "",
      apellido: "",
      dni: "",
      email: "",
      cliente: "",
      direccionCliente: "",
      horarioLaboral: "",
      rol: "empleado",
    });
    setCreateErrors({});
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
    setCreateErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateCreate = () => {
    const errs = {};
    if (!createForm.nombre) errs.nombre = "Requerido";
    if (!createForm.apellido) errs.apellido = "Requerido";
    if (!createForm.dni) errs.dni = "Requerido";
    if (!createForm.email) errs.email = "Requerido";
    return errs;
  };

  const handleCreateSubmit = async () => {
    const errs = validateCreate();
    if (Object.keys(errs).length > 0) {
      setCreateErrors(errs);
      return;
    }

    setCreateLoading(true);
    try {
      // PIN autogenerado 4 dígitos
      const pin = String(Math.floor(1000 + Math.random() * 9000));

      const payload = {
        nombre: createForm.nombre, // <-- CORRECCIÓN: El nombre del campo es 'nombre'
        apellido: createForm.apellido,
        email: createForm.email,
        dni: createForm.dni,
        pin,
        rol: createForm.rol,
        cliente: createForm.cliente,
        direccionCliente: createForm.direccionCliente,
        horarioLaboral: createForm.horarioLaboral,
      };

      const { data } = await registerApi(payload); // registerApi ahora se usa para crear

      setSnack({
        open: true,
        severity: "success",
        msg: `Usuario ${data.user?.nombre ?? ""} creado correctamente`,
      });

      // Mostrar PIN en un diálogo
      setPinDialog({
        open: true,
        pin,
        userName: `${createForm.nombre} ${createForm.apellido}`,
      });

      handleCloseCreateModal();
      fetchUsers();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        "No se pudo crear el usuario";
      setSnack({ open: true, severity: "error", msg });
    } finally {
      setCreateLoading(false);
    }
  };

  // -------------------- Editar empleado --------------------
  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      dni: user.dni || "",
      email: user.email || "",
      cliente: user.cliente || "",
      direccionCliente: user.direccionCliente || "",
      horarioLaboral: user.horarioLaboral || "",
      rol: user.rol || "empleado",
    });
    setEditErrors({});
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedUser(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.nombre) errs.nombre = "Requerido";
    if (!editForm.apellido) errs.apellido = "Requerido";
    if (!editForm.dni) errs.dni = "Requerido";
    if (!editForm.email) errs.email = "Requerido";
    return errs;
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;
    const errs = validateEdit();
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setEditLoading(true);
    try {
      await adminUpdateUserApi(selectedUser.id, {
        ...editForm,
      });

      setSnack({
        open: true,
        severity: "success",
        msg: `Datos de ${editForm.nombre} actualizados`,
      });

      handleCloseEditModal();
      fetchUsers();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        "No se pudieron actualizar los datos";
      setSnack({ open: true, severity: "error", msg });
    } finally {
      setEditLoading(false);
    }
  };

  // -------------------- Reset PIN --------------------
  const handleResetPin = async (user) => {
    if (!user) return;
    try {
      const { data } = await adminResetUserPinApi(user.id);
      setPinDialog({
        open: true,
        pin: data.newPin,
        userName: `${user.nombre} ${user.apellido}`,
      });
      setSnack({
        open: true,
        severity: "info",
        msg: `Se generó un nuevo PIN para ${user.nombre}`,
      });
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message || "No se pudo resetear el PIN";
      setSnack({ open: true, severity: "error", msg });
    }
  };

  // -------------------- Columnas DataGrid --------------------
  const columns = [
    {
      field: "nombre",
      headerName: "Nombre",
      flex: 1,
      minWidth: 140,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "apellido",
      headerName: "Apellido",
      flex: 1,
      minWidth: 140,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "dni",
      headerName: "DNI",
      flex: 0.8,
      minWidth: 110,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.5,
      minWidth: 220,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "cliente",
      headerName: "Cliente",
      flex: 1,
      minWidth: 140,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "rol",
      headerName: "Rol",
      flex: 0.8,
      minWidth: 100,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={
            params.value === "admin"
              ? "success"
              : params.value === "rrhh"
              ? "info"
              : "default"
          }
          size="small"
        />
      ),
    },
    {
      field: "estado",
      headerName: "Estado",
      flex: 0.8,
      minWidth: 110,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const isActivo = params.value === "activo";
        return (
          <Tooltip
            title={
              isActivo ? "Deshabilitar usuario" : "Habilitar usuario"
            }
          >
            <IconButton
              onClick={() => handleToggleStatus(params.row)}
              color={isActivo ? "success" : "error"}
              size="large"
            >
              {isActivo ? (
                <ToggleOnIcon fontSize="large" />
              ) : (
                <ToggleOffIcon fontSize="large" />
              )}
            </IconButton>
          </Tooltip>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Creado",
      type: "dateTime",
      flex: 1,
      minWidth: 150,
      align: "center",
      headerAlign: "center",
      valueGetter: (value) => {
        return value ? new Date(value) : null;
      },
      valueFormatter: (value) => {
        return value ? value.toLocaleDateString("es-AR") : "";
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      flex: 1.1,
      minWidth: 180,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Ver detalles">
            <IconButton
              onClick={() => handleOpenDetailsModal(params.row)}
              size="small"
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar datos">
            <IconButton
              onClick={() => handleOpenEditModal(params.row)}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cambiar rol">
            <IconButton
              onClick={() => handleOpenRoleModal(params.row)}
              size="small"
            >
              <ManageAccountsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Resetear PIN">
            <IconButton
              onClick={() => handleResetPin(params.row)}
              size="small"
            >
              <VpnKeyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // -------------------- Render --------------------
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mb: 2 }}
        spacing={2}
      >
        <Typography variant="h5" sx={{ fontWeight: 500 }}>
          Gestión de Empleados
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateModal}
        >
          Nuevo empleado
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }} elevation={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <TextField
            label="Buscar (nombre, apellido, email, DNI, cliente)"
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
            <MenuItem value="empleado">Empleado</MenuItem>
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
          paginationMode="server"
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
        />
      </Paper>

      {/* Snackbar global */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>

      {/* Modal cambiar rol */}
      <Dialog
        open={roleModalOpen}
        onClose={handleCloseRoleModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Cambiar rol de {selectedUser?.nombre || ""}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="role-select-label">Rol</InputLabel>
            <Select
              labelId="role-select-label"
              value={newRole}
              label="Rol"
              onChange={(e) => setNewRole(e.target.value)}
            >
              <MenuItem value="empleado">Empleado</MenuItem>
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
            Cambiar rol
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal detalles */}
      <Dialog
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Detalles de{" "}
          {selectedUser ? `${selectedUser.nombre} ${selectedUser.apellido}` : ""}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Typography>
                <strong>ID:</strong> {selectedUser.id}
              </Typography>
              <Typography>
                <strong>DNI:</strong> {selectedUser.dni}
              </Typography>
              <Typography>
                <strong>Nombre:</strong> {selectedUser.nombre}{" "}
                {selectedUser.apellido}
              </Typography>
              <Typography>
                <strong>Email:</strong> {selectedUser.email}
              </Typography>
              <Typography>
                <strong>Cliente:</strong> {selectedUser.cliente || "-"}
              </Typography>
              <Typography>
                <strong>Dirección cliente:</strong>{" "}
                {selectedUser.direccionCliente || "-"}
              </Typography>
              <Typography>
                <strong>Horario laboral:</strong>{" "}
                {selectedUser.horarioLaboral || "-"}
              </Typography>
              <Typography>
                <strong>Rol:</strong>{" "}
                <Chip
                  label={selectedUser.rol}
                  size="small"
                  color={
                    selectedUser.rol === "admin"
                      ? "secondary"
                      : selectedUser.rol === "rrhh"
                      ? "info"
                      : "default"
                  }
                />
              </Typography>
              <Typography>
                <strong>Estado:</strong>{" "}
                <Chip
                  label={selectedUser.estado}
                  size="small"
                  color={
                    selectedUser.estado === "activo"
                      ? "success"
                      : "error"
                  }
                />
              </Typography>
              {selectedUser.createdAt && (
                <Typography>
                  <strong>Fecha de creación:</strong>{" "}
                  {new Date(
                    selectedUser.createdAt
                  ).toLocaleDateString("es-AR")}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsModal}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal crear empleado */}
      <Dialog
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nuevo empleado</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Nombre"
                name="nombre"
                value={createForm.nombre}
                onChange={handleCreateChange}
                error={!!createErrors.nombre}
                helperText={createErrors.nombre}
                fullWidth
              />
              <TextField
                label="Apellido"
                name="apellido"
                value={createForm.apellido}
                onChange={handleCreateChange}
                error={!!createErrors.apellido}
                helperText={createErrors.apellido}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="DNI"
                name="dni"
                value={createForm.dni}
                onChange={handleCreateChange}
                error={!!createErrors.dni}
                helperText={createErrors.dni}
                fullWidth
              />
              <TextField // <-- CORRECCIÓN: El campo de email estaba duplicado
                label="Email"
                name="email"
                value={createForm.email}
                onChange={handleCreateChange}
                error={!!createErrors.email}
                helperText={createErrors.email}
                fullWidth
              />
            </Stack>
            <TextField
              label="Cliente"
              name="cliente"
              value={createForm.cliente}
              onChange={handleCreateChange}
              fullWidth
            />
            <TextField
              label="Dirección del cliente"
              name="direccionCliente"
              value={createForm.direccionCliente}
              onChange={handleCreateChange}
              fullWidth
            />
            <TextField
              label="Horario laboral (ej: 09:00–17:00)"
              name="horarioLaboral"
              value={createForm.horarioLaboral}
              onChange={handleCreateChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="create-rol-label">Rol</InputLabel>
              <Select
                labelId="create-rol-label"
                label="Rol"
                name="rol"
                value={createForm.rol}
                onChange={handleCreateChange}
              >
                <MenuItem value="empleado">Empleado</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="rrhh">RRHH</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info" variant="outlined">
              El PIN se genera automáticamente (4 dígitos) y se mostrará
              al confirmar.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateModal}>Cancelar</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={createLoading}
          >
            {createLoading ? "Creando..." : "Crear empleado"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal editar empleado */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Editar empleado{" "}
          {selectedUser
            ? `${selectedUser.nombre} ${selectedUser.apellido}`
            : ""}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Nombre"
                name="nombre"
                value={editForm.nombre}
                onChange={handleEditChange}
                error={!!editErrors.nombre}
                helperText={editErrors.nombre}
                fullWidth
              />
              <TextField
                label="Apellido"
                name="apellido"
                value={editForm.apellido}
                onChange={handleEditChange}
                error={!!editErrors.apellido}
                helperText={editErrors.apellido}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="DNI"
                name="dni"
                value={editForm.dni}
                onChange={handleEditChange}
                error={!!editErrors.dni}
                helperText={editErrors.dni}
                fullWidth
              />
              <TextField
                label="Email"
                name="email"
                value={editForm.email}
                onChange={handleEditChange}
                error={!!editErrors.email}
                helperText={editErrors.email}
                fullWidth
              />
            </Stack>
            <TextField
              label="Cliente"
              name="cliente"
              value={editForm.cliente}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Dirección del cliente"
              name="direccionCliente"
              value={editForm.direccionCliente}
              onChange={handleEditChange}
              fullWidth
            />
            <TextField
              label="Horario laboral"
              name="horarioLaboral"
              value={editForm.horarioLaboral}
              onChange={handleEditChange}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="edit-rol-label">Rol</InputLabel>
              <Select
                labelId="edit-rol-label"
                label="Rol"
                name="rol"
                value={editForm.rol}
                onChange={handleEditChange}
              >
                <MenuItem value="empleado">Empleado</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="rrhh">RRHH</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancelar</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={editLoading}
          >
            {editLoading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para mostrar PIN nuevo / creado */}
      <Dialog
        open={pinDialog.open}
        onClose={() => setPinDialog({ open: false, pin: "", userName: "" })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>PIN del usuario</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, mb: 1 }}>
            Usuario: <strong>{pinDialog.userName}</strong>
          </Typography>
          <Alert severity="info">
            El nuevo PIN es:{" "}
            <Typography
              component="span"
              sx={{ fontWeight: "bold", fontSize: 18, ml: 1 }}
            >
              {pinDialog.pin}
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Compartí este PIN con el empleado. Por seguridad, no se
            volverá a mostrar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setPinDialog({ open: false, pin: "", userName: "" })
            }
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Badge as BadgeIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Groups as GroupsIcon,
  PhotoCamera,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { AuthContext } from "../context/AuthContext";
import {
  listCollaboratorsInfoApi,
  getCollaboratorInfoApi,
  upsertCollaboratorInfoApi,
  exportCollaboratorsListApi,
} from "../api/collaboratorsInfo";
import { getClientsApi } from "../api/clients";

const PRIMARY = "#173487";
const PRIMARY_HOVER = "#2A4DB8";
const API_URL = import.meta.env.VITE_API_URL || "";

const EMPTY_INFO = {
  idEmpleado: "",
  segundoNombre: "",
  cuil: "",
  nacionalidad: "",
  lugarNacimiento: "",
  estadoCivil: "",
  domicilio: "",
  piso: "",
  departamento: "",
  localidad: "",
  provincia: "",
  codigoPostal: "",
  telefonoParticular: "",
  telefonoMovil: "",
  telefonoLaboral: "",
  emailParticular: "",
  emailLaboral: "",
  fechaIngreso: "",
  fechaEgreso: "",
  estudios: "",
  titulacion: "",
  datosMedicos: {},
  contactoPrincipal: {},
  contactoAlternativo: {},
  datosBancarios: {},
  equipamiento: [{}, {}, {}, {}],
  clienteAsignado: { nombre: "", posicion: "" },
};

function getPhotoUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  if (path.startsWith("/api")) {
    const base = API_URL.endsWith("/api") ? API_URL.slice(0, -4) : API_URL;
    return `${base}${path}`;
  }
  return path;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function Field({ label, value, onChange, disabled, type = "text", multiline }) {
  return (
    <TextField
      fullWidth
      size="small"
      label={label}
      type={type}
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      InputLabelProps={type === "date" ? { shrink: true } : undefined}
    />
  );
}

export default function CollaboratorsInfo() {
  const { user } = useContext(AuthContext);
  const canEdit = ["admin", "rrhh"].includes(user?.rol);
  const readOnly = !canEdit;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [clienteFilter, setClienteFilter] = useState("");
  const [clients, setClients] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const loadClients = useCallback(async () => {
    try {
      const { data } = await getClientsApi();
      setClients(Array.isArray(data) ? data : data?.items || []);
    } catch {
      setClients([]);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await listCollaboratorsInfoApi({
        page: page + 1,
        limit: rowsPerPage,
        q: q.trim() || undefined,
        cliente: clienteFilter || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e?.response?.data?.message || "Error al cargar colaboradores.");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, q, clienteFilter]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (row, editMode) => {
    try {
      const { data } = await getCollaboratorInfoApi(row._id);
      setSelected({ ...data, _editMode: editMode && canEdit });
      const info = data.info || {};
      setForm({
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        nacimiento: data.nacimiento ? dayjs(data.nacimiento).format("YYYY-MM-DD") : "",
        telefono: data.telefono || "",
        foto: data.foto || "",
        ...EMPTY_INFO,
        ...info,
        fechaIngreso: info.fechaIngreso ? dayjs(info.fechaIngreso).format("YYYY-MM-DD") : "",
        fechaEgreso: info.fechaEgreso ? dayjs(info.fechaEgreso).format("YYYY-MM-DD") : "",
        datosMedicos: { ...EMPTY_INFO.datosMedicos, ...(info.datosMedicos || {}) },
        contactoPrincipal: { ...(info.contactoPrincipal || {}) },
        contactoAlternativo: { ...(info.contactoAlternativo || {}) },
        datosBancarios: { ...(info.datosBancarios || {}) },
        clienteAsignado: {
          nombre: info.clienteAsignado?.nombre || data.dependencia || "",
          posicion: info.clienteAsignado?.posicion || data.posicion || "",
        },
        equipamiento: info.equipamiento?.length
          ? [...info.equipamiento, {}, {}, {}].slice(0, 4)
          : [{}, {}, {}, {}],
      });
      setTab(0);
      setDialogOpen(true);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo cargar la ficha.");
    }
  };

  const updateForm = (path, value) => {
    setForm((prev) => {
      const equipMatch = path.match(/^equipamiento\.(\d+)\.(\w+)$/);
      if (equipMatch) {
        const idx = Number(equipMatch[1]);
        const field = equipMatch[2];
        const equip = [...(prev.equipamiento || [{}, {}, {}, {}])];
        equip[idx] = { ...equip[idx], [field]: value };
        return { ...prev, equipamiento: equip };
      }
      const next = { ...prev };
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...(cur[keys[i]] || {}) };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateForm("foto", reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selected || readOnly) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await upsertCollaboratorInfoApi(selected._id, form);
      setDialogOpen(false);
      loadList();
      setSnack({ open: true, msg: "Ficha actualizada correctamente.", severity: "success" });
    } catch (e) {
      setSnack({ open: true, msg: e?.response?.data?.message || "Error al guardar.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const res = await exportCollaboratorsListApi({
        format,
        q: q.trim() || undefined,
        cliente: clienteFilter || undefined,
      });
      downloadBlob(res.data, `${dayjs().format("YYYY-MM-DD")}_colaboradores.${format}`);
    } catch (e) {
      setError(e?.response?.data?.message || "Error al exportar.");
    } finally {
      setExporting(false);
    }
  };

  const dialogTitle = useMemo(() => {
    if (!selected) return "";
    return readOnly || !selected._editMode
      ? `Ficha — ${selected.nombre} ${selected.apellido}`
      : `Editar — ${selected.nombre} ${selected.apellido}`;
  }, [selected, readOnly]);

  const disabled = readOnly || !selected?._editMode;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          background: "linear-gradient(135deg, #e3e8f7 0%, #d2d8e8 100%)",
          border: "1px solid rgba(23, 52, 135, 0.12)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <GroupsIcon sx={{ color: PRIMARY, fontSize: 32 }} />
          <Box flex={1}>
            <Typography variant="h5" fontWeight={700} sx={{ color: PRIMARY }}>
              Info Colaboradores
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fichas completas de colaboradores y dependencia (cliente).
              {readOnly ? " Solo lectura." : " Carga y edición para Admin y RRHH."}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <TextField
            size="small"
            label="Buscar nombre, apellido, DNI"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Dependencia (Cliente)</InputLabel>
            <Select
              value={clienteFilter}
              label="Dependencia (Cliente)"
              onChange={(e) => setClienteFilter(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {clients.map((c) => (
                <MenuItem key={c._id || c.nombre} value={c.nombre}>
                  {c.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
            onClick={loadList}
            disabled={loading}
            sx={{ bgcolor: PRIMARY, "&:hover": { bgcolor: PRIMARY_HOVER }, textTransform: "none" }}
          >
            Actualizar
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={exporting}
            onClick={() => handleExport("xlsx")}
            sx={{ borderColor: PRIMARY, color: PRIMARY, textTransform: "none" }}
          >
            Excel
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={exporting}
            onClick={() => handleExport("csv")}
            sx={{ borderColor: PRIMARY, color: PRIMARY, textTransform: "none" }}
          >
            CSV
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(23, 52, 135, 0.06)" }}>
                <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Colaborador</TableCell>
                <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>DNI</TableCell>
                <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Dependencia</TableCell>
                <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Posición</TableCell>
                <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Ficha</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: PRIMARY }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !items.length ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress sx={{ color: PRIMARY }} />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Sin resultados.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={getPhotoUrl(row.foto)} sx={{ width: 32, height: 32 }}>
                          <BadgeIcon fontSize="small" />
                        </Avatar>
                        <span>
                          {row.nombre} {row.apellido}
                        </span>
                      </Stack>
                    </TableCell>
                    <TableCell>{row.dni}</TableCell>
                    <TableCell>{row.dependencia || "—"}</TableCell>
                    <TableCell>{row.posicion || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.tieneFicha ? "Completa" : "Pendiente"}
                        color={row.tieneFicha ? "success" : "warning"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver ficha">
                        <IconButton size="small" onClick={() => openDetail(row, false)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canEdit && (
                        <Tooltip title="Editar ficha">
                          <IconButton size="small" onClick={() => openDetail(row, true)} sx={{ color: PRIMARY }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Filas"
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: PRIMARY, fontWeight: 700 }}>{dialogTitle}</DialogTitle>
        <DialogContent dividers>
          {form && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar src={getPhotoUrl(form.foto)} sx={{ width: 64, height: 64 }} />
                {canEdit && selected?._editMode && (
                  <Button variant="outlined" component="label" startIcon={<PhotoCamera />} size="small">
                    Foto de perfil
                    <input type="file" hidden accept="image/*" onChange={handlePhotoFile} />
                  </Button>
                )}
              </Stack>

              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tab label="Personal" />
                <Tab label="Médicos" />
                <Tab label="Emergencia" />
                <Tab label="Bancario" />
                <Tab label="Equipo" />
                <Tab label="Cliente" />
              </Tabs>

              {tab === 0 && (
                <Stack spacing={2} sx={{ pt: 1 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Field label="Nombre" value={form.nombre} onChange={(v) => updateForm("nombre", v)} disabled={disabled} />
                    <Field label="Segundo nombre" value={form.segundoNombre} onChange={(v) => updateForm("segundoNombre", v)} disabled={disabled} />
                    <Field label="Apellido" value={form.apellido} onChange={(v) => updateForm("apellido", v)} disabled={disabled} />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Field label="ID Empleado" value={form.idEmpleado} onChange={(v) => updateForm("idEmpleado", v)} disabled={disabled} />
                    <Field label="CUIL" value={form.cuil} onChange={(v) => updateForm("cuil", v)} disabled={disabled} />
                    <Field label="Nacionalidad" value={form.nacionalidad} onChange={(v) => updateForm("nacionalidad", v)} disabled={disabled} />
                  </Stack>
                  <Field label="Domicilio" value={form.domicilio} onChange={(v) => updateForm("domicilio", v)} disabled={disabled} />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Field label="Localidad" value={form.localidad} onChange={(v) => updateForm("localidad", v)} disabled={disabled} />
                    <Field label="Provincia" value={form.provincia} onChange={(v) => updateForm("provincia", v)} disabled={disabled} />
                    <Field label="CP" value={form.codigoPostal} onChange={(v) => updateForm("codigoPostal", v)} disabled={disabled} />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Field label="Tel. móvil" value={form.telefonoMovil} onChange={(v) => updateForm("telefonoMovil", v)} disabled={disabled} />
                    <Field label="Tel. laboral" value={form.telefonoLaboral} onChange={(v) => updateForm("telefonoLaboral", v)} disabled={disabled} />
                    <Field label="Email laboral" value={form.emailLaboral} onChange={(v) => updateForm("emailLaboral", v)} disabled={disabled} />
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Field label="Fecha ingreso" type="date" value={form.fechaIngreso} onChange={(v) => updateForm("fechaIngreso", v)} disabled={disabled} />
                    <Field label="Fecha egreso" type="date" value={form.fechaEgreso} onChange={(v) => updateForm("fechaEgreso", v)} disabled={disabled} />
                    <Field label="Nacimiento" type="date" value={form.nacimiento} onChange={(v) => updateForm("nacimiento", v)} disabled={disabled} />
                  </Stack>
                  <Field label="Estudios" value={form.estudios} onChange={(v) => updateForm("estudios", v)} disabled={disabled} multiline />
                  <Field label="Titulación" value={form.titulacion} onChange={(v) => updateForm("titulacion", v)} disabled={disabled} />
                </Stack>
              )}

              {tab === 1 && (
                <Stack spacing={2} sx={{ pt: 1 }}>
                  {[
                    ["obraSocial", "Obra social"],
                    ["obraSocialAportes", "Obra social (aportes)"],
                    ["empresaCobertura", "Empresa cobertura"],
                    ["numeroSocio", "Nº socio"],
                    ["planCobertura", "Plan"],
                    ["grupoSanguineo", "Grupo sanguíneo"],
                    ["alergias", "Alergias"],
                    ["afeccionesCronicas", "Afecciones crónicas"],
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      value={form.datosMedicos?.[key]}
                      onChange={(v) => updateForm(`datosMedicos.${key}`, v)}
                      disabled={disabled}
                    />
                  ))}
                </Stack>
              )}

              {tab === 2 && (
                <Stack spacing={2} sx={{ pt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Contacto principal
                  </Typography>
                  {["nombre", "parentesco", "domicilio", "telefonos"].map((k) => (
                    <Field
                      key={k}
                      label={k}
                      value={form.contactoPrincipal?.[k]}
                      onChange={(v) => updateForm(`contactoPrincipal.${k}`, v)}
                      disabled={disabled}
                    />
                  ))}
                  <Typography variant="subtitle2" color="text.secondary">
                    Contacto alternativo
                  </Typography>
                  {["nombre", "parentesco", "domicilio", "telefonos"].map((k) => (
                    <Field
                      key={k}
                      label={k}
                      value={form.contactoAlternativo?.[k]}
                      onChange={(v) => updateForm(`contactoAlternativo.${k}`, v)}
                      disabled={disabled}
                    />
                  ))}
                </Stack>
              )}

              {tab === 3 && (
                <Stack spacing={2} sx={{ pt: 1 }}>
                  {[
                    ["banco", "Banco"],
                    ["tipoCuenta", "Tipo de cuenta"],
                    ["numeroCuenta", "Nº cuenta"],
                    ["cbu", "CBU"],
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      value={form.datosBancarios?.[key]}
                      onChange={(v) => updateForm(`datosBancarios.${key}`, v)}
                      disabled={disabled}
                    />
                  ))}
                </Stack>
              )}

              {tab === 4 && (
                <Stack spacing={2} sx={{ pt: 1 }}>
                  {form.equipamiento.map((eq, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Equipo {idx + 1}
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Field label="Producto" value={eq.producto} onChange={(v) => updateForm(`equipamiento.${idx}.producto`, v)} disabled={disabled} />
                        <Field label="Marca" value={eq.marca} onChange={(v) => updateForm(`equipamiento.${idx}.marca`, v)} disabled={disabled} />
                        <Field label="Modelo / Serie" value={eq.modeloSerie} onChange={(v) => updateForm(`equipamiento.${idx}.modeloSerie`, v)} disabled={disabled} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}

              {tab === 5 && (
                <Stack spacing={2} sx={{ pt: 1 }}>
                  <FormControl fullWidth size="small" disabled={disabled}>
                    <InputLabel>Dependencia (Cliente)</InputLabel>
                    <Select
                      value={form.clienteAsignado?.nombre || ""}
                      label="Dependencia (Cliente)"
                      onChange={(e) => updateForm("clienteAsignado.nombre", e.target.value)}
                    >
                      <MenuItem value="">—</MenuItem>
                      {clients.map((c) => (
                        <MenuItem key={c._id || c.nombre} value={c.nombre}>
                          {c.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Field
                    label="Posición"
                    value={form.clienteAsignado?.posicion}
                    onChange={(v) => updateForm("clienteAsignado.posicion", v)}
                    disabled={disabled}
                  />
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cerrar
          </Button>
          {canEdit && selected?._editMode && (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ bgcolor: PRIMARY, "&:hover": { bgcolor: PRIMARY_HOVER } }}
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}

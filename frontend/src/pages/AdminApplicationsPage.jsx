// src/pages/admin/AdminApplicationsPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box, Container, Stack, Paper, Typography, LinearProgress, Divider, Pagination,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Chip, Menu, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DownloadIcon from "@mui/icons-material/Download";
import CircularProgress from "@mui/material/CircularProgress";
import { listApplicationsApi, updateApplicationApi, getApplicationCvDownloadUrlApi } from "../api/applications";

// --- Constantes
const APP_STATES = ["Enviada", "En revisión", "Preseleccionado", "Rechazado", "Contratado"];

const STATE_COLORS = {
  Enviada: "default",
  "En revisión": "info",
  Preseleccionado: "warning",
  Rechazado: "error",
  Contratado: "success",
};

// Tamaño unificado de los chips
const CHIP_WIDTH = 140;
const CHIP_HEIGHT = 28;

/* ================== Filtros UI ================== */
function ApplicationsFilters({ value, onChange }) {
  const handle = (k, v) => onChange({ ...value, [k]: v });

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        fullWidth
        label="ID/Título de Búsqueda"
        value={value.search}
        onChange={(e) => handle("search", e.target.value)}
        placeholder="ObjectId o título"
      />

      <FormControl fullWidth>
        <InputLabel>Estado</InputLabel>
        <Select
          label="Estado"
          value={value.state}
          onChange={(e) => handle("state", e.target.value)}
        >
          <MenuItem value="">Todos</MenuItem>
          {APP_STATES.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Buscar (nombre, apellido, email, mensaje)"
        value={value.q}
        onChange={(e) => handle("q", e.target.value)}
      />
    </Stack>
  );
}

/* ================== Tabla ================== */
function ApplicationsTable({ rows, onViewDetail, onChangeState }) {
  const [anchor, setAnchor] = useState(null);
  const [current, setCurrent] = useState(null);

  const openMenu = (e, row) => { setAnchor(e.currentTarget); setCurrent(row); };
  const closeMenu = () => { setAnchor(null); setCurrent(null); };

  const changeTo = async (state) => {
    if (current?._id) await onChangeState(current._id, state);
    closeMenu();
  };

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Postulante</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Búsqueda</TableCell>
            <TableCell sx={{ width: CHIP_WIDTH + 24 }}>Estado</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row._id} hover>
              <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
              <TableCell>{row.cvSnapshot?.nombre} {row.cvSnapshot?.apellido}</TableCell>
              <TableCell>{row.cvSnapshot?.email}</TableCell>
              <TableCell>
                <div style={{ fontWeight: 600 }}>{row.search?.titulo || row.search?._id}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {row.search?.ubicacion} · {row.search?.area} · {row.search?.estado}
                </div>
              </TableCell>
              <TableCell sx={{ width: CHIP_WIDTH + 24 }}>
                <Chip
                  size="small"
                  label={row.state}
                  color={STATE_COLORS[row.state] ?? "default"}
                  variant="filled"
                  sx={{
                    width: CHIP_WIDTH,
                    height: CHIP_HEIGHT,
                    borderRadius: "999px",
                    fontWeight: 600,
                    "& .MuiChip-label": {
                      width: "100%",
                      textAlign: "center",
                      px: 0,
                      whiteSpace: "nowrap",
                    },
                  }}
                />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title="Ver detalle">
                    <IconButton onClick={() => onViewDetail(row)}>
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cambiar estado">
                    <IconButton onClick={(e) => openMenu(e, row)}>
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Menu anchorEl={anchor} open={!!anchor} onClose={closeMenu}>
        {APP_STATES.filter((s) => s !== current?.state).map((s) => (
          <MenuItem key={s} onClick={() => changeTo(s)}>{s}</MenuItem>
        ))}
      </Menu>
    </>
  );
}

/* ================== Modal Detalle ================== */
function ApplicationDetailDialog({ open, onClose, application }) {
  if (!application) return null;
  const cv = application?.cvSnapshot || {};
  const search = application?.search || {};
  // 1. Verificamos si existe un ID de archivo en el proveedor (OneDrive)
  const cvProviderId = application?.cvSnapshot?.cvFile?.providerId;
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!application?._id) return;
    setIsDownloading(true);
    try {
      // Llamamos a la API segura que nos devuelve la URL
      const { data } = await getApplicationCvDownloadUrlApi(application._id);
      if (data.downloadUrl) {
        // Abrimos la URL en una nueva pestaña para iniciar la descarga
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error("Error al obtener la URL de descarga:", error);
      alert("No se pudo obtener el enlace de descarga.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Detalle de Postulación</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="text.secondary">
          {new Date(application?.createdAt).toLocaleString()}
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <div>
            <Typography variant="subtitle2">Estado</Typography>
            <Chip
              label={application?.state}
              size="small"
              color={STATE_COLORS[application?.state] || "default"}
              sx={{ mt: 0.5 }}
            />
          </div>

          <div>
            <Typography variant="subtitle2">Postulante</Typography>
            <Stack>
              <Typography>{cv.nombre} {cv.apellido}</Typography>
              <Typography variant="body2" color="text.secondary">{cv.email}</Typography>
              <Typography variant="body2" color="text.secondary">{cv.telefono}</Typography>
              <Typography variant="body2" color="text.secondary">{cv.linkedin}</Typography>
              <Typography variant="body2">
                Área: {cv.areaInteres} · Nivel: {cv.nivelAcademico}
              </Typography>
            </Stack>
          </div>

          <div>
            <Typography variant="subtitle2">Búsqueda</Typography>
            <Stack>
              <Typography>{search.titulo || search._id}</Typography>
              <Typography variant="body2" color="text.secondary">
                {search.ubicacion} · {search.area} · {search.estado}
              </Typography>
            </Stack>
          </div>

          {application?.message && (
            <div>
              <Typography variant="subtitle2">Mensaje del postulante</Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{application.message}</Typography>
            </div>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Cerrar</Button>
        {/* 2. El botón ahora usa un handler onClick */}
        {cvProviderId ? (
          <Button
            variant="contained"
            startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? "Obteniendo..." : "Descargar CV"}
          </Button>
        ) : (
          <Tooltip title="El postulante no adjuntó un archivo de CV en esta postulación.">
            {/* El span es necesario para que el Tooltip funcione en un botón deshabilitado */}
            <span>
              <Button variant="contained" startIcon={<DownloadIcon />} disabled>
                Descargar CV
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );
}

/* ================== Página ================== */
export default function AdminApplicationsPage() {
  const [all, setAll] = useState([]);          // todo lo que viene del back
  const [items, setItems] = useState([]);      // página actual
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ state: "", search: "", q: "" });
  const [selected, setSelected] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // 1) Trae TODO (API sin params, tal cual la tenés)
  async function fetchData() {
    setLoading(true);
    try {
      const { data } = await listApplicationsApi();
      const list = Array.isArray(data?.items) ? data.items : [];
      setAll(list);
      // NOTA: total se recalcula luego según filtros
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // 2) Aplica filtros en el front y pagina
  useEffect(() => {
    const q = (filters.q || "").toLowerCase().trim();
    const s = (filters.search || "").toLowerCase().trim();
    const state = filters.state || "";

    const filtered = all.filter((row) => {
      // estado
      if (state && row.state !== state) return false;

      // search: por id o por título
      if (s) {
        const sid = (row.search?._id || "").toString().toLowerCase();
        const stitle = (row.search?.titulo || "").toLowerCase();
        if (!sid.includes(s) && !stitle.includes(s)) return false;
      }

      // q: nombre/apellido/email/mensaje
      if (q) {
        const nombre = (row.cvSnapshot?.nombre || "").toLowerCase();
        const apellido = (row.cvSnapshot?.apellido || "").toLowerCase();
        const email = (row.cvSnapshot?.email || "").toLowerCase();
        const msg = (row.message || "").toLowerCase();
        if (
          !nombre.includes(q) &&
          !apellido.includes(q) &&
          !email.includes(q) &&
          !msg.includes(q)
        ) return false;
      }

      return true;
    });

    setTotal(filtered.length);
    const start = (page - 1) * limit;
    setItems(filtered.slice(start, start + limit));
  }, [all, filters, page, limit]);

  const handleChangeState = async (applicationId, newState) => {
    try {
      await updateApplicationApi(applicationId, { state: newState });
      await fetchData(); // refresca la lista completa
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={400}>Gestión de Postulaciones</Typography>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <ApplicationsFilters value={filters} onChange={setFilters} />
        </Paper>

        <Paper variant="outlined" sx={{ p: 0 }}>
          {loading && <LinearProgress />}
          <Box sx={{ p: 2 }}>
            <ApplicationsTable
              rows={items}
              onViewDetail={setSelected}
              onChangeState={handleChangeState}
            />
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Typography variant="body2">Total: {total}</Typography>

              <Stack direction="row" alignItems="center" spacing={2}>
                <TextField
                  select
                  size="small"
                  label="Por pág."
                  value={limit}
                  onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}
                  sx={{ minWidth: 120 }}
                >
                  {[10, 20, 50, 100].map(n => (
                    <MenuItem key={n} value={n}>{n}</MenuItem>
                  ))}
                </TextField>

                <Pagination page={page} count={totalPages} onChange={(_, p) => setPage(p)} />
              </Stack>
            </Stack>
          </Box>
        </Paper>
      </Stack>

      <ApplicationDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        application={selected}
      />
    </Container>
  );
}

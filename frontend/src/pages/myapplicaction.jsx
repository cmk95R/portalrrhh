import React, { useEffect, useContext,useMemo, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Container,
  Grid,
  Stack,
  IconButton,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
  Button,
  Avatar,
  Divider,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Skeleton,
  Pagination,
  InputAdornment,
  Link as MUILink,
  Snackbar,
  Alert
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import WorkIcon from "@mui/icons-material/Work";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SearchIcon from "@mui/icons-material/Search";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import { Link as RouterLink } from "react-router-dom";

// APIs
import { myApplicationsApi, withdrawApplicationApi } from "../api/applications";
import { AuthContext } from "../context/AuthContext"; // 1. Importar el AuthContext
import { profileApi } from "../api/auth"; // API para obtener el perfil del usuario

const statusMap = {
  accepted: { label: "Aprobada", color: "success" },
  approved: { label: "Aprobada", color: "success" },
  hired: { label: "Contratado/a", color: "success" },
  rejected: { label: "Rechazada", color: "error" },
  declined: { label: "Rechazada", color: "error" },
  withdrawn: { label: "Retirada", color: "default" },
  interviewing: { label: "Entrevista", color: "info" },
  interview: { label: "Entrevista", color: "info" },
  viewed: { label: "Visto", color: "secondary" },
  pending: { label: "En revisión", color: "warning" },
  submitted: { label: "En revisión", color: "warning" },
  in_review: { label: "En revisión", color: "warning" },
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
}

function normalize(app) {
  const s = app?.search && typeof app.search === "object" ? app.search : {};
  const id = (typeof app?.search === "string" && app.search) || s?._id || null;
  const title = s?.titulo || "Búsqueda";
  const company = s?.area || "";
  const location = s?.ubicacion || null;
  const createdAt = app?.createdAt || null;
  const state = (app?.state || "pending").toString().toLowerCase();
  const logoUrl = s?.logo || null;

  return { id, title, company, location, createdAt, state, logoUrl, raw: app };
}

export default function MyApplications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [statusOptions, setStatusOptions] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1); 
  const [snack, setSnack] = useState({ open: false, severity: "success", msg: "" });
  const [user, setUser] = useState(null);
  const PER_PAGE = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: appData }, { data: profileData }] = await Promise.all([
        myApplicationsApi(),
        profileApi()
      ]);

      const arr = Array.isArray(appData) ? appData : appData?.items || [];
      setItems(arr);
      setUser(profileData?.user || null);

      const estados = arr.map(app => (app.state || "pending").toLowerCase());
      setStatusOptions(["ALL", ...Array.from(new Set(estados))]);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Error inesperado";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Obtener el usuario del contexto
  const { user: authUser } = useContext(AuthContext);

  useEffect(() => {
    // 3. Solo ejecutar fetchData si hay un usuario autenticado
    if (authUser) {
      fetchData();
    }
  }, [fetchData, authUser]);

  const normalized = useMemo(() => items.map(normalize), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return normalized.filter(({ title, company, state }) => {
      const passesStatus = statusFilter === "ALL" || state === statusFilter;
      const passesQuery = !q || title.toLowerCase().includes(q) || (company || "").toLowerCase().includes(q);
      return passesStatus && passesQuery;
    });
  }, [normalized, statusFilter, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, query]);

  const handleRetirarPostulacion = async (applicationId, applicationTitle) => {
    if (window.confirm(`¿Estás seguro de que quieres retirar tu postulación a "${applicationTitle}"?`)) {
      try {
        await withdrawApplicationApi(applicationId);
        setSnack({ open: true, severity: "success", msg: "Postulación retirada con éxito." });
        fetchData();
      } catch (e) {
        const msg = e?.response?.data?.message || "No se pudo retirar la postulación.";
        setSnack({ open: true, severity: "error", msg });
      }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Título y refresco */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Mis postulaciones</Typography>
          <Typography variant="body2" color="text.secondary">Acá vas a ver todas las búsquedas a las que te postulaste.</Typography>
        </Box>
        <Tooltip title="Actualizar">
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Filtros */}
      <Box mt={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              fullWidth
              label="Buscar por título o empresa"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Estado</InputLabel>
              <Select
                labelId="status-label"
                label="Estado"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {statusOptions.map(opt => (
                  <MenuItem value={opt} key={opt}>
                    {opt === "ALL" ? "Todas" : (statusMap[opt]?.label || opt)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Contenido principal */}
      <Box mt={3}>
        {error && (
          <Card sx={{ mb: 3 }}><CardContent><Typography color="error">{error}</Typography></CardContent></Card>
        )}

        {loading && !items.length && (
          <Grid container spacing={2} mt={0.5}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} md={6} lg={4} key={`sk-${i}`}>
                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && !error && filtered.length === 0 && (
          <Card sx={{ textAlign: "center", py: 6 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>Aún no tenés postulaciones</Typography>
              <Button component={RouterLink} to="/searches" variant="contained" startIcon={<WorkIcon />}>Explorar búsquedas</Button>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={2} mt={0.5}>
          {paginated.map((item, idx) => {
            const { title, company, location, createdAt, state } = item;
            const statusCfg = statusMap[state] || statusMap.pending;

            const recruiterEmail = "rrhh@asytec.ar";
            const subject = `Consulta sobre mi postulación a: ${title}`;
            const body = `Hola equipo de RRHH de ASYTEC,\n\nQuería hacer una consulta sobre mi postulación a la búsqueda "${title}".\n\n[Escribe tu consulta aquí]\n\nSaludos cordiales,\n${user?.nombre || ''} ${user?.apellido || ''}`;
            const mailtoLink = `mailto:${recruiterEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            return (
              <Grid item xs={12} md={6} lg={4} key={`${item.raw?._id}-${idx}`}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: 3 }}>
                  <CardHeader
                    avatar={<Avatar><WorkIcon fontSize="small" /></Avatar>}
                    title={<Typography variant="h6" fontWeight={700}>{title}</Typography>}
                    subheader={
                      <Stack direction="row" spacing={1} alignItems="center" color="text.secondary" mt={0.5}>
                        <Typography variant="body2">{company || "—"}</Typography>
                        {location && (<><span>•</span><Typography variant="body2">{location}</Typography></>)}
                      </Stack>
                    }
                  />
                  <CardContent>
                    <Chip size="small" color={statusCfg.color} label={statusCfg.label} />
                    <Stack direction="row" spacing={1.5} alignItems="center" color="text.secondary" mt={2}>
                      <CalendarTodayIcon fontSize="small" />
                      <Typography variant="body2">Postulado: <strong>{formatDate(createdAt)}</strong></Typography>
                    </Stack>
                  </CardContent>
                  <Box flexGrow={1} />
                  <Divider />
                  <CardActions sx={{ justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1}>
                      {state !== 'withdrawn' && state !== 'rejected' && state !== 'hired' && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleRetirarPostulacion(item.raw?._id, title)}
                        >
                          Retirar
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<MailOutlineIcon />}
                        component="a"
                        href={mailtoLink}
                        target="_blank"
                      >
                        Contactar
                      </Button>
                    </Stack>
                    <MUILink component={RouterLink} to={`/searches/${item.id}`} underline="hover" sx={{ fontSize: 14 }}>
                      Ver detalle
                    </MUILink>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {filtered.length > PER_PAGE && (
          <Stack alignItems="center" mt={4}>
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, p) => setPage(p)}
              shape="rounded"
              color="primary"
            />
          </Stack>
        )}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
// src/pages/AdminCandidatesGrid.jsx
import * as React from "react";
import {
  Container, Stack, Paper, Typography, TextField, MenuItem, Tooltip, IconButton,
  Snackbar, Alert, CircularProgress
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import DownloadIcon from "@mui/icons-material/Download";
import { listUsersWithCvApi, getUserCvDownloadUrlApi } from "../api/users";

const fmtDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleDateString();
};

const normalizeLink = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

export default function AdminCandidatesGrid() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [snack, setSnack] = React.useState({ open: false, severity: "success", msg: "" });
  const [filters, setFilters] = React.useState({ q: "", areaInteres: "all" });
  const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = React.useState(0);
  const [downloadingId, setDownloadingId] = React.useState(null);

  const fetchCandidates = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        rol: "user", // Solo queremos candidatos
        q: filters.q,
        areaInteres: filters.areaInteres === "all" ? "" : filters.areaInteres,
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
      };
      const { data } = await listUsersWithCvApi(params);
      const mapped = (data?.items || []).map(u => ({
        id: u._id,
        publicId: u.publicId,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        ubicacion: [u.direccion?.localidad?.nombre, u.direccion?.provincia?.nombre].filter(Boolean).join(", "),
        area: u.cvArea,
        nivel: u.cvNivel,
        linkedin: u.cvLinkedin,
        telefono: u.telefono || u.cvTelefono,
        creado: u.createdAt,
        hasCv: u.hasCv,
      }));
      setRows(mapped);
      setRowCount(data?.total || 0);
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        severity: "error",
        msg: e?.response?.data?.message || "No se pudieron cargar los candidatos",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, paginationModel]);

  React.useEffect(() => {
    const timer = setTimeout(() => fetchCandidates(), 500); // debounce para no llamar a la API en cada tecla
    return () => clearTimeout(timer);
  }, [fetchCandidates]);

  const allAreas = React.useMemo(() => {
    const set = new Set(rows.map(r => r.area).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const handleDownloadCv = async (row) => {
    setDownloadingId(row.id);
    try {
      const { data } = await getUserCvDownloadUrlApi(row.id);
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error("La URL de descarga no fue encontrada.");
      }
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: e?.response?.data?.message || "No se pudo obtener el CV" });
    } finally {
      setDownloadingId(null);
    }
  };

  const columns = [
    { field: "publicId", headerName: "ID", width: 120 },
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 100 },
    { field: "apellido", headerName: "Apellido", flex: 1, minWidth: 100  },
    { field: "email", headerName: "Email", flex: 1.2, minWidth: 220 },
    {
      field: "ubicacion",
      headerName: "Ubicación",
      flex: 1.2,
      minWidth: 150,
      renderCell: (p) => p.value ? p.value : <span style={{ opacity: .6 }}>—</span>
    },
    // {
    //   field: "area",
    //   headerName: "Área de interés",
    //   width: 150,
    //   renderCell: (p) => p.value ? p.value : <span style={{ opacity: .6 }}>—</span>
    // },
    // {
    //   field: "nivel",
    //   headerName: "Nivel académico",
    //   width: 220,
    //   renderCell: (p) => p.value ? p.value : <span style={{ opacity: .6 }}>—</span>
    // },
    {
      field: "linkedin",
      headerName: "LinkedIn",
      flex: 0.5,
      minWidth: 120,
      renderCell: (p) =>
        p.value
          ? <a href={normalizeLink(p.value)} target="_blank" rel="noreferrer">{p.value}</a>
          : <span style={{ opacity: .6 }}>—</span>
    },
    {
      field: "telefono",
      headerName: "Teléfono",
      flex: 0.5,
      minWidth: 120,
      renderCell: (p) => p.value ? p.value : <span style={{ opacity: .6 }}>—</span>
    },
    {
      field: "creado",
      headerName: "Creado",
      width: 120,
      valueGetter: (value, row) => fmtDate(row.creado)
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 100,
      align: "center",
      sortable: false,
      renderCell: (params) => (
        params.row.hasCv ? (
          <Tooltip title="Descargar CV">
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleDownloadCv(params.row)}
              disabled={downloadingId === params.row.id}
            >
              {downloadingId === params.row.id ? <CircularProgress size={20} /> : <DownloadIcon />}
            </IconButton>
          </Tooltip>
        ) : null
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 400 }}>
        Gestión de Candidatos
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }} elevation={2}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
          <TextField
            label="Buscar (nombre, apellido o email)"
            value={filters.q}
            onChange={(e) => setFilters(f => ({ ...f, q: e.target.value }))}
            fullWidth
          />

          <TextField
            select
            label="Área"
            value={filters.areaInteres}
            onChange={(e) => setFilters(f => ({ ...f, areaInteres: e.target.value }))}
            sx={{ width: 150 }}
          >
            {allAreas.map((a) => (
              <MenuItem key={a} value={a}>
                {a === "all" ? "Todas" : a}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <Paper sx={{ height: 560, borderRadius: 2 }} elevation={2}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
            <CircularProgress />
          </Stack>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={rowCount}
            loading={loading}
            pageSizeOptions={[5, 10, 25]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode="server"
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
          />
        )}
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
    </Container>
  );
}

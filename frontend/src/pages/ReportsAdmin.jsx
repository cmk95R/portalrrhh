import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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
  Typography,
  Alert,
} from "@mui/material";
import {
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import dayjs from "dayjs";
import {
  getAttendanceReportApi,
  getAttendanceReportSummaryApi,
  exportAttendanceReportApi,
  getRequestReportApi,
  getRequestReportSummaryApi,
  exportRequestReportApi,
} from "../api/reports";

const PRIMARY = "#173487";
const PRIMARY_HOVER = "#2A4DB8";

const REQUEST_TYPES = [
  { value: "", label: "Todos los tipos" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "dia_estudio", label: "Día de Estudio" },
  { value: "mudanza", label: "Mudanza" },
  { value: "maternidad", label: "Maternidad" },
  { value: "paternidad", label: "Paternidad" },
  { value: "enfermedad", label: "Enfermedad" },
  { value: "otro", label: "Otro" },
];

const REQUEST_STATUS = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "pendiente_firma", label: "Pendiente firma" },
  { value: "aprobada", label: "Aprobada" },
  { value: "rechazada", label: "Rechazada" },
  { value: "cancelada", label: "Cancelada" },
];

const ATT_ESTADOS = [
  { value: "", label: "Todos" },
  { value: "presente", label: "Presente" },
  { value: "ausente", label: "Ausente" },
  { value: "no-aplica", label: "No aplica" },
];

function downloadBlob(blob, fallbackName) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  a.click();
  window.URL.revokeObjectURL(url);
}

/** @param {import('axios').AxiosResponse<Blob>} res */
function downloadFromResponse(res, fallbackName) {
  const cd = res.headers["content-disposition"] || res.headers["Content-Disposition"];
  let name = fallbackName;
  if (cd) {
    const star = /filename\*=UTF-8''([^;\n]+)/i.exec(cd);
    const plain = /filename="([^"]+)"/i.exec(cd);
    const plain2 = /filename=([^;\s]+)/i.exec(cd);
    try {
      if (star?.[1]) name = decodeURIComponent(star[1].trim());
      else if (plain?.[1]) name = plain[1];
      else if (plain2?.[1]) name = plain2[1].replace(/"/g, "");
    } catch {
      /* usar fallback */
    }
  }
  downloadBlob(res.data, name);
}

/** @param {unknown} err */
async function messageFromExportError(err) {
  const res = err?.response;
  if (res?.data instanceof Blob) {
    const text = await res.data.text();
    try {
      const j = JSON.parse(text);
      return j.message || text;
    } catch {
      return text || err?.message || "Error al exportar.";
    }
  }
  return err?.response?.data?.message || err?.message || "Error al exportar.";
}

export default function ReportsAdmin() {
  const [tab, setTab] = useState(0);

  const defaultFrom = useMemo(() => dayjs().startOf("month").format("YYYY-MM-DD"), []);
  const defaultTo = useMemo(() => dayjs().format("YYYY-MM-DD"), []);

  // --- Asistencias ---
  const [attFrom, setAttFrom] = useState(defaultFrom);
  const [attTo, setAttTo] = useState(defaultTo);
  const [attEstado, setAttEstado] = useState("");
  const [attMotivo, setAttMotivo] = useState("");
  const [attQ, setAttQ] = useState("");
  const [attPage, setAttPage] = useState(0);
  const [attRowsPerPage, setAttRowsPerPage] = useState(20);
  const [attItems, setAttItems] = useState([]);
  const [attTotal, setAttTotal] = useState(0);
  const [attSummary, setAttSummary] = useState({ byEstado: [], byMotivo: [] });
  const [attLoading, setAttLoading] = useState(false);
  const [attError, setAttError] = useState("");

  // --- Solicitudes ---
  const [reqFrom, setReqFrom] = useState(defaultFrom);
  const [reqTo, setReqTo] = useState(defaultTo);
  const [reqTipo, setReqTipo] = useState("");
  const [reqEstado, setReqEstado] = useState("");
  const [reqQ, setReqQ] = useState("");
  const [reqPage, setReqPage] = useState(0);
  const [reqRowsPerPage, setReqRowsPerPage] = useState(20);
  const [reqItems, setReqItems] = useState([]);
  const [reqTotal, setReqTotal] = useState(0);
  const [reqSummary, setReqSummary] = useState({ byTipo: [], byEstado: [] });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");

  const [exporting, setExporting] = useState(null);

  const loadAttendance = useCallback(async () => {
    setAttLoading(true);
    setAttError("");
    try {
      const params = {
        page: attPage + 1,
        limit: attRowsPerPage,
        sortBy: "fecha",
        sortDir: "desc",
        dateFrom: attFrom || undefined,
        dateTo: attTo || undefined,
        estado: attEstado || undefined,
        motivo: attMotivo.trim() || undefined,
        q: attQ.trim() || undefined,
      };
      const [listRes, sumRes] = await Promise.all([
        getAttendanceReportApi(params),
        getAttendanceReportSummaryApi({
          dateFrom: attFrom || undefined,
          dateTo: attTo || undefined,
        }),
      ]);
      setAttItems(listRes.data.items || []);
      setAttTotal(listRes.data.total || 0);
      setAttSummary(sumRes.data || { byEstado: [], byMotivo: [] });
    } catch (e) {
      setAttError(e?.response?.data?.message || e?.message || "Error al cargar asistencias.");
    } finally {
      setAttLoading(false);
    }
  }, [attPage, attRowsPerPage, attFrom, attTo, attEstado, attMotivo, attQ]);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    setReqError("");
    try {
      const params = {
        page: reqPage + 1,
        limit: reqRowsPerPage,
        dateFrom: reqFrom || undefined,
        dateTo: reqTo || undefined,
        tipo: reqTipo || undefined,
        estado: reqEstado || undefined,
        q: reqQ.trim() || undefined,
      };
      const [listRes, sumRes] = await Promise.all([
        getRequestReportApi(params),
        getRequestReportSummaryApi({
          dateFrom: reqFrom || undefined,
          dateTo: reqTo || undefined,
        }),
      ]);
      setReqItems(listRes.data.items || []);
      setReqTotal(listRes.data.total || 0);
      setReqSummary(sumRes.data || { byTipo: [], byEstado: [] });
    } catch (e) {
      setReqError(e?.response?.data?.message || e?.message || "Error al cargar solicitudes.");
    } finally {
      setReqLoading(false);
    }
  }, [reqPage, reqRowsPerPage, reqFrom, reqTo, reqTipo, reqEstado, reqQ]);

  useEffect(() => {
    if (tab === 0) loadAttendance();
  }, [tab, loadAttendance]);

  useEffect(() => {
    if (tab === 1) loadRequests();
  }, [tab, loadRequests]);

  const attExportParams = useMemo(
    () => ({
      sortBy: "fecha",
      sortDir: "desc",
      dateFrom: attFrom || undefined,
      dateTo: attTo || undefined,
      estado: attEstado || undefined,
      motivo: attMotivo.trim() || undefined,
      q: attQ.trim() || undefined,
    }),
    [attFrom, attTo, attEstado, attMotivo, attQ]
  );

  const reqExportParams = useMemo(
    () => ({
      dateFrom: reqFrom || undefined,
      dateTo: reqTo || undefined,
      tipo: reqTipo || undefined,
      estado: reqEstado || undefined,
      q: reqQ.trim() || undefined,
    }),
    [reqFrom, reqTo, reqTipo, reqEstado, reqQ]
  );

  const handleExportAttendance = async (format) => {
    const key = `att-${format}`;
    setExporting(key);
    try {
      const res = await exportAttendanceReportApi({ ...attExportParams, format });
      downloadFromResponse(res, `reporte_asistencias.${format}`);
    } catch (e) {
      setAttError(await messageFromExportError(e));
    } finally {
      setExporting(null);
    }
  };

  const handleExportRequests = async (format) => {
    const key = `req-${format}`;
    setExporting(key);
    try {
      const res = await exportRequestReportApi({ ...reqExportParams, format });
      downloadFromResponse(res, `reporte_solicitudes.${format}`);
    } catch (e) {
      setReqError(await messageFromExportError(e));
    } finally {
      setExporting(null);
    }
  };

  const btnSx = {
    bgcolor: PRIMARY,
    "&:hover": { bgcolor: PRIMARY_HOVER },
    textTransform: "none",
  };

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
          <AssessmentIcon sx={{ color: PRIMARY, fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: PRIMARY }}>
              Reportes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Asistencias (presentes, ausentes y motivos) y solicitudes (vacaciones, día de estudio, enfermedad,
              etc.). Exportá en CSV, Excel o PDF.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2,
            pt: 1,
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
            "& .Mui-selected": { color: `${PRIMARY} !important` },
            "& .MuiTabs-indicator": { backgroundColor: PRIMARY },
          }}
        >
          <Tab label="Asistencias" />
          <Tab label="Solicitudes" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            {attError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAttError("")}>
                {attError}
              </Alert>
            )}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
              <TextField
                label="Desde"
                type="date"
                size="small"
                value={attFrom}
                onChange={(e) => setAttFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
              <TextField
                label="Hasta"
                type="date"
                size="small"
                value={attTo}
                onChange={(e) => setAttTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={attEstado}
                  label="Estado"
                  onChange={(e) => setAttEstado(e.target.value)}
                >
                  {ATT_ESTADOS.map((o) => (
                    <MenuItem key={o.value || "all"} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Motivo (contiene)"
                size="small"
                value={attMotivo}
                onChange={(e) => setAttMotivo(e.target.value)}
                placeholder="Ej: Enfermedad, Vacaciones…"
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="Buscar nombre/apellido"
                size="small"
                value={attQ}
                onChange={(e) => setAttQ(e.target.value)}
                sx={{ minWidth: 200, flex: 1 }}
              />
              <Button
                variant="contained"
                startIcon={attLoading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                onClick={() => loadAttendance()}
                disabled={attLoading}
                sx={btnSx}
              >
                Actualizar
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
              <Typography variant="subtitle2" sx={{ width: "100%", color: "text.secondary" }}>
                Resumen del período
              </Typography>
              {(attSummary.byEstado || []).map((s) => (
                <Chip
                  key={s.estado}
                  label={`${s.estado || "?"}: ${s.count}`}
                  size="small"
                  sx={{ bgcolor: "rgba(23, 52, 135, 0.08)", color: PRIMARY, fontWeight: 600 }}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
              {(attSummary.byMotivo || []).slice(0, 12).map((m) => (
                <Chip
                  key={String(m.motivo)}
                  label={`${m.motivo}: ${m.count}`}
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: PRIMARY, color: PRIMARY }}
                />
              ))}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ width: "100%", mb: 0.5 }}>
                Exportar
              </Typography>
              {["csv", "xlsx", "pdf"].map((fmt) => (
                <Button
                  key={fmt}
                  size="small"
                  variant="outlined"
                  onClick={() => handleExportAttendance(fmt)}
                  disabled={!!exporting}
                  startIcon={exporting === `att-${fmt}` ? undefined : <DownloadIcon />}
                  sx={{
                    borderColor: PRIMARY,
                    color: PRIMARY,
                    textTransform: "none",
                    minWidth: 100,
                    "&:hover": { borderColor: PRIMARY_HOVER, bgcolor: "rgba(23, 52, 135, 0.06)" },
                  }}
                >
                  {exporting === `att-${fmt}` ? (
                    <CircularProgress size={18} sx={{ color: PRIMARY }} />
                  ) : (
                    fmt.toUpperCase()
                  )}
                </Button>
              ))}
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(23, 52, 135, 0.06)" }}>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Empleado</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Motivo</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Nota</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attLoading && !attItems.length ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <CircularProgress sx={{ color: PRIMARY }} />
                      </TableCell>
                    </TableRow>
                  ) : attItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No hay registros con estos filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attItems.map((row) => (
                      <TableRow key={row._id} hover>
                        <TableCell>{row.fecha}</TableCell>
                        <TableCell>
                          {row.nombre} {row.apellido}
                        </TableCell>
                        <TableCell>{row.estado}</TableCell>
                        <TableCell>{row.motivo || "—"}</TableCell>
                        <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.nota || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={attTotal}
              page={attPage}
              onPageChange={(_, p) => setAttPage(p)}
              rowsPerPage={attRowsPerPage}
              onRowsPerPageChange={(e) => {
                setAttRowsPerPage(parseInt(e.target.value, 10));
                setAttPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Filas"
            />
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            {reqError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setReqError("")}>
                {reqError}
              </Alert>
            )}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
              <TextField
                label="Desde"
                type="date"
                size="small"
                value={reqFrom}
                onChange={(e) => setReqFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
              <TextField
                label="Hasta"
                type="date"
                size="small"
                value={reqTo}
                onChange={(e) => setReqTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 160 }}
              />
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Tipo</InputLabel>
                <Select value={reqTipo} label="Tipo" onChange={(e) => setReqTipo(e.target.value)}>
                  {REQUEST_TYPES.map((o) => (
                    <MenuItem key={o.value || "all"} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Estado</InputLabel>
                <Select value={reqEstado} label="Estado" onChange={(e) => setReqEstado(e.target.value)}>
                  {REQUEST_STATUS.map((o) => (
                    <MenuItem key={o.value || "all"} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Buscar nombre/apellido/DNI"
                size="small"
                value={reqQ}
                onChange={(e) => setReqQ(e.target.value)}
                sx={{ minWidth: 220, flex: 1 }}
              />
              <Button
                variant="contained"
                startIcon={reqLoading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
                onClick={() => loadRequests()}
                disabled={reqLoading}
                sx={btnSx}
              >
                Actualizar
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1, gap: 1 }}>
              <Typography variant="subtitle2" sx={{ width: "100%", color: "text.secondary" }}>
                Por tipo
              </Typography>
              {(reqSummary.byTipo || []).map((s) => (
                <Chip
                  key={s.tipo}
                  label={`${s.tipo}: ${s.count}`}
                  size="small"
                  sx={{ bgcolor: "rgba(23, 52, 135, 0.08)", color: PRIMARY, fontWeight: 600 }}
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
              <Typography variant="subtitle2" sx={{ width: "100%", color: "text.secondary" }}>
                Por estado
              </Typography>
              {(reqSummary.byEstado || []).map((s) => (
                <Chip
                  key={s.estado}
                  label={`${s.estado}: ${s.count}`}
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: PRIMARY, color: PRIMARY }}
                />
              ))}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ width: "100%", mb: 0.5 }}>
                Exportar
              </Typography>
              {["csv", "xlsx", "pdf"].map((fmt) => (
                <Button
                  key={fmt}
                  size="small"
                  variant="outlined"
                  onClick={() => handleExportRequests(fmt)}
                  disabled={!!exporting}
                  startIcon={exporting === `req-${fmt}` ? undefined : <DownloadIcon />}
                  sx={{
                    borderColor: PRIMARY,
                    color: PRIMARY,
                    textTransform: "none",
                    minWidth: 100,
                    "&:hover": { borderColor: PRIMARY_HOVER, bgcolor: "rgba(23, 52, 135, 0.06)" },
                  }}
                >
                  {exporting === `req-${fmt}` ? (
                    <CircularProgress size={18} sx={{ color: PRIMARY }} />
                  ) : (
                    fmt.toUpperCase()
                  )}
                </Button>
              ))}
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "rgba(23, 52, 135, 0.06)" }}>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Tipo</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Empleado</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Desde</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Hasta</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Días</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: PRIMARY }}>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reqLoading && !reqItems.length ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <CircularProgress sx={{ color: PRIMARY }} />
                      </TableCell>
                    </TableRow>
                  ) : reqItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No hay solicitudes con estos filtros.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reqItems.map((row) => (
                      <TableRow key={row._id} hover>
                        <TableCell>{row.tipo}</TableCell>
                        <TableCell>{row.estado}</TableCell>
                        <TableCell>
                          {row.nombre} {row.apellido}
                        </TableCell>
                        <TableCell>{dayjs(row.fechaInicio).format("DD/MM/YYYY")}</TableCell>
                        <TableCell>{dayjs(row.fechaFin).format("DD/MM/YYYY")}</TableCell>
                        <TableCell>{row.cantidadDias}</TableCell>
                        <TableCell sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {row.motivo || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={reqTotal}
              page={reqPage}
              onPageChange={(_, p) => setReqPage(p)}
              rowsPerPage={reqRowsPerPage}
              onRowsPerPageChange={(e) => {
                setReqRowsPerPage(parseInt(e.target.value, 10));
                setReqPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Filas"
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
}

// src/pages/PublicSearches.jsx

import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  Switch,
  Typography,
  Paper,
  Divider,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

import { listPublicSearchesApi } from "../api/searches"; // <-- usa api/client.js por dentro
import { applyToSearchApi } from "../api/applications"; // si aún no existe, créalo
import { myApplicationsApi } from "../api/applications";
import SearchDetailDialog from "../components/ModalSearches"; // 1. Importar el modal
const STATUS_COLORS = {
  Activa: "success",
  Pausada: "warning",
  Cerrada: "default",
};

export default function PublicSearches() {

  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showActive, setShowActive] = useState(true);

  const [filterType, setFilterType] = useState("Todas"); // "Todas" | "Cerrada" | "Pausada"
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, severity: "success", msg: "" });
  const [applyingId, setApplyingId] = useState(null);
  const [appliedIds, setAppliedIds] = useState(() => new Set());
  const [selectedSearch, setSelectedSearch] = useState(null); // 2. Estado para el modal
  
  const [selectedArea, setSelectedArea] = useState("Todas");

   // Filtrar por área seleccionada
  const rowsFiltradas = useMemo(() => {
    if (selectedArea === "Todas") return rows;
    return rows.filter(s => s.area === selectedArea);
  }, [rows, selectedArea]);

  // Calcular áreas a partir de los datos cargados
  const areas = useMemo(() => {
    const set = new Set(rows.map(s => s.area).filter(Boolean));
    return ["Todas", ...Array.from(set)];
  }, [rows]);

  // Dividir en columnas para el layout
  const mitad = Math.ceil(rowsFiltradas.length / 2);
  const columnas = [rowsFiltradas.slice(0, mitad), rowsFiltradas.slice(mitad)];

  useEffect(() => {
    if (!user) { setAppliedIds(new Set()); return; }
    (async () => {
      try {
        const { data } = await myApplicationsApi(); // { items: [...] }
        const ids = new Set(
          (data?.items || []).map(a => a?.search?._id || a?.search).filter(Boolean)
        );
        setAppliedIds(ids);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user]);
  // Traducir tu UI → parámetro estado del backend
  const estadoParam = useMemo(() => {
    if (showActive) return "Activa";
    if (filterType === "Busquedas Cerradas") return "Cerrada";
    if (filterType === "En Pausa") return "Pausada";
    return undefined; // Todas
  }, [showActive, filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        ...(estadoParam && { estado: estadoParam }), // el controller público ya filtra por estado si lo enviás
        page: 1,
        limit: 100,
      };
      const { data } = await listPublicSearchesApi(params);
      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(
        items.map((s) => ({
          id: s._id,
          titulo: s.titulo,
          area: s.area,
          estado: s.estado,
          ubicacion: s.ubicacion || "",
          descripcion: s.descripcion || "",
          updatedAt: s.updatedAt,
        }))
      );
    } catch (e) {
      console.error(e);
      setSnack({
        open: true,
        severity: "error",
        msg: e?.response?.data?.message || "No se pudieron cargar las búsquedas",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoParam]);

  return (
    <Box sx={{ bgcolor: "#CFE6FF", p: 4, minHeight: "100vh" }}>
      <Typography variant="h5" gutterBottom>
        Busquedas Activas
      </Typography>
      {/* Filtros por área */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Typography variant="body2">Filtrar por área:</Typography>
        {areas.map(area => (
          <Button
            key={area}
            variant={selectedArea === area ? "contained" : "outlined"}
            onClick={() => setSelectedArea(area)}
            size="small"
            sx={{ textTransform: "none" }}
          >
            {area}
          </Button>
        ))}
      </Stack>
      
      {/* Toggle y filtros */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Switch
          checked={showActive}
          onChange={() => setShowActive(!showActive)}
          color="primary"
          inputProps={{ "aria-label": "Búsquedas activas" }}
        />
        <Typography variant="body2">Búsquedas Activas</Typography>
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        {/* <Button
          variant={filterType === "Todas" ? "contained" : "outlined"}
          onClick={() => setFilterType("Todas")}
          sx={{ textTransform: "none" }}
          disabled={showActive} // si está en "Activas", ignora este filtro
        >
          Todas las Búsquedas
        </Button>
        <Button
          variant={filterType === "Busquedas Cerradas" ? "contained" : "outlined"}
          onClick={() => setFilterType("Busquedas Cerradas")}
          sx={{ textTransform: "none" }}
          disabled={showActive}
        >
          Búsquedas Cerradas
        </Button>
        <Button
          variant={filterType === "En Pausa" ? "contained" : "outlined"}
          onClick={() => setFilterType("En Pausa")}
          sx={{ textTransform: "none" }}
          disabled={showActive}
        >
          En Pausa
        </Button> */}

        {/* <Button variant="text" onClick={fetchData} sx={{ ml: "auto" }}>
          Actualizar
        </Button> */}
      </Stack>

      {/* Lista */}

      <Stack direction="row" spacing={2}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: 240, width: "100%" }}>
            <CircularProgress />
          </Stack>
        ) : rows.length === 0 ? (
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: "center", width: "100%" }}>
            <Typography sx={{ opacity: 0.7 }}>No hay resultados para este filtro.</Typography>
          </Paper>
        ) : (
          columnas.map((col, idx) => (
            <Stack key={idx} spacing={2} flex={1}>
              {col.map((item) => (
                <Paper
                  key={item.id}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    bgcolor: "background.paper",
                    minWidth: 0,
                  }}
                  elevation={1}
                >
                  <Stack direction="row" alignItems="center" spacing={2} flex={1}>
                    <PersonOutlineIcon color="primary" sx={{ fontSize: 40 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="primary">
                        {item.area} • #{String(item.id).slice(-6)}
                      </Typography>
                      <Typography fontWeight="bold" variant="subtitle1" color="text.primary">
                        {item.titulo}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.ubicacion || item.descripcion?.slice(0, 120)}
                      </Typography>
                      <Stack direction="row" alignItems="center" sx={{ mt: 1, flexWrap: "wrap", rowGap: 1 }} spacing={1}>
                        <Chip
                          label={item.estado}
                          color={STATUS_COLORS[item.estado] || "default"}
                          size="small"
                          sx={{ fontWeight: "bold" }}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        {(() => {
                          const alreadyApplied = appliedIds.has(item.id);
                          const disabled = alreadyApplied || item.estado !== "Activa" || applyingId === item.id;
                          return (
                            <Button
                              variant={alreadyApplied ? "outlined" : "contained"}
                              color={alreadyApplied ? "success" : "primary"}
                              size="small"
                              startIcon={alreadyApplied ? <CheckCircleOutlineIcon /> : null}
                              disabled={disabled}
                              onClick={async () => {
                                if (!user) return navigate("/login");
                                try {
                                  setApplyingId(item.id);
                                  await applyToSearchApi(item.id, { message: "" });
                                  setAppliedIds(prev => {
                                    const next = new Set(prev);
                                    next.add(item.id);
                                    return next;
                                  });
                                  setSnack({ open: true, severity: "success", msg: "Postulación enviada ✅" });
                                } catch (e) {
                                  const msg = e?.response?.data?.message || "No se pudo postular";
                                  setSnack({ open: true, severity: "error", msg });
                                } finally {
                                  setApplyingId(null);
                                }
                              }}
                            >
                              {alreadyApplied
                                ? "Ya te postulaste"
                                : (applyingId === item.id ? "Postulando..." : "Postularme")}
                            </Button>
                          );
                        })()}
                      </Stack>
                    </Box>
                  </Stack>
                  <IconButton
                    aria-label="detalle"
                    // 3. Abrir el modal al hacer clic
                    onClick={() => setSelectedSearch(item)}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
          ))
        )}
      </Stack>

      {/* 4. Renderizar el modal */}
      <SearchDetailDialog
        open={!!selectedSearch}
        onClose={() => setSelectedSearch(null)}
        application={{ search: selectedSearch }}
      />

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

    </Box>
  );
}

import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardActionArea,
  Avatar,
  Checkbox,
  FormControlLabel,
  Divider,
  Stack,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  Breadcrumbs,
  Link,
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Footer from './footer';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listBeneficiosApi, listCategoriasBeneficiosApi } from '../api/beneficios';
import { getConfigApi } from '../api/config';
import { AuthContext } from '../context/AuthContext';

import LanguageIcon from '@mui/icons-material/Language';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

const ICONO_POR_CATEGORIA = {
  'Idiomas': LanguageIcon,
  'Educacion': MenuBookIcon,
  'Compras': LocalOfferIcon,
  'ActividadFisica': FitnessCenterIcon,
};

const AZULES = ['#173487', '#1E40AF', '#2563EB', '#3B82F6', '#60A5FA'];
const COLOR_POR_CATEGORIA = {
  'Idiomas': AZULES[0],
  'Educacion': AZULES[1],
  'Compras': AZULES[2],
  'ActividadFisica': AZULES[3],
};

const PAGE_SIZE_OPTIONS = [4, 8, 12, 16];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function BeneficiosSection() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [beneficios, setBeneficios] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [catsSeleccionadas, setCatsSeleccionadas] = useState([]);
  const [beneficiosPublicos, setBeneficiosPublicos] = useState(false);
  const catsOrdenadas = useMemo(() => {
    return categorias.map((c, i) => ({ ...c, color: AZULES[i % AZULES.length] }));
  }, [categorias]);
  const [pageSize, setPageSize] = useState(8);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    Promise.all([listBeneficiosApi(), listCategoriasBeneficiosApi()])
      .then(([resItems, resCats]) => {
        if (cancelado) return;
        setBeneficios(resItems.data?.items || []);
        setCategorias(resCats.data?.items || []);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err?.response?.data?.message || 'No se pudieron cargar los beneficios.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    getConfigApi('beneficios_publicos')
      .then(({ data }) => {
        setBeneficiosPublicos(data?.value === true);
      })
      .catch(() => {
        setBeneficiosPublicos(false);
      });
  }, []);

  const toggleCategoria = (key) => {
    setCatsSeleccionadas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const filtrados = useMemo(() => {
    if (catsSeleccionadas.length === 0) return beneficios;
    return beneficios.filter((b) => catsSeleccionadas.includes(b.categoria));
  }, [beneficios, catsSeleccionadas]);

  const visibles = filtrados.slice(0, pageSize);

  const hoverImgPorBeneficio = useMemo(() => {
    const map = {};
    beneficios.forEach((b) => {
      if (b.galeria && b.galeria.length > 0) {
        const seed = b.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        map[b.id] = b.galeria[seed % b.galeria.length];
      }
    });
    return map;
  }, [beneficios]);

  return (
    <Box sx={{ backgroundColor: '#f7f8fb', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 4 }, flexGrow: 1 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 2, color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          <Link
            component={RouterLink}
            underline="hover"
            color="inherit"
            to="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            <HomeOutlinedIcon fontSize="small" />
            Inicio
          </Link>
          <Typography color="text.primary">Beneficios</Typography>
        </Breadcrumbs>

        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid size={{ xs: 12, md: 3, lg: 2.5 }}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
              {/* Desktop: lista de checkboxes */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, color: '#173487' }}>
                  Categorías
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Stack>
                  {catsOrdenadas.map((c) => (
                    <FormControlLabel
                      key={c.key}
                      control={
                        <Checkbox
                          size="small"
                          checked={catsSeleccionadas.includes(c.key)}
                          onChange={() => toggleCategoria(c.key)}
                          sx={{
                            color: c.color,
                            '&.Mui-checked': { color: c.color },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: 'text.primary' }}>
                          {c.label}
                        </Typography>
                      }
                      sx={{ py: 0.25 }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* Mobile: select multi-categoría */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: '#173487' }}>
                  Filtrar por categoría
                </Typography>
                <Select
                  multiple
                  fullWidth
                  size="small"
                  value={catsSeleccionadas}
                  onChange={(e) => {
                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                    setCatsSeleccionadas(value);
                  }}
                  displayEmpty
                  renderValue={(selected) => {
                    if (selected.length === 0) return <Typography variant="body2" color="text.secondary">Todas las categorías</Typography>;
                    return selected.map((k) => catsOrdenadas.find((c) => c.key === k)?.label).filter(Boolean).join(', ');
                  }}
                  sx={{ backgroundColor: 'white' }}
                >
                  {catsOrdenadas.map((c) => (
                    <MenuItem key={c.key} value={c.key} sx={{ fontSize: '0.9rem' }}>
                      <Checkbox
                        size="small"
                        checked={catsSeleccionadas.includes(c.key)}
                        sx={{ color: c.color, '&.Mui-checked': { color: c.color }, p: 0.5, mr: 1 }}
                      />
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 9, lg: 9.5 }}>
            <Typography variant="h4" component="h1" fontWeight={700} sx={{ color: '#173487', fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
              Beneficios
            </Typography>
            <Divider sx={{ mt: 1.5, mb: 2.5, borderBottomWidth: 2, borderColor: '#e0e3eb' }} />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="flex-end"
              sx={{ mb: 3 }}
            >
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {filtrados.length === 0 ? 0 : 1}-
                  {Math.min(pageSize, filtrados.length)} de {filtrados.length} artículo(s)
                </Typography>
                <Select
                  size="small"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  sx={{ minWidth: 70, backgroundColor: 'white' }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
            </Stack>

            {loading && (
              <Stack alignItems="center" sx={{ py: 8 }}>
                <CircularProgress sx={{ color: '#173487' }} />
              </Stack>
            )}

            {error && !loading && (
              <Alert severity="error" sx={{ my: 2 }}>
                {error}
              </Alert>
            )}

            {!loading && !error && !beneficiosPublicos && user?.rol === 'empleado' && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: { xs: 8, md: 12 },
                  textAlign: 'center',
                  backgroundColor: 'white',
                  borderRadius: 3,
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <Box
                  component="img"
                  src="/logo3.png"
                  alt="Asytec Sistemas"
                  sx={{ width: 80, height: 80, objectFit: 'contain', mb: 3, opacity: 0.9 }}
                />
                <Typography variant="h4" fontWeight={700} sx={{ color: '#173487', mb: 1 }}>
                  Próximamente
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420 }}>
                  Estamos preparando grandes beneficios para vos. Muy pronto vas a poder acceder a descuentos exclusivos como colaborador de ASYTEC.
                </Typography>
              </Box>
            )}

            {!loading && !error && (beneficiosPublicos || user?.rol !== 'empleado') && (
              <Grid container spacing={3}>
                {visibles.map((b) => {
                  const IconoCat = ICONO_POR_CATEGORIA[b.categoria] || LocalOfferIcon;
                  const color = COLOR_POR_CATEGORIA[b.categoria] || '#173487';
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={b.id}>
                      <motion.div variants={cardVariants} initial="hidden" animate="visible" whileHover={{ y: -4 }}>
                        <Card
                          sx={{
                            borderRadius: 2,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            border: '1px solid #e5e7eb',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'box-shadow 0.2s, border-color 0.2s',
                            '&:hover': {
                              boxShadow: '0 6px 18px rgba(23,52,135,0.12)',
                              borderColor: color,
                            },
                          }}
                        >
                          <CardActionArea
                            onClick={() => navigate(`/beneficios/${b.id}`)}
                            sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                          >
                            <Box
                              sx={{
                                height: { xs: 150, sm: 170, md: 180 },
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'white',
                                py: { xs: 3, md: 4 },
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover .hover-overlay': {
                                  opacity: 1,
                                  transform: 'scale(1)',
                                },
                                '&:hover .base-logo': {
                                  opacity: 0,
                                  transform: 'scale(0.92)',
                                },
                              }}
                            >
                              {b.imagen ? (
                                <>
                                  <Box
                                    component="img"
                                    src={b.imagen}
                                    alt={b.titulo}
                                    className="base-logo"
                                    sx={{
                                      maxWidth: { xs: '60%', sm: '70%' },
                                      maxHeight: { xs: 110, sm: 130, md: 140 },
                                      objectFit: 'contain',
                                      mixBlendMode: b.blendMode || 'normal',
                                      transition: 'opacity 0.4s ease, transform 0.4s ease',
                                    }}
                                  />
                                  {hoverImgPorBeneficio[b.id] && (
                                    <Box
                                      component="img"
                                      src={hoverImgPorBeneficio[b.id]}
                                      alt={`${b.titulo} preview`}
                                      className="hover-overlay"
                                      sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        opacity: 0,
                                        transform: 'scale(1.08)',
                                        transition: 'opacity 0.45s ease, transform 0.6s ease',
                                        pointerEvents: 'none',
                                      }}
                                    />
                                  )}
                                </>
                              ) : (
                                <Avatar
                                  sx={{
                                    bgcolor: `${color}14`,
                                    width: 96,
                                    height: 96,
                                    borderRadius: 2,
                                  }}
                                  variant="rounded"
                                >
                                  <IconoCat sx={{ fontSize: 48, color: color }} />
                                </Avatar>
                              )}
                            </Box>
                            <Box sx={{ p: 2.5, pt: 2, textAlign: 'center' }}>
                              <Typography variant="h6" component="div" fontWeight={700} sx={{ color: '#173487' }}>
                                {b.titulo}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {b.descuento} de descuento
                              </Typography>
                            </Box>
                          </CardActionArea>
                        </Card>
                      </motion.div>
                    </Grid>
                  );
                })}
                {visibles.length === 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Box
                      sx={{
                        py: 8,
                        textAlign: 'center',
                        backgroundColor: 'white',
                        borderRadius: 2,
                        border: '1px dashed #d1d5db',
                      }}
                    >
                      <Typography color="text.secondary">
                        No se encontraron beneficios con los filtros seleccionados.
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Grid>
        </Grid>
      </Container>
      <Footer />
    </Box>
  );
}

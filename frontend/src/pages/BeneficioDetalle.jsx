import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Avatar,
  Button,
  Stack,
  Divider,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ContactMailOutlinedIcon from '@mui/icons-material/ContactMailOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import { getBeneficioApi, listCategoriasBeneficiosApi } from '../api/beneficios';
import Footer from '../components/footer';

const ICONO_POR_CATEGORIA = {
  'Idiomas': LanguageIcon,
  'Educacion': MenuBookIcon,
  'Compras': LocalOfferIcon,
  'ActividadFisica': FitnessCenterIcon,
};

const COLOR_POR_CATEGORIA = {
  'Idiomas': '#0F766E',
  'Educacion': '#7C3AED',
  'Compras': '#D97706',
  'ActividadFisica': '#DC2626',
};

function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ py: 3 }}>
      {value === index && children}
    </Box>
  );
}

export default function BeneficioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [beneficio, setBeneficio] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(0);
  const [accordion, setAccordion] = useState('descripcion');
  const [imagenActiva, setImagenActiva] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    Promise.all([getBeneficioApi(id), listCategoriasBeneficiosApi()])
      .then(([resItem, resCats]) => {
        if (cancelado) return;
        setBeneficio(resItem.data);
        setImagenActiva(resItem.data?.imagen || null);
        setCategorias(resCats.data?.items || []);
        setError(null);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err?.response?.status === 404 ? 'Beneficio no encontrado.' : 'No se pudo cargar el beneficio.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#173487' }} />
      </Box>
    );
  }

  if (error || !beneficio) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error || 'Beneficio no encontrado.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => navigate('/beneficios')}>
          Volver a Beneficios
        </Button>
      </Container>
    );
  }

  const IconoCat = ICONO_POR_CATEGORIA[beneficio.categoria] || LocalOfferIcon;
  const color = COLOR_POR_CATEGORIA[beneficio.categoria] || '#173487';
  const labelCat = categorias.find((c) => c.key === beneficio.categoria)?.label || beneficio.categoria;

  return (
    <Box sx={{ backgroundColor: '#f7f8fb', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 4 }, flexGrow: 1 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 2, color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
        >
          <Link component={RouterLink} underline="hover" color="inherit" to="/" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <HomeOutlinedIcon fontSize="small" />
            Inicio
          </Link>
          <Link component={RouterLink} underline="hover" color="inherit" to="/beneficios">
            Beneficios
          </Link>
          <Typography color="text.primary" sx={{ maxWidth: { xs: 140, sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {beneficio.titulo}
          </Typography>
        </Breadcrumbs>

        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/beneficios')}
          sx={{ mb: 2, color: '#173487', fontWeight: 600 }}
        >
          Volver
        </Button>

        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
              }}
            >
              <Box
                sx={{
                  height: { xs: 220, sm: 280, md: 340 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {imagenActiva ? (
                  <Box
                    component="img"
                    src={imagenActiva}
                    alt={beneficio.titulo}
                    sx={{
                      maxWidth: '80%',
                      maxHeight: '85%',
                      objectFit: 'contain',
                      mixBlendMode: beneficio.blendMode || 'normal',
                    }}
                  />
                ) : (
                  <Avatar
                    variant="rounded"
                    sx={{
                      bgcolor: 'white',
                      width: 160,
                      height: 160,
                      border: `2px solid ${color}`,
                      boxShadow: `0 8px 24px ${color}30`,
                    }}
                  >
                    <IconoCat sx={{ fontSize: 80, color: color }} />
                  </Avatar>
                )}
                {beneficio.codigo && (
                  <Chip
                    icon={<ConfirmationNumberOutlinedIcon />}
                    label={beneficio.codigo}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      fontWeight: 700,
                      bgcolor: color,
                      color: 'white',
                      '& .MuiChip-icon': { color: 'white' },
                    }}
                  />
                )}
              </Box>

              {(beneficio.galeria && beneficio.galeria.length > 0) ? (
                <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
                  <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" useFlexGap>
                    {beneficio.galeria.map((src, i) => {
                      const activa = imagenActiva === src;
                      return (
                        <Box
                          key={i}
                          component="img"
                          src={src}
                          alt={`${beneficio.titulo} ${i + 1}`}
                          onClick={() => setImagenActiva(src)}
                          sx={{
                            width: { xs: 52, sm: 60, md: 64 },
                            height: { xs: 52, sm: 60, md: 64 },
                            borderRadius: 1.5,
                            border: `2px solid ${activa ? color : '#e5e7eb'}`,
                            objectFit: 'cover',
                            cursor: 'pointer',
                            transition: 'border-color 0.2s, transform 0.2s',
                            backgroundColor: '#fafafa',
                            '&:hover': {
                              borderColor: color,
                              transform: 'scale(1.05)',
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
                  <Stack direction="row" spacing={1.5} justifyContent="center">
                    {[0, 1, 2, 3].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 64,
                          height: 64,
                          borderRadius: 1.5,
                          border: `2px solid ${i === 0 ? color : '#e5e7eb'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: i === 0 ? `${color}10` : '#fafafa',
                        }}
                      >
                        <IconoCat sx={{ fontSize: 28, color: i === 0 ? color : '#9ca3af' }} />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={1.5}>
              <Chip
                label={labelCat}
                size="small"
                sx={{
                  alignSelf: 'flex-start',
                  fontWeight: 600,
                  bgcolor: `${color}1A`,
                  color: color,
                }}
              />
              <Typography variant="h4" component="h1" fontWeight={700} sx={{ color: '#173487', fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
                {beneficio.titulo}
              </Typography>
              <Typography variant="h5" component="p" fontWeight={700} sx={{ color: color, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                {beneficio.descuento} de descuento
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {beneficio.descripcionCorta}
              </Typography>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                endIcon={<OpenInNewIcon />}
                href={beneficio.sitio}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  bgcolor: '#173487',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': { bgcolor: '#2A4DB8' },
                }}
              >
                Ir al sitio
              </Button>
              {beneficio.contacto && (
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ContactMailOutlinedIcon />}
                  href={beneficio.contacto.startsWith('http') ? beneficio.contacto : `mailto:${beneficio.contacto}`}
                  target={beneficio.contacto.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  sx={{
                    borderColor: '#173487',
                    color: '#173487',
                    fontWeight: 600,
                    '&:hover': { borderColor: '#2A4DB8', bgcolor: 'rgba(23,52,135,0.04)' },
                  }}
                >
                  Contacto
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>

        <Box sx={{ mt: { xs: 3, md: 5 }, backgroundColor: 'white', borderRadius: 3, border: '1px solid #e5e7eb', px: { xs: 2, md: 4 } }}>
          {isMobile ? (
            <Box>
              <Accordion
                expanded={accordion === 'descripcion'}
                onChange={(_, exp) => setAccordion(exp ? 'descripcion' : false)}
                disableGutters
                sx={{ '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={700} sx={{ color: accordion === 'descripcion' ? '#173487' : 'text.primary' }}>
                    Descripcion
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Array.isArray(beneficio.descripcion) ? (
                    <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                      {beneficio.descripcion.map((item, i) => (
                        <Box component="li" key={i} sx={{ mb: 1, lineHeight: 1.7 }}>
                          <Typography variant="body1" component="span">
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                      {beneficio.descripcion}
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              <Accordion
                expanded={accordion === 'comoAcceder'}
                onChange={(_, exp) => setAccordion(exp ? 'comoAcceder' : false)}
                disableGutters
                sx={{ '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={700} sx={{ color: accordion === 'comoAcceder' ? '#173487' : 'text.primary' }}>
                    Como acceder
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List disablePadding>
                    {beneficio.comoAcceder.map((item, i) => (
                      <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start', py: 0.75 }}>
                        <ListItemIcon sx={{ minWidth: 36, mt: '2px' }}>
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: color,
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {i + 1}
                          </Box>
                        </ListItemIcon>
                        <ListItemText primary={item} primaryTypographyProps={{ variant: 'body1' }} />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>

              {beneficio.incluye && beneficio.incluye.length > 0 && (
                <Accordion
                  expanded={accordion === 'incluye'}
                  onChange={(_, exp) => setAccordion(exp ? 'incluye' : false)}
                  disableGutters
                  sx={{ '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={700} sx={{ color: accordion === 'incluye' ? '#173487' : 'text.primary' }}>
                      Que incluye
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List disablePadding>
                      {beneficio.incluye.map((item, i) => (
                        <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start', py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32, mt: '2px' }}>
                            <CheckCircleOutlineIcon sx={{ color, fontSize: 22 }} />
                          </ListItemIcon>
                          <ListItemText primary={item} primaryTypographyProps={{ variant: 'body1' }} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {beneficio.consideraciones && beneficio.consideraciones.length > 0 && (
                <Accordion
                  expanded={accordion === 'consideraciones'}
                  onChange={(_, exp) => setAccordion(exp ? 'consideraciones' : false)}
                  disableGutters
                  sx={{ '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight={700} sx={{ color: accordion === 'consideraciones' ? '#173487' : 'text.primary' }}>
                      Consideraciones
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List disablePadding>
                      {beneficio.consideraciones.map((item, i) => (
                        <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start', py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32, mt: '2px' }}>
                            <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                          </ListItemIcon>
                          <ListItemText primary={item} primaryTypographyProps={{ variant: 'body1', color: 'text.secondary' }} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          ) : (
            <>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              borderBottom: '1px solid #e5e7eb',
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: { xs: '0.875rem', sm: '1rem' }, minHeight: { xs: 44, sm: 48 } },
              '& .Mui-selected': { color: '#173487' },
              '& .MuiTabs-indicator': { backgroundColor: '#173487', height: 3 },
            }}
          >
            <Tab label="Descripcion" />
            <Tab label="Como acceder" />
            {beneficio.incluye && beneficio.incluye.length > 0 && <Tab label="Que incluye" />}
            {beneficio.consideraciones && beneficio.consideraciones.length > 0 && <Tab label="Consideraciones" />}
          </Tabs>

          <TabPanel value={tab} index={0}>
            {Array.isArray(beneficio.descripcion) ? (
              <Box component="ul" sx={{ pl: 2.5, m: 0 }}>
                {beneficio.descripcion.map((item, i) => (
                  <Box component="li" key={i} sx={{ mb: 1, lineHeight: 1.7 }}>
                    <Typography variant="body1" component="span">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                {beneficio.descripcion}
              </Typography>
            )}
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <List disablePadding>
              {beneficio.comoAcceder.map((item, i) => (
                <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start', py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: '2px' }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {i + 1}
                    </Box>
                  </ListItemIcon>
                  <ListItemText primary={item} primaryTypographyProps={{ variant: 'body1' }} />
                </ListItem>
              ))}
            </List>
          </TabPanel>

          {beneficio.incluye && beneficio.incluye.length > 0 && (
            <TabPanel value={tab} index={2}>
              <List disablePadding>
                {beneficio.incluye.map((item, i) => (
                  <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start', py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32, mt: '2px' }}>
                      <CheckCircleOutlineIcon sx={{ color, fontSize: 22 }} />
                    </ListItemIcon>
                    <ListItemText primary={item} primaryTypographyProps={{ variant: 'body1' }} />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          )}

          {beneficio.consideraciones && beneficio.consideraciones.length > 0 && (
            <TabPanel value={tab} index={beneficio.incluye && beneficio.incluye.length > 0 ? 3 : 2}>
              <List disablePadding>
                {beneficio.consideraciones.map((item, i) => (
                  <ListItem key={i} disableGutters sx={{ alignItems: 'flex-start', py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 32, mt: '2px' }}>
                      <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText primary={item} primaryTypographyProps={{ variant: 'body1', color: 'text.secondary' }} />
                  </ListItem>
                ))}
              </List>
            </TabPanel>
          )}
            </>
          )}
        </Box>
      </Container>
      <Footer />
    </Box>
  );
}

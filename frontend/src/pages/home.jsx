import React, { useContext, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Container,
  CardMedia,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// Icons
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SchoolIcon from '@mui/icons-material/School';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PublicSearchesCarousel from "../components/PublicSearchesCarousel";
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import Footer from '../components/footer';
import { AuthContext } from '../context/AuthContext';
import { getConfigApi } from '../api/config';
// ===== Variants =====
// Hero: fondo con ken-burns + contenido fade-up
const heroBgVariants = {
  initial: { scale: 1.02 },
  animate: { scale: 1.07, transition: { duration: 12, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' } },
};
const heroContentVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

// Cards “¿Aceptás el desafío?”
const imgVariants = {
  rest: { scale: 1, filter: 'brightness(1)', transition: { type: 'spring', stiffness: 120, damping: 15 } },
  hover: { scale: 1.06, filter: 'brightness(0.8)', transition: { type: 'spring', stiffness: 120, damping: 15 } },
};
const overlayVariants = {
  rest: { opacity: 0, y: 20, transition: { duration: 0.25 } },
  hover: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

// Secciones animadas
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { when: 'beforeChildren', staggerChildren: 0.12 }
  },
};
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 120, damping: 18 }
  },
};

// ===== Datos =====
const valores = [
  { icon: AccessTimeFilledIcon, title: 'Registración de Asistencia', text: 'Facilita el registro y seguimiento de las asistencias diarias, garantizando , eficiencia y calidad en el trabajo.', path: '/my-attendance' },
  { icon: FactCheckIcon, title: 'Mis Solicitudes', text: 'Gestioná fácilmente tus solicitudes de vacaciones, días de estudio, enfermedad, mudanza, maternidad, y otras.', path: '/my-requests?filter=estudios_vacaciones' },
  { icon: Diversity3Icon, title: 'Licencias Médicas', text: 'Cargá las licencias médicas y hacé el seguimiento de tus ausencias de manera sencilla.', path: '/my-requests?filter=licencias_medicas' },
  { icon: CardGiftcardIcon, title: 'Beneficios', text: 'Accedé a descuentos y convenios exclusivos por ser parte de ASYTEC: educación, idiomas, actividad física y más.', path: '/beneficios' },
];
const testimonios = [
  {
    nombre: 'Bautista Palma.',
    rol: 'Pasante Administrativo',
    frase: 'ASYTEC es mi primera experiencia trabajando y me ayudará a abrir nuevas puertas en el mundo laboral. Es una gran Oportunidad.',
    foto: '../testimonios/t2.png'
  },
  {
    nombre: 'Agustin Gonzalez',
    rol: 'Soporte Técnico',
    frase: 'Agradezco la oportunidad y el reconocimiento que me da ASYTEC, y valoro formar parte de este equipo',
    foto: '../testimonios/t1.png'
  },
  {
    nombre: 'Joan Valenzuela.',
    rol: 'Analista de Ciberseguridad',
    frase: 'Muy feliz por salir de la zona de confort para cumplir sueños y animarme a crecer. Gracias ASYTEC por confiar en mis capacidades',
    foto: '../testimonios/t3.png'
  },

];

const areas = [
  { title: 'Recursos Humanos', tags: ['Seleccion', 'Capacitación', 'Clima'], img: 'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=1200&q=60', path: '/searches?area=Recursos Humanos' },
  { title: 'Administración', tags: ['Finanzas', 'Compras', 'Legal'], img: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=60', path: '/searches?area=Administracion' },
  { title: 'Pasantias', tags: ['Aprendizaje', 'Crecimiento'], img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=60', path: '/searches?area=Pasantia' },
  { title: 'Sistemas', tags: ['Software', 'Soporte Tecnico', 'DevOps'], img: 'https://images.pexels.com/photos/442150/pexels-photo-442150.jpeg', path: '/searches?area=Sistemas' }
];

const Home = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [idxTestimonio, setIdxTestimonio] = React.useState(0);
  const [beneficiosPublicos, setBeneficiosPublicos] = useState(true);
  const [proximamenteOpen, setProximamenteOpen] = useState(false);

  useEffect(() => {
    getConfigApi('beneficios_publicos')
      .then(({ data }) => setBeneficiosPublicos(data?.value === true))
      .catch(() => setBeneficiosPublicos(true));
  }, []);

  const nextTestimonio = () => setIdxTestimonio((p) => (p + 1) % testimonios.length);
  const prevTestimonio = () => setIdxTestimonio((p) => (p - 1 + testimonios.length) % testimonios.length);

  // Auto-rotate testimonios
  const handleApplyClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/login');
    }
  };
  React.useEffect(() => {
    const t = setInterval(() => nextTestimonio(), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <Box sx={{ background: "linear-gradient(180deg, #e3e8f7 0%, #d2d8e8 100%)" }}>

      {/* ===== HERO con animaciones ===== */}
      <Box
        sx={{
          position: 'relative',
          height: '55vh',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          mb: 4,
        }}
      >
        <motion.div
          variants={heroBgVariants}
          initial="initial"
          animate="animate"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url("/bg5.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
            willChange: 'transform',
          }}
        />
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0, 0, 0, 0.5)', zIndex: 1 }} />
        <Container maxWidth="md" sx={{ zIndex: 2 }}>
          <motion.div variants={heroContentVariants} initial="hidden" animate="visible">
            <Typography variant="h2" component="h1" gutterBottom color='white'>
              BIENVENIDO
            </Typography>
            <Typography variant="h5">
              Te acompañamos en las gestiones de tu día a día.
            </Typography>
            {/* <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} style={{ marginTop: 24 }}>
              <Button variant="contained" color="primary" onClick={handleApplyClick} sx={{ px: 4, py: 1.5, fontWeight: 'bold' }}>
                Postularme
              </Button>
            </motion.div> */}
          </motion.div>
        </Container>
      </Box>

      {/* ===== VALORES / CULTURA ===== */}
      <motion.section variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <Container maxWidth="lg" sx={{ mb: 8, justifyItems: "center" }} >
          <Typography variant="h4" gutterBottom textAlign="center"></Typography>
          <Grid container spacing={3} sx={{ display: { xs: "grid", width: "max-content", justifyContent: "space-around", lg: "flex" } }}>
            {valores.map((v, i) => {
              const esBeneficio = v.title === 'Beneficios';
              const bloqueado = esBeneficio && !beneficiosPublicos && user?.rol === 'empleado';
              return (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                  <motion.div variants={cardVariants} whileHover={{ y: -6 }}>
                    <Card sx={{
                      borderRadius: 3,
                      boxShadow: 3,
                      width: "360px",
                      height: "300px",
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: bloqueado ? 0.85 : 1,
                    }}>
                      <CardActionArea onClick={() => bloqueado ? setProximamenteOpen(true) : v.path && navigate(v.path)}>
                        <CardContent sx={{ p: 3, textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <Avatar sx={{ bgcolor: '#163282', width: 72, height: 72, mx: 'auto', mb: 2 }}>
                            <v.icon sx={{ fontSize: 40, color: 'white' }} />
                          </Avatar>
                          <Typography gutterBottom variant="h6" component="div" >
                            {v.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {v.text}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                      <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                        {bloqueado ? (
                          <Box sx={{
                            bgcolor: '#173487',
                            color: 'white',
                            px: 2.5,
                            py: 0.6,
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 8px rgba(23,52,135,0.35)',
                            cursor: 'pointer',
                          }} onClick={() => setProximamenteOpen(true)}>
                            Próximamente
                          </Box>
                        ) : (
                          <Button size="small" color="primary" onClick={() => v.path && navigate(v.path)} sx={{ color: '#173487' }}>
                            Ver Mas
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </motion.section>
      <Dialog open={proximamenteOpen} onClose={() => setProximamenteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3, textAlign: 'center', p: 2 } }}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box component="img" src="/logo3.png" alt="Asytec Sistemas" sx={{ width: 72, height: 72, objectFit: 'contain' }} />
          <Typography variant="h5" fontWeight={700} sx={{ color: '#173487' }}>
            Próximamente
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estamos preparando grandes beneficios para vos. Muy pronto vas a poder acceder a descuentos exclusivos como colaborador de ASYTEC.
          </Typography>
          <Button variant="contained" onClick={() => setProximamenteOpen(false)} sx={{ bgcolor: '#173487', '&:hover': { bgcolor: '#2A4DB8' }, mt: 1 }}>
            Entendido
          </Button>
        </DialogContent>
      </Dialog>

      <Footer />
    </Box>

  );
};

export default Home;

import React, { useContext } from 'react';
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
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// Icons
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SchoolIcon from '@mui/icons-material/School';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PublicSearchesCarousel from "../components/PublicSearchesCarousel";
import CardActionArea from '@mui/material/CardActionArea';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import Footer from '../components/footer';
import { AuthContext } from '../context/AuthContext';
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
  { icon: AccessTimeFilledIcon, title: 'Registracion de Horas', text: 'Facilita el registro y seguimiento de las horas trabajadas, garantizando , eficiencia y calidad en el trabajo.', path: '/my-attendance' },
  { icon: SchoolIcon, title: 'Solicitud Dias de Estudios y Vacaciones', text: 'Gestioná los días de estudio y vacaciones fácilmente desde un mismo lugar.' },
  { icon: Diversity3Icon, title: 'Licencias Medicas', text: 'Cargá las licencias médicas y hacé el seguimiento de tus ausencias de manera sencilla.' },

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

  const nextTestimonio = () => setIdxTestimonio((p) => (p + 1) % testimonios.length);
  const prevTestimonio = () => setIdxTestimonio((p) => (p - 1 + testimonios.length) % testimonios.length);

  // Auto-rotate testimonios
  const handleApplyClick = () => {
    if (user) {
      navigate('/profile');
    } else {
      navigate('/register');
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
              Te acompañamos en las gestiones de tu dia a dia.
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
            {valores.map((v, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <motion.div variants={cardVariants} whileHover={{ y: -6 }}>
                  <Card sx={{ borderRadius: 3, boxShadow: 3, width: "360px", height: "300px", display: 'flex', flexDirection: 'column' }}>
                    <CardActionArea>
                      <CardContent sx={{ p: 3, textAlign: 'center', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 72, height: 72, mx: 'auto', mb: 2 }}>
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
                      <Button size="small" color="primary" onClick={() => v.path && navigate(v.path)}>
                        Ver Mas
                      </Button>
                    </CardActions>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </motion.section>


      {/* ===== CARROUSEL DE PUBLICACIONES ===== */}

      {/* <Box sx={{ display: { xs: 'none', md: 'flex', justifyContent: 'center'} }}>
        <motion.section variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <Container maxWidth="lg" sx={{ mb: 2 }}>
            <PublicSearchesCarousel />
          </Container>
        </motion.section>
      </Box> */}


      {/* 
      ===== OPORTUNIDADES POR ÁREA =====
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <Container maxWidth="lg" sx={{ mb: 8 }}>
          <Typography variant="h4" gutterBottom textAlign="center">
            Áreas de Oportunidad
          </Typography>
          <Grid container spacing={3} sx={{ display: { xs: "grid" , lg: "flex"}, justifyContent: "center"}}>
            {areas.map((a, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <motion.div variants={cardVariants} whileHover={{ y: -6, scale: 1.01 }}>
                  <Card
                    sx={{
                      width: "250px",
                      borderRadius: 3,
                      overflow: "hidden",
                      boxShadow: 4,
                      display: "flex",
                      flexDirection: "column",
                      height: "360px",
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={a.img}
                      alt={a.title}
                      sx={{
                        height: 160,
                        width: "100%",
                        objectFit: "cover"
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom noWrap>
                        {a.title}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ maxHeight: 60, overflow: "hidden" }}>
                        {a.tags.map((t) => (
                          <Chip key={t} label={t} size="small" />
                        ))}
                      </Stack>
                    </CardContent>
                    <Box sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate(a.path)}
                      >
                        Ver vacantes
                      </Button>
                    </Box>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </motion.section> */}



      {/* 
      ===== TESTIMONIOS (carrusel simple) =====
      <Container maxWidth="md" sx={{ mb: 8 }}>
        <Typography variant="h4" gutterBottom textAlign="center">Historias reales</Typography>
        <Box sx={{ position: 'relative', backgroundColor: 'white', borderRadius: 3, boxShadow: 3, p: 4 }}>
          
          <Box sx={{ minHeight: 170, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={idxTestimonio}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                style={{ width: '100%' }}
              >
                <Stack spacing={2} alignItems="center" textAlign="center">
                  <Avatar src={testimonios[idxTestimonio].foto} sx={{ width: 96, height: 96 }} />
                  <Typography variant="h6" sx={{ maxWidth: 680 }}>
                    “{testimonios[idxTestimonio].frase}”
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {testimonios[idxTestimonio].nombre} — {testimonios[idxTestimonio].rol}
                  </Typography>
                </Stack>
              </motion.div>
            </AnimatePresence>
          </Box>
          
        </Box>
      </Container> */}




      {/* ===== FAQ ===== */}
      {/* <Container maxWidth="md" sx={{ mb: 10 }}>
        <Typography variant="h4" gutterBottom textAlign="center">Preguntas frecuentes</Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>¿Cómo es el proceso de selección?</AccordionSummary>
          <AccordionDetails>
            Realizamos un primer screening de CV, entrevista con RRHH y entrevista técnica/cultural con el equipo. Te mantenemos informado en cada etapa.
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>¿En qué áreas puedo postularme?</AccordionSummary>
          <AccordionDetails>
            Tecnología, Comercial, Administración y People. También recibimos postulaciones espontáneas.
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>¿Qué pasa después de cargar mi CV?</AccordionSummary>
          <AccordionDetails>
            Nuestro equipo evalúa tu perfil y, si hay match, te contactamos para los siguientes pasos. Guardamos tu CV para futuras búsquedas.
          </AccordionDetails>
        </Accordion>
      </Container> */}

      {/* ===== CTA final ===== */}
      {/* <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', py: 6, backgroundColor: 'white', borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h4" gutterBottom>¿Te gustaría trabajar con nosotros?</Typography>
          <Typography variant="h6" sx={{ mb: 3 }}>Subí tu CV y sumate a nuestra base de talentos.</Typography>
          <Button variant="contained" color="primary" onClick={handleApplyClick} sx={{ px: 4, py: 1.5, fontWeight: 'bold' }}>
            Cargar mi CV
          </Button>
        </Box>a
      </Container> */}
      <Footer />
    </Box>

  );
};

export default Home;

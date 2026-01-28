import React from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Stack,
  Link,
  IconButton,
} from '@mui/material';

import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';

const Footer = () => {
  return (
    <Box component="footer" sx={{ bgcolor: '#173487', color: 'white', mt: 8, pt: 4, pb: 1 } }>
      <Container maxWidth="lg">
        <Grid container spacing={4} display={'flex'} justifyContent={'space-between'}>

          {/* Columna contacto */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="h6" gutterBottom>Contacto</Typography>
            <Typography variant="body2">Congreso 2171 Piso 8° Of. A - (C1428BVE) </Typography>
            <Typography variant="body2">Tel: +54 11 5367-8000</Typography>
            <Typography variant="body2">Email: info@asytec.com</Typography>
          </Grid>

          {/* Columna redes sociales */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography variant="h6" gutterBottom>Seguinos</Typography>
            <Stack direction="row" spacing={2}>
              <IconButton color="inherit" href="https://www.linkedin.com/company/asytec/" target="_blank"><LinkedInIcon /></IconButton>
              
              <IconButton color="inherit" href="https://www.instagram.com/asytecsistemas/" target="_blank"><InstagramIcon /></IconButton>
            </Stack>
          </Grid>
        </Grid>

        {/* Línea inferior */}
        <Box sx={{ textAlign: 'center', mt: 5, borderTop: '1px solid rgba(255,255,255,0.2)', pt: 3 }}>
          <Typography variant="body2" color="grey.400">
            © 2026 ASYTEC Sistemas S.R.L.Todos los derechos reservados.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

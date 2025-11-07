import * as React from "react";
import { Box, Grid, Card, CardMedia, Typography } from "@mui/material";

// 🔥 Versión 100% JavaScript (sin TypeScript)
// Efectos:
// - Zoom + oscurecimiento de imagen al hover
// - Overlay con título y texto que aparece con fade + slide-up

const imgVariants = {
  rest: { scale: 1, filter: "brightness(1)", transition: { type: "spring", stiffness: 120, damping: 15 } },
  hover: { scale: 1.06, filter: "brightness(0.8)", transition: { type: "spring", stiffness: 120, damping: 15 } },
};

const overlayVariants = {
  rest: { opacity: 0, y: 20, transition: { duration: 0.25 } },
  hover: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function AceptasElDesafioCards() {
  const items = [
    {
      title: "Crecé con nosotros",
      text: "Impulsamos tu desarrollo profesional con capacitaciones constantes.",
      image:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=60",
    },
    {
      title: "Desafíos reales",
      text: "Formá parte de proyectos reales que impactan en la industria.",
      image:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=60",
    },
    {
      title: "Equipo humano",
      text: "Trabajamos con personas que valoran el compromiso y la innovación.",
      image:
        "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=800&q=60",
    },
  ];

  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" gutterBottom display={"flex"} justifyContent={"center"}>
        ¿Aceptás el desafío?
      </Typography>

      <Grid container spacing={3} justifyContent="center">
        {items.map((item, idx) => (
          <Grid item xs={12} sm={6} md={4} key={idx} sx={{ display: "flex", justifyContent: "center" }}>
            <motion.div initial="rest" whileHover="hover" animate="rest" style={{ width: 300 }}>
              <Card sx={{ maxWidth: 300, width: "100%", borderRadius: 3, overflow: "hidden", position: "relative", boxShadow: 6 }}>
                <Box sx={{ position: "relative", height: 220 }}>
                  {/* Imagen animada */}
                  <motion.div variants={imgVariants} style={{ height: "100%" }}>
                    <CardMedia component="img" height="220" image={item.image} alt={item.title} />
                  </motion.div>

                  {/* Overlay animado (solo aparece en hover) */}
                  <motion.div
                    variants={overlayVariants}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "flex-end",
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.75) 100%)",
                      padding: 16,
                      pointerEvents: "none",
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ color: "#fff", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#f0f0f0", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
                        {item.text}
                      </Typography>
                    </Box>
                  </motion.div>
                </Box>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

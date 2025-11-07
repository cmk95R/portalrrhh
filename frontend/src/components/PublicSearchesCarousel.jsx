import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, CardActions, Button, Chip, CircularProgress,Stack } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useNavigate } from "react-router-dom";
import { listPublicSearchesApi } from "../api/searches";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation"; // Si usas navegación
import { Navigation, Autoplay } from "swiper/modules";

import SearchDetailDialog from "../components/ModalSearches";


const STATUS_COLORS = {
  Activa: "success",
  Pausada: "warning",
  Cerrada: "default",
};

export default function PublicSearchesCarousel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState(null);
  

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await listPublicSearchesApi({ estado: "Activa", limit: 12 });
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
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography color="text.secondary">No hay búsquedas activas en este momento.</Typography>
      </Box>
    );
  }

  return (

    <Box sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom textAlign="center">
        Busquedas Activas
      </Typography>
      <Swiper
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        loop={true}
        modules={[Navigation, Autoplay]}
        navigation
        spaceBetween={24}
        slidesPerView={1}
        breakpoints={{
          600: { slidesPerView: 2 },
          900: { slidesPerView: 3 },
          1200: { slidesPerView: 4 },
        }}
        style={{ width: "100%", paddingLeft: "40px", paddingRight: "19px",paddingBottom: "32px", justifyContent: "center" }}
      >
        {rows.map((item) => (
          <SwiperSlide key={item.id}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 3,
                height: 220,
                width: 200,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                p: 2,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                {/* <PersonOutlineIcon color="primary" sx={{ fontSize: 10 }} /> */}
                <Box>
                  <Typography variant="caption" color="primary">
                    {item.area}
                  </Typography>
                  <Typography fontWeight="bold" variant="subtitle1" color="text.primary" Wrap>
                    {item.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {item.ubicacion || item.descripcion?.slice(0, 60)}
                  </Typography>
                </Box>
              </Stack>
              <Box>
                <Chip
                  label={item.estado}
                  color={STATUS_COLORS[item.estado] || "default"}
                  size="small"
                  sx={{ fontWeight: "bold", mt: 2, justifyContent: "center" }}
                />
              </Box>
              <CardActions sx={{ justifyContent: "center" }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setSelectedSearch({ search: item });
                    setModalOpen(true);
                  }}
                >
                  Mas Info
                </Button>
              </CardActions>
            </Card>
          </SwiperSlide>
        ))}
        <SearchDetailDialog
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          application={selectedSearch}
        />
      </Swiper>
    </Box>

  );

}

{/* Modal for showing search details */ }

import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Stack, Chip
} from "@mui/material";
import { useNavigate } from "react-router-dom";

// Define los colores de estado (ajusta según tu app)
const STATE_COLORS = {
    Activa: "success",
    Pausada: "warning",
    Cerrada: "default",
};

function SearchDetailDialog({ open, onClose, application }) {
    const navigate = useNavigate();
    if (!application || !application.search) return null;

    const { search } = application;

    // Estado legible y color
    const estado = search.estado || "Activa";
    const color = STATE_COLORS[estado] || "default";

    const handleApply = () => {
        // Redirige a la página de detalle de la búsqueda específica
        navigate(`/searches/${search._id}`);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{search.titulo || "Detalle de Búsqueda"}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <div>
                        <Typography variant="subtitle2">Área y Estado</Typography>
                        <Chip
                            label={search.area || "-"}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mt: 0.5, mr: 1 }}
                        />
                        <Chip
                            label={estado}
                            size="small"
                            color={color}
                            sx={{ mt: 0.5 }}
                        />
                    </div>

                    <div>
                        <Typography variant="subtitle2">Búsqueda</Typography>
                        <Stack>
                            <Typography>{search.titulo || search._id || "-"}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {search.ubicacion || "-"} · {search.area || "-"} · {search.estado || "-"}
                            </Typography>
                        </Stack>
                    </div>

                    {search.descripcion && (
                        <div>
                            <Typography variant="subtitle2">Descripción</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{search.descripcion}</Typography>
                        </div>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">Cerrar</Button>
                
            </DialogActions>
        </Dialog>
    );
}

export default SearchDetailDialog;
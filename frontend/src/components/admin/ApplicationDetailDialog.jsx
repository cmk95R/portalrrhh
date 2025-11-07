import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Stack, Typography, Chip
} from "@mui/material";
import { APP_STATES } from "@/constants/appStates";

const COLORS = {
    "Enviada": "default",
    "En revisión": "info",
    "Preseleccionado": "warning",
    "Rechazado": "error",
    "Contratado": "success",
};

export default function ApplicationDetailDialog({ open, onClose, application }) {
    if (!application) return null;
    const cv = application.cvSnapshot || {};
    const search = application.search || {};

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Detalle de Postulación</DialogTitle>
            <DialogContent dividers>
                <Typography variant="caption" color="text.secondary">
                    {new Date(application.createdAt).toLocaleString()}
                </Typography>

                <Stack spacing={2} sx={{ mt: 2 }}>
                    <div>
                        <Typography variant="subtitle2">Estado</Typography>
                        <Chip
                            label={application.state}
                            size="small"
                            color={COLORS[application.state] || "default"}
                            sx={{ mt: 0.5 }}
                        />
                    </div>

                    <div>
                        <Typography variant="subtitle2">Postulante</Typography>
                        <Stack>
                            <Typography>{cv.nombre} {cv.apellido}</Typography>
                            <Typography variant="body2">{cv.email}</Typography>
                            <Typography variant="body2">{cv.telefono}</Typography>
                            <Typography variant="body2">{cv.linkedin}</Typography>
                            <Typography variant="body2">
                                Área: {cv.areaInteres} · Nivel: {cv.nivelAcademico}
                            </Typography>
                        </Stack>
                    </div>

                    <div>
                        <Typography variant="subtitle2">Búsqueda</Typography>
                        <Stack>
                            {/* OJO: tu controller popula "titulo, area, estado, ubicacion" */}
                            <Typography>{search.titulo || search._id}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {search.ubicacion} · {search.area} · {search.estado}
                            </Typography>
                        </Stack>
                    </div>

                    {application.message && (
                        <div>
                            <Typography variant="subtitle2">Mensaje del postulante</Typography>
                            <Typography variant="body2">{application.message}</Typography>
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

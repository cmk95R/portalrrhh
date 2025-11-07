import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Container, Grid, Typography, Card,
  Button, TextField, MenuItem, Stack, Snackbar, Alert, Skeleton,
  Stepper, Step, StepLabel, CircularProgress, Fade, IconButton
} from "@mui/material";
import { styled } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon
} from "@mui/icons-material";
import DownloadIcon from "@mui/icons-material/Download";

// APIs
import { profileApi } from "../api/auth";
import { getMyCvApi, upsertMyCv, upsertMyCvJson, getMyCvDownloadUrlApi } from "../api/cv";
import { editUserApi } from "../api/users";

// Componentes
import DireccionAR from "../components/DireccionAR";

// Utils
import { normalizeDireccion } from "../utils/normalize";
// import { mergeDireccion } from "../utils/merge";

// Constantes
const nivelesAcademicos = [
  "Secundario completo", "Secundario incompleto", "Terciario/Técnico en curso",
  "Terciario/Técnico completo", "Universitario en curso", "Universitario completo",
  "Posgrado en curso", "Posgrado completo", "Curso/Bootcamp"
];
const steps = ['Datos Personales', 'Contacto', 'Educación', 'Experiencia', 'Adjuntar CV', 'Revisar y Guardar'];

// Componente para ocultar el input de archivo
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// --- Componente principal ---
export default function ProfileWizard() {
  const [loading, setLoading] = useState(true);
  const [cvData, setCvData] = useState({});
  const [user, setUser] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: "success", msg: "" });
  const [activeStep, setActiveStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: me }, { data: cvResp }] = await Promise.all([profileApi(), getMyCvApi()]);
      const userData = me?.user || {};
      const cv = cvResp?.cv || {};

      setUser(userData);

      // --- LÓGICA DE FUSIÓN ---
      // 1. La base son los datos del CV (que no tiene dirección).
      // 2. Los datos del User (incluida la dirección) sobreescriben la base.
      setCvData({
        ...cv,
        ...userData,
        nombre: cv?.nombre ?? userData?.nombre ?? "",
        apellido: cv?.apellido ?? userData?.apellido ?? "",
        email: cv?.email ?? userData?.email ?? "",
      });
    } catch (e) {
      console.error(e);
      setSnack({ open: true, severity: "error", msg: "No se pudo cargar tu perfil." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDataChange = (field, value) => {
    setCvData(prevData => ({ ...prevData, [field]: value }));
  };

  const handleDireccionChange = useCallback((dir) => {
    // El componente DireccionAR ya nos da el formato correcto:
    // { provincia: object, localidad: string }.
    // Simplemente lo asignamos directamente al estado.
    setCvData(prev => ({ ...prev, direccion: dir }));
  }, []);

  const handleExperienceChange = (newExperiences) => {
    setCvData(prevData => ({ ...prevData, experiencia: newExperiences }));
  };

  const handleEducationChange = (newEducation) => {
    setCvData(prevData => ({ ...prevData, educacion: newEducation }));
  };

  const handleFinalSave = async () => {
    setIsSaving(true);

    try {
      // --- CORRECCIÓN: Se consolida el guardado en una sola llamada a la API del CV ---
      // El backend (upsertMyCV) ya se encarga de sincronizar los datos con el modelo User.
      const payload = {
        ...cvData,
      };

      if (selectedFile) {
        const formData = new FormData();
        // Adjuntamos el archivo bajo el nombre 'cvPdf' que espera el backend
        formData.append('cvPdf', selectedFile, selectedFile.name);

        // Creamos una copia de payload para no modificar el estado
        const dataToSend = { ...payload };

        // Adjuntamos el resto de los campos al FormData
        for (const key in dataToSend) {
          const value = dataToSend[key];
          // Los objetos (como 'direccion' o 'experiencia') se convierten a JSON
          if (['experiencia', 'educacion'].includes(key) || (typeof value === 'object' && value !== null)) {
            formData.append(key, JSON.stringify(value));
          } else if (value !== null && value !== undefined) {
            formData.append(key, value);
          }
        }
        await upsertMyCv(formData);
      } else {
        // Si no hay archivo, enviamos solo los datos del CV como JSON
        await upsertMyCvJson(payload);
      }

      setSnack({ open: true, severity: "success", msg: "Perfil guardado con éxito!" });
      await fetchAll();
      setSelectedFile(null);
      setActiveStep(0);
    } catch (e) {
      console.error(e);
      // Mensaje de error más específico si es posible
      const errorMsg = e.response?.data?.message || "Error al guardar el perfil.";
      setSnack({ open: true, severity: "error", msg: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => setActiveStep(p => p + 1);
  const handleBack = () => setActiveStep(p => p - 1);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Container>
    );
  }

  const getStepContent = (step) => {
    switch (step) {
      case 0: return <PersonalForm data={cvData} onChange={handleDataChange} reviewData={cvData} />;
      case 1: return <ContactLocationForm data={cvData} onFieldChange={handleDataChange} onDireccionChange={handleDireccionChange} reviewData={cvData} />;
      case 2: return <EducationForm data={cvData.educacion || []} onChange={handleEducationChange} reviewData={cvData} />;
      case 3: return <ExperienceForm data={cvData.experiencia || []} onChange={handleExperienceChange} reviewData={cvData} />;
      case 4: return (
        <UploadCV
          key={cvData.updatedAt || (cvData.cvFile?.filename || 'no-file')}
          existingFile={cvData.cvFile}
          lastUpdated={cvData.updatedAt}
          onFileSelect={setSelectedFile}
          reviewData={cvData}
          newFile={selectedFile}
        />
      );
      case 5: return <ReviewAndSaveForm data={cvData} newFile={selectedFile} />; // El paso final ya es una revisión completa
      default: return 'Paso desconocido';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, bgcolor: 'background.default' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => window.history.back()} sx={{ mb: 3 }}>Volver</Button>
      <Card sx={{ p: 4, borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
          Configurar Perfil Profesional
        </Typography>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        <Box sx={{ minHeight: 400, p: 2 }}>
          {getStepContent(activeStep)}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button color="inherit" disabled={activeStep === 0 || isSaving} onClick={handleBack} sx={{ mr: 1 }}>
            Anterior
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          {activeStep === steps.length - 1 ? (
            <Button variant="contained" onClick={handleFinalSave} disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : 'Confirmar y Guardar'}
            </Button>
          ) : (
            <Button variant="contained" onClick={handleNext}>
              Siguiente
            </Button>
          )}
        </Box>
      </Card>
      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Container>
  );
}

// --- Componentes de Resumen (Review Cards) ---

const PersonalDataReviewCard = ({ data }) => (
  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle1" fontWeight="bold">Datos Personales:</Typography>
    <Typography>Nombre y Apellido: {data.nombre || '—'} {data.apellido || ''}</Typography>
    <Typography>Fecha de Nacimiento: {data.nacimiento ? new Date(data.nacimiento).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—'}</Typography>
    <Typography variant="subtitle2" fontWeight="bold" mt={1}>Resumen:</Typography>
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto' }}>{data.perfil || 'Aún no has añadido un resumen.'}</Typography>
  </Card>
);

const ContactDataReviewCard = ({ data }) => (
  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle1" fontWeight="bold">Contacto y Ubicación:</Typography>
    <Typography>Email: {data.email || '—'}</Typography>
    <Typography>LinkedIn: {data.linkedin || '—'}</Typography>
    <Typography>Teléfono: {data.telefono || '—'}</Typography>
    <Typography>
      Ubicación: {
        [
          (data.direccion?.localidad?.nombre ?? data.direccion?.localidad), // <-- CORRECCIÓN AQUÍ
          data.direccion?.provincia?.nombre
        ].filter(Boolean).join(', ') || '—'
      }
    </Typography>
  </Card>
);

const EducationDataReviewCard = ({ data }) => (
  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle1" fontWeight="bold">Educación:</Typography>
    {data.educacion && data.educacion.length > 0 ? (
      data.educacion.map((edu, index) => (
        <Box key={index} sx={{ mt: index > 0 ? 1 : 0, mb: 1, borderBottom: index < data.educacion.length - 1 ? '1px solid #eee' : 'none', pb: 1 }}>
          <Typography><strong>Título:</strong> {edu.carrera || '—'}</Typography>
          <Typography><strong>Institución:</strong> {edu.institucion || '—'}</Typography>
          <Typography><strong>Nivel:</strong> {edu.nivelAcademico || '—'}</Typography>
        </Box>
      ))
    ) : (
      <Typography>No se ha añadido información académica.</Typography>
    )}
  </Card>
);

const ExperienceDataReviewCard = ({ data }) => (
  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle1" fontWeight="bold">Experiencia Laboral:</Typography>
    {data.experiencia && data.experiencia.length > 0 ? (
      data.experiencia.map((exp, index) => (
        <Box key={index} sx={{ mt: index > 0 ? 1 : 0, mb: 1, borderBottom: index < data.experiencia.length - 1 ? '1px solid #eee' : 'none', pb: 1 }}>
          <Typography><strong>Puesto:</strong> {exp.puesto || '—'}</Typography>
          <Typography><strong>Empresa:</strong> {exp.empresa || '—'}</Typography>
          <Typography><strong>Periodo:</strong> {exp.desde ? new Date(exp.desde).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '...'} - {exp.hasta ? new Date(exp.hasta).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : 'Actualidad'}</Typography>
        </Box>
      ))
    ) : (
      <Typography>No se ha añadido experiencia laboral.</Typography>
    )}
  </Card>
);

const CvFileDataReviewCard = ({ data, newFile }) => (
  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle1" fontWeight="bold">CV Adjunto:</Typography>
    <Typography>
      {newFile ? `Nuevo: ${newFile.name}` : (data.cvFile?.filename || 'No hay un CV cargado.')}
    </Typography>
  </Card>
);

// --- Componentes de Formulario por Paso (Modificados) ---

const PersonalForm = ({ data, onChange, reviewData }) => (
  <Fade in={true}>
    <Grid container spacing={4} wrap="wrap">
      <Grid xs={12} md={7}>
        <Stack spacing={3}>
          <Typography variant="h6" gutterBottom>Cuéntanos un poco sobre ti</Typography>
          <TextField label="Nombre *" value={data.nombre || ''} onChange={e => onChange('nombre', e.target.value)} fullWidth />
          <TextField label="Apellido" value={data.apellido || ''} onChange={e => onChange('apellido', e.target.value)} fullWidth />
          <TextField type="date" label="Fecha de nacimiento" value={String(data.nacimiento || '').slice(0, 10)} InputLabelProps={{ shrink: true }} onChange={e => onChange('nacimiento', e.target.value)} fullWidth />
          <TextField label="Resumen Profesional" multiline rows={4} value={data.perfil || ''} onChange={e => onChange('perfil', e.target.value)} fullWidth />
        </Stack>
      </Grid>
      <Grid xs={12} md={5}>
        <PersonalDataReviewCard data={reviewData} />
      </Grid>
    </Grid>
  </Fade>
);

const ContactLocationForm = ({ data, onFieldChange, onDireccionChange, reviewData }) => (
  <Fade in={true}>
    <Grid container spacing={4}>
      <Grid xs={12} md={7}>
        <Stack spacing={3}>
          <Typography variant="h6" gutterBottom>Información de Contacto y Ubicación</Typography>
          <TextField label="Email *" value={data.email || ''} onChange={e => onFieldChange('email', e.target.value)} fullWidth />
          <TextField label="Teléfono" value={data.telefono || ''} onChange={e => onFieldChange('telefono', e.target.value)} fullWidth />
          <TextField label="URL de LinkedIn" value={data.linkedin || ''} onChange={e => onFieldChange('linkedin', e.target.value)} fullWidth />
          <DireccionAR value={data.direccion || null} onChange={onDireccionChange} required />
        </Stack>
      </Grid>
      <Grid xs={12} md={5}>
        <ContactDataReviewCard data={reviewData} />
      </Grid>
    </Grid>
  </Fade>
);

const EducationForm = ({ data, onChange, reviewData }) => {
  const educations = data || [];

  const addEducation = () => onChange([...educations, { nivelAcademico: '', carrera: '', institucion: '', desde: '', hasta: '' }]);
  const removeEducation = (idx) => onChange(educations.filter((_, i) => i !== idx));
  const updateEducation = (idx, field, value) => {
    const newEducations = educations.map((edu, i) => i === idx ? { ...edu, [field]: value } : edu);
    onChange(newEducations);
  };

  return (
    <Fade in={true}>
      <Grid container spacing={4}>
        <Grid xs={12} md={7}>
          <Stack spacing={3}>
            <Typography variant="h6" gutterBottom>Tu Trayectoria Académica</Typography>
            {educations.map((edu, idx) => (
              <Card key={idx} variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" fontWeight="medium">Estudio #{idx + 1}</Typography>
                  <IconButton color="error" size="small" onClick={() => removeEducation(idx)}><DeleteIcon /></IconButton>
                </Box>
                <Grid container spacing={2}>
                  <Grid xs={12} >
                    <TextField select fullWidth label="Nivel Académico" value={edu.nivelAcademico || ''} onChange={e => updateEducation(idx, 'nivelAcademico', e.target.value)} >
                      {nivelesAcademicos.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid xs={12}><TextField label="Nombre de la carrera / Título Obtenido" value={edu.carrera || ''} onChange={e => updateEducation(idx, 'carrera', e.target.value)} fullWidth /></Grid>
                  <Grid xs={12}><TextField label="Institución Educativa" value={edu.institucion || ''} onChange={e => updateEducation(idx, 'institucion', e.target.value)} fullWidth /></Grid>
                  <Grid xs={12} sm={6}><TextField type="date" label="Desde" value={String(edu.desde || '').slice(0, 10)} InputLabelProps={{ shrink: true }} onChange={e => updateEducation(idx, 'desde', e.target.value)} fullWidth /></Grid>
                  <Grid xs={12} sm={6}><TextField type="date" label="Hasta" value={String(edu.hasta || '').slice(0, 10)} InputLabelProps={{ shrink: true }} onChange={e => updateEducation(idx, 'hasta', e.target.value)} fullWidth /></Grid>
                </Grid>
              </Card>
            ))}
            <Button startIcon={<AddIcon />} onClick={addEducation} variant="text" sx={{ alignSelf: 'flex-start' }}>Añadir Estudio</Button>
          </Stack>
        </Grid>
        <Grid xs={12} md={5}>
          <EducationDataReviewCard data={reviewData} />
        </Grid>
      </Grid>
    </Fade>
  );
};

const ExperienceForm = ({ data, onChange, reviewData }) => {
  const experiences = data || [];

  const addExperience = () => onChange([...experiences, { puesto: '', empresa: '', desde: '', hasta: '' }]);
  const removeExperience = (idx) => onChange(experiences.filter((_, i) => i !== idx));
  const updateExperience = (idx, field, value) => {
    const newExperiences = experiences.map((exp, i) => i === idx ? { ...exp, [field]: value } : exp);
    onChange(newExperiences);
  };

  return (
    <Fade in={true}>
      <Grid container spacing={4}>
        <Grid xs={12} md={7}>
          <Stack spacing={3}>
            <Typography variant="h6" gutterBottom>Tu Historial Laboral</Typography>
            {experiences.map((exp, idx) => (
              <Card key={exp._id || idx} variant="outlined" sx={{ p: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle1" fontWeight="medium">Experiencia #{idx + 1}</Typography>
                  <IconButton color="error" size="small" onClick={() => removeExperience(idx)}><DeleteIcon /></IconButton>
                </Box>
                <Grid container spacing={2}>
                  <Grid xs={12}><TextField label="Puesto / Título" value={exp.puesto || ''} onChange={e => updateExperience(idx, 'puesto', e.target.value)} fullWidth /></Grid>
                  <Grid xs={12}><TextField label="Empresa" value={exp.empresa || ''} onChange={e => updateExperience(idx, 'empresa', e.target.value)} fullWidth /></Grid>
                  <Grid xs={6}><TextField type="date" label="Desde" value={String(exp.desde || '').slice(0, 10)} InputLabelProps={{ shrink: true }} onChange={e => updateExperience(idx, 'desde', e.target.value)} fullWidth /></Grid>
                  <Grid xs={6}><TextField type="date" label="Hasta" value={String(exp.hasta || '').slice(0, 10)} InputLabelProps={{ shrink: true }} onChange={e => updateExperience(idx, 'hasta', e.target.value)} fullWidth /></Grid>
                </Grid>
              </Card>
            ))}
            <Button startIcon={<AddIcon />} onClick={addExperience} variant="text" sx={{ alignSelf: 'flex-start' }}>Añadir Experiencia</Button>
          </Stack>
        </Grid>
        <Grid xs={12} md={5}>
          <ExperienceDataReviewCard data={reviewData} />
        </Grid>
      </Grid>
    </Fade>
  );
};

// --- Componente UploadCV con el botón de descarga corregido ---
const UploadCV = ({ existingFile, lastUpdated, onFileSelect, reviewData, newFile }) => {
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { data } = await getMyCvDownloadUrlApi();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error("Error al obtener la URL de descarga:", error);
      alert("No se pudo obtener el enlace de descarga. Por favor, inténtalo de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Fade in={true}>
      <Grid container spacing={4}>
        <Grid xs={12} md={7}>
          <Stack spacing={3}>
            <Typography variant="h6" gutterBottom>Adjunta tu CV (Formato PDF)</Typography>
            <Typography variant="body2" color="text.secondary">
              Si subes un nuevo archivo, reemplazará al existente cuando guardes tu perfil al final del proceso.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
                {selectedFileName ? "Cambiar archivo" : "Seleccionar Archivo"}
                <VisuallyHiddenInput type="file" accept=".pdf" onChange={handleFileChange} />
              </Button>

              {existingFile?.providerId && !selectedFileName && (
                <Button
                  variant="contained"
                  startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? "Obteniendo..." : "Descargar CV Actual"}
                </Button>
              )}
            </Stack>

            {selectedFileName ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Nuevo archivo seleccionado: <strong>{selectedFileName}</strong>. Se guardará al final del proceso.
              </Alert>
            ) : existingFile?.filename ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                Ya tienes un CV guardado: <strong>{existingFile.filename}</strong>
                {lastUpdated && (
                  <Typography variant="caption" display="block">
                    (Última actualización: {new Date(lastUpdated).toLocaleDateString('es-AR')})
                  </Typography>
                )}
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Aún no has subido ningún archivo de CV.
              </Alert>
            )}
          </Stack>
        </Grid>
        <Grid xs={12} md={5}>
          <CvFileDataReviewCard data={reviewData} newFile={newFile} />
        </Grid>
      </Grid>
    </Fade>
  );
};

const ReviewAndSaveForm = ({ data, newFile }) => (
  <Fade in={true}>
    <Stack spacing={3}>
      <Typography variant="h6" gutterBottom>Revisa que toda tu información sea correcta</Typography>
      {/* Usamos los mismos componentes de resumen para consistencia */}
      <PersonalDataReviewCard data={data} />
      <ContactDataReviewCard data={data} />
      <EducationDataReviewCard data={data} />
      <ExperienceDataReviewCard data={data} />
      <CvFileDataReviewCard data={data} newFile={newFile} />
    </Stack>
  </Fade>
);

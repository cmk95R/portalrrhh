import React, { useState, useMemo } from "react";
import { upsertMyCvJson } from "../api/cv"; // ajusta la ruta si es distinta
import {
  Box,
  Container,
  Typography,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Button,
  Grid,
  Divider,
  Chip,
  Snackbar,
  Alert,
  Paper,
  Stack,
  Autocomplete,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";

// NUEVO: habilidades por rol/área
const opcionesPorRol = {
  "Desarrollo": [
    "JavaScript","TypeScript","React","Node.js","Python","Java",
    "SQL","NoSQL","Docker","Kubernetes","AWS/Azure/GCP","Otro"
  ],
  "Administrativo": [
    "Excel/Sheets Avanzado","Word/Docs","Bejerman","Exactian","PowerPoint/Slides","Pago a Proveedores",
    "Altas y Bajas de Personal","SAP/ERP","Conciliacion Bancara",
    "Tramites Bancarios","Registtro de Cobranzas","Carga de Facturas","Otro"
  ],
  "Recursos Humanos": [
    "ATS (Greenhouse/Lever)","LinkedIn Recruiter","Onboarding/Offboarding",
    "Evaluación de desempeño","Clima y cultura","LMS",
    "Legislación laboral (básico)","People Analytics","Excel/Sheets","Otro"
  ],
  "Soporte Técnico": [
    "ITIL (incidentes)","Jira Service Management","Active Directory/Azure AD",
    "Redes (TCP/IP/DNS/VPN)","Windows/macOS troubleshooting",
    "TeamViewer/AnyDesk","Backups","PowerShell/Bash (básico)","Otro"
  ],
  "Ciberseguridad": [
    "SIEM (Splunk/QRadar)","EDR/XDR","Vuln Management (Nessus)",
    "Firewalls/IDS/IPS","IAM/MFA/SSO","ISO27001/NIST",
    "OWASP Top 10","Análisis de logs","Pentest básico","Otro"
  ],
};


const competenciasSociales = [
  "Comunicación efectiva", "Trabajo en equipo", "Empatía","Proactividad",
  "Habilidades de resolución de conflictos", "Habilidades de escucha activa",
  "Adaptabilidad", "Liderazgo", "Colaboración interdisciplinaria",
];

const nivelesAcademicos = [
  "Secundario completo", "Secundario incompleto", "Terciario/Técnico en curso",
  "Terciario/Técnico completo", "Universitario en curso", "Universitario completo",
  "Posgrado en curso", "Posgrado completo",
];

const nivelesIngles = ["Sin conocimientos", "Nivel básico", "Nivel intermedio", "Nivel avanzado"];
const ambitosLaborales = ["Freelancer", "Soy estudiante y trabajo", "Soy estudiante","Pasante", "Otro"];

// Animaciones suaves
const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: "easeOut" } }),
};
const listStagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } };
const itemVariant = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } };

export default function CVForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const redirectTimer = useRef(null);

  // NUEVO: rol/área seleccionado para filtrar habilidades
  const [rolSeleccionado, setRolSeleccionado] = useState("Desarrollo");

  const [formData, setFormData] = useState({
    nombre: "",
    nacimiento: "",
    ciudad: "",
    provincia: "",
    pais: "",
    email: "",
    telefono: "",
    habilidades: [],
    otraHabilidad: "",
    perfil: "",
    salario: "",
    linkedin: "",
    repositorio: "",
    competencias: [],
    nivelAcademico: "",
    carreraIT: "",
    nivelIngles: "",
    certIngles: "",
    ambitoLaboral: "",
    otraSituacion: "",
    relacionIT: "",
    disponibilidad: "",
    notebook: "",
    cv: null,
  });
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  const requiredOk = useMemo(() => {
    const r = formData;
    return r.nombre && r.email && r.telefono && r.pais && r.nivelAcademico && r.ambitoLaboral && r.cv;
  }, [formData]);

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target || {};
    if (type === "checkbox" && (name === "habilidades" || name === "competencias")) {
      setFormData((prev) => {
        const arr = new Set(prev[name] || []);
        if (checked) arr.add(value);
        else arr.delete(value);
        return { ...prev, [name]: Array.from(arr) };
      });
      return;
    }
    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files?.[0] ?? null }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDrop = (ev) => {
    ev.preventDefault();
    const file = ev.dataTransfer.files?.[0];
    if (file) setFormData((prev) => ({ ...prev, cv: file }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!requiredOk) {
    setSnack({ open: true, msg: "Completá los campos obligatorios (*)", severity: "warning" });
    return;
  }

  try {
    setLoading(true);
    const payload = {
      // Datos personales
      nombre: formData.nombre,
      nacimiento: formData.nacimiento, // "YYYY-MM-DD"
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      pais: formData.pais,
      email: formData.email,
      telefono: formData.telefono,

      // Área / rol + habilidades
      areaRol: rolSeleccionado,
      habilidades: formData.habilidades,        // array (máx 5)
      otraHabilidad: formData.otraHabilidad,

      // Blandas
      competencias: formData.competencias,      // array (máx 5)

      // Perfil / redes
      perfil: formData.perfil,
      salario: formData.salario,
      linkedin: formData.linkedin,
      repositorio: formData.repositorio,

      // Educación / idiomas / situación
      nivelAcademico: formData.nivelAcademico,
      carreraIT: formData.carreraIT,            // "SI" | "NO" | ""
      nivelIngles: formData.nivelIngles,
      certIngles: formData.certIngles,          // "SI" | "NO" | ""
      detalleCertIngles: formData.detalleCertIngles,
      ambitoLaboral: formData.ambitoLaboral,
      otraSituacion: formData.otraSituacion,
      relacionIT: formData.relacionIT,          // "SI" | "NO" | ""
      aniosIT: formData.aniosIT,
      disponibilidad: formData.disponibilidad,
    };

   await upsertMyCvJson(payload);

    setSnack({ open: true, msg: "¡Gracias por cargar tu CV! 🎉", severity: "success" });
    window.scrollTo({ top: 0, behavior: "smooth" });

    redirectTimer.current = setTimeout(() => {
      navigate("/", { replace: true });
    }, 2000);
  } catch (err) {
    setSnack({
      open: true,
      msg: err?.response?.data?.message || "Error al enviar tu CV",
      severity: "error",
    });
  } finally {
    setLoading(false);
  }
};

  const isOtroHabilidad = formData.habilidades.includes("Otro");

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <motion.div initial="hidden" animate="visible" variants={listStagger}>
          {/* Header */}
          <motion.div variants={sectionVariants}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Mi CV
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Unite a nuestra plataforma de reclutamiento y sé parte de la vanguardia que construye el futuro tecnológico.
            </Typography>
          </motion.div>

          <Box component="form" onSubmit={handleSubmit}>
            {/* Datos personales */}
            <motion.div variants={sectionVariants}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Datos personales
              </Typography>
            </motion.div>

            <Grid container spacing={2} component={motion.div} variants={listStagger} initial="hidden" animate="visible">
              {[
                { name: "nombre", label: "Nombre completo *" },
                { name: "nacimiento", label: "Fecha de nacimiento", type: "date", InputLabelProps: { shrink: true }, inputProps: { max: new Date().toISOString().split("T")[0] } },
                { name: "ciudad", label: "Ciudad" },
                { name: "provincia", label: "Provincia/Estado" },
                { name: "pais", label: "País de residencia *" },
                { name: "email", label: "Correo electrónico *" },
                { name: "telefono", label: "Teléfono *" },
              ].map((f) => (
                <Grid item xs={12} sm={6} key={f.name} component={motion.div} variants={itemVariant}>
                  <TextField
                    fullWidth
                    label={f.label}
                    name={f.name}
                    type={f.type || "text"}
                    InputLabelProps={f.InputLabelProps}
                    inputProps={f.inputProps}
                    value={formData[f.name]}
                    onChange={handleChange}
                  />
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

{/* === Área / Rol + Habilidades técnicas (lista -> chips) === */}
<motion.div variants={sectionVariants}>
  <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
    Área / Rol
  </Typography>
</motion.div>

<Stack spacing={2} sx={{ mb: 3 }}>
  {/* Select de rol */}
  <TextField
    select
    fullWidth
    label="Seleccioná el área/rol"
    value={rolSeleccionado}
    onChange={(e) => {
      const nuevoRol = e.target.value;
      setRolSeleccionado(nuevoRol);
      // Si querés resetear al cambiar de rol, descomentá esta línea:
      // setFormData((prev) => ({ ...prev, habilidades: [], otraHabilidad: "" }));
    }}
  >
    {Object.keys(opcionesPorRol).map((rol) => (
      <MenuItem key={rol} value={rol}>{rol}</MenuItem>
    ))}
  </TextField>

  <motion.div variants={sectionVariants}>
    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
      Habilidades técnicas <Typography component="span" variant="body2" color="text.secondary">(máx. 5)</Typography>
    </Typography>
  </motion.div>

  {/* Selector de habilidad (una por vez) */}
  <TextField
    select
    fullWidth
    label={`Seleccioná una habilidad de ${rolSeleccionado}`}
    value=""
    onChange={(e) => {
      const item = e.target.value;
      if (item && !formData.habilidades.includes(item) && formData.habilidades.length < 5) {
        setFormData((prev) => ({ ...prev, habilidades: [...prev.habilidades, item] }));
      }
    }}
    disabled={(opcionesPorRol[rolSeleccionado] || []).length === 0 || formData.habilidades.length >= 5}
  >
    {(opcionesPorRol[rolSeleccionado] || []).map((opt) => (
      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
    ))}
  </TextField>

  {/* Chips de seleccionadas */}
  <Stack direction="row" spacing={1} flexWrap="wrap">
    {formData.habilidades.map((h) => (
      <Chip
        key={h}
        label={h}
        onDelete={() =>
          setFormData((prev) => ({
            ...prev,
            habilidades: prev.habilidades.filter((x) => x !== h),
            // Si borran "Otro", también limpiamos la libre:
            otraHabilidad: h === "Otro" ? "" : prev.otraHabilidad,
          }))
        }
        color="primary"
        variant="outlined"
      />
    ))}
  </Stack>

  <Typography
    variant="caption"
    color={formData.habilidades.length >= 5 ? "error" : "text.secondary"}
  >
    Seleccionadas: {formData.habilidades.length}/5
  </Typography>
</Stack>

{/* Campo condicional para "Otro" */}
<AnimatePresence initial={false}>
  {formData.habilidades.includes("Otro") && (
    <motion.div
      key="otraHabilidad"
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      <TextField
        fullWidth
        label="Especificá otra habilidad"
        name="otraHabilidad"
        value={formData.otraHabilidad}
        onChange={handleChange}
        sx={{ mb: 2 }}
      />
    </motion.div>
  )}
</AnimatePresence>


            {/* Redes */}
            <Grid container spacing={2} component={motion.div} variants={listStagger} initial="hidden" animate="visible">


              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <TextField fullWidth label="LinkedIn" name="linkedin" value={formData.linkedin} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} component={motion.div} variants={itemVariant}>
                <TextField fullWidth label="GitHub/GitLab/Otro" name="repositorio" value={formData.repositorio} onChange={handleChange} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Competencias sociales – Lista con chips (máx. 5) */}
            <motion.div variants={sectionVariants}>
              <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
                Habilidades Blandas <Typography component="span" variant="body2" color="text.secondary">(máx. 5)</Typography>
              </Typography>
            </motion.div>

            <Stack spacing={2} sx={{ mb: 3 }}>
              {/* Selector */}
              <TextField
                select
                fullWidth
                label="Seleccioná una competencia"
                value=""
                onChange={(e) => {
                  const comp = e.target.value;
                  if (
                    comp &&
                    !formData.competencias.includes(comp) &&
                    formData.competencias.length < 5
                  ) {
                    setFormData((prev) => ({
                      ...prev,
                      competencias: [...prev.competencias, comp],
                    }));
                  }
                }}
                disabled={formData.competencias.length >= 5}
                helperText={
                  formData.competencias.length >= 5
                    ? "Alcanzaste el máximo de 5 competencias."
                    : "Elegí una y se agregará a la lista."
                }
              >
                {competenciasSociales.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>

              {/* Chips seleccionadas */}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {formData.competencias.map((comp, idx) => (
                  <Chip
                    key={`${comp}-${idx}`}
                    label={comp}
                    onDelete={() =>
                      setFormData((prev) => ({
                        ...prev,
                        competencias: prev.competencias.filter((c) => c !== comp),
                      }))
                    }
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Stack>

              <Typography
                variant="caption"
                color={formData.competencias.length >= 5 ? "error" : "text.secondary"}
              >
                Seleccionadas: {formData.competencias.length}/5
              </Typography>
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
              Educacion <Typography component="span" variant="body2" color="text.secondary">    </Typography>
            </Typography>
            {/* === Educación / Idiomas / Laboral (mejorado) === */}
            <Grid display={"flex"} flexDirection={"column"}
              container
              spacing={2}
              component={motion.div}
              variants={listStagger}
              initial="hidden"
              animate="visible"
            >
              {/* Nivel académico */}
              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Nivel académico"
                  name="nivelAcademico"
                  value={formData.nivelAcademico}
                  onChange={handleChange}
                  helperText="Seleccioná tu máximo nivel educativo"
                >
                  {nivelesAcademicos.map((nivel) => (
                    <MenuItem key={nivel} value={nivel}>{nivel}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* ¿Cursaste carrera IT? (radios) */}
              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    ¿Cursaste una carrera relacionada a IT?
                  </Typography>
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.carreraIT === 'SI'}
                          onChange={() => setFormData(p => ({ ...p, carreraIT: 'SI' }))}
                        />
                      }
                      label="Sí"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.carreraIT === 'NO'}
                          onChange={() => setFormData(p => ({ ...p, carreraIT: 'NO' }))}
                        />
                      }
                      label="No"
                    />
                  </FormGroup>
                </Box>
              </Grid>

              {/* Nivel de inglés */}
              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <TextField
                  select
                  fullWidth
                  label="Nivel de inglés"
                  name="nivelIngles"
                  value={formData.nivelIngles}
                  onChange={handleChange}
                  helperText="Indica tu nivel actual (auto-percibido)"
                >
                  {nivelesIngles.map((nivel) => (
                    <MenuItem key={nivel} value={nivel}>{nivel}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Certificación de inglés (radios) */}
              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    ¿Tenés certificación en inglés?
                  </Typography>
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.certIngles === 'SI'}
                          onChange={() => setFormData(p => ({ ...p, certIngles: 'SI' }))}
                        />
                      }
                      label="Sí"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.certIngles === 'NO'}
                          onChange={() => setFormData(p => ({ ...p, certIngles: 'NO' }))}
                        />
                      }
                      label="No"
                    />
                  </FormGroup>
                </Box>
              </Grid>

              {/* Campo condicional: detalle certificación */}
              <AnimatePresence initial={false}>
                {formData.certIngles === 'SI' && (
                  <Grid
                    item
                    xs={12}
                    component={motion.div}
                    variants={itemVariant}
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <TextField
                      fullWidth
                      label="Detalle certificación (ej. TOEFL 95, IELTS 7, B2 CEFR)"
                      name="detalleCertIngles"
                      value={formData.detalleCertIngles || ''}
                      onChange={handleChange}
                    />
                  </Grid>
                )}
              </AnimatePresence>

              {/* Ámbito laboral */}
              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Situacion Laboral Actual"
                  name="ambitoLaboral"
                  value={formData.ambitoLaboral}
                  onChange={handleChange}
                  helperText="Seleccioná la opción que mejor te describa hoy"
                >
                  {ambitosLaborales.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Campo condicional: otra situación */}
              <AnimatePresence initial={false}>
                {formData.ambitoLaboral === 'Otro' && (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    component={motion.div}
                    variants={itemVariant}
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <TextField
                      fullWidth
                      label="Especificá otra situación laboral"
                      name="otraSituacion"
                      value={formData.otraSituacion}
                      onChange={handleChange}
                    />
                  </Grid>
                )}
              </AnimatePresence>

              {/* ¿Relación con IT? (radios) */}
              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    ¿Tu empleo actual tiene relación con IT?
                  </Typography>
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.relacionIT === 'SI'}
                          onChange={() => setFormData(p => ({ ...p, relacionIT: 'SI' }))}
                        />
                      }
                      label="Sí"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.relacionIT === 'NO'}
                          onChange={() => setFormData(p => ({ ...p, relacionIT: 'NO' }))}
                        />
                      }
                      label="No"
                    />
                  </FormGroup>
                </Box>
              </Grid>

              {/* Campo condicional: años en IT */}
              <AnimatePresence initial={false}>
                {formData.relacionIT === 'SI' && (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    component={motion.div}
                    variants={itemVariant}
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <TextField
                      fullWidth
                      type="number"
                      label="Años de experiencia en IT"
                      name="aniosIT"
                      value={formData.aniosIT || ''}
                      inputProps={{ min: 0, max: 50 }}
                      onChange={handleChange}
                      helperText="Indicá números enteros (ej. 0, 1, 3, 5...)"
                    />
                  </Grid>
                )}
              </AnimatePresence>

              {/* Disponibilidad horaria */}
              <Grid item xs={12} sm={6} component={motion.div} variants={itemVariant}>
                <TextField
                  select
                  fullWidth
                  label="Disponibilidad horaria"
                  name="disponibilidad"
                  value={formData.disponibilidad}
                  onChange={handleChange}
                  helperText="Elegí tu disponibilidad principal"
                >
                  {["Full-time", "Part-time", "Freelance"].map((opt) => (
                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                  ))}
                </TextField>
              </Grid>


            </Grid>


            <Divider sx={{ my: 3 }} />

            {/* Subir CV con drag & drop */}
            <motion.div variants={sectionVariants}>
              <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
                CV (PDF/DOC) *
              </Typography>
            </motion.div>

            <Paper
              variant="outlined"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              sx={{
                p: 2,
                mb: 2,
                borderStyle: "dashed",
                borderRadius: 2,
                textAlign: "center",
                transition: "all .2s",
                "&:hover": { boxShadow: 3, borderColor: "primary.main" },
              }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                Arrastrá tu archivo aquí o usá el botón.
              </Typography>
              <Button variant="contained" component="label">
                Seleccionar archivo
                <input type="file" hidden name="cv" onChange={handleChange} accept=".pdf,.doc,.docx" />
              </Button>
              {formData.cv && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Archivo seleccionado: <Chip label={formData.cv.name} size="small" />
                </Typography>
              )}
            </Paper>

            {/* Botón enviar */}
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" variant="contained" color="primary" disabled={!requiredOk}>
                  Enviar
                </Button>
              </motion.div>
            </Box>
          </Box>
        </motion.div>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}

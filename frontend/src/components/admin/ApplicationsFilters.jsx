import { Stack, TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { APP_STATES } from "@/constants/appStates";

export default function ApplicationsFilters({ value, onChange }) {
  const handle = (k, v) => onChange({ ...value, [k]: v });

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
      <TextField
        fullWidth
        label="ID de Búsqueda (search)"
        value={value.search}
        onChange={(e) => handle("search", e.target.value)}
        placeholder="64f0... (ObjectId)"
      />

      <FormControl fullWidth>
        <InputLabel>Estado</InputLabel>
        <Select
          label="Estado"
          value={value.state}
          onChange={(e) => handle("state", e.target.value)}
        >
          <MenuItem value="">Todos</MenuItem>
          {APP_STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Buscar (nombre, apellido, email, mensaje)"
        value={value.q}
        onChange={(e) => handle("q", e.target.value)}
      />
    </Stack>
  );
}

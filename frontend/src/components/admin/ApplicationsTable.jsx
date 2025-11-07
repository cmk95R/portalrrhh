import {
  Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, Chip, Menu, MenuItem, Stack
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import { APP_STATES } from "@/constants/appStates";

const COLORS = {
  "Enviada": "default",
  "En revisión": "info",
  "Preseleccionado": "warning",
  "Rechazado": "error",
  "Contratado": "success",
};

export default function ApplicationsTable({ rows, onViewDetail, onChangeState }) {
  const [anchor, setAnchor] = useState(null);
  const [current, setCurrent] = useState(null);

  const openMenu = (e, row) => { setAnchor(e.currentTarget); setCurrent(row); };
  const closeMenu = () => { setAnchor(null); setCurrent(null); };

  const changeTo = (state) => {
    if (current?._id) onChangeState(current._id, state);
    closeMenu();
  };

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Fecha</TableCell>
          <TableCell>Postulante</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Búsqueda</TableCell>
          <TableCell>Estado</TableCell>
          <TableCell align="right">Acciones</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row._id} hover>
            <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
            <TableCell>{row.cvSnapshot?.nombre} {row.cvSnapshot?.apellido}</TableCell>
            <TableCell>{row.cvSnapshot?.email}</TableCell>
            <TableCell>
              {/* TENER EN CUENTA los nombres del populate en tu controller */}
              <div style={{ fontWeight: 500 }}>{row.search?.titulo || row.search?._id}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {row.search?.ubicacion} · {row.search?.area} · {row.search?.estado}
              </div>
            </TableCell>
            <TableCell>
              <Chip size="small" label={row.state} color={COLORS[row.state] || "default"} />
            </TableCell>
            <TableCell align="right">
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Tooltip title="Ver detalle">
                  <IconButton onClick={() => onViewDetail(row)}>
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cambiar estado">
                  <IconButton onClick={(e) => openMenu(e, row)}>
                    <MoreVertIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>

      <Menu anchorEl={anchor} open={!!anchor} onClose={closeMenu}>
        {APP_STATES.filter((s) => s !== current?.state).map((s) => (
          <MenuItem key={s} onClick={() => changeTo(s)}>{s}</MenuItem>
        ))}
      </Menu>
    </Table>
  );
}

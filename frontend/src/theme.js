// src/theme.js (or similar)
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#173487',
      dark: '#132966',
      light: '#2A4DB8',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Raleway", sans-serif',
    // Optional: Adjust weights for specific elements
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 500 },
    button: { fontWeight: 500 },
  },
  // ... other theme settings (palette, etc.)
});

export default theme;
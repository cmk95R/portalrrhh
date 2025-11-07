// src/theme.js (or similar)
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: '"Poppins", sans-serif', // Set Poppins as the default
    // Optional: Adjust weights for specific elements
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 500 },
    button: { fontWeight: 500 },
  },
  // ... other theme settings (palette, etc.)
});

export default theme;
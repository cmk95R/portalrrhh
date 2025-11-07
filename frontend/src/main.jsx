import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import AuthProvider from "./context/AuthProvider";

// --- 👇 AÑADE ESTAS IMPORTACIONES ---
import { ThemeProvider } from '@mui/material/styles'; // Para aplicar el tema
import CssBaseline from '@mui/material/CssBaseline'; // Para normalizar estilos
import theme from './theme'; // 👈 Asegúrate que la ruta a tu archivo de tema sea correcta

// --- 👇 ENVUELVE TU APP CON THEMEPROVIDER Y CSSBASELINE ---
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode> {/* Es buena práctica envolver todo en StrictMode */}
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider theme={theme}> {/* Aplica el tema */}
          
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
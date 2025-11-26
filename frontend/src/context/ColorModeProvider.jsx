// src/context/ColorModeProvider.jsx
import { useMemo, useState } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { ColorModeContext } from "./ColorModeContext"; // Importamos el contexto

export default function ColorModeProvider({ children }) {
    const [mode, setMode] = useState(localStorage.getItem("theme") || "light");

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => {
                    const newMode = prevMode === "light" ? "dark" : "light";
                    localStorage.setItem("theme", newMode);
                    return newMode;
                });
            },
            mode,
        }),
        [mode]
    );

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === "light"
                        ? {
                            background: {
                                default: "#f5f5f5",
                                paper: "#ffffff",
                            },
                        }
                        : {
                            background: {
                                default: "#121212",
                                paper: "#1e1e1e",
                            },
                        }),
                },
            }),
        [mode]
    );

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}

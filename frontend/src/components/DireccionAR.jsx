import React, { useEffect, useState } from "react";
import { Grid, TextField, Autocomplete, CircularProgress } from "@mui/material";

// 1. VOLVEMOS A IMPORTAR LA API
import { getProvinciasApi } from "../api/apiGeo"; 

// 2. ELIMINAMOS LA LISTA HARCODEADA DE AQUÍ
// const PROVINCIAS_HARCODEADAS = [ ... ]; // <-- ELIMINADO

const dedupeById = (arr = []) => Array.from(new Map(arr.map((x) => [x.id, x])).values());

export default function DireccionAR({ value, onChange, required }) {
    // value: { provincia?: {id, nombre}, localidad?: string }
    
    // 3. VOLVEMOS A AÑADIR LOS ESTADOS PARA CARGA
    const [provincias, setProvincias] = useState([]);
    const [loadingProv, setLoadingProv] = useState(true);

    // 4. REACTIVAMOS EL useEffect PARA LLAMAR A LA API
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoadingProv(true);
                // Llamamos a nuestra API del backend
                const { data } = await getProvinciasApi(); 
                if (!alive) return;

                // El backend nos dará la lista de la API o el fallback
                const provinciasApi = data?.provincias || [];
                setProvincias(dedupeById(provinciasApi));

            } catch (e) {
                // Si incluso nuestra API falla, mostramos un error
                console.error("Error al cargar provincias desde el backend:", e);
                if (alive) setProvincias([]); // Dejar vacío
            } finally {
                if (alive) setLoadingProv(false);
            }
        })();
        return () => { alive = false; };
    }, []); // Cargar solo al montar

    // --- Handlers (sin cambios) ---
    const handleProvinciaChange = (event, newProv) => {
        onChange({ provincia: newProv, localidad: "" });
    };

    const handleLocalidadTextChange = (event) => {
        onChange({ ...value, localidad: event.target.value });
    };

    return (
        <Grid container spacing={2}>
            {/* --- Autocomplete de Provincia (ahora usa el estado) --- */}
            <Grid item xs={12} sm={6} width={150}>
                <Autocomplete
                    width={150}
                    options={provincias} // <-- 5. Usa el estado 'provincias'
                    value={value?.provincia || null}
                    getOptionLabel={(o) => o?.nombre || ""}
                    onChange={handleProvinciaChange}
                    isOptionEqualToValue={(a, b) => a?.id === b?.id}
                    loading={loadingProv} // <-- 6. Usa el estado 'loadingProv'
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Provincia"
                            required={required}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {/* 7. Vuelve a mostrar el spinner */}
                                        {loadingProv ? <CircularProgress size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
            </Grid>

            {/* --- TextField de Localidad (sin cambios) --- */}
            <Grid item xs={12} sm={6}>
                <TextField
                    width={150}
                    label="Ingresa tu localidad"
                    required={required}
                    value={
                        value?.localidad?.nombre ?? // Si es un objeto, usa su propiedad 'nombre'
                        value?.localidad ?? // Si no, usa el valor de localidad (string)
                        '' // Como fallback, un string vacío
                    }
                    onChange={handleLocalidadTextChange}
                />
            </Grid>
        </Grid>
    );
}
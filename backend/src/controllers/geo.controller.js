// controllers/geo.controller.js

const BASE_URL = "https://apis.datos.gob.ar/georef/api";
const API_TIMEOUT = 4000; // 5 segundos
// --- INICIO: DATOS DE RESPALDO (FALLBACK) ---
// En caso de que la API externa falle, usamos estos datos.
const fallbackProvincias = [
    { id: '06', nombre: 'Buenos Aires' },
    { id: '10', nombre: 'Catamarca' },
    { id: '14', nombre: 'Córdoba' },
    { id: '18', nombre: 'Corrientes' },
    { id: '22', nombre: 'Chaco' },
    { id: '26', nombre: 'Chubut' },
    { id: '02', nombre: 'Ciudad Autónoma de Buenos Aires' },
    { id: '30', nombre: 'Entre Ríos' },
    { id: '34', nombre: 'Formosa' },
    { id: '38', nombre: 'Jujuy' },
    { id: '42', nombre: 'La Pampa' },
    { id: '46', nombre: 'La Rioja' },
    { id: '50', nombre: 'Mendoza' },
    { id: '54', nombre: 'Misiones' },
    { id: '58', nombre: 'Neuquén' },
    { id: '62', nombre: 'Río Negro' },
    { id: '66', nombre: 'Salta' },
    { id: '70', nombre: 'San Juan' },
    { id: '74', nombre: 'San Luis' },
    { id: '78', nombre: 'Santa Cruz' },
    { id: '82', nombre: 'Santa Fe' },
    { id: '86', nombre: 'Santiago del Estero' },
    { id: '94', nombre: 'Tierra del Fuego' },
    { id: '90', nombre: 'Tucumán' }
].sort((a, b) => a.nombre.localeCompare(b.nombre)); // Ordenamos alfabéticamente
// --- FIN: DATOS DE RESPALDO ---
// --- Caché en memoria ---
const cache = {
    provincias: null,
    localidades: new Map(),
};

/**
 * Obtiene la lista de provincias con un timeout de 5 segundos.
 */
export const getProvincias = async (req, res, next) => {
    try {
        if (cache.provincias) {
            return res.json({ provincias: cache.provincias });
        }

        const controller = new AbortController();
        const signal = controller.signal;

        // Promesa de timeout: rechaza y aborta la petición después de 5 segundos
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => {
                controller.abort();
                reject(new Error("Timeout de API"));
            }, API_TIMEOUT)
        );

        // Promesa de fetch: usa el 'signal' del AbortController
        const fetchPromise = fetch(`${BASE_URL}/provincias?campos=id,nombre&orden=nombre`, { signal });

        let response = null;
        try {
            // Compiten el fetch y el timeout
            response = await Promise.race([fetchPromise, timeoutPromise]);
        } catch (error) {
            // Si el error es por el timeout (AbortError) o el timeoutPromise, usamos el fallback.
            if (error.name === "AbortError" || error.message === "Timeout de API") {
                console.warn(`API de Provincias superó los ${API_TIMEOUT}ms. Usando fallback.`);
                cache.provincias = fallbackProvincias;
                return res.json({ provincias: fallbackProvincias });
            }
            // Si es otro error de fetch (ej. DNS, ECONNREFUSED), también usamos fallback.
            throw error;
        }

        let provincias = [];
        if (response && response.ok) {
            const data = await response.json();
            provincias = data.provincias || [];
        }

        // Si la API respondió OK pero sin datos, también usa el fallback
        cache.provincias = provincias.length > 0 ? provincias : fallbackProvincias;
        res.json({ provincias: cache.provincias });

    } catch (error) {
        // Catch principal (para errores de fetch no relacionados con timeout o fallos de lógica)
        console.error("Error en getProvincias, usando fallback:", error.message);
        cache.provincias = fallbackProvincias; // Asegura el fallback en cualquier error
        res.json({ provincias: fallbackProvincias });
    }
};

/**
 * Obtiene las localidades con un timeout de 5 segundos.
 * Si falla, devuelve un array vacío (lo que activa el modo manual en el frontend).
 */
export const getLocalidades = async (req, res, next) => {
    const { provinciaId } = req.query;
    if (!provinciaId) {
        return res.status(400).json({ message: "El ID de la provincia es requerido." });
    }

    try {
        if (cache.localidades.has(provinciaId)) {
            return res.json({ localidades: cache.localidades.get(provinciaId) });
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => {
                controller.abort();
                reject(new Error("Timeout de API"));
            }, API_TIMEOUT)
        );

        const url = `${BASE_URL}/localidades?provincia=${encodeURIComponent(provinciaId)}&campos=id,nombre&orden=nombre&max=5000`;
        const fetchPromise = fetch(url, { signal });

        let response = null;
        let localidades = []; // Por defecto, un array vacío

        try {
            response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (response && response.ok) {
                const data = await response.json();
                localidades = data.localidades || [];
            }
            // Si no es ok, o si el response es null, 'localidades' queda como []
        
        } catch (error) {
            // Si hay timeout o error de fetch, 'localidades' queda como []
            if (error.name === "AbortError" || error.message === "Timeout de API") {
                console.warn(`API de Localidades time-out para provincia ${provinciaId}. Frontend usará modo manual.`);
            } else {
                console.error(`Error en getLocalidades para provincia ${provinciaId}:`, error.message);
            }
        }
        
        cache.localidades.set(provinciaId, localidades);
        res.json({ localidades }); // Devuelve [] si falló, lo que activa el modo manual en el front

    } catch (error) {
        // Este catch es para errores de lógica interna, no del fetch
        console.error(`Error fatal en getLocalidades ${provinciaId}:`, error);
        next(error);
    }
};
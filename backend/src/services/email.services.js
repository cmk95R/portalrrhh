import { Resend } from "resend";

// --- INICIO: CORRECCIÓN ---
// No inicializamos el cliente aquí. Lo haremos de forma "perezosa" (lazy)
// para asegurarnos de que `dotenv` haya cargado las variables de entorno primero.
let resend;

const getResendClient = () => {
    if (!resend) {
        // Esta inicialización ahora ocurre la primera vez que se llama a una función de email,
        // momento en el cual process.env.RESEND_API_KEY ya estará disponible.
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
};
// --- FIN: CORRECCIÓN ---
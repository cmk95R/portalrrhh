// middleware/upload.middleware.js

import multer from "multer";

// Usamos memoryStorage porque no queremos guardar el archivo en el disco del servidor.
// Lo procesaremos en memoria y lo enviaremos directamente a OneDrive.
const storage = multer.memoryStorage();

// Filtro para aceptar solo archivos PDF
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true); // Aceptar el archivo
    } else {
        cb(new Error("Solo se permiten archivos PDF."), false); // Rechazar el archivo
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 5, // Límite de 5 MB
    },
});

export default upload;
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// Cargar variables de entorno
dotenv.config({ path: "./.env" });

// Importar los modelos
import User from "../src/models/User.js";
import Cv from "../src/models/Cv.js";
import Application from "../src/models/Application.js";
import Search from "../src/models/Search.js";
// ... importa cualquier otro modelo que necesites limpiar/poblar

// --- DATOS DE PRUEBA (SEED DATA) ---
const createSeedData = async () => {
    // Hasheamos las contraseñas para los usuarios de prueba
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("123456", salt);

    const users = [
        {
            nombre: "Admin",
            apellido: "User",
            email: "admin@asytec.ar",
            password: hashedPassword,
            rol: "admin",
        },
        {
            nombre: "Juan",
            apellido: "Perez",
            email: "juan.perez@test.com",
            password: hashedPassword,
            rol: "user",
        },
        {
            nombre: "Maria",
            apellido: "Gomez",
            email: "maria.gomez@test.com",
            password: hashedPassword,
            rol: "user",
        },
    ];
    return { users };
};


// --- FUNCIÓN PARA LIMPIAR LA BASE DE DATOS ---
const cleanDatabase = async () => {
    console.log("🧹 Limpiando la base de datos...");
    try {
        // Borramos todos los documentos de las colecciones en paralelo
        await Promise.all([
            User.deleteMany(),
            Cv.deleteMany(),
            Application.deleteMany(),
            Search.deleteMany(),
        ]);
        console.log("✅ Base de datos limpia.");
    } catch (error) {
        console.error("❌ Error limpiando la base de datos:", error);
        process.exit(1); // Salir con error
    }
};

// --- FUNCIÓN PARA POBLAR LA BASE DE DATOS ---
const seedDatabase = async () => {
    console.log("🌱 Poblando la base de datos con datos de prueba...");
    try {
        const { users } = await createSeedData();

        // Crear usuarios
        const createdUsers = await User.insertMany(users);
        console.log(`   - ${createdUsers.length} usuarios creados.`);

        // Crear un CV para Juan Perez
        const juan = createdUsers.find(u => u.email === "juan.perez@test.com");
        if (juan) {
            await Cv.create({
                user: juan._id,
                nombre: juan.nombre,
                apellido: juan.apellido,
                email: juan.email,
                perfil: "Desarrollador con 5 años de experiencia en el stack MERN.",
                nivelAcademico: "Universitario completo",
                experiencia: [{ puesto: "Developer", empresa: "Tech Corp" }]
            });
            console.log("   - CV de prueba creado para Juan Perez.");
        }

        console.log("✅ Base de datos poblada con éxito.");

    } catch (error) {
        console.error("❌ Error poblando la base de datos:", error);
        process.exit(1); // Salir con error
    }
};

// --- FUNCIÓN PRINCIPAL ---
const run = async () => {
    // Conectar a MongoDB
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔌 Conectado a MongoDB.");
    } catch (error) {
        console.error("❌ Error de conexión a MongoDB:", error);
        process.exit(1);
    }
    
    // Leer argumentos de la línea de comandos
    const args = process.argv.slice(2);

    if (args.includes("--clean")) {
        await cleanDatabase();
    }

    if (args.includes("--seed")) {
        await seedDatabase();
    }
    
    // Si no hay argumentos, mostrar ayuda
    if (args.length === 0) {
        console.log(`
Uso: node scripts/seeder.js [opciones]

Opciones:
  --clean     Limpia todas las colecciones de la base de datos.
  --seed      Puebla la base de datos con datos de prueba.
  
Ejemplo: node scripts/seeder.js --clean --seed
        `);
    }

    // Desconectar de la base de datos
    await mongoose.disconnect();
    console.log("🔌 Desconectado de MongoDB.");
    process.exit(0);
};

// --- ¡MUY IMPORTANTE! VERIFICACIÓN DE ENTORNO ---
if (process.env.NODE_ENV === "production") {
    console.error("❌ ¡PELIGRO! No puedes ejecutar el seeder en un entorno de producción.");
    process.exit(1);
} else {
    run();
}
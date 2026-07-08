const express = require('express');
const { Rcon } = require('rcon-client');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de RCON (Asegúrate de configurar esto en las variables de entorno de Coolify o ponerlas aquí)
const RCON_HOST = process.env.RCON_HOST || 'IP_DE_TU_VPS';
const RCON_PORT = parseInt(process.env.RCON_PORT || '50115');
const RCON_PASSWORD = process.env.RCON_PASSWORD || 'TU_CONTRASEÑA_RCON';

// Middleware para procesar datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ruta para mostrar la página del acertijo
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Ruta para validar la respuesta del formulario
app.post('/verificar', async (req, res) => {
    const { nick, respuesta } = req.body;
    
    // AQUÍ DEFINES LA RESPUESTA CORRECTA (en minúsculas para evitar fallos de mayúsculas)
    const RESPUESTA_CORRECTA = 'ricardo'; 

    // Validación básica de campos vacíos
    if (!nick || !respuesta) {
        return res.status(400).send('<h3>Por favor, completa todos los campos.</h3><a href="/">Volver</a>');
    }

    // Comprobar si la respuesta es correcta
    if (respuesta.trim().toLowerCase() === RESPUESTA_CORRECTA) {
        try {
            // Conectarse al RCON de Minecraft
            const rcon = await Rcon.connect({
                host: RCON_HOST,
                port: RCON_PORT,
                password: RCON_PASSWORD,
            });

            // EJECUTAR EL COMANDO: Usamos el comando de Skript personalizado que hicimos antes
            const comando = `darunlibro ${nick.trim()}`;
            const respuestaRcon = await rcon.send(comando);
            
            // Cerrar conexión RCON
            await rcon.end();

            // Respuesta bonita al usuario en la web
            res.send(`
                <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                    <h1 style="color: green;">¡Felicidades, respuesta correcta!</h1>
                    <p>Se ha enviado un libro con instrucciones a la cuenta de Minecraft: <strong>${nick}</strong></p>
                    <p>Revisa tu inventario dentro del juego.</p>
                </div>
            `);

        } catch (error) {
            console.error('Error de RCON:', error);
            res.status(500).send('<h3>Hubo un error al conectar con el servidor de Minecraft, pero tu respuesta fue correcta. Contacta a un administrador.</h3>');
        }
    } else {
        // Respuesta incorrecta
        res.send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                <h1 style="color: red;">Respuesta incorrecta</h1>
                <p>Vuelve a intentarlo o piensa mejor el acertijo.</p>
                <a href="/" style="background: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reintentar</a>
            </div>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Servidor del acertijo corriendo en el puerto ${PORT}`);
});

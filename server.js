const express = require('express');
const { Rcon } = require('rcon-client');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3005;

// Variables de entorno con los valores por defecto de Minecraft
const RCON_HOST = process.env.RCON_HOST || '62.171.153.80';
const RCON_PORT = parseInt(process.env.RCON_PORT || '50115');
const RCON_PASSWORD = process.env.RCON_PASSWORD || 'backdoorkain';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Ruta del archivo físico donde se guardará el acertijo permanentemente
const ARCHIVO_DATA = path.join(__dirname, 'acertijo.json');

// Valores por defecto (se usarán solo la primera vez si el archivo no existe)
let configuracionAcertijo = {
    titulo: "Desafío del Servidor #1",
    pregunta: "Tengo ojos pero no veo, bailo sin música y soy el meme más famoso del servidor... ¿Quién soy?",
    respuesta: "ricardo",
    comando: "givebook %player% mi_libro"
};

// FUNCIÓN PARA CARGAR LOS DATOS DESDE EL DISCO
function cargarDatos() {
    try {
        if (fs.existsSync(ARCHIVO_DATA)) {
            const datosRaw = fs.readFileSync(ARCHIVO_DATA, 'utf8');
            configuracionAcertijo = JSON.parse(datosRaw);
            console.log("-> Datos del acertijo cargados correctamente desde el disco.");
        } else {
            console.log("-> No se encontró archivo previo. Usando valores por defecto.");
            guardarDatos();
        }
    } catch (error) {
        console.error("Error al cargar el archivo de datos:", error);
    }
}

// FUNCIÓN PARA GUARDAR LOS DATOS EN EL DISCO
function guardarDatos() {
    try {
        fs.writeFileSync(ARCHIVO_DATA, JSON.stringify(configuracionAcertijo, null, 2), 'utf8');
        console.log("-> Cambios guardados físicamente en el disco.");
    } catch (error) {
        console.error("Error al escribir en el archivo de datos:", error);
    }
}

// Inicializar la carga de datos al encender el servidor
cargarDatos();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. VISTA PÚBLICA: Interfaz para los jugadores
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${configuracionAcertijo.titulo}</title>
        <style>
            body { font-family: sans-serif; background: #1e1e24; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: #2a2a35; padding: 30px; border-radius: 10px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h1 { color: #ffbc42; margin-bottom: 5px; }
            .box { background: #1e1e24; padding: 15px; border-left: 5px solid #ffbc42; margin: 20px 0; font-style: italic; line-height: 1.4; }
            input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 5px; border: 1px solid #444; background: #1e1e24; color: #fff; box-sizing: border-box; }
            .bedrock-note { color: #aaa; font-size: 0.85em; text-align: left; margin: -5px 0 15px 2px; line-height: 1.3; }
            .bedrock-note strong { color: #ffbc42; }
            button { width: 100%; padding: 12px; background: #ffbc42; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; color: #1e1e24; margin-top: 5px; }
            button:hover { background: #e0a334; }
            .footer-link { margin-top: 25px; display: block; color: #555; text-decoration: none; font-size: 0.8em; }
            .footer-link:hover { color: #777; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧩 ${configuracionAcertijo.titulo}</h1>
            <div class="box">"${configuracionAcertijo.pregunta}"</div>
            <form action="/verificar" method="POST">
                <input type="text" name="nick" placeholder="Tu Nick de Minecraft (Exacto)" required>
                <div class="bedrock-note">
                    ⚠️ <strong>Jugadores Bedrock (Xbox/Celular):</strong> Recuerda que tu usuario comienza con un punto. Ejemplo: <code>.UsuarioBedrock</code>
                </div>
                <input type="text" name="respuesta" placeholder="Tu Respuesta aquí" required>
                <button type="submit">Enviar Solución</button>
            </form>
            <a href="/admin" class="footer-link">Panel de Control</a>
        </div>
    </body>
    </html>
    `);
});
// 2. RUTA PÚBLICA: Validación de la respuesta e interacción RCON
app.post('/verificar', async (req, res) => {
    const { nick, respuesta } = req.body;

    if (!nick || !respuesta) {
        return res.status(400).send('<h3>Por favor llena todos los campos.</h3><a href="/">Volver</a>');
    }

    if (respuesta.trim().toLowerCase() === configuracionAcertijo.respuesta.trim().toLowerCase()) {
        try {
            const rcon = await Rcon.connect({ host: RCON_HOST, port: RCON_PORT, password: RCON_PASSWORD });
            const comandoFinal = configuracionAcertijo.comando.replace('%player%', nick.trim());
            
            await rcon.send(comandoFinal);
            await rcon.end();

            res.send(`
                <body style="text-align: center; font-family: sans-serif; background: #1e1e24; color: #fff; padding-top: 100px;">
                    <h1 style="color: #4caf50;">¡Respuesta Correcta!</h1>
                    <p>El comando RCON ha sido enviado exitosamente para el jugador: <strong>${nick}</strong></p>
                    <p>¡Revisa tu inventario o el chat dentro de KattyCraft!</p>
                </body>
            `);
        } catch (error) {
            console.error(error);
            res.status(500).send('<body style="text-align:center;font-family:sans-serif;background:#1e1e24;color:#fff;padding-top:100px;"><h3>¡Respuesta correcta! Sin embargo, falló la conexión RCON. Avisa al staff.</h3></body>');
        }
    } else {
        res.send(`
            <body style="text-align: center; font-family: sans-serif; background: #1e1e24; color: #fff; padding-top: 100px;">
                <h1 style="color: #f44336;">Respuesta Incorrecta</h1>
                <p>Vuelve a leer el acertijo en el mapa e inténtalo de nuevo.</p>
                <a href="/" style="color: #ffbc42; text-decoration: none; font-weight: bold;">[ Regresar ]</a>
            </body>
        `);
    }
});

// 3. VISTA DE ADMINISTRACIÓN: Panel de login y edición unificado
app.get('/admin', (req, res) => {
    const { pass } = req.query;

    if (pass !== ADMIN_PASSWORD) {
        return res.send(`
            <body style="font-family:sans-serif; background:#1e1e24; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
            <form action="/admin" method="GET" style="background:#2a2a35; padding:30px; border-radius:8px; text-align:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                <h3>Acceso Administrativo</h3>
                <input type="password" name="pass" placeholder="Contraseña de Seguridad" style="padding:10px; margin-bottom:15px; border-radius:4px; border:1px solid #444; background:#1e1e24; color:#fff; text-align:center;"><br>
                <button type="submit" style="padding:10px 25px; background:#ffbc42; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Autenticar</button>
            </form>
            </body>
        `);
    }

    res.send(`
        <body style="font-family:sans-serif; background:#1e1e24; color:#fff; padding:30px;">
            <h2 style="color: #ffbc42; border-bottom: 2px solid #2a2a35; padding-bottom: 10px;">⚙️ Gestor del Acertijo Activo</h2>
            <p style="color: #aaa;">Cualquier cambio guardado aquí modificará la página de inicio inmediatamente.</p>
            
            <form action="/admin/guardar" method="POST" style="background:#2a2a35; padding:25px; border-radius:8px; max-width: 600px;">
                <input type="hidden" name="pass" value="${pass}">
                
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Título del Desafío:</label><br>
                    <input type="text" name="titulo" value="${configuracionAcertijo.titulo}" style="width:100%; background:#1e1e24; color:#fff; border:1px solid #444; padding:10px; border-radius:4px; margin-top:5px;">
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Pregunta / Acertijo:</label><br>
                    <textarea name="pregunta" style="width:100%; height:75px; background:#1e1e24; color:#fff; border:1px solid #444; padding:10px; border-radius:4px; margin-top:5px; font-family:sans-serif;">${configuracionAcertijo.pregunta}</textarea>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold;">Respuesta Correcta:</label><br>
                    <input type="text" name="respuesta" value="${configuracionAcertijo.respuesta}" style="width:100%; background:#1e1e24; color:#fff; border:1px solid #444; padding:10px; border-radius:4px; margin-top:5px;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="font-weight: bold;">Comando RCON (Usa %player% para el nombre del jugador):</label><br>
                    <input type="text" name="comando" value="${configuracionAcertijo.comando}" style="width:100%; background:#1e1e24; color:#fff; border:1px solid #444; padding:10px; border-radius:4px; margin-top:5px; font-family: monospace;">
                </div>

                <button type="submit" style="padding:12px 30px; background:#4caf50; color:#fff; border:none; border-radius:5px; font-size:1em; cursor:pointer; font-weight:bold;">Actualizar Evento</button>
            </form>
        </body>
    `);
});

// 4. ACCIÓN DE GUARDAR: Procesa la edición del Admin y escribe el archivo JSON
app.post('/admin/guardar', (req, res) => {
    const { pass, titulo, pregunta, respuesta, comando } = req.body;
    if (pass !== ADMIN_PASSWORD) return res.status(403).send('Acceso denegado.');

    configuracionAcertijo.titulo = titulo;
    configuracionAcertijo.pregunta = pregunta;
    configuracionAcertijo.respuesta = respuesta;
    configuracionAcertijo.comando = comando;

    // GUARDADO PERSISTENTE EN EL VPS
    guardarDatos();

    res.send(`
        <script>
            alert('¡El acertijo y el título se han guardado permanentemente en el disco!');
            window.location.href = '/admin?pass=${pass}';
        </script>
    `);
});

app.listen(PORT, () => console.log(`Servidor de eventos corriendo en puerto ${PORT}`));

const express = require('express');
const { Rcon } = require('rcon-client');
const path = require('path');

const app = express();
const PORT = 3005;

// Variables de entorno para RCON
const RCON_HOST = process.env.RCON_HOST || '62.171.153.80';
const RCON_PORT = parseInt(process.env.RCON_PORT || '50115');
const RCON_PASSWORD = process.env.RCON_PASSWORD || 'backdoorkain';

// Contraseña para acceder al panel de administración web
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'midorimidori1';

// Base de datos temporal en memoria para 3 preguntas (puedes cambiarlas desde el panel admin)
let acertijos = {
    1: {
        pregunta: "Tengo ojos pero no veo, bailo sin música y soy el meme más famoso del servidor... ¿Quién soy?",
        respuesta: "ricardo",
        comando: "mi_evento_recompensa %player% 1"
    },
    2: {
        pregunta: "Segunda pregunta del evento: ¿Cuál es el bloque más duro de obtener sin romper la lógica?",
        respuesta: "bedrock",
        comando: "mi_evento_recompensa %player% 2"
    },
    3: {
        pregunta: "Tercera pregunta: ¿Cuál es el nombre de la mascota del admin?",
        respuesta: "katty",
        comando: "mi_evento_recompensa %player% 3"
    }
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Vista Pública: Formulario para los jugadores (Soporta parámetro ?id=1, ?id=2, ?id=3)
app.get('/', (req, res) => {
    const id = req.query.id || 1;
    const acertijo = acertijos[id];

    if (!acertijo) {
        return res.status(404).send('<h3>Este desafío no existe.</h3>');
    }

    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Desafío KattyCraft</title>
        <style>
            body { font-family: sans-serif; background: #1e1e24; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: #2a2a35; padding: 30px; border-radius: 10px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h1 { color: #ffbc42; }
            .box { background: #1e1e24; padding: 15px; border-left: 5px solid #ffbc42; margin: 20px 0; font-style: italic; }
            input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 5px; border: 1px solid #444; background: #1e1e24; color: #fff; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #ffbc42; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; }
            button:hover { background: #e0a334; }
            .footer-link { margin-top: 20px; display: block; color: #777; text-decoration: none; font-size: 0.8em; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🧩 Desafío #${id}</h1>
            <div class="box">"${acertijo.pregunta}"</div>
            <form action="/verificar" method="POST">
                <input type="hidden" name="id" value="${id}">
                <input type="text" name="nick" placeholder="Tu Nick de Minecraft (Exacto)" required>
                <input type="text" name="respuesta" placeholder="Tu Respuesta aquí" required>
                <button type="submit">Enviar Solución</button>
            </form>
            <a href="/admin" class="footer-link">Panel de Control</a>
        </div>
    </body>
    </html>
    `);
});

// 2. Ruta para procesar la respuesta del jugador
app.post('/verificar', async (req, res) => {
    const { id, nick, respuesta } = req.body;
    const acertijo = acertijos[id];

    if (!acertijo) return res.status(400).send('Desafío no válido.');

    if (respuesta.trim().toLowerCase() === acertijo.respuesta.trim().toLowerCase()) {
        try {
            const rcon = await Rcon.connect({ host: RCON_HOST, port: RCON_PORT, password: RCON_PASSWORD });
            
            // Reemplazamos la variable %player% por el nick del jugador real
            const comandoFinal = acertijo.comando.replace('%player%', nick.trim());
            await rcon.send(comandoFinal);
            await rcon.end();

            res.send(`
                <div style="text-align: center; font-family: sans-serif; margin-top: 50px; background: #1e1e24; color: #fff; height: 100vh; padding-top: 40px;">
                    <h1 style="color: #4caf50;">¡Respuesta Correcta!</h1>
                    <p>El servidor de Minecraft ha procesado tu premio para el jugador: <strong>${nick}</strong></p>
                    <p>¡Entra al juego y reclama tu recompensa!</p>
                </div>
            `);
        } catch (error) {
            console.error(error);
            res.status(500).send('<h3>Respuesta correcta, pero falló la conexión RCON con Minecraft. Avisa a un admin.</h3>');
        }
    } else {
        res.send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 50px; background: #1e1e24; color: #fff; height: 100vh; padding-top: 40px;">
                <h1 style="color: #f44336;">Respuesta Incorrecta</h1>
                <p>Vuelve a leer el acertijo e inténtalo de nuevo.</p>
                <a href="/?id=${id}" style="color: #ffbc42;">Regresar</a>
            </div>
        `);
    }
});

// 3. Vista de Administración (Logueo / Edición)
app.get('/admin', (req, res) => {
    const { pass } = req.query;

    if (pass !== ADMIN_PASSWORD) {
        return res.send(`
            <body style="font-family:sans-serif; background:#1e1e24; color:#fff; display:flex; justify-content:center; align-items:center; height:100vh;">
            <form action="/admin" method="GET" style="background:#2a2a35; padding:20px; border-radius:8px; text-align:center;">
                <h3>Acceso Administrativo</h3>
                <input type="password" name="pass" placeholder="Contraseña Admin" style="padding:10px; margin-bottom:10px; border-radius:4px; border:none;"><br>
                <button type="submit" style="padding:10px 20px; background:#ffbc42; border:none; border-radius:4px; font-weight:bold;">Entrar</button>
            </form>
            </body>
        `);
    }

    // Si la contraseña es correcta, muestra el editor de los 3 acertijos
    let formularios = '';
    for (let key in acertijos) {
        formularios += `
            <div style="background:#2a2a35; padding:15px; margin-bottom:15px; border-radius:8px; border-left: 4px solid #ffbc42;">
                <h4>Desafío #${key} (URL pública: /?id=${key})</h4>
                <label>Pregunta:</label><br>
                <textarea name="p_${key}" style="width:100%; height:50px; background:#1e1e24; color:#fff; border:1px solid #444;">${acertijos[key].pregunta}</textarea><br><br>
                <label>Respuesta Correcta:</label><br>
                <input type="text" name="r_${key}" value="${acertijos[key].respuesta}" style="width:100%; background:#1e1e24; color:#fff; border:1px solid #444; padding:5px;"><br><br>
                <label>Comando Skript / RCON (Usa %player% para el nick):</label><br>
                <input type="text" name="c_${key}" value="${acertijos[key].comando}" style="width:100%; background:#1e1e24; color:#fff; border:1px solid #444; padding:5px;">
            </div>
        `;
    }

    res.send(`
        <body style="font-family:sans-serif; background:#1e1e24; color:#fff; padding:20px;">
            <h2>⚙️ Configuración de Acertijos KattyCraft</h2>
            <form action="/admin/guardar" method="POST">
                <input type="hidden" name="pass" value="${pass}">
                ${formularios}
                <button type="submit" style="padding:12px 30px; background:#4caf50; color:#fff; border:none; border-radius:5px; font-size:1.1em; cursor:pointer; font-weight:bold;">Guardar Cambios</button>
            </form>
        </body>
    `);
});

// 4. Procesar el guardado de los cambios del Admin
app.post('/admin/guardar', (req, res) => {
    const { pass } = req.body;
    if (pass !== ADMIN_PASSWORD) return res.status(403).send('No autorizado');

    for (let key in acertijos) {
        acertijos[key].pregunta = req.body[`p_${key}`];
        acertijos[key].respuesta = req.body[`r_${key}`];
        acertijos[key].comando = req.body[`c_${key}`];
    }

    res.send(`
        <script>
            alert('¡Configuración guardada con éxito!');
            window.location.href = '/admin?pass=${pass}';
        </script>
    `);
});

app.listen(PORT, () => {
    console.log(`Servidor del acertijo corriendo en el puerto ${PORT}`);
});

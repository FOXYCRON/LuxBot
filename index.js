const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const config = require('./config/settings');

// --- BANDERA PARA EVITAR REENVÍO DE EVENTOS ACUMULADOS EN EL ARRANQUE ---
let botListo = false;

// --- RUTAS A LA BASE DE DATOS DENTRO DE /database ---
const DB_FILE = path.join(__dirname, 'database', 'comandos.json');
const WELCOME_FILE = path.join(__dirname, 'database', 'welcome.json');
const MSGS_FILE = path.join(__dirname, 'database', 'mensajes.json');

// Crear la carpeta database si aún no existe
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf-8');
}

// Inicializar welcome.json deshabilitado por defecto ({ "enabled": false })
if (!fs.existsSync(WELCOME_FILE)) {
    fs.writeFileSync(WELCOME_FILE, JSON.stringify({ enabled: false }, null, 2), 'utf-8');
}

// Inicializar mensajes.json para el registro de actividad
if (!fs.existsSync(MSGS_FILE)) {
    fs.writeFileSync(MSGS_FILE, JSON.stringify({}), 'utf-8');
}

function getComandos() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveComando(nombre, contenido) {
    const db = getComandos();
    db[nombre] = contenido;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// --- FUNCIONALIDAD PARA REGISTRO DE MENSAJES (FANTASMAS) ---
function registrarMensaje(groupId, senderId) {
    try {
        let data = {};
        if (fs.existsSync(MSGS_FILE)) {
            data = JSON.parse(fs.readFileSync(MSGS_FILE, 'utf-8'));
        }
        if (!data[groupId]) data[groupId] = {};
        if (!data[groupId][senderId]) data[groupId][senderId] = 0;

        data[groupId][senderId] += 1;

        fs.writeFileSync(MSGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('Error al guardar contador de mensajes:', e);
    }
}

// --- FUNCIONES PARA MANEJAR WELCOME.JSON ---
function getWelcomeStatus() {
    try {
        const data = JSON.parse(fs.readFileSync(WELCOME_FILE, 'utf-8'));
        return data.enabled === true; // Retorna true solo si es true explícitamente
    } catch (error) {
        return false;
    }
}

function setWelcomeStatus(status) {
    fs.writeFileSync(WELCOME_FILE, JSON.stringify({ enabled: status }, null, 2), 'utf-8');
}

// --- CARGADOR RECURSIVO DE COMANDOS Y ALIAS ---
const systemCommands = new Map();
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadCommands(fullPath);
        } else if (item.endsWith('.js')) {
            const cmd = require(fullPath);

            if (cmd.name) {
                systemCommands.set(cmd.name, cmd);
            }

            if (cmd.aliases && Array.isArray(cmd.aliases)) {
                cmd.aliases.forEach(alias => systemCommands.set(alias, cmd));
            }
        }
    }
}

loadCommands(commandsPath);

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ["LuxBot", "Chrome", "1.0.0"] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            botListo = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`⚠️ Conexión cerrada. Código de razón: ${statusCode}. Reconectando: ${shouldReconnect}`);

            if (shouldReconnect) {
                setTimeout(() => {
                    startBot();
                }, 3000);
            } else {
                console.log('❌ Sesión cerrada permanentemente. Elimina la carpeta auth_info_baileys y vuelve a escanear el QR.');
            }
        } else if (connection === 'open') {
            console.log('✅ Bot conectado con éxito a WhatsApp');
            setTimeout(() => {
                botListo = true;
                console.log('🚀 Bot listo para procesar bienvenidas e interacciones en tiempo real.');
            }, 5000);
        }
    });

    // --- EVENTO DE BIENVENIDA A NUEVOS MIEMBROS ---
    sock.ev.on('group-participants.update', async (update) => {
        if (!botListo) return;

        const { id, participants, action } = update;

        if (action === 'add') {
            try {
                // Leer el estado directamente de welcome.json
                const bienvenidaActiva = getWelcomeStatus();
                
                if (!bienvenidaActiva) return; // Desactivado por defecto o si es false

                const groupMetadata = await sock.groupMetadata(id);
                const groupName = groupMetadata.subject;

                const mencionesTexto = [];
                const jidsMentions = [];

                for (const participant of participants) {
                    const jid = typeof participant === 'string' 
                        ? participant 
                        : (participant.id || participant.jid || '');

                    if (jid) {
                        const userNumber = jid.split('@')[0];
                        mencionesTexto.push(`@${userNumber}`);
                        jidsMentions.push(jid);
                    }
                }

                if (jidsMentions.length === 0) return;

                const usuariosMencionados = mencionesTexto.join(', ');

                const mensajeBienvenida = 
`✨ *¡BIENVENIDO/A A LUXPASS!* ${usuariosMencionados}

👥 *Grupo:* ${groupName}

───────────────
💼 *CATÁLOGO DE SERVICIOS*

🎬 *Streaming:* 
• Netflix | Disney+ | Max | Prime | VIX+
• Crunchyroll | Apple TV+ | Canva Pro

🎵 *Música:* 
• Spotify | YouTube Premium | Apple Music | Deezer

📺 *TV & Multimedia:* 
• IPTV | Películas | Series
───────────────

📌 *COMANDOS ÚTILES:*
• *${config.prefix}stock* ➔ Ver precios y disponibilidad
• *${config.prefix}pago* ➔ Métodos de pago disponibles
• *${config.prefix}combos* ➔ Mira los combos disponibles
• *${config.prefix}lotes* ➔ Precios especiales en compras por lote

💎 ¡Disfruta del mejor entretenimiento con la calidad y confianza de LUXPASS!`;

                await sock.sendMessage(id, { 
                    text: mensajeBienvenida, 
                    mentions: jidsMentions 
                });

            } catch (error) {
                console.error('Error al enviar la bienvenida agrupada:', error);
            }
        }
    });

    // --- RECEPCIÓN Y EJECUCIÓN DE MENSAJES Y COMANDOS ---
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return; 
        
        const m = messages[0];
        if (!m.message) return;

        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const rawSender = m.key.participant || m.key.remoteJid;
        const sender = rawSender.replace(/:[0-9]+@/g, '@');

        // --- REGISTRO AUTOMÁTICO DE MENSAJES EN GRUPOS (PARA FANTASMAS) ---
        if (isGroup && !m.key.fromMe) {
            registrarMensaje(from, sender);
        }

        // --- VALIDACIONES DE UBICACIÓN ---
        if (config.allowedChatType === 'private' && isGroup) return;
        if (config.allowedChatType === 'group' && !isGroup) return;
        if (isGroup && config.allowedGroups.length > 0 && !config.allowedGroups.includes(from)) return;

        const body = m.message.conversation || 
                     m.message.extendedTextMessage?.text || 
                     m.message.imageMessage?.caption || '';

        if (!body.startsWith(config.prefix)) return;

        const args = body.slice(config.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Parámetros pasados a los módulos
        const context = { 
            sock, 
            from, 
            command, 
            args, 
            body, 
            m, 
            sender, 
            config, 
            getComandos, 
            saveComando, 
            getWelcomeStatus,
            setWelcomeStatus,
            systemCommands 
        };

        // --- DETECCIÓN Y BÚSQUEDA AUTOMÁTICA DE COMANDOS ---
        let targetCmd = systemCommands.get(command);

        if (!targetCmd) {
            for (const [key, cmdModule] of systemCommands.entries()) {
                if (command.startsWith(key)) {
                    targetCmd = cmdModule;
                    break;
                }
            }
        }

        if (targetCmd) {
            return await targetCmd.execute(context);
        }

        const comandosBD = getComandos();
        if (comandosBD[command]) {
            return await sock.sendMessage(from, { text: comandosBD[command] });
        }
    });
}

startBot();
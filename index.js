const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const config = require('./config/settings');
const DB_FILE = path.join(__dirname, 'database', 'comandos.json');

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

function getComandos() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveComando(nombre, contenido) {
    const db = getComandos();
    db[nombre] = contenido;
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// --- 1. CARGADOR RECURSIVO DE COMANDOS Y ALIAS (SUBDIRECTORIOS INCLUIDOS) ---
const systemCommands = new Map();
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Si encuentra carpetas como 'admin' o 'clientes', las explora automáticamente
            loadCommands(fullPath);
        } else if (item.endsWith('.js')) {
            const cmd = require(fullPath);

            // Registrar por nombre principal
            if (cmd.name) {
                systemCommands.set(cmd.name, cmd);
            }

            // Registrar todos sus alias dinámicamente
            if (cmd.aliases && Array.isArray(cmd.aliases)) {
                cmd.aliases.forEach(alias => systemCommands.set(alias, cmd));
            }
        }
    }
}

// Ejecuta la lectura recursiva al arrancar
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
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        const m = messages[0];
        if (!m.message) return;

        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const rawSender = m.key.participant || m.key.remoteJid;
        const sender = rawSender.replace(/:[0-9]+@/g, '@');

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

        // Parámetros pasados a los módulos de comandos
        const context = { sock, from, command, args, body, m, sender, config, getComandos, saveComando };

        // --- 2. DETECCIÓN Y BÚSQUEDA AUTOMÁTICA ---
        let targetCmd = systemCommands.get(command);

        // Si no es exacto, busca por prefijo pegado (ej. "setpago" -> encuentra comando "set")
        if (!targetCmd) {
            for (const [key, cmdModule] of systemCommands.entries()) {
                if (command.startsWith(key)) {
                    targetCmd = cmdModule;
                    break;
                }
            }
        }

        // Si existe el módulo en cualquier subcarpeta de /commands, se ejecuta
        if (targetCmd) {
            return await targetCmd.execute(context);
        }

        // 3. Si no es comando del sistema, busca en comandos.json
        const comandosBD = getComandos();
        if (comandosBD[command]) {
            return await sock.sendMessage(from, { text: comandosBD[command] });
        }
    });
}

startBot();
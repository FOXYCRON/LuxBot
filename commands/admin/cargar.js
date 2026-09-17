const fs = require('fs');
const path = require('path');
// 🔑 Importar tu gestor de autorización
const { isAuthorized } = require('../../database/dbAuth'); // Ajusta la ruta a tu archivo dbAuth

const STOCK_FILE = path.join(__dirname, '../../database/stock_disponible.json');

function getStock() {
    if (!fs.existsSync(STOCK_FILE)) fs.writeFileSync(STOCK_FILE, JSON.stringify({}), 'utf-8');
    try {
        const content = fs.readFileSync(STOCK_FILE, 'utf-8').trim();
        return content ? JSON.parse(content) : {};
    } catch {
        return {};
    }
}

function saveStock(data) {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
    name: 'cargar',
    aliases: ['addstock'],
    category: 'admin',
    async execute(ctx) {
        const { sock, from, args, m, sender, config } = ctx;

        // 🔒 1. VALIDACIÓN CON BASE DE DATOS `authorized_users.json`
        const isGroup = from.endsWith('@g.us');
        const currentGroupId = isGroup ? from : null;

        let hasPermission = isAuthorized(sender, currentGroupId);

        if (!hasPermission && config.sudoNumbers) {
            hasPermission = config.sudoNumbers.some(num => {
                const cleanNum = num.trim().toLowerCase();
                return cleanNum === sender.toLowerCase() || 
                       (m.key?.participant && cleanNum === m.key.participant.toLowerCase());
            });
        }

        if (!hasPermission) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permiso para administrar el stock.' }, { quoted: m });
        }

        const prefix = config.prefix || '.';

        if (args.length < 2) {
            return await sock.sendMessage(from, { 
                text: `⚠️ *Uso del comando:*\n\n` +
                      `1. Configurar precio:\n\`${prefix}cargar <plataforma> <perfil|completa> <duracion> -p <precio>\`\n\n` +
                      `2. Cargar cuenta:\n\`${prefix}cargar <plataforma> <perfil|completa> <duracion> <correo:contra[:perfil]>\`\n\n` +
                      `*Ejemplos (Duraciones: 1m, 2m, 3m, 6m, 12m, etc.):*\n` +
                      `• \`${prefix}cargar vix perfil 1m -p 35\`\n` +
                      `• \`${prefix}cargar vix perfil 3m -p 90\`\n` +
                      `• \`${prefix}cargar vix completa 12m -p 800\`\n` +
                      `• \`${prefix}cargar vix perfil 1m correo@gmail.com:pass:Z5\``
            }, { quoted: m });
        }

        const plataforma = args[0].toLowerCase();
        const tipo = args[1].toLowerCase();

        if (tipo !== 'perfil' && tipo !== 'completa') {
            return await sock.sendMessage(from, { text: '❌ El tipo debe ser *perfil* o *completa*. Ej: `.cargar vix perfil 1m ...` ' }, { quoted: m });
        }

        // Evaluar si se especificó la duración en los argumentos (si no, por defecto '1m')
        let duracion = '1m';
        let argIndex = 2;

        if (args[2] && !args[2].startsWith('-p') && !args[2].includes(':')) {
            duracion = args[2].toLowerCase();
            argIndex = 3;
        }

        const stockData = getStock();
        if (!stockData[plataforma]) stockData[plataforma] = {};
        if (!stockData[plataforma][tipo]) stockData[plataforma][tipo] = {};
        if (!stockData[plataforma][tipo][duracion]) {
            stockData[plataforma][tipo][duracion] = { precio: 0, cuentas: [] };
        }

        // 1. Configurar precio
        if (args[argIndex] === '-p' && args[argIndex + 1]) {
            const nuevoPrecio = parseFloat(args[argIndex + 1]);
            if (isNaN(nuevoPrecio)) return await sock.sendMessage(from, { text: '❌ Precio inválido.' }, { quoted: m });

            stockData[plataforma][tipo][duracion].precio = nuevoPrecio;
            saveStock(stockData);
            return await sock.sendMessage(from, { 
                text: `✅ Precio de *${plataforma.toUpperCase()}* [${tipo.toUpperCase()}] (${duracion.toUpperCase()}) configurado en $${nuevoPrecio.toFixed(2)}` 
            }, { quoted: m });
        }

        // 2. Extraer texto de la cuenta
        let contenidoCuenta = '';
        if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = m.message.extendedTextMessage.contextInfo.quotedMessage;
            contenidoCuenta = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
        } else if (args.length > argIndex) {
            contenidoCuenta = args.slice(argIndex).join(' ');
        }

        if (!contenidoCuenta) {
            return await sock.sendMessage(from, { text: '❌ Debes incluir el contenido de la cuenta o responder a un mensaje.' }, { quoted: m });
        }

        // Validar que exista precio asignado
        if (typeof stockData[plataforma][tipo][duracion].precio !== 'number' || stockData[plataforma][tipo][duracion].precio <= 0) {
            return await sock.sendMessage(from, { 
                text: `⚠️ La modalidad *${tipo.toUpperCase()}* (${duracion.toUpperCase()}) de *${plataforma.toUpperCase()}* no tiene un precio configurado.\nConfigura el precio primero: \`${prefix}cargar ${plataforma} ${tipo} ${duracion} -p <precio>\`` 
            }, { quoted: m });
        }

        stockData[plataforma][tipo][duracion].cuentas.push(contenidoCuenta);
        saveStock(stockData);

        return await sock.sendMessage(from, { 
            text: `✅ Cuenta agregada a *${plataforma.toUpperCase()}* [${tipo.toUpperCase()}] (${duracion.toUpperCase()}).\n📦 Stock disponible: ${stockData[plataforma][tipo][duracion].cuentas.length}` 
        }, { quoted: m });
    }
};
const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'welcome',
    aliases: ['bienvenida', 'bienvenidas'],
    category: 'admin',
    execute: async ({ sock, from, sender, args, config, getWelcomeStatus, setWelcomeStatus, m }) => {
        const isGroup = from.endsWith('@g.us');

        // Validar permisos de admin/sudo
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '🚫 Solo los administradores o dueños del bot pueden modificar la configuración de bienvenida.' 
            }, { quoted: m });
        }

        const opcion = args[0]?.toLowerCase();
        const estadoActual = getWelcomeStatus();

        if (!opcion) {
            return await sock.sendMessage(from, { 
                text: `ℹ️ *ESTADO DE BIENVENIDAS:* ${estadoActual ? '🟢 *ACTIVADAS*' : '🔴 *DESACTIVADAS*'}\n\n` +
                      `Usa:\n` +
                      `• \`${config.prefix}welcome on\` para activar\n` +
                      `• \`${config.prefix}welcome off\` para desactivar` 
            }, { quoted: m });
        }

        if (opcion === 'on' || opcion === '1' || opcion === 'activar') {
            setWelcomeStatus(true);
            return await sock.sendMessage(from, { 
                text: '✅ *Las bienvenidas han sido ACTIVADAS correctamente.*' 
            }, { quoted: m });
        }

        if (opcion === 'off' || opcion === '0' || opcion === 'desactivar') {
            setWelcomeStatus(false);
            return await sock.sendMessage(from, { 
                text: '🛑 *Las bienvenidas han sido DESACTIVADAS correctamente.*' 
            }, { quoted: m });
        }

        return await sock.sendMessage(from, { 
            text: `⚠️ Opción no válida. Usa *${config.prefix}welcome on* o *${config.prefix}welcome off*.` 
        }, { quoted: m });
    }
};
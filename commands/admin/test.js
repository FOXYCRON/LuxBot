const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'test',
    aliases: ['testwelcome', 'probarmensaje'],
    category: 'admin',
    execute: async ({ sock, from, config, sender, m }) => {
        const isGroup = from.endsWith('@g.us');

        if (!isGroup) {
            return await sock.sendMessage(from, { 
                text: '❌ Este comando de prueba solo se puede usar dentro de un grupo.' 
            }, { quoted: m });
        }

        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '❌ No tienes permisos para probar el mensaje de bienvenida.' 
            }, { quoted: m });
        }

        try {
            // Obtener datos del grupo
            const groupMetadata = await sock.groupMetadata(from);
            const groupName = groupMetadata.subject;
            const groupDesc = groupMetadata.desc ? groupMetadata.desc.toString() : 'Sin descripción por el momento.';

            // Mención formateada para el usuario de prueba
            const usuariosMencionados = `@${sender.split('@')[0]}`;

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
  *${config.prefix}stock* ➔ Ver precios y disponibilidad
  *${config.prefix}pago* ➔ Métodos de pago disponibles
  *${config.prefix}combos* ➔ Mira los combos disponibles
  *${config.prefix}lotes* ➔ Precios especiales en compras por lote

💎 ¡Disfruta del mejor entretenimiento con la calidad y confianza de LUXPASS!`;

            await sock.sendMessage(from, {
                text: mensajeBienvenida,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error('Error al probar bienvenida:', error);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al intentar generar la bienvenida.' }, { quoted: m });
        }
    }
};
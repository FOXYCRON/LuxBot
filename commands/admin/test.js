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

            // Quien ejecuta el comando sirve de usuario de prueba
            const userNumber = sender.split('@')[0];

            const mensajeBienvenida = 
                `👋 *¡BIENVENIDO/A A LUXPASS!* @${userNumber}

                👥 *Grupo:* ${groupName}

                🍿 *DISPONIBLE EN LUXPASS:*
                🎦 *Streaming:* Netflix, Disney+, Max, Prime, VIX, Crunchyroll, Apple TV+, Canva Pro y más.
                🎶 *Música:* Spotify Premium, YouTube Premium, Apple Music, Deezer.
                📺 *TV & Servicios:* IPTV, Películas, Series y Recargas de saldo.

                📦 *¿DÓNDE VER EL STOCK Y PRECIOS?*
                • Escribe *${config.prefix}stock* para consultar la lista en tiempo real.
                • Escribe *${config.prefix}comandos* para ver todas las funciones disponibles.

                _¡Gracias por unirte! Revisa el catálogo escribiendo los comandos arriba._`;

            await sock.sendMessage(from, {
                text: mensajeBienvenida,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error('Error al probar bienvenida:', error);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al intentar generar la bienvenida.' });
        }
    }
};
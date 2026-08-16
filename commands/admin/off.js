const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'shutdown',
    aliases: ['apagar', 'off', 'stopbot'],
    category: 'admin',
    execute: async ({ sock, from, sender, m, config }) => {
        const isGroup = from.endsWith('@g.us');

        // Validar que solo un Administrador / Sudo / Creador pueda apagar el bot
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '🚫 Solo el dueño o administradores del bot pueden ejecutar este comando.' 
            }, { quoted: m });
        }

        try {
            // Confirmar apago en el chat
            await sock.sendMessage(from, { 
                text: '🛑 *LuxBot se está apagando...*\n\n_Para volver a encenderlo, inicia el proceso desde la consola o panel host._' 
            }, { quoted: m });

            console.log(`\n⚠️  El bot fue apagado remotamente por: ${sender}\n`);

            // Dar un pequeño margen de 1 segundo para asegurar que el mensaje de WhatsApp se envíe antes de matar el proceso
            setTimeout(() => {
                process.exit(0);
            }, 1000);

        } catch (error) {
            console.error('Error al intentar apagar el bot:', error);
            return await sock.sendMessage(from, { 
                text: '❌ Ocurrió un error al intentar apagar el bot.' 
            }, { quoted: m });
        }
    }
};
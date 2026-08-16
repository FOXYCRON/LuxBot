const checkAdminPermissions = require('../../utils/isBotAdmin');

// Helper para formatear segundos a Días, Horas, Minutos y Segundos
function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(', ');
}

module.exports = {
    name: 'ubot',
    aliases: ['botinfo', 'infobot', 'stats'],
    category: 'admin',
    execute: async ({ sock, from, sender, config, m }) => {
        const inicio = Date.now();

        const isGroup = from.endsWith('@g.us');
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });

        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '🚫 Solo los administradores o dueños del bot pueden ver las estadísticas internas.' 
            }, { quoted: m });
        }

        try {
            // Obtener total de grupos en los que participa el bot
            const groups = await sock.groupFetchAllParticipating();
            const totalGrupos = Object.keys(groups).length;

            // Calcular uso de memoria y tiempo de actividad
            const memoryUsedMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const uptimeFormatted = formatUptime(process.uptime());

            // Calcular latencia
            const latencia = Date.now() - inicio;

            const infoText = 
                `🤖 *INFORMACIÓN Y ESTADÍSTICAS DEL BOT*

                👑 *Creador:* \`${config.creator} (LuxPass)\`
                📌 *Prefijo actual:* \`${config.prefix}\`
                ⚙️ *Versión del Bot:* \`1.0.0\`
                📚 *Librería:* \`Baileys (@whiskeysockets/baileys)\`

                📊 *ESTADÍSTICAS EN TIEMPO REAL:*
                ⚡ *Latencia:* \`${latencia} ms\`
                👥 *Grupos activos:* \`${totalGrupos}\`
                💾 *Uso de Memoria RAM:* \`${memoryUsedMB} MB\`
                ⏱️ *Tiempo activo:* \`${uptimeFormatted}\`
                🖥️ *Plataforma Node:* \`${process.version}\``;

            return await sock.sendMessage(from, { text: infoText }, { quoted: m });

        } catch (error) {
            console.error('Error al obtener estadísticas del bot:', error);
            return await sock.sendMessage(from, { 
                text: '❌ Ocurrió un error al obtener la información técnica del bot.' 
            }, { quoted: m });
        }
    }
};
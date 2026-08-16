const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'servers',
    aliases: ['servidores', 'grupos', 'groups'],
    category: 'admin',
    execute: async ({ sock, from, sender, m, config }) => {
        const isGroup = from.endsWith('@g.us');

        // Validar si el usuario tiene permisos de admin/sudo
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '🚫 Solo el dueño o los administradores pueden ver la lista de grupos.' 
            }, { quoted: m });
        }

        try {
            // Obtener todos los grupos en los que participa el bot
            const groupsObj = await sock.groupFetchAllParticipating();
            const groups = Object.values(groupsObj);

            if (groups.length === 0) {
                return await sock.sendMessage(from, { 
                    text: '⚠️ El bot actualmente no está en ningún grupo.' 
                }, { quoted: m });
            }

            let totalMiembros = 0;
            let listaGrupos = '';

            groups.forEach((g, index) => {
                const count = g.participants ? g.participants.length : 0;
                totalMiembros += count;
                listaGrupos += `${index + 1}. ${g.subject}\n   └ ID: ${g.id}\n   └ Miembros: ${count}\n\n`;
            });

            // Prevenir exceder el límite de caracteres si el bot está en demasiados grupos
            if (listaGrupos.length > 3500) {
                listaGrupos = listaGrupos.substring(0, 3500) + '\n...y más grupos.';
            }

            const mensaje = 
                `👥 *LISTA DE GRUPOS ACTIVOS*

                \`\`\`
                ${listaGrupos.trim()}
                \`\`\`

                📊 *RESUMEN TOTAL:*
                • *Grupos totales:* \`${groups.length}\`
                • *Miembros totales:* \`${totalMiembros}\``;

            return await sock.sendMessage(from, { text: mensaje }, { quoted: m });

        } catch (error) {
            console.error('Error al obtener la lista de grupos:', error);
            return await sock.sendMessage(from, { 
                text: '❌ Ocurrió un error al obtener la lista de grupos.' 
            }, { quoted: m });
        }
    }
};
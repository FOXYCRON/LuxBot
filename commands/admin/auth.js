const { addAuthorizedUser } = require('../../database/dbAuth');
const checkAdminPermissions = require('../../utils/isBotAdmin');
const parseTargetUser = require('../../utils/getUser');

module.exports = {
    name: 'auth',
    aliases: ['grant', 'daracceso'],
    execute: async ({ sock, from, args, m, sender, config }) => {
        const isGroup = from.endsWith('@g.us');
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        
        if (!hasPermission) {
            return await sock.sendMessage(from, { text: '❌ No tienes permisos para usar este comando.' }, { quoted: m });
        }

        const targetJid = parseTargetUser(m, args);
        if (!targetJid) {
            return await sock.sendMessage(from, { 
                text: '⚠️ *Uso del comando*\n\n• `/auth @usuario` (Otorga permiso en este chat)\n• `/auth @usuario global` (Otorga permiso en todos los chats)\n• Responde a un mensaje con `/auth`' 
            }, { quoted: m });
        }

        const isGlobal = args.includes('global');
        const userNumber = targetJid.split('@')[0];
        const adminNumber = sender.split('@')[0];

        let groupName = 'Privado / Global';
        if (isGroup && !isGlobal) {
            const groupMetadata = await sock.groupMetadata(from);
            groupName = groupMetadata.subject;
        }

        // Guardar en la base de datos con todos los detalles
        addAuthorizedUser(targetJid, {
            scope: (isGroup && !isGlobal) ? 'group' : 'global',
            groupId: (isGroup && !isGlobal) ? from : null,
            groupName: groupName,
            grantedBy: sender
        });

        const scopeText = (isGroup && !isGlobal) ? `👥 *Grupo:* ${groupName}` : '🌐 *Acceso:* Global (Todos los chats)';

        await sock.sendMessage(from, {
            text: `✅ *Acceso Otorgado*\n\n👤 *Usuario:* @${userNumber}\n${scopeText}\n👮 *Autorizado por:* @${adminNumber}`,
            mentions: [targetJid, sender]
        }, { quoted: m });
    }
};
const { removeAuthorizedUser } = require('../../database/dbAuth');
const checkAdminPermissions = require('../../utils/isBotAdmin');
const parseTargetUser = require('../../utils/getUser');

module.exports = {
    name: 'unauth',
    aliases: ['revoke', 'quitaracceso', 'removeauth'],
    execute: async ({ sock, from, args, m, sender, config }) => {
        const isGroup = from.endsWith('@g.us');
        
        // Verifica si quien ejecuta el comando tiene permisos de admin
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        
        if (!hasPermission) {
            return await sock.sendMessage(from, { text: '❌ No tienes permisos para usar este comando.' }, { quoted: m });
        }

        const targetJid = parseTargetUser(m, args);
        if (!targetJid) {
            return await sock.sendMessage(from, { 
                text: '⚠️ *Uso del comando*\n\n• `/unauth @usuario` (Quitar acceso)\n• `/unauth 5216681234567`\n• Responde a un mensaje con `/unauth`' 
            }, { quoted: m });
        }

        const removed = removeAuthorizedUser(targetJid);
        const userNumber = targetJid.split('@')[0];

        if (removed) {
            await sock.sendMessage(from, {
                text: `🗑️ *Acceso Revocado*\n\n👤 Al usuario @${userNumber} se le han retirado los permisos administrativos.`,
                mentions: [targetJid]
            }, { quoted: m });
        } else {
            await sock.sendMessage(from, {
                text: `ℹ️ El usuario @${userNumber} no estaba registrado en la lista de usuarios autorizados.`,
                mentions: [targetJid]
            }, { quoted: m });
        }
    }
};
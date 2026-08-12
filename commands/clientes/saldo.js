const { getSaldoUser } = require('../../database/dbSaldos');
const parseTargetUser = require('../../utils/getUser');
const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'saldo',
    aliases: ['balance', 'misaldo'],
    execute: async ({ sock, from, args, m, sender, config }) => {
        const isGroup = from.endsWith('@g.us');
        
        // Verificar si quien ejecuta el comando es Admin / Sudo / Autorizado
        const isAdmin = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });

        let targetJid = sender;

        // Si es admin y especificó a otro usuario (por mención, respuesta o número), consulta a ese usuario
        if (isAdmin) {
            const parsedJid = parseTargetUser(m, args);
            if (parsedJid) {
                targetJid = parsedJid;
            }
        }

        const saldo = getSaldoUser(targetJid);
        const userNumber = targetJid.split('@')[0];

        await sock.sendMessage(from, {
            text: `💳 *Consulta de Saldo*\n\n👤 *Usuario:* @${userNumber}\n💰 *Saldo disponible:* $${saldo.toFixed(2)}`,
            mentions: [targetJid]
        }, { quoted: m });
    }
};
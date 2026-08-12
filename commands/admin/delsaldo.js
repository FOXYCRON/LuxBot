const { addSaldoUser, getSaldoUser } = require('../../database/dbSaldos');
const parseTargetUser = require('../../utils/getUser');
const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'delsaldo',
    aliases: ['removesaldo', 'restarsaldo', 'subsaldo'],
    execute: async ({ sock, from, args, body, m, sender, config }) => {
        const isGroup = from.endsWith('@g.us');
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });

        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '❌ Solo los administradores pueden gestionar el saldo.' 
            }, { quoted: m });
        }

        const targetJid = parseTargetUser(m, args);
        let monto = NaN;

        // 1. Buscar monto si viene marcado con '$'
        const matchSigno = body.match(/\$\s*(\d+(\.\d+)?)/);
        if (matchSigno) {
            monto = parseFloat(matchSigno[1]);
        } else {
            // 2. Si no tiene '$', busca el último argumento numérico
            for (let i = args.length - 1; i >= 0; i--) {
                const cleanArg = args[i].replace(',', '.');
                if (!isNaN(cleanArg) && !args[i].includes('@') && args[i].length < 10) {
                    monto = parseFloat(cleanArg);
                    break;
                }
            }
        }

        if (!targetJid || isNaN(monto) || monto <= 0) {
            return await sock.sendMessage(from, { 
                text: '⚠️ *Uso incorrecto del comando*\n\nEjemplos válidos:\n• `/delsaldo @usuario $50`\n• `/delsaldo 5216684204529 $50`\n• `/delsaldo 5216684204529 50`\n• Responde a un mensaje con `/delsaldo $50`' 
            }, { quoted: m });
        }

        // Resta pasando el monto negativo
        const nuevoSaldo = addSaldoUser(targetJid, -monto);
        const userNumber = targetJid.split('@')[0];

        await sock.sendMessage(from, {
            text: `✅ *Saldo Descontado*\n\n👤 *Usuario:* @${userNumber}\n🔻 *Descontado:* $${monto.toFixed(2)}\n💰 *Saldo Restante:* $${nuevoSaldo.toFixed(2)}`,
            mentions: [targetJid]
        }, { quoted: m });
    }
};
const { addSaldoUser } = require('../../database/dbSaldos');
const parseTargetUser = require('../../utils/getUser');
const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'addsaldo',
    aliases: ['setsaldo', 'saldoadd'],
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

        // 1. Buscar primero si el monto viene marcado explícitamente con '$' (ej. $50, $ 50)
        const matchSigno = body.match(/\$\s*(\d+(\.\d+)?)/);
        if (matchSigno) {
            monto = parseFloat(matchSigno[1]);
        } else {
            // 2. Si no tiene '$', busca el último argumento numérico de la frase
            // (El número de teléfono siempre va al inicio/medio, así que el monto suele ser el último)
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
                text: '⚠️ *Uso incorrecto del comando*\n\nEjemplos válidos:\n• `/addsaldo @usuario $50`\n• `/addsaldo 5216684204529 $50`\n• `/addsaldo 5216684204529 50`\n• Responde a un mensaje con `/addsaldo $50`' 
            }, { quoted: m });
        }

        const nuevoSaldo = addSaldoUser(targetJid, monto);
        const userNumber = targetJid.split('@')[0];

        await sock.sendMessage(from, {
            text: `✅ *Saldo actualizado*\n\n👤 *Usuario:* @${userNumber}\n💵 *Añadido:* $${monto.toFixed(2)}\n💰 *Saldo Total:* $${nuevoSaldo.toFixed(2)}`,
            mentions: [targetJid]
        }, { quoted: m });
    }
};
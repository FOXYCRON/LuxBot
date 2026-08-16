const fs = require('fs');
const path = require('path');
const checkAdminPermissions = require('../../utils/isBotAdmin');

// Ruta a la base de datos de saldos
const SALDOS_FILE = path.join(__dirname, '..', '..', 'database', 'saldos.json');

module.exports = {
    name: 'listsaldos',
    aliases: ['vsaldos', 'vsaldo', 'versaldos', 'listsaldo'],
    category: 'admin',
    execute: async ({ sock, from, config, sender, m }) => {
        const isGroup = from.endsWith('@g.us');
        
        // 1. Verificar permisos de admin
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '❌ Solo los administradores pueden consultar la lista global de saldos.' 
            }, { quoted: m });
        }

        // 2. Verificar si existe la base de datos de saldos
        if (!fs.existsSync(SALDOS_FILE)) {
            return await sock.sendMessage(from, { text: 'ℹ️ No hay registros de saldos en la base de datos.' }, { quoted: m });
        }

        const saldosData = JSON.parse(fs.readFileSync(SALDOS_FILE, 'utf-8'));
        const jids = Object.keys(saldosData);

        if (jids.length === 0) {
            return await sock.sendMessage(from, { text: 'ℹ️ No hay usuarios con saldo en el sistema.' }, { quoted: m });
        }

        // 3. Filtrar y construir el reporte
        let mensaje = `💰 *RESUMEN DE SALDOS REGISTRADOS*\n\n`;
        const mentions = [];
        let totalAcumulado = 0;

        jids.forEach((jid) => {
            const saldo = saldosData[jid];
            const userNumber = jid.split('@')[0];
            
            // Ignorar usuarios con saldo 0 para no saturar la lista
            if (saldo !== 0) {
                mensaje += `• @${userNumber}: *$${saldo.toFixed(2)}*\n`;
                mentions.push(jid);
                totalAcumulado += saldo;
            }
        });

        if (mentions.length === 0) {
            return await sock.sendMessage(from, { text: 'ℹ️ Todos los usuarios tienen un saldo de $0.00.' }, { quoted: m });
        }

        mensaje += `\n💵 *Total acumulado en el bot:* $${totalAcumulado.toFixed(2)}`;

        return await sock.sendMessage(from, { 
            text: mensaje, 
            mentions 
        }, { quoted: m });
    }
};
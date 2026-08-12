const fs = require('fs');
const path = require('path');
const checkAdminPermissions = require('../../utils/isBotAdmin');

// Ruta a la base de datos de saldos (para usarla como referencia de actividad)
const SALDOS_FILE = path.join(__dirname, '..', '..', 'database', 'saldos.json');

module.exports = {
    name: 'fantasmas',
    aliases: ['ghosts', 'inactivos', 'verfantasmas'],
    execute: async ({ sock, from, config, sender, m }) => {
        const isGroup = from.endsWith('@g.us');

        // 1. Validar que se ejecute dentro de un grupo
        if (!isGroup) {
            return await sock.sendMessage(from, { 
                text: '❌ Este comando solo se puede usar dentro de grupos.' 
            }, { quoted: m });
        }

        // 2. Verificar permisos de Administrador
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '❌ Solo los administradores pueden ejecutar el comando de fantasmas.' 
            }, { quoted: m });
        }

        try {
            // 3. Obtener metadatos y participantes del grupo
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants || [];

            // Obtener lista de JIDs con interacción registrada (ejemplo: en saldos.json)
            let usuariosActivos = [];
            if (fs.existsSync(SALDOS_FILE)) {
                const saldosData = JSON.parse(fs.readFileSync(SALDOS_FILE, 'utf-8'));
                usuariosActivos = Object.keys(saldosData);
            }

            // 4. Filtrar usuarios que NO tienen actividad ni son admins/bot
            const botJid = sock.user.id.replace(/:[0-9]+@/g, '@');
            
            const fantasmas = participants.filter(p => {
                const cleanJid = p.id.replace(/:[0-9]+@/g, '@');
                
                // Excluir al bot
                if (cleanJid === botJid) return false;
                
                // Excluir admins del grupo (opcional)
                if (p.admin === 'admin' || p.admin === 'superadmin') return false;

                // Es fantasma si no está registrado en la base activa
                return !usuariosActivos.includes(cleanJid);
            });

            if (fantasmas.length === 0) {
                return await sock.sendMessage(from, { 
                    text: '✅ *¡Sin fantasmas detectados!* Todos los miembros del grupo tienen actividad registrada.' 
                }, { quoted: m });
            }

            // 5. Construir el reporte
            let mensaje = `👻 *LISTA DE USUARIOS FANTASMAS / INACTIVOS*\n`;
            mensaje += `👥 *Grupo:* ${groupMetadata.subject}\n`;
            mensaje += `📊 *Inactivos detectados:* ${fantasmas.length} de ${participants.length}\n\n`;

            const mentions = [];
            fantasmas.forEach((f, index) => {
                const cleanJid = f.id.replace(/:[0-9]+@/g, '@');
                const number = cleanJid.split('@')[0];
                mensaje += `${index + 1}. @${number}\n`;
                mentions.push(cleanJid);
            });

            mensaje += `\n_Nota: Esta lista excluye administradores del grupo._`;

            return await sock.sendMessage(from, { 
                text: mensaje, 
                mentions 
            }, { quoted: m });

        } catch (error) {
            console.error('Error en comando fantasmas:', error);
            return await sock.sendMessage(from, { 
                text: '❌ Ocurrió un error al intentar obtener la lista de miembros.' 
            }, { quoted: m });
        }
    }
};
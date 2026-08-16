const fs = require('fs');
const path = require('path');
const checkAdminPermissions = require('../../utils/isBotAdmin');

// Ruta a la base de datos de conteo de mensajes
const MSGS_FILE = path.join(__dirname, '..', '..', 'database', 'mensajes.json');

module.exports = {
    name: 'fantasmas',
    aliases: ['ghosts', 'inactivos', 'verfantasmas'],
    category: 'admin',
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

            // 4. Leer base de datos de conteo de mensajes
            let conteoGrupo = {};
            if (fs.existsSync(MSGS_FILE)) {
                const msgsData = JSON.parse(fs.readFileSync(MSGS_FILE, 'utf-8'));
                conteoGrupo = msgsData[from] || {};
            }

            const botJid = sock.user.id.replace(/:[0-9]+@/g, '@');

            // 5. Mapear participantes y obtener su cantidad de mensajes
            const listaMiembros = participants
                .map(p => {
                    const cleanJid = p.id.replace(/:[0-9]+@/g, '@');
                    const totalMsgs = conteoGrupo[cleanJid] || 0;
                    const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';

                    return {
                        jid: cleanJid,
                        msgs: totalMsgs,
                        isAdmin,
                        isBot: cleanJid === botJid
                    };
                })
                // Filtrar para ignorar al Bot y a los Administradores
                .filter(user => !user.isBot && !user.isAdmin);

            // 6. Ordenar de menor a mayor cantidad de mensajes (los más inactivos primero)
            listaMiembros.sort((a, b) => a.msgs - b.msgs);

            // Puedes ajustar el límite de cuántos inactivos mostrar (ej: Top 20 o todos)
            const limiteMostrados = 20; 
            const fantasmas = listaMiembros.slice(0, limiteMostrados);

            if (fantasmas.length === 0) {
                return await sock.sendMessage(from, { 
                    text: '✅ *¡Sin usuarios para evaluar!* No hay miembros comunes en este grupo.' 
                }, { quoted: m });
            }

            // 7. Construir el reporte con la cantidad de mensajes
            let mensaje = `👻 *MIEMBROS MÁS INACTIVOS / FANTASMAS*\n`;
            mensaje += `👥 *Grupo:* ${groupMetadata.subject}\n`;
            mensaje += `📊 *Evaluados:* ${listaMiembros.length} miembros\n\n`;

            const mentions = [];
            fantasmas.forEach((f, index) => {
                const number = f.jid.split('@')[0];
                const msgTexto = f.msgs === 1 ? '1 mensaje' : `${f.msgs} mensajes`;
                
                // Icono visual si tiene 0 mensajes
                const icono = f.msgs === 0 ? '💤' : '💬';

                mensaje += `${index + 1}. @${number} ➔ ${icono} *${msgTexto}*\n`;
                mentions.push(f.jid);
            });

            mensaje += `\n_Nota: Lista ordenada de menor a mayor actividad (excluye administradores)._`;

            return await sock.sendMessage(from, { 
                text: mensaje, 
                mentions 
            }, { quoted: m });

        } catch (error) {
            console.error('Error en comando fantasmas:', error);
            return await sock.sendMessage(from, { 
                text: '❌ Ocurrió un error al intentar obtener la lista de inactivos.' 
            }, { quoted: m });
        }
    }
};
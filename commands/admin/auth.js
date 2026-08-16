const { addAuthorizedUser } = require('../../database/dbAuth');
const checkAdminPermissions = require('../../utils/isBotAdmin');
const parseTargetUser = require('../../utils/getUser');

module.exports = {
    name: 'auth',
    aliases: ['grant', 'daracceso'],
    category: 'admin',
    execute: async ({ sock, from, args, m, sender, config }) => {
        const isGroup = from.endsWith('@g.us');
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        
        if (!hasPermission) {
            return await sock.sendMessage(from, { text: '❌ No tienes permisos para usar este comando.' }, { quoted: m });
        }

        // Obtener el objetivo (soporta mención, respuesta o número ingresado)
        const targetJid = parseTargetUser(m, args);
        if (!targetJid) {
            return await sock.sendMessage(from, { 
                text: '⚠️ *Uso del comando*\n\n' +
                      '• `/auth @usuario` (Otorga permiso en el grupo actual)\n' +
                      '• `/auth @usuario global` (Otorga permiso global)\n' +
                      '• `/auth @usuario Nombre del Grupo` (Otorga permiso en un grupo específico por nombre)' 
            }, { quoted: m });
        }

        const isGlobal = args.includes('global');
        const userNumber = targetJid.split('@')[0];
        const adminNumber = sender.split('@')[0];

        // Extraer los argumentos que no correspondan al número o mención del usuario
        const remainingArgs = args.filter(arg => !arg.includes(userNumber) && arg.toLowerCase() !== 'global');
        const searchGroupName = remainingArgs.join(' ').trim().toLowerCase();

        let targetGroupId = null;
        let targetGroupName = 'Privado / Global';
        let scope = 'global';

        if (!isGlobal) {
            // Caso 1: Se especificó un nombre de grupo en el comando
            if (searchGroupName.length > 0) {
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    const matchedGroup = Object.values(groups).find(g => 
                        g.subject.toLowerCase().includes(searchGroupName)
                    );

                    if (!matchedGroup) {
                        return await sock.sendMessage(from, { 
                            text: `❌ No se encontró ningún grupo donde esté el bot que coincida con: *${searchGroupName}*` 
                        }, { quoted: m });
                    }

                    targetGroupId = matchedGroup.id;
                    targetGroupName = matchedGroup.subject;
                    scope = 'group';
                } catch (err) {
                    console.error('Error al buscar grupos:', err);
                    return await sock.sendMessage(from, { 
                        text: '❌ Hubo un error al buscar la lista de grupos.' 
                    }, { quoted: m });
                }
            } 
            // Caso 2: Se ejecuta dentro de un grupo sin especificar nombre de otro grupo
            else if (isGroup) {
                const groupMetadata = await sock.groupMetadata(from);
                targetGroupId = from;
                targetGroupName = groupMetadata.subject;
                scope = 'group';
            }
        }

        // Guardar en la base de datos
        addAuthorizedUser(targetJid, {
            scope: scope,
            groupId: targetGroupId,
            groupName: targetGroupName,
            grantedBy: sender
        });

        const scopeText = scope === 'group' 
            ? `👥 *Grupo:* ${targetGroupName}` 
            : '🌐 *Acceso:* Global (Todos los chats)';

        await sock.sendMessage(from, {
            text: `✅ *Acceso Otorgado*\n\n👤 *Usuario:* @${userNumber}\n${scopeText}\n👮 *Autorizado por:* @${adminNumber}`,
            mentions: [targetJid, sender]
        }, { quoted: m });
    }
};
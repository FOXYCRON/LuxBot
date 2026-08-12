const { isAuthorized } = require('../database/dbAuth');

async function checkAdminPermissions({ sock, from, sender, isGroup, config }) {
    const cleanSender = sender.split('@')[0].replace(/[^0-9]/g, '');

    // 1. Es Sudo (SuperAdmin global)
    const isSudo = config.sudoNumbers && config.sudoNumbers.some(num => {
        return num.toString().replace(/[^0-9]/g, '') === cleanSender;
    });
    if (isSudo) return true;

    // 2. Está en la base de datos autorizada (pasa el grupo actual para verificar si aplica en este chat)
    if (isAuthorized(sender, isGroup ? from : null)) return true;

    // 3. Es Admin del grupo de WhatsApp
    if (isGroup) {
        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants || [];
            const participant = participants.find(p => p.id.replace(/:[0-9]+@/g, '@') === sender);
            
            if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                return true;
            }
        } catch (error) {
            console.error('Error al verificar admin del grupo:', error);
        }
    }

    return false;
}

module.exports = checkAdminPermissions;
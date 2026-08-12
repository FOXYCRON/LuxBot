/**
 * Extrae el JID del usuario objetivo desde menciones, mensaje respondido o número de texto.
 */
function parseTargetUser(m, args) {
    // 1. Verificar si respondieron a un mensaje
    const quotedParticipant = m.message?.extendedTextMessage?.contextInfo?.participant;
    if (quotedParticipant) {
        return quotedParticipant.replace(/:[0-9]+@/g, '@');
    }

    // 2. Verificar si mencionaron a alguien (@521...)
    const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentionedJid && mentionedJid.length > 0) {
        return mentionedJid[0].replace(/:[0-9]+@/g, '@');
    }

    // 3. Verificar si escribieron el número directo en los argumentos
    if (args.length > 0) {
        let cleanNumber = args[0].replace(/[^0-9]/g, '');
        if (cleanNumber.length >= 10) {
            return `${cleanNumber}@s.whatsapp.net`;
        }
    }

    return null;
}

module.exports = parseTargetUser;
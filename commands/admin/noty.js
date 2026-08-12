module.exports = {
    name: 'notify',
    aliases: ['hidetag', 'n', 'todos', 'aviso'],
    async execute({ sock, from, command, args, body, m, sender, config }) {
        if (!from.endsWith('@g.us')) {
            return await sock.sendMessage(from, { text: '⚠️ Este comando solo se puede usar en grupos.' });
        }

        if (config.sudoNumbers.length > 0 && !config.sudoNumbers.includes(sender)) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permiso para enviar avisos.' });
        }

        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        const mentions = participants.map(p => p.id);

        const contextInfo = m.message.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;

        let noticeText = '';

        if (quotedMessage) {
            noticeText = quotedMessage.conversation || 
                         quotedMessage.extendedTextMessage?.text || 
                         quotedMessage.imageMessage?.caption || '';
        } else {
            noticeText = body.replace(new RegExp(`^\\${config.prefix}${command}\\s*`, 'i'), '').trim();
        }

        if (!noticeText) {
            return await sock.sendMessage(from, { 
                text: `⚠️ Escribe el texto o responde a un mensaje.\nEjemplo: ${config.prefix}n tenemos ÚLTIMOS 3 PERFILES` 
            });
        }

        // 1. Darle formato grisesito (Monospace) a las líneas secundarias o a todo si no lleva formato manual
        let formattedText = noticeText;

        // Si el usuario no mandó bloque monospace manual, le da estilo de recuadro grisesito
        if (!noticeText.includes('```') && !noticeText.includes('`')) {
            const lineas = noticeText.split('\n');
            const titulo = lineas[0]; // La primera línea la dejamos como encabezado principal
            const resto = lineas.slice(1).join('\n').trim();

            if (resto) {
                formattedText = `${titulo}\n\n\`\`\`${resto}\`\`\``;
            } else {
                formattedText = `\`\`\`${noticeText}\`\`\``;
            }
        }

        // 2. Formato de fecha del día
        const hoy = new Date();
        const fechaFormateada = hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

        // 3. Unir cuerpo con barra de pie de página
        const fullMessage = `${formattedText}\n\n│ ${groupMetadata.subject} ┊ ${fechaFormateada}`;

        // 4. Enviar con tarjeta contextual superior (WhatsApp Business / Verificado)
        return await sock.sendMessage(from, {
            text: fullMessage,
            mentions: mentions,
            contextInfo: {
                externalAdReply: {
                    title: "WhatsApp Business · Oficial",
                    body: `${groupMetadata.subject} · Canal Oficial`,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    // Si tienes un link de canal/grupo o imagen opcional lo agregas aquí:
                    //sourceUrl: "https://whatsapp.com"
                }
            }
        });
    }
};
module.exports = {
    name: 'set',
    aliases: [ ], // Para detectar prefijos pegados
    category: 'admin',
    async execute({ sock, from, command, args, body, m, sender, config, saveComando }) {
        if (config.sudoNumbers.length > 0 && !config.sudoNumbers.includes(sender)) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permiso para configurar comandos.' });
        }

        const customName = command.replace('set', '') || args[0];
        if (!customName) {
            return await sock.sendMessage(from, { 
                text: `⚠️ Especifica el nombre del comando. Ejemplo: ${config.prefix}setpago texto` 
            });
        }

        const contextInfo = m.message.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        let textToSave = '';

        if (quotedMessage) {
            textToSave = quotedMessage.conversation || 
                         quotedMessage.extendedTextMessage?.text || 
                         quotedMessage.imageMessage?.caption || '';
        } else {
            if (command === 'set') {
                textToSave = body.split(' ').slice(2).join(' ').trim();
            } else {
                textToSave = body.slice(config.prefix.length + command.length).trim();
            }
        }

        if (!textToSave) {
            return await sock.sendMessage(from, { 
                text: '⚠️ No se encontró contenido para guardar.' 
            });
        }

        saveComando(customName, textToSave);
        return await sock.sendMessage(from, { 
            text: `✅ *SE HA CONFIGURADO EL COMANDO "${customName}"*\n\nActívalo con: ${config.prefix}${customName}` 
        });
    }
};
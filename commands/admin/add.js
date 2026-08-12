module.exports = {
    name: 'add',
    aliases: ['agg', 'agregar'],
    async execute({ sock, from, command, args, body, m, sender, config, getComandos, saveComando }) {
        if (config.sudoNumbers.length > 0 && !config.sudoNumbers.includes(sender)) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permiso para editar comandos.' });
        }
        
        const customName = command.replace('add', '') || args[0];
        if (!customName) {
            return await sock.sendMessage(from, { 
                text: `⚠️ Especifica el comando al que agregarás texto. Ejemplo: ${config.prefix}addstock texto nuevo` 
            });
        }

        const db = getComandos();
        if (!db[customName]) {
            return await sock.sendMessage(from, { 
                text: `⚠️ El comando "${customName}" no existe. Créalo primero con ${config.prefix}set${customName}` 
            });
        }

        const contextInfo = m.message.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        let textToAdd = '';

        if (quotedMessage) {
            textToAdd = quotedMessage.conversation || 
                        quotedMessage.extendedTextMessage?.text || 
                        quotedMessage.imageMessage?.caption || '';
        } else {
            if (command === 'add') {
                textToAdd = body.split(' ').slice(2).join(' ').trim();
            } else {
                textToAdd = body.slice(config.prefix.length + command.length).trim();
            }
        }

        if (!textToAdd) {
            return await sock.sendMessage(from, { text: '⚠️ Escribe el contenido a añadir.' });
        }

        const contenidoActualizado = `${db[customName]}\n\n${textToAdd}`;
        saveComando(customName, contenidoActualizado);

        return await sock.sendMessage(from, { 
            text: `✅ *SE HAN AÑADIDO LOS DATOS A "${customName}"*` 
        });
    }
};
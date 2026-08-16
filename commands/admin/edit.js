module.exports = {
    name: 'edit',
    aliases: ['editar'],
    category: 'admin',
    async execute({ sock, from, command, args, body, sender, config, getComandos, saveComando }) {
        if (config.sudoNumbers.length > 0 && !config.sudoNumbers.includes(sender)) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permiso para editar comandos.' });
        }

            if (config.sudoNumbers.length > 0 && !config.sudoNumbers.includes(sender)) {
                return await sock.sendMessage(from, { text: '🚫 No tienes permiso para editar comandos.' });
            }

            // Extraer nombre del comando (ej. "stock" de "/editstock")
            let customName = command.replace('edit', '').replace('ar', '');
            
            // Si el usuario usó espacio: "/edit stock viejo | nuevo"
            let inputArgs = args;
            if (!customName) {
                customName = inputArgs.shift();
            }

            if (!customName) {
                return await sock.sendMessage(from, { 
                    text: `⚠️ Especifica el comando a editar.\nEjemplo: ${config.prefix}editstock TextoViejo | TextoNuevo` 
                });
            }

            const db = getComandos();
            if (!db[customName]) {
                return await sock.sendMessage(from, { 
                    text: `⚠️ El comando "${customName}" no existe. Usa ${config.prefix}set${customName} para crearlo.` 
                });
            }

            // Obtener el texto enviado después del comando
            const paramText = body.slice(config.prefix.length + command.length).trim();
            const partes = paramText.split('--').map(p => p.trim());

            if (partes.length < 2 || !partes[0] || !partes[1]) {
                return await sock.sendMessage(from, { 
                    text: `⚠️ Formato incorrecto. Usa el separador "--"\n\nEjemplo:\n${config.prefix}edit${customName} $95 MXN -- $100 MXN` 
                });
            }

            const [textoViejo, textoNuevo] = partes;
            const contenidoActual = db[customName];

            // Validar que el texto a reemplazar realmente exista en el comando
            if (!contenidoActual.includes(textoViejo)) {
                return await sock.sendMessage(from, { 
                    text: `⚠️ No se encontró el texto "${textoViejo}" dentro del comando "${customName}".` 
                });
            }

            // Reemplazar la frase/dato
            const contenidoActualizado = contenidoActual.replace(textoViejo, textoNuevo);
            saveComando(customName, contenidoActualizado);

            return await sock.sendMessage(from, { 
                text: `✅ *DATO ACTUALIZADO EN "${customName}"*\n\nSe cambió:\n❌ "${textoViejo}"\n por:\n✅ "${textoNuevo}"` 
            });
        }
};
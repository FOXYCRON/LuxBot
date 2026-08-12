const fs = require('fs');
const path = require('path');
const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'reload',
    aliases: ['recargar', 'refresh'],
    execute: async ({ sock, from, config, systemCommands, sender, m }) => {
        const isGroup = from.endsWith('@g.us');
        
        // 1. Verificar permisos de Administrador / Sudo
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });
        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '❌ No tienes permisos para recargar los comandos.' 
            }, { quoted: m });
        }

        try {
            // 2. Limpiar el Map actual de comandos
            systemCommands.clear();

            // 3. Ruta raíz de comandos
            const commandsPath = path.join(__dirname, '..', '..', 'commands');

            // Función recursiva para recargar archivos y purgar la caché de Node.js
            function reloadFolder(dir) {
                if (!fs.existsSync(dir)) return 0;
                
                let reloadedCount = 0;
                const items = fs.readdirSync(dir);

                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        reloadedCount += reloadFolder(fullPath);
                    } else if (item.endsWith('.js')) {
                        // Borrar la caché interna de require para forzar la relectura del archivo
                        delete require.cache[require.resolve(fullPath)];

                        // Re-importar el comando
                        const cmd = require(fullPath);

                        if (cmd.name) {
                            systemCommands.set(cmd.name, cmd);
                            reloadedCount++;
                        }

                        if (cmd.aliases && Array.isArray(cmd.aliases)) {
                            cmd.aliases.forEach(alias => systemCommands.set(alias, cmd));
                        }
                    }
                }
                return reloadedCount;
            }

            // Ejecutar la recarga
            const totalComandos = reloadFolder(commandsPath);

            // 4. Confirmación al usuario
            await sock.sendMessage(from, {
                text: `🔄 *SISTEMA RECARGADO*\n\n✅ Se han vuelto a cargar *${totalComandos}* archivos/módulos de comandos en caliente sin reiniciar el servidor.`
            }, { quoted: m });

        } catch (error) {
            console.error('Error al recargar comandos:', error);
            await sock.sendMessage(from, {
                text: '❌ *Ha ocurrido un error al recargar los comandos.*\n_Revisa la consola del servidor para más detalles._'
            }, { quoted: m });
        }
    }
};
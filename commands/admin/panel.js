const fs = require('fs');
const path = require('path');
const checkAdminPermissions = require('../../utils/isBotAdmin');

module.exports = {
    name: 'adminhelp',
    aliases: ['admin', 'panel', 'adminmenu', 'comandosadmin'],
    execute: async ({ sock, from, config, systemCommands, sender, m }) => {
        const isGroup = from.endsWith('@g.us');
        
        // 1. Verificar si quien ejecuta el comando es Admin / Sudo / Autorizado
        const hasPermission = await checkAdminPermissions({ sock, from, sender, isGroup, m, config });

        if (!hasPermission) {
            return await sock.sendMessage(from, { 
                text: '❌ No tienes permisos para ver el menú de administración.' 
            }, { quoted: m });
        }

        // 2. Leer directamente los archivos .js dentro de la carpeta commands/admin
        const adminFolderPath = path.join(__dirname);
        const adminFiles = fs.readdirSync(adminFolderPath).filter(file => file.endsWith('.js'));

        const comandosAdmin = [];

        for (const file of adminFiles) {
            const cmdModule = require(path.join(adminFolderPath, file));
            if (cmdModule.name) {
                comandosAdmin.push(cmdModule.name);
            }
        }

        // Ordenar alfabéticamente
        comandosAdmin.sort();

        if (comandosAdmin.length === 0) {
            return await sock.sendMessage(from, { 
                text: '🛠️ *PANEL DE ADMINISTRACIÓN*\n\nNo se encontraron comandos de administración registrados.' 
            }, { quoted: m });
        }

        // 3. Construir el mensaje del panel
        let textoLista = `🛠️ *PANEL DE ADMINISTRACIÓN*\n\n`;
        comandosAdmin.forEach((cmd) => {
            textoLista += `• ${config.prefix}${cmd}\n`;
        });
        textoLista += `\n_Estos comandos solo son visibles y ejecutables por administradores._`;

        return await sock.sendMessage(from, { text: textoLista }, { quoted: m });
    }
};
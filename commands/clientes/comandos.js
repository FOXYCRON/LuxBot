module.exports = {
    name: 'comandos',
    aliases: ['menu', 'help'],
    execute: async ({ sock, from, config, getComandos, systemCommands, m }) => {
        const listaComandos = new Set();

        // 1. Recorrer comandos de sistema (JS) y filtrar los de admin o invisibles
        for (const [key, cmd] of systemCommands.entries()) {
            // Ignorar alias duplicados en el Map y comandos de administración/sistema
            if (cmd.name === key && cmd.category !== 'admin' && cmd.category !== 'system') {
                listaComandos.add(`${config.prefix}${cmd.name}`);
            }
        }

        // 2. Recorrer comandos creados en la base de datos (comandos.json)
        const db = getComandos();
        const clavesIgnoradas = ['bienvenida_enabled']; // Claves de configuración interna a omitir

        for (const cmdKey of Object.keys(db)) {
            if (!clavesIgnoradas.includes(cmdKey)) {
                listaComandos.add(`${config.prefix}${cmdKey}`);
            }
        }

        // Ordenar alfabéticamente
        const comandosOrdenados = Array.from(listaComandos).sort();

        if (comandosOrdenados.length === 0) {
            return await sock.sendMessage(from, { 
                text: '📋 No hay comandos disponibles por el momento.' 
            }, { quoted: m });
        }

        const textoMenu = 
`📋 *COMANDOS DISPONIBLES*

${comandosOrdenados.map(c => `• ${c}`).join('\n')}

_Escribe cualquiera de los comandos anteriores para ver su contenido._`;

        await sock.sendMessage(from, { text: textoMenu }, { quoted: m });
    }
};
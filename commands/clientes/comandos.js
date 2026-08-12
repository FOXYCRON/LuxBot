module.exports = {
    name: 'comandos',
    aliases: ['help', 'menu'],
    async execute({ sock, from, config, getComandos, systemCommands }) {
        // 1. Obtener los comandos guardados dinámicamente en el JSON
        const comandosBD = getComandos();
        const nombresJSON = Object.keys(comandosBD);

        // 2. Filtrar comandos del sistema creados en archivo .js que sean públicos (omite alias duplicados)
        // Puedes agregar a la lista de ignorados comandos admin como 'addsaldo', 'auth', 'set', etc.
        const adminCommands = ['addsaldo', 'auth', 'unauth', 'set', 'edit', 'add', 'abrir', 'cerrar', 'notify', 'restart'];
        
        const nombresSistema = [];
        if (systemCommands) {
            for (const [key, cmd] of systemCommands.entries()) {
                // Solo agrega el nombre principal (no los alias) y excluye los administrativos
                if (cmd.name === key && !adminCommands.includes(cmd.name)) {
                    nombresSistema.push(cmd.name);
                }
            }
        }

        // 3. Unir y ordenar todos los comandos disponibles para el cliente
        const todosLosComandos = Array.from(new Set([...nombresSistema, ...nombresJSON])).sort();

        if (todosLosComandos.length === 0) {
            return await sock.sendMessage(from, { 
                text: `📋 *LISTA DE COMANDOS*\n\nNo hay comandos disponibles en este momento.` 
            });
        }

        let textoLista = `📋 *COMANDOS DISPONIBLES*\n\n`;
        todosLosComandos.forEach((cmd) => {
            textoLista += `• ${config.prefix}${cmd}\n`;
        });
        textoLista += `\n_Escribe cualquiera de los comandos anteriores para ver su contenido._`;

        return await sock.sendMessage(from, { text: textoLista });
    }
};
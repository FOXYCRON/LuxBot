module.exports = {
    name: 'comandos',
    aliases: ['help', 'menu'],
    async execute({ sock, from, config, getComandos }) {
        const listaComandos = getComandos();
        const nombres = Object.keys(listaComandos);

        if (nombres.length === 0) {
            return await sock.sendMessage(from, { 
                text: `📋 *LISTA DE COMANDOS*\n\nNo hay comandos guardados aún.` 
            });
        }

        let textoLista = `📋 *COMANDOS DISPONIBLES*\n\n`;
        nombres.sort().forEach((cmd) => {
            textoLista += `${config.prefix}${cmd}\n`;
        });
        textoLista += `\n_Escribe cualquiera de los comandos anteriores para ver su contenido._`;

        return await sock.sendMessage(from, { text: textoLista });
    }
};
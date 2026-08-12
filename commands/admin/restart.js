module.exports = {
    name: 'restart',
    aliases: ['reboot', 'reload', 'restarted', 'reset'],
    async execute({ sock, from, sender, config }) {
        if (config.sudoNumbers.length > 0 && !config.sudoNumbers.includes(sender)) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permiso para reiniciar el bot.' });
        }

        await sock.sendMessage(from, { text: '🔄 Reiniciando el bot, dame un momento...' });
        setTimeout(() => process.exit(0), 1000);
    }
};
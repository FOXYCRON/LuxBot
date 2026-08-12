// Objeto para almacenar temporizadores activos por chat
const activeTimers = {};

module.exports = {
    name: 'abrir',
    aliases: ['open', 'cerrar', 'close'],
    async execute({ sock, from, command, args, sender, config }) {
        if (!from.endsWith('@g.us')) {
            return await sock.sendMessage(from, { text: '⚠️ Este comando solo se puede usar en grupos.' });
        }

        if (config.sudoNumbers.length > 0 && !config.sudoNumbers.includes(sender)) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permiso para modificar la configuración del grupo.' });
        }

        const groupMetadata = await sock.groupMetadata(from);
        const groupName = groupMetadata.subject;
        const isOpenAction = command === 'abrir' || command === 'open';

        // 1. Si no hay parámetros (ej: /abrir o /cerrar), se ejecuta al INSTANTE
        if (args.length === 0) {
            return await applyGroupSetting(sock, from, isOpenAction, groupName);
        }

        // 2. Si se pasan parámetros de tiempo (ej: /abrir 10m o /cerrar 1h)
        const timeInput = args[0].toLowerCase();
        const delayMs = parseTimeToMs(timeInput);

        if (!delayMs) {
            return await sock.sendMessage(from, { 
                text: '⚠️ Formato de tiempo inválido.\nUsa: `10s` (segundos), `15m` (minutos) o `2h` (horas).\nEjemplo: `.cerrar 30m`' 
            });
        }

        // Cancelar temporizador previo en este grupo si existía uno
        if (activeTimers[from]) {
            clearTimeout(activeTimers[from]);
        }

        const actionText = isOpenAction ? 'Abrir grupo' : 'Cerrar grupo';

        await sock.sendMessage(from, {
            text: `⏳ *Acción programada*\n✦ *Acción:* 🔓 ${actionText}\n✦ *Grupo:* ${groupName}\n✦ *Se ejecutará en:* ${timeInput}`
        });

        // Programar la ejecución
        activeTimers[from] = setTimeout(async () => {
            await applyGroupSetting(sock, from, isOpenAction, groupName);
            delete activeTimers[from];
        }, delayMs);
    }
};

// Función auxiliar para aplicar el cambio en WhatsApp
async function applyGroupSetting(sock, from, isOpenAction, groupName) {
    try {
        const setting = isOpenAction ? 'not_announcement' : 'announcement';
        const actionText = isOpenAction ? '🔓 Abrir grupo' : '🔒 Cerrar grupo';

        await sock.groupSettingUpdate(from, setting);

        return await sock.sendMessage(from, {
            text: `✅ *Acción ejecutada*\n✦ *Acción:* ${actionText}\n✦ *Grupo:* ${groupName}`
        });
    } catch (error) {
        console.error('Error al cambiar la configuración del grupo:', error);
        return await sock.sendMessage(from, {
            text: '❌ No se pudo cambiar el ajuste del grupo. Asegúrate de que el bot sea *Administrador*.'
        });
    }
}

// Convierte expresiones de tiempo (ej: 10s, 15m, 2h) a milisegundos
function parseTimeToMs(input) {
    const match = input.match(/^(\d+)(s|m|h)$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        default: return null;
    }
}
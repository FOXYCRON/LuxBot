// Objeto para almacenar temporizadores activos por chat
const activeTimers = {};

module.exports = {
    name: 'abrir',
    aliases: ['open', 'cerrar', 'close'],
    category: 'admin', 
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

        // 2. Procesar el tiempo (duración o hora exacta)
        const rawInput = args.join(' ').toLowerCase().trim();
        const delayMs = parseTimeOrExactMs(rawInput);

        if (!delayMs) {
            return await sock.sendMessage(from, { 
                text: '⚠️ Formato de tiempo inválido.\n\nEjemplos válidos:\n• Duración: `10s`, `15m`, `2h`\n• Hora exacta: `10:00`, `22:30`, `10:00pm`\n\nEjemplo: `.cerrar 10:00pm`' 
            });
        }

        // Cancelar temporizador previo en este grupo si existía uno
        if (activeTimers[from]) {
            clearTimeout(activeTimers[from]);
        }

        const actionText = isOpenAction ? 'Abrir grupo' : 'Cerrar grupo';

        // Calcular y formatear la hora exacta de ejecución
        const targetDate = new Date(Date.now() + delayMs);
        const horaEjecucion = targetDate.toLocaleTimeString('es-MX', {
            timeZone: 'America/Hermosillo',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        await sock.sendMessage(from, {
            text: `⏳ *Acción programada*\n✦ *Acción:* 🔓 ${actionText}\n✦ *Grupo:* ${groupName}\n✦ *Hora de ejecución:* ${horaEjecucion}`
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

// Analiza tanto duraciones (10m, 2h) como horas fijas (10:00, 10:00pm, 22:00)
function parseTimeOrExactMs(input) {
    // Caso 1: Expresión de duración relativa (ej: 10s, 15m, 2h)
    const relativeMatch = input.match(/^(\d+)(s|m|h)$/);
    if (relativeMatch) {
        const value = parseInt(relativeMatch[1]);
        const unit = relativeMatch[2];
        if (unit === 's') return value * 1000;
        if (unit === 'm') return value * 60 * 1000;
        if (unit === 'h') return value * 60 * 60 * 1000;
    }

    // Caso 2: Hora fija (ej: "10:00", "22:30", "10:00pm", "10:00 am")
    const exactMatch = input.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
    if (exactMatch) {
        let hours = parseInt(exactMatch[1]);
        const minutes = parseInt(exactMatch[2]);
        const period = exactMatch[3];

        if (minutes < 0 || minutes > 59) return null;

        // Ajustar formato 12 horas AM/PM
        if (period) {
            if (hours < 1 || hours > 12) return null;
            if (period === 'pm' && hours < 12) hours += 12;
            if (period === 'am' && hours === 12) hours = 0;
        } else {
            if (hours < 0 || hours > 23) return null;
        }

        // Obtener la fecha y hora actual en la zona horaria objetivo
        const now = new Date();
        const localNowStr = now.toLocaleString('en-US', { timeZone: 'America/Hermosillo' });
        const localNow = new Date(localNowStr);

        const target = new Date(localNow);
        target.setHours(hours, minutes, 0, 0);

        // Si la hora ingresada ya pasó hoy, programarla para el día de mañana
        if (target.getTime() <= localNow.getTime()) {
            target.setDate(target.getDate() + 1);
        }

        return target.getTime() - localNow.getTime();
    }

    return null;
}
const fs = require('fs');
const path = require('path');
const { getSaldoUser, setSaldoUser } = require('../../database/dbSaldos');
// 🔑 Importar tu gestor de autorización
const { isAuthorized } = require('../../database/dbAuth'); // Ajusta la ruta a tu archivo

const STOCK_FILE = path.join(__dirname, '../../database/stock_disponible.json');
const VENDIDAS_FILE = path.join(__dirname, '../../database/cuentas_vendidas.json');

// ⚙️ NÚMERO INICIAL PARA LAS VENTAS
const ID_INICIAL = 1;

function getJson(file) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify({}), 'utf-8');
        return {};
    }
    try {
        const content = fs.readFileSync(file, 'utf-8').trim();
        return content ? JSON.parse(content) : {};
    } catch {
        return {};
    }
}

function saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
    name: 'comprar',
    aliases: ['buy', 'vender'],
    category: 'admin',
    async execute(ctx) {
        const { sock, from, args, m, sender, config } = ctx;

        // 🔒 1. VALIDACIÓN CON BASE DE DATOS `authorized_users.json`
        const isGroup = from.endsWith('@g.us');
        const currentGroupId = isGroup ? from : null;

        let hasPermission = isAuthorized(sender, currentGroupId);

        if (!hasPermission && config.sudoNumbers) {
            hasPermission = config.sudoNumbers.some(num => {
                const cleanNum = num.trim().toLowerCase();
                return cleanNum === sender.toLowerCase() || 
                       (m.key?.participant && cleanNum === m.key.participant.toLowerCase());
            });
        }

        if (!hasPermission) {
            return await sock.sendMessage(from, { text: '🚫 No tienes permisos autorizados en el sistema para ejecutar este comando.' }, { quoted: m });
        }

        // 🎯 2. DETERMINAR EL DESTINATARIO DE LA COMPRA
        const mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        const targetJid = mentionedJid || sender;

        if (args.length < 2) {
            return await sock.sendMessage(from, { 
                text: '⚠️ *Uso del comando:*\n\n`.comprar <plataforma> <perfil|completa> [duracion] [@usuario]`\n\n*Ejemplos:*\n• `.comprar vix perfil 1m` *(Compra de 1 mes)*\n• `.comprar vix perfil 3m @5216681234567` *(Compra de 3 meses para la mención)*' 
            }, { quoted: m });
        }

        const plataforma = args[0].toLowerCase();
        const tipo = args[1].toLowerCase();

        if (tipo !== 'perfil' && tipo !== 'completa') {
            return await sock.sendMessage(from, { text: '❌ Tipo de cuenta no válido. Elige *perfil* o *completa*.' }, { quoted: m });
        }

        // Identificar si especificó la duración (ej: 1m, 2m, 3m, 6m, 12m) o usar '1m' por defecto
        let duracion = '1m';
        if (args[2] && !args[2].startsWith('@') && isNaN(args[2])) {
            duracion = args[2].toLowerCase();
        }

        const stockData = getJson(STOCK_FILE);

        // Validar si existe la plataforma/tipo/duración y si hay stock disponible
        const itemStock = stockData[plataforma]?.[tipo]?.[duracion];

        if (!itemStock || !Array.isArray(itemStock.cuentas) || itemStock.cuentas.length === 0) {
            return await sock.sendMessage(from, { text: `❌ Lo sentimos, no hay stock disponible para *${plataforma.toUpperCase()}* [${tipo.toUpperCase()}] (${duracion.toUpperCase()}).` }, { quoted: m });
        }

        const precio = itemStock.precio;

        // Consultar saldo del usuario destino
        let saldoUsuario = getSaldoUser(targetJid);
        let userJidFinal = targetJid;

        if (saldoUsuario < precio) {
            const numTarget = targetJid.split('@')[0].split(':')[0];
            return await sock.sendMessage(from, { 
                text: `❌ Saldo insuficiente.\n👤 *Usuario:* +${numTarget}\n💰 *Saldo actual:* $${saldoUsuario.toFixed(2)}\n🏷️ *Precio producto:* $${precio.toFixed(2)}` 
            }, { quoted: m });
        }

        // 3. Descontar Saldo del usuario destino
        const nuevoSaldo = setSaldoUser(userJidFinal, saldoUsuario - precio);

        // 4. Extraer cuenta del stock
        const cuentaEntregada = itemStock.cuentas.shift();
        saveJson(STOCK_FILE, stockData);

        // 5. Obtener teléfono real del usuario destino
        let numeroCliente = userJidFinal.split('@')[0].split(':')[0];

        // 6. REGISTRAR EN CUENTAS VENDIDAS
        const vendidasData = getJson(VENDIDAS_FILE);
        const llaveVenta = `${plataforma}_${tipo}_${duracion}`;
        if (!Array.isArray(vendidasData[llaveVenta])) vendidasData[llaveVenta] = [];

        // 🔢 OBTENER EL ID MÁS ALTO DE TODO EL ARCHIVO HISTÓRICO PARA SEGUIR LA SECUENCIA GLOBAL
        let maxId = ID_INICIAL - 1;
        for (const clave in vendidasData) {
            if (Array.isArray(vendidasData[clave])) {
                for (const venta of vendidasData[clave]) {
                    if (venta.idVenta && venta.idVenta > maxId) {
                        maxId = venta.idVenta;
                    }
                }
            }
        }
        const idVenta = maxId + 1;

        vendidasData[llaveVenta].push({
            idVenta: idVenta,
            clienteTelefono: numeroCliente,
            clienteJid: userJidFinal,
            tipo: tipo,
            duracion: duracion,
            cuenta: cuentaEntregada,
            precio: precio,
            fecha: new Date().toLocaleString('es-MX', { timeZone: 'America/Hermosillo' })
        });
        saveJson(VENDIDAS_FILE, vendidasData);

        // 7. Formatear datos de la cuenta para mensaje privado
        const partes = cuentaEntregada.split(':');
        const correo = partes[0] ? partes[0].trim() : '';
        const contra = partes[1] ? partes[1].trim() : '';
        const perfilNombre = partes[2] ? partes[2].trim() : null;

        let datosCuenta = `✉️ ${correo}\n🔑: ${contra}`;
        let advertencias = '';

        if (tipo === 'perfil' || perfilNombre) {
            datosCuenta += `\nPerfil: ${perfilNombre || 'Asignado'}`;
            advertencias = 
`Para mantener Garantía:
🗳️ No meter más de un dispositivo 
🗳️ No modificar contraseña
🗳️ No cambiar nombre`;
        } else {
            datosCuenta += `\nTipo: Cuenta Completa (Sin Perfil)`;
            advertencias = 
`Para mantener Garantía:
🗳️ No modificar los datos de la cuenta
🗳️ Respetar los términos de servicio`;
        }

        const mensajePrivado = 
`${plataforma.charAt(0).toUpperCase() + plataforma.slice(1)} 💙 (${duracion.toUpperCase()}) *(Venta #${idVenta})*

${datosCuenta}

${advertencias}`;

        // 8. Enviar mensaje privado al usuario destino
        try {
            await sock.sendMessage(userJidFinal, { text: mensajePrivado });
        } catch (err) {
            console.error('Error al enviar mensaje privado al usuario:', err);
        }

        // 9. Confirmación al grupo etiquetando al cliente
        return await sock.sendMessage(from, { 
            text: `✅ *¡Compra realizada con éxito! (Venta #${idVenta})*\n\n👤 *Usuario:* @${numeroCliente}\n🛒 *Producto:* ${plataforma.toUpperCase()} [${tipo.toUpperCase()}] (${duracion.toUpperCase()})\n💵 *Descontado:* $${precio.toFixed(2)}\n💰 *Saldo restante:* $${nuevoSaldo.toFixed(2)}\n\n📩 *La cuenta ha sido enviada al chat privado del usuario.*`,
            mentions: [userJidFinal]
        }, { quoted: m });
    }
};
const fs = require('fs');
const path = require('path');

const STOCK_FILE = path.join(__dirname, '../../database/stock_disponible.json');

function getStock() {
    if (!fs.existsSync(STOCK_FILE)) return {};
    try {
        const content = fs.readFileSync(STOCK_FILE, 'utf-8').trim();
        return content ? JSON.parse(content) : {};
    } catch (err) {
        return {};
    }
}

module.exports = {
    name: 'stockb',
    aliases: ['catalogo', 'stock1'],
    category: 'tienda',
    async execute(ctx) {
        const { sock, from, m, config } = ctx;

        const stockData = getStock();
        const plataformas = Object.keys(stockData);

        if (plataformas.length === 0) {
            return await sock.sendMessage(from, { text: '📦 Actualmente no hay productos registrados en el catálogo.' }, { quoted: m });
        }

        const prefix = config.prefix || '.';
        let mensaje = `💼 *CATÁLOGO Y STOCK DE LUXPASS* 💼\n\n───────────────\n`;

        for (const plat of plataformas) {
            const dataPlat = stockData[plat];
            const nombrePlataforma = plat.toUpperCase();

            let bloquePlat = `🎬 *${nombrePlataforma}*\n`;
            let tieneVariantes = false;

            const tipos = ['perfil', 'completa'];

            for (const t of tipos) {
                if (dataPlat[t]) {
                    const tagMod = t === 'perfil' ? '👤 Perfil' : '🏠 Completa';
                    
                    // Si el objeto interno contiene duraciones (1m, 3m, 12m, etc.)
                    const duraciones = Object.keys(dataPlat[t]);

                    for (const dur of duraciones) {
                        const item = dataPlat[t][dur];
                        if (item && typeof item === 'object') {
                            tieneVariantes = true;
                            const cantidad = Array.isArray(item.cuentas) ? item.cuentas.length : 0;
                            const precio = typeof item.precio === 'number' ? item.precio.toFixed(2) : '0.00';
                            const estado = cantidad > 0 ? `🟢 (${cantidad})` : `🔴 Agotado`;

                            bloquePlat += `├ 🔹 *${tagMod} [${dur.toUpperCase()}]:* $${precio} | ${estado}\n`;
                        }
                    }
                }
            }

            // Mantiene compatibilidad en caso de formatos anteriores sin subclave de duración
            if (!tieneVariantes && (dataPlat.precio !== undefined || Array.isArray(dataPlat.cuentas))) {
                const cantidad = Array.isArray(dataPlat.cuentas) ? dataPlat.cuentas.length : 0;
                const precio = typeof dataPlat.precio === 'number' ? dataPlat.precio.toFixed(2) : '0.00';
                const estado = cantidad > 0 ? `🟢 (${cantidad})` : `🔴 Agotado`;
                bloquePlat += `└ 🏷️ *Precio:* $${precio} | ${estado}\n`;
            }

            mensaje += bloquePlat + `\n`;
        }

        mensaje += `───────────────\n`;
        mensaje += `📌 *¿Cómo comprar?*\n`;
        mensaje += `Usa el comando: *${prefix}comprar <plataforma> <perfil|completa> [duración] [@usuario]*\n`;
        mensaje += `Ejemplo: *${prefix}comprar netflix perfil 3m*`;

        return await sock.sendMessage(from, { text: mensaje }, { quoted: m });
    }
};
const fs = require('fs');
const path = require('path');

const DB_SALDOS = path.join(__dirname, 'saldos.json');

if (!fs.existsSync(DB_SALDOS)) {
    fs.writeFileSync(DB_SALDOS, JSON.stringify({}), 'utf-8');
}

function getSaldos() {
    return JSON.parse(fs.readFileSync(DB_SALDOS, 'utf-8'));
}

function saveSaldos(data) {
    fs.writeFileSync(DB_SALDOS, JSON.stringify(data, null, 2), 'utf-8');
}

function getSaldoUser(jid) {
    const saldos = getSaldos();
    return saldos[jid] || 0;
}

function setSaldoUser(jid, monto) {
    const saldos = getSaldos();
    saldos[jid] = Math.max(0, monto); // Evita valores negativos
    saveSaldos(saldos);
    return saldos[jid];
}

function addSaldoUser(jid, monto) {
    const saldoActual = getSaldoUser(jid);
    const nuevoSaldo = saldoActual + monto;
    return setSaldoUser(jid, nuevoSaldo);
}

module.exports = {
    getSaldoUser,
    setSaldoUser,
    addSaldoUser
};
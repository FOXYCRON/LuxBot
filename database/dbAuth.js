const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(__dirname, 'authorized_users.json');

function getAuthorizedUsers() {
    if (!fs.existsSync(AUTH_FILE)) {
        fs.writeFileSync(AUTH_FILE, JSON.stringify({}));
    }
    try {
        const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        // Si la base antigua era un array [], la convierte automáticamente al nuevo formato objeto {}
        if (Array.isArray(data)) {
            const converted = {};
            data.forEach(id => {
                converted[id] = { scope: 'global', groupName: 'Global', date: new Date().toISOString() };
            });
            saveAuthorizedUsers(converted);
            return converted;
        }
        return data;
    } catch (e) {
        return {};
    }
}

function saveAuthorizedUsers(data) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Revisa si el usuario tiene permiso (ya sea global o para ese grupo específico)
function isAuthorized(jid, currentGroupId = null) {
    const users = getAuthorizedUsers();
    const userAuth = users[jid];

    if (!userAuth) return false;

    // Si el usuario tiene acceso global
    if (userAuth.scope === 'global') return true;

    // Si el acceso está amarrado a un grupo específico
    if (userAuth.scope === 'group' && currentGroupId && userAuth.groupId === currentGroupId) {
        return true;
    }

    return false;
}

function addAuthorizedUser(jid, metadata) {
    const users = getAuthorizedUsers();
    
    users[jid] = {
        scope: metadata.scope || 'global', // 'global' o 'group'
        groupId: metadata.groupId || null,
        groupName: metadata.groupName || 'N/A',
        grantedBy: metadata.grantedBy || 'Sudo',
        date: new Date().toISOString().split('T')[0]
    };

    saveAuthorizedUsers(users);
    return true;
}

function removeAuthorizedUser(jid) {
    const users = getAuthorizedUsers();
    if (users[jid]) {
        delete users[jid];
        saveAuthorizedUsers(users);
        return true;
    }
    return false;
}

module.exports = {
    isAuthorized,
    addAuthorizedUser,
    removeAuthorizedUser
};
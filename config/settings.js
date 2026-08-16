module.exports = {
    // Nombre del creador / dueño del bot
    creator: 'LioTDH', // O tu nombre/apodo deseado

    // Prefijo para activar comandos ('/' o '.')
    prefix: '/',

    // Tipos de chat permitidos: 'all', 'private', o 'group'
    allowedChatType: 'all', 

    // Lista de grupos permitidos (vacío [] para permitir cualquier grupo)
    // Ejemplo: ['120363012345678901@g.us']
    allowedGroups: [
        '120363427697817445@g.us', // LuxBot Oficial Grupo
        '120363428671919248@g.us' // Pruebas Grupo
    ],

    // Números autorizados para CREAR/EDITAR comandos con /set
    // Usa el número con código de país seguido de @s.whatsapp.net
    sudoNumbers: [
        '268843612155950@lid' // ADMIN LioTDH
    ]
};
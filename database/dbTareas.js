const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.join(__dirname, 'tareas.json');

function getTareas() {
    if (!fs.existsSync(TASKS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8'));
    } catch {
        return [];
    }
}

function saveTarea(tarea) {
    const tareas = getTareas().filter(t => t.from !== tarea.from); // Reemplaza previa si existía
    tareas.push(tarea);
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tareas, null, 2), 'utf-8');
}

function removeTarea(from) {
    const tareas = getTareas().filter(t => t.from !== from);
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tareas, null, 2), 'utf-8');
}

module.exports = { getTareas, saveTarea, removeTarea };
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/database.json');

function loadDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Ошибка загрузки БД:', err);
        return { teams: [], tasks: [], submissions: [], media: {} };
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Ошибка сохранения БД:', err);
        return false;
    }
}

function getNextId(collection) {
    if (collection.length === 0) return 1;
    return Math.max(...collection.map(item => item.id)) + 1;
}

module.exports = { loadDB, saveDB, getNextId };
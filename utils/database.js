const fs = require('fs').promises;
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'places.json');
const backupPath = path.join(__dirname, '..', 'data', 'backup');

// Создание резервной копии
async function createBackup() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupPath, `places-${timestamp}.json`);
        
        await fs.mkdir(backupPath, { recursive: true });
        await fs.writeFile(backupFile, data);
    } catch (error) {
        console.error('Ошибка создания резервной копии:', error);
    }
}

// Загрузка данных
async function loadPlaces() {
    try {
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('Файл данных не найден, создается новый...');
        const initialData = { places: [] };
        await fs.writeFile(dataPath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

// Утилита для очистки данных
function cleanData(data) {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined || cleaned[key] === null || cleaned[key] === '') {
            delete cleaned[key];
        }
    });
    return cleaned;
}

// Сохранение данных
async function savePlaces(data) {
    await createBackup();
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

module.exports = { loadPlaces, savePlaces, cleanData };
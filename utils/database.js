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
        
        console.log(`✅ Создан бэкап: ${path.basename(backupFile)}`);
        
        // Очищаем старые бэкапы после создания нового
        await cleanupOldBackups();
        
    } catch (error) {
        console.error('❌ Ошибка создания резервной копии:', error);
    }
}

// Очистка бэкапов старше 14 дней
async function cleanupOldBackups() {
    try {
        const files = await fs.readdir(backupPath);
        const now = new Date();
        const daysToKeep = 14;
        const cutoffTime = now.getTime() - (daysToKeep * 24 * 60 * 60 * 1000);
        
        let deletedCount = 0;
        
        for (const file of files) {
            if (file.startsWith('places-') && file.endsWith('.json')) {
                const filePath = path.join(backupPath, file);
                const stats = await fs.stat(filePath);
                const fileTime = stats.mtime.getTime();
                
                if (fileTime < cutoffTime) {
                    await fs.unlink(filePath);
                    console.log(`🗑️ Удален старый бэкап: ${file}`);
                    deletedCount++;
                }
            }
        }
        
        if (deletedCount > 0) {
            console.log(`✅ Удалено старых бэкапов: ${deletedCount}`);
        }
        
    } catch (error) {
        // Если папка backup не существует или пуста - это нормально
        if (error.code !== 'ENOENT') {
            console.error('❌ Ошибка очистки старых бэкапов:', error);
        }
    }
}

// Загрузка данных
async function loadPlaces() {
    try {
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('📁 Файл данных не найден, создается новый...');
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
    await createBackup(); // Создаем бэкап перед сохранением
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

// Принудительная очистка старых бэкапов (можно вызывать отдельно)
async function forceCleanup() {
    console.log('🧹 Запущена принудительная очистка старых бэкапов...');
    await cleanupOldBackups();
}

module.exports = { 
    loadPlaces, 
    savePlaces, 
    cleanData, 
    cleanupOldBackups,
    forceCleanup 
};
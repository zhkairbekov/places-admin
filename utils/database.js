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
        if (error.code !== 'ENOENT') {
            console.error('❌ Ошибка очистки старых бэкапов:', error);
        }
    }
}

// Получение списка всех бэкапов
async function getBackupsList() {
    try {
        await fs.mkdir(backupPath, { recursive: true });
        const files = await fs.readdir(backupPath);

        const backups = [];

        for (const file of files) {
            if (file.startsWith('places-') && file.endsWith('.json')) {
                const filePath = path.join(backupPath, file);
                const stats = await fs.stat(filePath);

                // Парсим дату из имени файла
                const dateStr = file.replace('places-', '').replace('.json', '');
                const date = new Date(dateStr.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, '$1-$2-$3T$4:$5:$6.$7Z'));

                backups.push({
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: date,
                    formattedDate: date.toLocaleString('ru-RU')
                });
            }
        }

        // Сортируем по дате (новые сверху)
        return backups.sort((a, b) => b.created - a.created);

    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error('❌ Ошибка получения списка бэкапов:', error);
        throw error;
    }
}

// Получение содержимого конкретного бэкапа
async function getBackupContent(filename) {
    try {
        const filePath = path.join(backupPath, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Ошибка чтения бэкапа:', error);
        throw error;
    }
}

// Восстановление из бэкапа
async function restoreFromBackup(filename) {
    try {
        const backupData = await getBackupContent(filename);

        // Создаем бэкап текущего состояния перед восстановлением
        await createBackup();

        // Восстанавливаем данные
        await fs.writeFile(dataPath, JSON.stringify(backupData, null, 2));

        console.log(`✅ Восстановлено из бэкапа: ${filename}`);
        return backupData;

    } catch (error) {
        console.error('❌ Ошибка восстановления из бэкапа:', error);
        throw error;
    }
}

// Удаление конкретного бэкапа
async function deleteBackup(filename) {
    try {
        const filePath = path.join(backupPath, filename);
        await fs.unlink(filePath);
        console.log(`🗑️ Удален бэкап: ${filename}`);
    } catch (error) {
        console.error('❌ Ошибка удаления бэкапа:', error);
        throw error;
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
    await createBackup();
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
}

module.exports = {
    loadPlaces,
    savePlaces,
    cleanData,
    cleanupOldBackups,
    getBackupsList,
    getBackupContent,
    restoreFromBackup,
    deleteBackup
};
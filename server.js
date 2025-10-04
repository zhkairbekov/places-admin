require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Импорт модулей
const middleware = require('./config/middleware');
const authRoutes = require('./routes/auth');
const placesRoutes = require('./routes/places');
const pagesRoutes = require('./routes/pages');
const uploadRoutes = require('./routes/upload');
const mediaRoutes = require('./routes/media'); // ← ДОБАВЬТЕ ЭТУ СТРОКУ
const { cleanupOldBackups } = require('./utils/database');

// Настройка middleware
middleware.setupMiddleware(app);

// Подключение роутов
app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes); // ← ДОБАВЬТЕ ЭТУ СТРОКУ
app.use('/', pagesRoutes);

// Автоматическая очистка старых бэкапов при запуске сервера
async function initializeServer() {
    try {
        console.log('🧹 Проверка старых бэкапов...');
        await cleanupOldBackups();
        
        setInterval(async () => {
            console.log('🕒 Запуск периодической очистки бэкапов...');
            await cleanupOldBackups();
        }, 24 * 60 * 60 * 1000);
        
    } catch (error) {
        console.error('Ошибка инициализации сервера:', error);
    }
}

// Запуск сервера
app.listen(PORT, async () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔐 Админ login: ${process.env.ADMIN_USER}`);
    console.log(`🔐 Админ password: ${process.env.ADMIN_PASS}`);
    console.log(`🖼️ Медиатека доступна по /media-library`);
    
    // Проверяем и создаем необходимые директории
    try {
        const fs = require('fs').promises;
        await fs.mkdir('images', { recursive: true });
        await fs.mkdir('data', { recursive: true });
        await fs.mkdir('data/backup', { recursive: true });
        console.log('✅ Все необходимые директории созданы');
    } catch (error) {
        console.error('❌ Ошибка создания директорий:', error);
    }
    
    await initializeServer();
});
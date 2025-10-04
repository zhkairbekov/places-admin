require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Импорт модулей
const middleware = require('./config/middleware');
const authRoutes = require('./routes/auth');
const placesRoutes = require('./routes/places');
const pagesRoutes = require('./routes/pages');
const { cleanupOldBackups } = require('./utils/database'); // Добавьте эту строку

// Настройка middleware
middleware.setupMiddleware(app);

// Подключение роутов
app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/', pagesRoutes);

// Автоматическая очистка старых бэкапов при запуске сервера
async function initializeServer() {
    try {
        console.log('🧹 Проверка старых бэкапов...');
        await cleanupOldBackups();
        
        // Запускаем периодическую очистку каждые 24 часа
        setInterval(async () => {
            console.log('🕒 Запуск периодической очистки бэкапов...');
            await cleanupOldBackups();
        }, 24 * 60 * 60 * 1000); // 24 часа
        
    } catch (error) {
        console.error('Ошибка инициализации сервера:', error);
    }
}

// Запуск сервера
app.listen(PORT, async () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔐 Админ login: ${process.env.ADMIN_USER}`);
    console.log(`🔐 Админ pass: ${process.env.ADMIN_PASS}`);
    
    // Инициализация дополнительных функций
    await initializeServer();
});
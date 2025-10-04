require('dotenv').config();

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Импорт модулей
const middleware = require('./config/middleware');
const authRoutes = require('./routes/auth');
const placesRoutes = require('./routes/places');
const pagesRoutes = require('./routes/pages');

// Настройка middleware
middleware.setupMiddleware(app);

// Подключение роутов
app.use('/api/auth', authRoutes);       // ← Все auth роуты начинаются с /api/auth
app.use('/api/places', placesRoutes);   // ← Все places роуты начинаются с /api/places
app.use('/', pagesRoutes);              // ← Страницы

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔐 Админ login: ${process.env.ADMIN_USER}`);
});
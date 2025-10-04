const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { checkAdminAuth, requireAuth } = require('../middleware/auth');
const router = express.Router();

// Маршрут для страницы медиатеки
router.get('/media-library', checkAdminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'media-library.html'));
});

// API для получения галереи изображений
router.get('/gallery', requireAuth, async (req, res) => {
    console.log('🖼️ Запрос к /api/media/gallery получен');
    try {
        const uploadDir = path.join(__dirname, '..', 'images');
        console.log('📁 Путь к images:', uploadDir);

        // Проверяем существование директории
        try {
            await fs.access(uploadDir);
        } catch (error) {
            console.error('❌ Полная ошибка в /api/media/gallery:', error);
            console.error('❌ Stack trace:', error.stack);
            return res.status(500).json({
                error: 'Ошибка сервера при загрузке галереи',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }

        const files = await fs.readdir(uploadDir);

        // Используем Promise.all для асинхронной обработки
        const images = await Promise.all(
            files
                .filter(file => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))
                .map(async (file) => {
                    try {
                        const filePath = path.join(uploadDir, file);
                        const stats = await fs.stat(filePath);
                        const fileSize = stats.size;

                        return {
                            filename: file,
                            url: `/images/${file}`,
                            size: fileSize,
                            formattedSize: formatFileSize(fileSize),
                            uploaded: stats.birthtime,
                            uploadedFormatted: stats.birthtime.toLocaleDateString('ru-RU')
                        };
                    } catch (error) {
                        console.error(`Ошибка чтения файла ${file}:`, error);
                        return null;
                    }
                })
        );

        // Фильтруем null значения и сортируем
        const validImages = images.filter(img => img !== null)
            .sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

        res.json(validImages);

    } catch (error) {
        console.error('❌ Ошибка чтения директории:', error);
        return res.status(500).json({
            error: 'Ошибка сервера при загрузке галереи',
            details: error.message
        });
    }
});

// Вспомогательная функция для форматирования размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
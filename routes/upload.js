const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Создаем папку images если не существует
const ensureImagesDir = async () => {
    try {
        await fs.mkdir('images', { recursive: true });
    } catch (error) {
        console.error('Ошибка создания папки images:', error);
    }
};

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await ensureImagesDir();
        cb(null, 'images/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// Фильтр файлов - только изображения
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Разрешены только файлы изображений (JPEG, PNG, GIF, WebP)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Загрузка файла
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }

        const imageUrl = `/images/${req.file.filename}`;

        console.log('✅ Файл загружен:', req.file.filename);

        res.json({
            success: true,
            filename: req.file.filename,
            url: imageUrl,
            message: 'Файл успешно загружен'
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки файла:', error);
        res.status(500).json({ error: 'Ошибка загрузки файла' });
    }
});

// Удаление файла
router.delete('/:filename', requireAuth, async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join('images', filename);

        await fs.unlink(filePath);

        console.log('🗑️ Файл удален:', filename);

        res.json({
            success: true,
            message: 'Файл успешно удален'
        });

    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Файл не найден' });
        }
        console.error('❌ Ошибка удаления файла:', error);
        res.status(500).json({ error: 'Ошибка удаления файла' });
    }
});

// Получение списка загруженных изображений с информацией
// Получение списка загруженных изображений с информацией
router.get('/gallery', requireAuth, async (req, res) => {
    try {
        await ensureImagesDir();
        const files = await fs.readdir('images');

        const images = await Promise.all(
            files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            }).map(async (file) => {
                const filePath = path.join('images', file);
                const stats = await fs.stat(filePath);

                return {
                    filename: file,
                    url: `/images/${file}`,
                    size: stats.size,
                    uploaded: stats.mtime,
                    uploadedFormatted: stats.mtime.toLocaleString('ru-RU'),
                    formattedSize: formatFileSize(stats.size)
                };
            })
        );

        // Сортируем по дате (новые сверху)
        images.sort((a, b) => b.uploaded - a.uploaded);

        res.json(images);

    } catch (error) {
        console.error('❌ Ошибка получения галереи изображений:', error);
        res.status(500).json({ error: 'Ошибка получения галереи изображений' });
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
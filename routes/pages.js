const express = require('express');
const path = require('path');
const { checkAdminAuth } = require('../middleware/auth');
const router = express.Router();

// Главная страница с проверкой авторизации
router.get('/', (req, res) => {
    const isAuthenticated = req.session.authenticated && req.session.user === process.env.ADMIN_USER;
    
    // Читаем HTML файл и модифицируем его
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'public', 'index.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Ошибка загрузки страницы');
        }
        
        let html = data;
        
        if (isAuthenticated) {
            // Добавляем ссылку для авторизованных
            html = html.replace(
                '<p>Лучшие локации для вашего следующего приключения</p>',
                '<p>Лучшие локации для вашего следующего приключения</p><div style="text-align: center; margin-top: 1rem;"><a href="/admin" style="color: white; text-decoration: underline; font-size: 1.1rem;">🔐 Админ-панель</a></div>'
            );
        }
        
        res.send(html);
    });
});

// Страницы авторизации
router.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html'));
});

router.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html'));
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin-login.html'));
});

// Админ-панель - несколько вариантов
router.get('/admin', checkAdminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

router.get('/dashboard', checkAdminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Статические файлы - разрешаем доступ к CSS, JS, изображениям
router.get('/public/*', (req, res, next) => {
    const allowedExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico'];
    const fileExtension = path.extname(req.path).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
        // Разрешаем Express static middleware обработать файл
        express.static('public')(req, res, next);
    } else {
        res.status(403).send('Доступ запрещен');
    }
});

// Заблокировать доступ к чувствительным файлам
router.get('*.json', (req, res) => {
    res.status(403).sendFile(path.join(__dirname, '..', 'public', '403.html'));
});

router.get('/data/*', (req, res) => {
    res.status(403).sendFile(path.join(__dirname, '..', 'public', '403.html'));
});

// Обработка 404 - для всех остальных маршрутов
router.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
});

module.exports = router;
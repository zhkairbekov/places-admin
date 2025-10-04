const express = require('express');
const { validationResult } = require('express-validator');
const { loginValidation } = require('../middleware/validation');
const router = express.Router();

// Авторизация
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASS;

        if (username === adminUser && password === adminPass) {
            req.session.authenticated = true;
            req.session.user = username;

            console.log('✅ Успешный вход пользователя:', username);

            res.json({
                success: true,
                message: 'Успешный вход',
                user: username
            });
        } else {
            console.log('❌ Неудачная попытка входа:', username);
            res.status(401).json({
                success: false,
                error: 'Неверный логин или пароль'
            });
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера'
        });
    }
});

// Проверка авторизации - БЕЗ автоматического обновления
router.get('/check', (req, res) => {
    const isAuthenticated = req.session.authenticated && req.session.user === process.env.ADMIN_USER;

    res.json({
        authenticated: isAuthenticated,
        user: isAuthenticated ? req.session.user : null
    });
});

// Выход - редирект на главную
router.post('/logout', (req, res) => {
    const userName = req.session.user;

    req.session.destroy((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
            return res.status(500).json({ error: 'Ошибка при выходе' });
        }

        // Очищаем cookie сессии
        res.clearCookie('connect.sid');

        console.log('🚪 Пользователь вышел:', userName);

        res.json({
            success: true,
            message: 'Успешный выход',
            redirect: '/'
        });
    });
});

module.exports = router;
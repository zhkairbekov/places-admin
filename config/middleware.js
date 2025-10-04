const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Rate limiting для авторизации
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Слишком много попыток входа, попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting для загрузки файлов
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 загрузок за 15 минут
    message: { error: 'Слишком много загрузок, попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

function setupMiddleware(app) {
    // Middleware безопасности
    if (process.env.NODE_ENV === 'production') {
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "blob:", "https:"],
                    connectSrc: ["'self'"]
                }
            }
        }));
    } else {
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrcAttr: ["'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "blob:", "https:"],
                    connectSrc: ["'self'"]
                }
            }
        }));
    }

    app.use(express.json({ limit: '50mb' })); // Увеличили лимит для base64
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Статические файлы - CSS, JS
    app.use('/public', express.static('public', {
        setHeaders: (res, path) => {
            if (path.endsWith('admin.js')) {
                res.set('Cache-Control', 'no-store');
            }
        }
    }));

    // Статические файлы - изображения
    app.use('/images', express.static('images', {
        setHeaders: (res, path) => {
            res.set('Cache-Control', 'public, max-age=86400');
        }
    }));

    // Настройка сессий
    app.use(session({
        secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
        resave: true,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 365 * 24 * 60 * 60 * 1000
        },
        rolling: false
    }));

    // Rate limiting
    app.use('/api/auth/login', authLimiter);
    app.use('/api/upload', uploadLimiter);

    // Логирование запросов
    app.use((req, res, next) => {
        console.log('📨', new Date().toISOString(), req.method, req.url);
        next();
    });
}

module.exports = { setupMiddleware };
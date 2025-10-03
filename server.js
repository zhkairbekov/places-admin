require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware безопасности
if (process.env.NODE_ENV === 'production') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"]
            }
        }
    }));
} else {
    // В разработке разрешаем inline скрипты
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                scriptSrcAttr: ["'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"]
            }
        }
    }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы с ограничениями доступа
app.use('/public', express.static('public', {
    setHeaders: (res, path) => {
        // Запрещаем доступ к JS файлам админки без авторизации
        if (path.endsWith('admin.js')) {
            res.set('Cache-Control', 'no-store');
        }
    }
}));

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true в production с HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 часа
    }
}));

// Rate limiting для авторизации
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 попыток
    message: { error: 'Слишком много попыток входа, попробуйте позже' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Функции для работы с данными
const dataPath = path.join(__dirname, 'data', 'places.json');
const backupPath = path.join(__dirname, 'data', 'backup');

// Создание резервной копии
async function createBackup() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupPath, `places-${timestamp}.json`);
        
        await fs.mkdir(backupPath, { recursive: true });
        await fs.writeFile(backupFile, data);
    } catch (error) {
        console.error('Ошибка создания резервной копии:', error);
    }
}

// Загрузка данных
async function loadPlaces() {
    try {
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Создаем файл с начальными данными
        const initialData = {
            places: [
                {
                    "id": 1,
                    "name": "Эрмитаж",
                    "description": "Один из крупнейших художественных музеев мира, расположенный в Санкт-Петербурге.",
                    "category": "Музей",
                    "address": "Дворцовая пл., 2, Санкт-Петербург",
                    "price": 500,
                    "rating": 4.9,
                    "image": "",
                    "createdAt": "2024-01-15T10:00:00.000Z",
                    "updatedAt": "2024-01-15T10:00:00.000Z"
                },
                {
                    "id": 2,
                    "name": "Красная площадь",
                    "description": "Главная площадь Москвы, известная своими историческими памятниками и архитектурой.",
                    "category": "Достопримечательность",
                    "address": "Красная пл., Москва",
                    "price": 0,
                    "rating": 4.8,
                    "image": "",
                    "createdAt": "2024-01-16T14:30:00.000Z",
                    "updatedAt": "2024-01-16T14:30:00.000Z"
                }
            ]
        };
        await fs.writeFile(dataPath, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

// Утилита для очистки данных от undefined/null значений
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

// Валидация данных места
const placeValidation = [
    body('name').trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').trim().isLength({ max: 500 }).escape(),
    body('category').trim().isLength({ min: 1, max: 50 }).escape(),
    body('address').trim().isLength({ max: 200 }).escape(),
    body('price').isFloat({ min: 0 }).optional(),
    body('rating').isFloat({ min: 0, max: 5 }).optional()
];

// Middleware проверки аутентификации
function requireAuth(req, res, next) {
    if (req.session.authenticated && req.session.user === process.env.ADMIN_USER) {
        next();
    } else {
        res.status(401).json({ error: 'Требуется авторизация' });
    }
}

// Middleware для проверки авторизации при доступе к админ-панели
function checkAdminAuth(req, res, next) {
    if (req.session.authenticated && req.session.user === process.env.ADMIN_USER) {
        next();
    } else {
        // Если запрос API - возвращаем JSON ошибку
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        // Если запрос к админ-панели - редирект на страницу логина
        return res.redirect('/admin-login.html');
    }
}

// API Routes

// Авторизация
app.post('/api/login', authLimiter, [
    body('username').trim().isLength({ min: 1 }).escape(),
    body('password').isLength({ min: 1 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        
        // Проверяем учетные данные из .env
        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASS;
        
        if (username === adminUser && password === adminPass) {
            req.session.authenticated = true;
            req.session.user = username;
            res.json({ 
                success: true, 
                message: 'Успешный вход', 
                user: username 
            });
        } else {
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

// Проверка авторизации
app.get('/api/check-auth', (req, res) => {
    if (req.session.authenticated && req.session.user === process.env.ADMIN_USER) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Выход
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Успешный выход' });
});

// Получение всех мест (публичный доступ)
app.get('/api/places', async (req, res) => {
    try {
        const data = await loadPlaces();
        res.json(data.places);
    } catch (error) {
        console.error('Ошибка загрузки мест:', error);
        res.status(500).json({ error: 'Ошибка загрузки данных' });
    }
});

// CRUD операции (требуют авторизации)

// Создание места
app.post('/api/places', requireAuth, placeValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = await loadPlaces();
        const newPlace = {
            id: Date.now(),
            ...cleanData(req.body), // Очищаем данные
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        data.places.push(newPlace);
        await savePlaces(data);
        res.status(201).json(newPlace);
    } catch (error) {
        console.error('Ошибка создания места:', error);
        res.status(500).json({ error: 'Ошибка создания места' });
    }
});

// Обновление места
app.put('/api/places/:id', requireAuth, placeValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = await loadPlaces();
        const placeIndex = data.places.findIndex(p => p.id === parseInt(req.params.id));

        if (placeIndex === -1) {
            return res.status(404).json({ error: 'Место не найдено' });
        }

        data.places[placeIndex] = {
            ...data.places[placeIndex],
            ...cleanData(req.body), // Очищаем данные
            updatedAt: new Date().toISOString()
        };

        await savePlaces(data);
        res.json(data.places[placeIndex]);
    } catch (error) {
        console.error('Ошибка обновления места:', error);
        res.status(500).json({ error: 'Ошибка обновления места' });
    }
});

// Удаление места
app.delete('/api/places/:id', requireAuth, async (req, res) => {
    try {
        const data = await loadPlaces();
        const placeIndex = data.places.findIndex(p => p.id === parseInt(req.params.id));

        if (placeIndex === -1) {
            return res.status(404).json({ error: 'Место не найдено' });
        }

        data.places.splice(placeIndex, 1);
        await savePlaces(data);
        res.json({ message: 'Место успешно удалено' });
    } catch (error) {
        console.error('Ошибка удаления места:', error);
        res.status(500).json({ error: 'Ошибка удаления места' });
    }
});

// Защита всех админских роутов
app.use('/admin.html', checkAdminAuth);
app.use('/api/places', (req, res, next) => {
    if (req.method === 'GET') {
        next(); // GET запросы к /api/places доступны всем
    } else {
        requireAuth(req, res, next); // Остальные методы требуют авторизации
    }
});

// Статические файлы (ограниченный доступ)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin-login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin.html', checkAdminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Заблокировать доступ к чувствительным файлам
app.get('*.json', (req, res) => {
    res.status(403).send('Доступ запрещен');
});

app.get('/data/*', (req, res) => {
    res.status(403).send('Доступ запрещен');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔐 Админ login: ${process.env.ADMIN_USER}`);
    console.log(`🔐 Админ password: ${process.env.ADMIN_PASS}`);
});
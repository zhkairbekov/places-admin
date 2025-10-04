const express = require('express');
const { validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { placeValidation } = require('../middleware/validation');
const { loadPlaces, savePlaces, cleanData, cleanupOldBackups } = require('../utils/database'); // Исправленный импорт
const router = express.Router();

// Получение всех мест (публичный доступ)
router.get('/', async (req, res) => {
    try {
        const data = await loadPlaces();
        res.json(data.places);
    } catch (error) {
        console.error('Ошибка загрузки мест:', error);
        res.status(500).json({ error: 'Ошибка загрузки данных' });
    }
});

// Создание места (требует авторизации)
router.post('/', requireAuth, placeValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = await loadPlaces();
        const newPlace = {
            id: Date.now(),
            ...cleanData(req.body),
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

// Обновление места (требует авторизации)
router.put('/:id', requireAuth, placeValidation, async (req, res) => {
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
            ...cleanData(req.body),
            updatedAt: new Date().toISOString()
        };

        await savePlaces(data);
        res.json(data.places[placeIndex]);
    } catch (error) {
        console.error('Ошибка обновления места:', error);
        res.status(500).json({ error: 'Ошибка обновления места' });
    }
});

// Удаление места (требует авторизации)
router.delete('/:id', requireAuth, async (req, res) => {
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

// Ручная очистка старых бэкапов (требует авторизации)
router.post('/cleanup-backups', requireAuth, async (req, res) => {
    try {
        await cleanupOldBackups(); // Используем cleanupOldBackups вместо forceCleanup
        res.json({
            success: true,
            message: 'Очистка старых бэкапов выполнена'
        });
    } catch (error) {
        console.error('Ошибка очистки бэкапов:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка очистки бэкапов'
        });
    }
});

module.exports = router;
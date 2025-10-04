function sessionHandler(err, req, res, next) {
    if (err && err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Ошибка CSRF токена' });
    }

    if (err && err.message.includes('session')) {
        console.error('Ошибка сессии:', err);
        return res.status(500).json({ error: 'Ошибка сервера сессии' });
    }

    next(err);
}

module.exports = { sessionHandler };
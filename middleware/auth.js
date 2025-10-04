function requireAuth(req, res, next) {
    if (req.session.authenticated && req.session.user === process.env.ADMIN_USER) {
        next();
    } else {
        res.status(401).json({ error: 'Требуется авторизация' });
    }
}

function checkAdminAuth(req, res, next) {
    if (req.session.authenticated && req.session.user === process.env.ADMIN_USER) {
        next();
    } else {
        // Редирект на страницу авторизации для неавторизованных
        return res.redirect('/auth');
    }
}

module.exports = { requireAuth, checkAdminAuth };
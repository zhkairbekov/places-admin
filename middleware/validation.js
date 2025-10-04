const { body } = require('express-validator');

const placeValidation = [
    body('name').trim().isLength({ min: 1, max: 100 }).escape(),
    body('description').trim().isLength({ max: 500 }).escape(),
    body('category').trim().isLength({ min: 1, max: 50 }).escape(),
    body('address').trim().isLength({ max: 200 }).escape(),
    body('price').isFloat({ min: 0 }).optional(),
    body('rating').isFloat({ min: 0, max: 5 }).optional()
];

const loginValidation = [
    body('username').trim().isLength({ min: 1 }).escape(),
    body('password').isLength({ min: 1 })
];

module.exports = { placeValidation, loginValidation };
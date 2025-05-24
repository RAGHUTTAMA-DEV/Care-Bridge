const { body, validationResult } = require('express-validator');

// Validation middleware for hospital data
const validateHospital = [
    // Validate name
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Hospital name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Hospital name must be between 2 and 100 characters'),

    // Validate address
    body('address')
        .trim()
        .notEmpty()
        .withMessage('Address is required')
        .isLength({ min: 5, max: 200 })
        .withMessage('Address must be between 5 and 200 characters'),

    // Validate phone
    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^\+?[0-9\s-]{10,15}$/)
        .withMessage('Please provide a valid phone number'),

    // Validate email
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    // Validate location (optional)
    body('location')
        .optional()
        .custom((value) => {
            if (!value || !value.coordinates || !Array.isArray(value.coordinates) || value.coordinates.length !== 2) {
                throw new Error('Location must have valid coordinates [longitude, latitude]');
            }
            const [lng, lat] = value.coordinates;
            if (typeof lng !== 'number' || typeof lat !== 'number' ||
                lng < -180 || lng > 180 || lat < -90 || lat > 90) {
                throw new Error('Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90');
            }
            return true;
        }),

    // Validation result middleware
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateHospital
}; 
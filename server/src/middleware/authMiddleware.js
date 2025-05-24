const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, no token provided' 
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Not authorized, user not found' 
                });
            }

            // Add user to request object
            req.user = user;
            next();
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, invalid token' 
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error in authentication' 
        });
    }
};

// Authorize by role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, no user found' 
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: `Not authorized, role ${req.user.role} is not allowed` 
            });
        }

        next();
    };
};

module.exports = { protect, authorize }; 
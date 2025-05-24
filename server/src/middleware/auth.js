const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path if necessary

const authenticateJWT = async (req, res, next) => {
  try {
    // Check for token in header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token provided' 
      });
    }

    // Get token from header
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, invalid token format' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token payload (excluding password)
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
        message: 'Not authorized, token failed' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error during authentication' 
    });
  }
};

// Middleware to authorize users by role
const authorizeRole = (roles) => (req, res, next) => {
  // Ensure roles is always an array
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: `User role ${req.user ? req.user.role : ''} is not authorized to access this route` 
    });
  }
  next();
};

module.exports = { authenticateJWT, authorizeRole }; 
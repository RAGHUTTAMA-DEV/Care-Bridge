const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { email, phone, password, role, firstName, lastName, dob, address, hospitalId } = req.body;

  // Basic validation
  if (!password || !role || !firstName || !lastName || !dob || !address || (!email && !phone)) {
    return res.status(400).json({ message: 'Please fill in all required fields' });
  }

  // Check if user already exists by email or phone
  const userExists = await User.findOne({ $or: [{ email }, { phone }] });

  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  try {
    // Create user
    const user = await User.create({
      email,
      phone,
      password,
      role,
      firstName,
      lastName,
      dob,
      address,
      hospitalId: (role === 'staff' || role === 'doctor') ? hospitalId : undefined, // Only add hospitalId for staff/doctors
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        dob: user.dob,
        address: user.address,
        hospitalId: user.hospitalId,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, phone, password } = req.body;

  // Debug logging
  console.log('\n=== Login Attempt ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Parsed credentials:', {
    email: email || 'not provided',
    phone: phone || 'not provided',
    hasPassword: !!password,
    passwordLength: password ? password.length : 0
  });

  // Basic validation
  if (!password || (!email && !phone)) {
    console.log('Login validation failed:', { 
      hasPassword: !!password, 
      hasEmail: !!email, 
      hasPhone: !!phone,
      body: JSON.stringify(req.body, null, 2)
    });
    return res.status(400).json({ message: 'Please provide email/phone and password' });
  }

  try {
    // Find user by email or phone
    const query = email ? { email } : { phone };
    console.log('Finding user with query:', query);
    
    const user = await User.findOne(query);
    
    // Debug logging
    console.log('User lookup result:', {
      found: !!user,
      email: user?.email,
      phone: user?.phone,
      role: user?.role,
      id: user?._id,
      hasPassword: !!user?.password
    });

    if (user) {
      console.log('Attempting password match...');
      const passwordMatch = await user.matchPassword(password);
      console.log('Password match result:', { 
        match: passwordMatch,
        providedPasswordLength: password.length,
        hashedPasswordLength: user.password.length
      });
      
      if (passwordMatch) {
        const token = generateToken(user._id);
        console.log('Login successful:', { 
          userId: user._id, 
          role: user.role,
          tokenPreview: token.substring(0, 20) + '...'
        });
        
        res.json({
          _id: user._id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          dob: user.dob,
          address: user.address,
          hospitalId: user.hospitalId,
          token
        });
      } else {
        console.log('Login failed: Password mismatch');
        res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      console.log('Login failed: User not found');
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      body: JSON.stringify(req.body, null, 2)
    });
    res.status(500).json({ message: 'Server error during login' });
  }
  console.log('=== End Login Attempt ===\n');
};

module.exports = { registerUser, loginUser }; 
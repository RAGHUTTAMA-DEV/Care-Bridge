const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: function() { return !this.phone; }, // Require email if phone is not provided
    unique: true,
    lowercase: true,
    trim: true,
    sparse: true // Allows null values if not required
  },
  phone: {
    type: String,
    required: function() { return !this.email; }, // Require phone if email is not provided
    unique: true,
    trim: true,
    sparse: true // Allows null values if not required
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['patient', 'staff', 'doctor'],
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  dob: {
    type: Date,
    required: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital', // Assuming a Hospital model exists
    required: function() { return this.role === 'staff' || this.role === 'doctor'; }
  },
  // Optional fields for login (as per login/signup description)
  // hospitalId: { type: String }, // for staff opt
  // doctorId: { type: String }, // for doctors opt
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Hash the password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 
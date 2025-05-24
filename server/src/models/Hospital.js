const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 2 && 
                 v[0] >= -180 && v[0] <= 180 && // longitude
                 v[1] >= -90 && v[1] <= 90;     // latitude
        },
        message: 'Coordinates must be valid [longitude, latitude] pairs'
      }
    }
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  // Add other hospital-specific fields as needed (e.g., services, departments)
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
HospitalSchema.index({ location: '2dsphere' });

// Ensure coordinates are stored as [longitude, latitude]
HospitalSchema.pre('save', function(next) {
  if (this.isModified('location.coordinates')) {
    // Ensure coordinates are stored as [longitude, latitude]
    const [longitude, latitude] = this.location.coordinates;
    this.location.coordinates = [longitude, latitude];
  }
  next();
});

module.exports = mongoose.model('Hospital', HospitalSchema); 
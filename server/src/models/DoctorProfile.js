const mongoose = require('mongoose');

const DoctorProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Each user can only have one doctor profile
  },
  specialization: {
    type: String,
    required: true,
    trim: true,
  },
  qualifications: [{
    degree: {
      type: String,
      required: true,
      trim: true
    },
    institution: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  experience: {
    type: Number,  // in years
    required: true,
    min: 0
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  availability: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/  // HH:MM format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/  // HH:MM format
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }],
  languages: [{
    type: String,
    trim: true
  }],
  bio: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  achievements: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      trim: true
    }
  }],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    }
  },
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries
DoctorProfileSchema.index({ location: '2dsphere' });

// Helper method to check if doctor is available at a specific date and time
DoctorProfileSchema.methods.isAvailableAt = function(date) {
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const time = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  
  const availabilitySlot = this.availability.find(slot => 
    slot.day === dayOfWeek && 
    slot.isAvailable &&
    time >= slot.startTime && 
    time <= slot.endTime
  );
  
  return !!availabilitySlot;
};

// Helper method to get next available slot
DoctorProfileSchema.methods.getNextAvailableSlot = function(fromDate = new Date()) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let currentDate = new Date(fromDate);
  
  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = days[currentDate.getDay()];
    const availabilitySlot = this.availability.find(slot => 
      slot.day === dayOfWeek && 
      slot.isAvailable
    );
    
    if (availabilitySlot) {
      const [startHour, startMinute] = availabilitySlot.startTime.split(':');
      const slotDate = new Date(currentDate);
      slotDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      
      if (slotDate > fromDate) {
        return slotDate;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return null;
};

module.exports = mongoose.model('DoctorProfile', DoctorProfileSchema); 
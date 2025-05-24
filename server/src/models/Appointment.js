const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctorProfile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DoctorProfile',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'in_queue', 'in_progress', 'completed', 'cancelled', 'no_show'],
        default: 'scheduled'
    },
    queueNumber: {
        type: Number
    },
    estimatedWaitTime: {
        type: Number // in minutes
    },
    actualWaitTime: {
        type: Number // in minutes
    },
    symptoms: {
        type: String
    },
    notes: {
        type: String
    },
    prescription: {
        type: String
    },
    followUpDate: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
appointmentSchema.index({ doctor: 1, date: 1, status: 1 });
appointmentSchema.index({ patient: 1, date: 1 });
appointmentSchema.index({ status: 1, queueNumber: 1 });

// Method to calculate estimated wait time
appointmentSchema.methods.calculateEstimatedWaitTime = async function() {
    const DoctorProfile = mongoose.model('DoctorProfile');
    const doctorProfile = await DoctorProfile.findById(this.doctorProfile);
    
    if (!doctorProfile) return null;

    // Get average consultation time from doctor's profile or use default
    const avgConsultationTime = doctorProfile.avgConsultationTime || 15; // default 15 minutes

    // Count patients ahead in queue
    const patientsAhead = await this.constructor.countDocuments({
        doctor: this.doctor,
        date: this.date,
        status: { $in: ['scheduled', 'in_queue'] },
        queueNumber: { $lt: this.queueNumber }
    });

    return patientsAhead * avgConsultationTime;
};

// Method to update queue status
appointmentSchema.methods.updateQueueStatus = async function() {
    const now = new Date();
    const appointmentDate = new Date(this.date);
    
    // If appointment is today and within time window
    if (now.toDateString() === appointmentDate.toDateString()) {
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
        const appointmentTime = parseInt(this.startTime.split(':')[0]) * 60 + 
                              parseInt(this.startTime.split(':')[1]);

        if (currentTime >= appointmentTime - 30 && currentTime <= appointmentTime + 30) {
            this.status = 'in_queue';
            this.estimatedWaitTime = await this.calculateEstimatedWaitTime();
            await this.save();
        }
    }
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment; 
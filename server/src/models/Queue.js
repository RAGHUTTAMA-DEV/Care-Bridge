const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'closed'],
        default: 'active'
    },
    maxPatients: {
        type: Number,
        default: 20,
        min: 1
    },
    averageWaitTime: {
        type: Number,
        default: 30, // in minutes
        min: 0
    },
    patients: [{
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: true
        },
        status: {
            type: String,
            enum: ['waiting', 'in_progress', 'completed', 'no_show', 'cancelled'],
            default: 'waiting'
        },
        priority: {
            type: String,
            enum: ['high', 'normal', 'low'],
            default: 'normal'
        },
        reason: {
            type: String,
            required: true
        },
        appointmentTime: {
            type: Date,
            default: Date.now
        },
        estimatedWaitTime: {
            type: Number,
            default: 30 // in minutes
        },
        actualWaitTime: {
            type: Number,
            default: 0 // in minutes
        },
        consultationStartTime: {
            type: Date
        },
        consultationEndTime: {
            type: Date
        },
        notes: {
            type: String
        }
    }],
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

// Indexes for better query performance
queueSchema.index({ hospitalId: 1, date: 1 });
queueSchema.index({ doctor: 1, date: 1 });
queueSchema.index({ 'patients.patient': 1, 'patients.status': 1 });

// Pre-save middleware to update timestamps
queueSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Method to calculate average wait time
queueSchema.methods.calculateAverageWaitTime = async function() {
    const completedPatients = this.patients.filter(p => p.status === 'completed' && p.actualWaitTime > 0);
    if (completedPatients.length > 0) {
        const totalWaitTime = completedPatients.reduce((sum, p) => sum + p.actualWaitTime, 0);
        this.averageWaitTime = Math.round(totalWaitTime / completedPatients.length);
    }
    return this.save();
};

// Method to update patient's actual wait time
queueSchema.methods.updatePatientWaitTime = async function(patientId) {
    const patient = this.patients.find(p => p.patient.toString() === patientId.toString());
    if (patient && patient.consultationStartTime) {
        const waitTime = (patient.consultationStartTime - patient.appointmentTime) / (1000 * 60); // Convert to minutes
        patient.actualWaitTime = Math.round(waitTime);
        await this.save();
        await this.calculateAverageWaitTime();
    }
};

// Method to get queue statistics
queueSchema.methods.getQueueStats = function() {
    const stats = {
        totalPatients: this.patients.length,
        waitingCount: this.patients.filter(p => p.status === 'waiting').length,
        inProgressCount: this.patients.filter(p => p.status === 'in_progress').length,
        completedCount: this.patients.filter(p => p.status === 'completed').length,
        noShowCount: this.patients.filter(p => p.status === 'no_show').length,
        cancelledCount: this.patients.filter(p => p.status === 'cancelled').length,
        averageWaitTime: this.averageWaitTime
    };
    return stats;
};

const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue; 
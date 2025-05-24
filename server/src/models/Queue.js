const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    patients: [{
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['waiting', 'in-progress', 'completed', 'cancelled'],
            default: 'waiting'
        },
        appointmentTime: {
            type: Date,
            required: true
        },
        priority: {
            type: Number,
            default: 0  // Higher number means higher priority
        },
        reason: {
            type: String,
            required: true
        },
        estimatedWaitTime: {
            type: Number,  // in minutes
            default: 30
        }
    }],
    status: {
        type: String,
        enum: ['active', 'paused', 'closed'],
        default: 'active'
    },
    averageWaitTime: {
        type: Number,  // in minutes
        default: 30
    }
}, {
    timestamps: true
});

// Index for efficient querying
QueueSchema.index({ hospital: 1, doctor: 1, date: 1 });

module.exports = mongoose.model('Queue', QueueSchema); 
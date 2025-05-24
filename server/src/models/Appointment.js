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
    hospital: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    appointmentTime: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvalMessage: {
        type: String,
        default: ''
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    notes: {
        type: String,
        default: ''
    },
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        isRead: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

// Indexes for efficient querying
appointmentSchema.index({ patient: 1, appointmentTime: 1 });
appointmentSchema.index({ doctor: 1, appointmentTime: 1 });
appointmentSchema.index({ hospital: 1, appointmentTime: 1 });
appointmentSchema.index({ status: 1, appointmentTime: 1 });

// Virtual for checking if appointment is upcoming
appointmentSchema.virtual('isUpcoming').get(function() {
    return this.appointmentTime > new Date() && this.status !== 'cancelled';
});

// Method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
    const hoursUntilAppointment = (this.appointmentTime - new Date()) / (1000 * 60 * 60);
    return hoursUntilAppointment >= 24 && this.status !== 'completed';
};

// Method to add a message to the appointment
appointmentSchema.methods.addMessage = async function(senderId, message) {
    this.messages.push({
        sender: senderId,
        message,
        timestamp: new Date()
    });
    await this.save();
    return this;
};

// Method to mark messages as read
appointmentSchema.methods.markMessagesAsRead = async function(userId) {
    this.messages = this.messages.map(msg => {
        if (msg.sender.toString() !== userId.toString()) {
            msg.isRead = true;
        }
        return msg;
    });
    await this.save();
    return this;
};

module.exports = mongoose.model('Appointment', appointmentSchema); 
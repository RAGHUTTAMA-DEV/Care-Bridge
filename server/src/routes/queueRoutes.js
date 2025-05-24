const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const Queue = require('../models/Queue');
const User = require('../models/User');
const { io } = require('../socket');

// Helper function to emit queue updates
const emitQueueUpdate = (hospitalId, queue) => {
    if (io && hospitalId) {
        io.to(`hospital:${hospitalId}`).emit('queue:update', queue);
    }
};

// Helper function to emit patient updates
const emitPatientUpdate = (patientId, queue) => {
    if (io && patientId) {
        io.to(`patient:${patientId}`).emit('queue:update', queue);
    }
};

// Create a new queue for a doctor
router.post('/', authenticateJWT, authorizeRole(['staff', 'doctor']), async (req, res) => {
    try {
        const { hospitalId, doctorId, date } = req.body;
        
        // Verify doctor belongs to hospital
        const doctor = await User.findOne({
            _id: doctorId,
            role: 'doctor',
            hospitalId: hospitalId
        });

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found in this hospital' });
        }

        const queue = await Queue.create({
            hospital: hospitalId,
            doctor: doctorId,
            date: new Date(date)
        });

        res.status(201).json(queue);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add patient to queue
router.post('/:queueId/patients', authenticateJWT, async (req, res) => {
    try {
        const { patientId, reason, priority, appointmentTime } = req.body;
        
        // Validate required fields
        if (!patientId || !reason) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                required: ['patientId', 'reason']
            });
        }

        // Find and validate queue
        const queue = await Queue.findById(req.params.queueId);
        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        // Check if queue is active
        if (queue.status !== 'active') {
            return res.status(400).json({ 
                message: 'Cannot join queue - queue is not active',
                queueStatus: queue.status
            });
        }

        // Verify patient exists and is not already in queue
        const patient = await User.findOne({ _id: patientId, role: 'patient' });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check if patient is already in queue
        const existingPatient = queue.patients.find(p => 
            p.patient.toString() === patientId || 
            (p.patient && p.patient._id && p.patient._id.toString() === patientId)
        );
        if (existingPatient) {
            return res.status(400).json({ 
                message: 'Patient is already in this queue',
                patientStatus: existingPatient.status
            });
        }

        // Add patient to queue
        queue.patients.push({
            patient: patientId,
            reason: reason.trim(),
            priority: priority || 0,
            appointmentTime: appointmentTime ? new Date(appointmentTime) : new Date(),
            status: 'waiting'
        });

        await queue.save();
        
        // Populate the updated queue
        const updatedQueue = await Queue.findById(queue._id)
            .populate('doctor', 'firstName lastName')
            .populate('patients.patient', 'firstName lastName');
        
        // Emit updates
        emitQueueUpdate(queue.hospital, updatedQueue);
        emitPatientUpdate(patientId, updatedQueue);

        res.json(updatedQueue);
    } catch (error) {
        console.error('Error adding patient to queue:', error);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update patient status in queue
router.put('/:queueId/patients/:patientId', authenticateJWT, authorizeRole(['staff', 'doctor']), async (req, res) => {
    try {
        const { status } = req.body;
        const queue = await Queue.findById(req.params.queueId)
            .populate('doctor', 'firstName lastName')
            .populate('patients.patient', 'firstName lastName');

        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        const patientQueue = queue.patients.id(req.params.patientId);
        if (!patientQueue) {
            return res.status(404).json({ message: 'Patient not found in queue' });
        }

        patientQueue.status = status;
        await queue.save();

        // Emit updates
        emitQueueUpdate(queue.hospital, queue);
        emitPatientUpdate(patientQueue.patient, queue);

        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get current queue status
router.get('/:queueId', authenticateJWT, async (req, res) => {
    try {
        const queue = await Queue.findById(req.params.queueId)
            .populate('doctor', 'firstName lastName')
            .populate('patients.patient', 'firstName lastName');

        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get queues for a doctor
router.get('/doctor/:doctorId', authenticateJWT, async (req, res) => {
    try {
        const { date } = req.query;
        const query = { doctor: req.params.doctorId };
        
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const queues = await Queue.find(query)
            .populate('doctor', 'firstName lastName email specialization')
            .populate('hospital', 'name address')
            .populate('patients.patient', 'firstName lastName email');

        res.json(queues);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update queue status
router.put('/:queueId/status', authenticateJWT, authorizeRole(['staff', 'doctor']), async (req, res) => {
    try {
        const { status } = req.body;
        
        // Validate status value
        const validStatuses = ['active', 'paused', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                message: 'Invalid status value', 
                validStatuses 
            });
        }

        // Find queue and verify ownership
        const queue = await Queue.findById(req.params.queueId)
            .populate('doctor', 'firstName lastName')
            .populate('patients.patient', 'firstName lastName');

        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        // Verify user has permission to update this queue
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check if user is staff/doctor of the hospital
        if (user.role === 'staff' && user.hospitalId?.toString() !== queue.hospital?.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this queue' });
        }
        if (user.role === 'doctor' && user._id?.toString() !== queue.doctor?._id?.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this queue' });
        }

        // Update status
        const oldStatus = queue.status;
        queue.status = status;
        
        // If closing queue, update all waiting patients to cancelled
        if (status === 'closed') {
            queue.patients = queue.patients.map(patient => {
                if (patient.status === 'waiting') {
                    return { ...patient.toObject(), status: 'cancelled' };
                }
                return patient;
            });
        }

        // Save the queue
        await queue.save();

        // Emit updates without try-catch since we have null checks in the helper functions
        if (queue.hospital) {
            emitQueueUpdate(queue.hospital.toString(), queue);
        }
        
        // Emit updates to individual patients
        queue.patients.forEach(patient => {
            if (patient.patient && patient.patient._id) {
                emitPatientUpdate(patient.patient._id.toString(), queue);
            }
        });

        // Return the updated queue
        res.json({
            ...queue.toObject(),
            status: queue.status,
            oldStatus,
            message: `Queue status updated from ${oldStatus} to ${status}`
        });

    } catch (error) {
        console.error('Error updating queue status:', error);
        res.status(500).json({ 
            message: 'Error updating queue status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get all queues for a hospital
router.get('/hospital/:hospitalId', authenticateJWT, async (req, res) => {
    try {
        const queues = await Queue.find({ hospital: req.params.hospitalId })
            .populate('doctor', 'firstName lastName')
            .populate('patients.patient', 'firstName lastName')
            .sort({ date: -1 }); // Sort by date, most recent first

        res.json(queues);
    } catch (error) {
        console.error('Error fetching hospital queues:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 
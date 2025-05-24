const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRole } = require('../middleware/auth');
const Queue = require('../models/Queue');
const User = require('../models/User');

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
        const queue = await Queue.findById(req.params.queueId);

        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        // Verify patient exists
        const patient = await User.findOne({ _id: patientId, role: 'patient' });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Add patient to queue
        queue.patients.push({
            patient: patientId,
            reason,
            priority: priority || 0,
            appointmentTime: new Date(appointmentTime)
        });

        await queue.save();
        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update patient status in queue
router.put('/:queueId/patients/:patientId', authenticateJWT, authorizeRole(['staff', 'doctor']), async (req, res) => {
    try {
        const { status } = req.body;
        const queue = await Queue.findById(req.params.queueId);

        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        const patientQueue = queue.patients.id(req.params.patientId);
        if (!patientQueue) {
            return res.status(404).json({ message: 'Patient not found in queue' });
        }

        patientQueue.status = status;
        await queue.save();

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
            .populate('hospital', 'name')
            .populate('patients.patient', 'firstName lastName');

        res.json(queues);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update queue status (active/paused/closed)
router.put('/:queueId/status', authenticateJWT, authorizeRole(['staff', 'doctor']), async (req, res) => {
    try {
        const { status } = req.body;
        const queue = await Queue.findByIdAndUpdate(
            req.params.queueId,
            { status },
            { new: true }
        );

        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        res.json(queue);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
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
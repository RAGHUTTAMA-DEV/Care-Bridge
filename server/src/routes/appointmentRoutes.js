const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    bookAppointment,
    getAppointments,
    getDoctorQueue,
    updateAppointmentStatus,
    cancelAppointment
} = require('../controllers/appointmentController');

// All routes are protected
router.use(protect);

// Book a new appointment
router.post('/', bookAppointment);

// Get appointments for the current user (patient or doctor)
router.get('/', getAppointments);

// Get doctor's queue
router.get('/queue/:doctorId', getDoctorQueue);

// Update appointment status
router.patch('/:id/status', updateAppointmentStatus);

// Cancel appointment
router.delete('/:id', cancelAppointment);

module.exports = router; 
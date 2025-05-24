const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');

// @desc    Book a new appointment
// @route   POST /api/appointments
// @access  Private
const bookAppointment = async (req, res) => {
    try {
        const {
            doctorId,
            date,
            startTime,
            symptoms,
            notes
        } = req.body;

        // Validate required fields
        if (!doctorId || !date || !startTime) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Get doctor profile
        const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
        if (!doctorProfile) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Check if doctor is available at the requested time
        const isAvailable = await doctorProfile.isAvailableAt(new Date(date), startTime);
        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                message: 'Doctor is not available at the requested time'
            });
        }

        // Calculate end time based on doctor's average consultation time
        const avgConsultationTime = doctorProfile.avgConsultationTime || 15; // default 15 minutes
        const [hours, minutes] = startTime.split(':').map(Number);
        const endTimeMinutes = (hours * 60 + minutes + avgConsultationTime) % (24 * 60);
        const endTime = `${Math.floor(endTimeMinutes / 60)}:${(endTimeMinutes % 60).toString().padStart(2, '0')}`;

        // Get the next queue number for the day
        const lastAppointment = await Appointment.findOne({
            doctor: doctorId,
            date: new Date(date)
        }).sort({ queueNumber: -1 });

        const queueNumber = lastAppointment ? lastAppointment.queueNumber + 1 : 1;

        // Create appointment
        const appointment = await Appointment.create({
            patient: req.user._id,
            doctor: doctorId,
            doctorProfile: doctorProfile._id,
            date: new Date(date),
            startTime,
            endTime,
            queueNumber,
            symptoms,
            notes
        });

        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to book appointment',
            error: error.message
        });
    }
};

// @desc    Get appointments for a user (patient or doctor)
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res) => {
    try {
        const { status, date, upcoming, patientId, doctorId, approvalStatus } = req.query;
        const query = {};

        console.log('GetAppointments request:', {
            user: {
                id: req.user._id,
                role: req.user.role,
                email: req.user.email
            },
            query: req.query
        });

        // Set query based on user role and provided IDs
        if (patientId) {
            query.patient = patientId;
        } else if (doctorId) {
            query.doctor = doctorId;
        } else if (req.user.role === 'doctor') {
            query.doctor = req.user._id;
        } else {
            query.patient = req.user._id;
        }

        // Add filters
        if (status) {
            query.status = status;
        }
        if (approvalStatus) {
            query.approvalStatus = approvalStatus;
        }
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.appointmentTime = { $gte: startDate, $lte: endDate };
        }
        if (upcoming === 'true') {
            const now = new Date();
            query.appointmentTime = { $gte: now };
            query.status = { $nin: ['cancelled', 'completed'] };
            console.log('Upcoming appointments query:', {
                now,
                query: {
                    appointmentTime: query.appointmentTime,
                    status: query.status,
                    patient: query.patient,
                    doctor: query.doctor
                }
            });
        }

        console.log('Final constructed query:', JSON.stringify(query, null, 2));

        // First, let's check if we have any appointments at all
        const totalAppointments = await Appointment.countDocuments();
        console.log(`Total appointments in database: ${totalAppointments}`);

        // Then check appointments matching our query
        const appointments = await Appointment.find(query)
            .populate('patient', 'firstName lastName email phone')
            .populate('doctor', 'firstName lastName specialization')
            .populate('hospital', 'name address')
            .populate('approvedBy', 'firstName lastName')
            .populate('messages.sender', 'firstName lastName role')
            .sort({ appointmentTime: 1 });

        console.log(`Found ${appointments.length} appointments matching query`);
        if (appointments.length === 0) {
            // If no appointments found, let's check what appointments we have
            const allAppointments = await Appointment.find()
                .populate('patient', 'firstName lastName email')
                .populate('doctor', 'firstName lastName')
                .select('appointmentTime status patient doctor')
                .lean();
            console.log('All appointments in database:', allAppointments.map(apt => ({
                id: apt._id,
                appointmentTime: apt.appointmentTime,
                status: apt.status,
                patient: apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'No patient',
                doctor: apt.doctor ? `${apt.doctor.firstName} ${apt.doctor.lastName}` : 'No doctor'
            })));
        }

        res.json(appointments);
    } catch (error) {
        console.error('Error getting appointments:', error);
        res.status(500).json({
            message: 'Failed to get appointments',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get current queue for a doctor
// @route   GET /api/appointments/queue/:doctorId
// @access  Private
const getDoctorQueue = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const queue = await Appointment.find({
            doctor: doctorId,
            date: today,
            status: { $in: ['scheduled', 'in_queue', 'in_progress'] }
        })
        .populate('patient', 'firstName lastName')
        .sort({ queueNumber: 1 });

        // Update queue status and wait times
        for (const appointment of queue) {
            await appointment.updateQueueStatus();
        }

        res.json({
            success: true,
            data: queue
        });
    } catch (error) {
        console.error('Error getting doctor queue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get doctor queue',
            error: error.message
        });
    }
};

// @desc    Update appointment status
// @route   PATCH /api/appointments/:id/status
// @access  Private
const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, prescription, followUpDate } = req.body;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Only doctor can update status
        if (req.user.role !== 'doctor' || appointment.doctor.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update appointment status'
            });
        }

        // Update appointment
        appointment.status = status;
        if (prescription) appointment.prescription = prescription;
        if (followUpDate) appointment.followUpDate = new Date(followUpDate);

        // Calculate actual wait time if appointment is completed
        if (status === 'completed') {
            const startTime = new Date(appointment.date);
            const [hours, minutes] = appointment.startTime.split(':');
            startTime.setHours(parseInt(hours), parseInt(minutes));
            const waitTime = Math.round((new Date() - startTime) / (1000 * 60)); // in minutes
            appointment.actualWaitTime = waitTime;
        }

        await appointment.save();

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update appointment status',
            error: error.message
        });
    }
};

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private
const cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Check if user is authorized to cancel
        if (appointment.patient.toString() !== req.user._id.toString() && 
            appointment.doctor.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this appointment'
            });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        res.json({
            success: true,
            message: 'Appointment cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel appointment',
            error: error.message
        });
    }
};

module.exports = {
    bookAppointment,
    getAppointments,
    getDoctorQueue,
    updateAppointmentStatus,
    cancelAppointment
}; 
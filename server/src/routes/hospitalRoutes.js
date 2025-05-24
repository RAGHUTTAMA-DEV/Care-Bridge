const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    findNearbyHospitals,
    getAllHospitals,
    getHospitalById,
    createHospital,
    updateHospital
} = require('../controllers/hospitalController');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const axios = require('axios');
const { validateHospital } = require('../middleware/validation');

// Helper function to geocode address
const geocodeAddress = async (address) => {
    try {
        // Using OpenStreetMap Nominatim API for geocoding
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: address,
                format: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': 'CareBridge Healthcare App'
            }
        });

        if (response.data && response.data.length > 0) {
            return {
                type: 'Point',
                coordinates: [
                    parseFloat(response.data[0].lon),
                    parseFloat(response.data[0].lat)
                ]
            };
        }
        throw new Error('No coordinates found for address');
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
};

// Public routes
router.get('/near', protect, findNearbyHospitals);
router.get('/', protect, getAllHospitals);
router.get('/:id', protect, getHospitalById);

// Admin only routes
router.post('/', protect, authorize('staff'), createHospital);
router.put('/:id', protect, authorize('staff'), updateHospital);

// Assign doctor to hospital
router.post('/:hospitalId/doctors/:doctorId', protect, authorize('staff'), async (req, res) => {
    try {
        const { hospitalId, doctorId } = req.params;
        
        // Verify hospital exists
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        // Verify doctor exists and is a doctor
        const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Update doctor's hospital
        doctor.hospitalId = hospitalId;
        await doctor.save();

        res.json({ message: 'Doctor assigned to hospital successfully', doctor });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Remove doctor from hospital
router.delete('/:hospitalId/doctors/:doctorId', protect, authorize('staff'), async (req, res) => {
    try {
        const { hospitalId, doctorId } = req.params;
        
        const doctor = await User.findOne({ 
            _id: doctorId, 
            role: 'doctor',
            hospitalId: hospitalId 
        });

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found in this hospital' });
        }

        doctor.hospitalId = null;
        await doctor.save();

        res.json({ message: 'Doctor removed from hospital successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get hospital with its doctors
router.get('/:hospitalId/doctors', protect, async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        // Find doctors in the User collection
        const doctors = await User.find({ 
            role: 'doctor',
            hospitalId: hospital._id 
        }).select('-password');

        // Get doctor profiles for additional information
        const doctorProfiles = await DoctorProfile.find({
            user: { $in: doctors.map(d => d._id) }
        }).populate('user', '-password');

        // Combine user and profile data
        const doctorsWithProfiles = doctors.map(doctor => {
            const profile = doctorProfiles.find(p => p.user._id.toString() === doctor._id.toString());
            return {
                ...doctor.toObject(),
                profile: profile || null
            };
        });

        res.json({
            hospital,
            doctors: doctorsWithProfiles
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 
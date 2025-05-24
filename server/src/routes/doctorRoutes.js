const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { searchDoctors, getDoctorAvailability } = require('../controllers/doctorController');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const axios = require('axios');

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

// Search doctors with filters
router.get('/search', protect, searchDoctors);

// Get doctor availability
router.get('/:doctorId/availability', protect, getDoctorAvailability);

// Get doctor profile
router.get('/profile', protect, authorize('doctor'), async (req, res) => {
    try {
        const profile = await DoctorProfile.findOne({ user: req.user._id })
            .populate('user', '-password');
        if (!profile) {
            return res.status(404).json({ 
                success: false,
                message: 'Doctor profile not found' 
            });
        }
        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Update doctor profile
router.put('/profile', protect, authorize('doctor'), async (req, res) => {
    try {
        const {
            specialization,
            qualifications,
            experience,
            consultationFee,
            availability,
            languages,
            bio,
            achievements,
            address // Add address field for geocoding
        } = req.body;

        // Validate time format for availability
        if (availability) {
            for (const slot of availability) {
                if (!slot.startTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) ||
                    !slot.endTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
                    return res.status(400).json({ 
                        success: false,
                        message: 'Invalid time format. Use HH:MM format (24-hour)' 
                    });
                }
            }
        }

        // Prepare update object
        const updateData = {
            specialization,
            qualifications,
            experience,
            consultationFee,
            availability,
            languages,
            bio,
            achievements
        };

        // If address is provided, geocode it and add location
        if (address) {
            try {
                const location = await geocodeAddress(address);
                updateData.location = location;
            } catch (error) {
                console.error('Geocoding error:', error);
                return res.status(400).json({
                    success: false,
                    message: 'Failed to geocode address. Please provide a valid address.'
                });
            }
        }

        const profile = await DoctorProfile.findOneAndUpdate(
            { user: req.user._id },
            updateData,
            { 
                new: true, 
                runValidators: true,
                upsert: true // Create profile if it doesn't exist
            }
        ).populate('user', '-password');
        
        res.json({
            success: true,
            data: profile
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Update specific availability slot
router.put('/profile/availability/:day', protect, authorize('doctor'), async (req, res) => {
    try {
        const { day } = req.params;
        const { startTime, endTime, isAvailable } = req.body;

        // Validate time format
        if (!startTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) ||
            !endTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
            return res.status(400).json({ 
                message: 'Invalid time format. Use HH:MM format (24-hour)' 
            });
        }

        const profile = await DoctorProfile.findOne({ user: req.user._id });
        if (!profile) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        // Find and update the specific day's availability
        const availabilityIndex = profile.availability.findIndex(slot => slot.day === day);
        if (availabilityIndex === -1) {
            profile.availability.push({ day, startTime, endTime, isAvailable });
        } else {
            profile.availability[availabilityIndex] = { day, startTime, endTime, isAvailable };
        }

        await profile.save();
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add qualification
router.post('/profile/qualifications', protect, authorize('doctor'), async (req, res) => {
    try {
        const { degree, institution, year } = req.body;
        const profile = await DoctorProfile.findOne({ user: req.user._id });
        
        if (!profile) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        profile.qualifications.push({ degree, institution, year });
        await profile.save();
        
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add achievement
router.post('/profile/achievements', protect, authorize('doctor'), async (req, res) => {
    try {
        const { title, year, description } = req.body;
        const profile = await DoctorProfile.findOne({ user: req.user._id });
        
        if (!profile) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        profile.achievements.push({ title, year, description });
        await profile.save();
        
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all doctors in a hospital
router.get('/hospital/:hospitalId', protect, async (req, res) => {
    try {
        const doctors = await DoctorProfile.find({ hospitalId: req.params.hospitalId })
            .populate('user', '-password')
            .select('-availability');

        res.json({
            success: true,
            count: doctors.length,
            data: doctors
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Find doctors near a location
router.get('/near', async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10000, specialization } = req.query;
        
        if (!longitude || !latitude) {
            return res.status(400).json({ 
                message: 'Longitude and latitude are required' 
            });
        }

        const query = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance) // in meters
                }
            }
        };

        if (specialization) {
            query.specialization = specialization;
        }

        const doctors = await DoctorProfile.find(query)
            .populate('user', '-password')
            .select('-availability'); // Exclude availability details from initial search

        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Find doctors by specialization near a location
router.get('/specialization/:specialization/near', async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10000 } = req.query;
        const { specialization } = req.params;
        
        if (!longitude || !latitude) {
            return res.status(400).json({ 
                message: 'Longitude and latitude are required' 
            });
        }

        const doctors = await DoctorProfile.find({
            specialization,
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            }
        })
        .populate('user', '-password')
        .select('-availability');

        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router; 
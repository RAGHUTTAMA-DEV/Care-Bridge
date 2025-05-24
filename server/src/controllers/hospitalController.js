const Hospital = require('../models/Hospital');

// @desc    Find nearby hospitals
// @route   GET /api/hospitals/near
// @access  Private
const findNearbyHospitals = async (req, res) => {
    try {
        const { latitude, longitude, maxDistance = 10000 } = req.query; // maxDistance in meters, default 10km

        // Validate coordinates
        if (!latitude || !longitude) {
            return res.status(400).json({ 
                success: false,
                message: 'Latitude and longitude are required' 
            });
        }

        // Convert to numbers and validate ranges
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const maxDist = parseFloat(maxDistance);

        if (isNaN(lat) || isNaN(lng) || isNaN(maxDist)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid coordinates or distance' 
            });
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ 
                success: false,
                message: 'Coordinates out of valid range' 
            });
        }

        // Find hospitals within the specified distance
        const hospitals = await Hospital.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat] // MongoDB uses [longitude, latitude] order
                    },
                    $maxDistance: maxDist
                }
            }
        }).select('-__v'); // Exclude version field

        console.log(`Found ${hospitals.length} hospitals within ${maxDist}m`);

        res.json({
            success: true,
            data: hospitals
        });
    } catch (error) {
        console.error('Error finding nearby hospitals:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to find nearby hospitals' 
        });
    }
};

// @desc    Get all hospitals
// @route   GET /api/hospitals
// @access  Private
const getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find().select('-__v');
        res.json(hospitals);
    } catch (error) {
        console.error('Error getting hospitals:', error);
        res.status(500).json({ message: 'Failed to get hospitals' });
    }
};

// @desc    Get hospital by ID
// @route   GET /api/hospitals/:id
// @access  Private
const getHospitalById = async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id).select('-__v');
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        res.json(hospital);
    } catch (error) {
        console.error('Error getting hospital:', error);
        res.status(500).json({ message: 'Failed to get hospital' });
    }
};

// @desc    Create hospital
// @route   POST /api/hospitals
// @access  Private/Admin
const createHospital = async (req, res) => {
    try {
        const { name, address, location, phone, email } = req.body;

        // Validate required fields
        if (!name || !address || !location || !phone || !email) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Validate location format
        if (!location.coordinates || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
            return res.status(400).json({ message: 'Invalid location format' });
        }

        const hospital = await Hospital.create({
            name,
            address,
            location: {
                type: 'Point',
                coordinates: location.coordinates // [longitude, latitude]
            },
            phone,
            email
        });

        res.status(201).json(hospital);
    } catch (error) {
        console.error('Error creating hospital:', error);
        if (error.code === 11000) { // Duplicate key error
            res.status(400).json({ message: 'Hospital with this name or email already exists' });
        } else {
            res.status(500).json({ message: 'Failed to create hospital' });
        }
    }
};

// @desc    Update hospital
// @route   PUT /api/hospitals/:id
// @access  Private/Admin
const updateHospital = async (req, res) => {
    try {
        const { name, address, location, phone, email } = req.body;
        const hospital = await Hospital.findById(req.params.id);

        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        // Update fields if provided
        if (name) hospital.name = name;
        if (address) hospital.address = address;
        if (location) {
            hospital.location = {
                type: 'Point',
                coordinates: location.coordinates
            };
        }
        if (phone) hospital.phone = phone;
        if (email) hospital.email = email;

        await hospital.save();
        res.json(hospital);
    } catch (error) {
        console.error('Error updating hospital:', error);
        if (error.code === 11000) {
            res.status(400).json({ message: 'Hospital with this name or email already exists' });
        } else {
            res.status(500).json({ message: 'Failed to update hospital' });
        }
    }
};

module.exports = {
    findNearbyHospitals,
    getAllHospitals,
    getHospitalById,
    createHospital,
    updateHospital
}; 
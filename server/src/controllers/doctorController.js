const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');

// @desc    Find doctors with filters
// @route   GET /api/doctors/search
// @access  Private
const searchDoctors = async (req, res) => {
    try {
        console.log('Search doctors request received:', {
            query: req.query,
            user: req.user ? { id: req.user._id, role: req.user.role } : 'No user'
        });

        const {
            specialization,
            experience,
            maxFee,
            languages,
            availability,
            latitude,
            longitude,
            maxDistance = 20000, // default 20km (increased from 10km)
            hospitalId,
            rating
        } = req.query;

        // Build query object
        const query = {};

        // Add specialization filter
        if (specialization) {
            query.specialization = specialization;
        }

        // Add experience filter
        if (experience) {
            query.experience = { $gte: parseInt(experience) };
        }

        // Add consultation fee filter
        if (maxFee) {
            query.consultationFee = { $lte: parseInt(maxFee) };
        }

        // Add languages filter
        if (languages) {
            const languageList = languages.split(',');
            query.languages = { $in: languageList };
        }

        // Add availability filter
        if (availability) {
            try {
                const { day, time } = availability;
                if (day && time) {
                    query['availability'] = {
                        $elemMatch: {
                            day,
                            startTime: { $lte: time },
                            endTime: { $gte: time },
                            isAvailable: true
                        }
                    };
                }
            } catch (error) {
                console.error('Error processing availability filter:', error);
            }
        }

        // Add location filter
        if (latitude && longitude) {
            try {
                const lat = parseFloat(latitude);
                const lng = parseFloat(longitude);
                const maxDist = parseInt(maxDistance);

                console.log('Location search params:', {
                    latitude: lat,
                    longitude: lng,
                    maxDistance: maxDist,
                    coordinates: [lng, lat] // Note: MongoDB expects [longitude, latitude]
                });

                query.location = {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [lng, lat] // MongoDB expects [longitude, latitude]
                        },
                        $maxDistance: maxDist
                    }
                };
            } catch (error) {
                console.error('Error processing location filter:', error);
            }
        }

        // Add hospital filter
        if (hospitalId) {
            query.hospitalId = hospitalId;
        }

        // Add rating filter
        if (rating) {
            query.rating = { $gte: parseFloat(rating) };
        }

        console.log('Constructed query:', JSON.stringify(query, null, 2));

        // First, let's check if we have any doctors at all
        const totalDoctors = await DoctorProfile.countDocuments();
        console.log(`Total doctors in database: ${totalDoctors}`);

        // Execute query with population
        const doctors = await DoctorProfile.find(query)
            .populate({
                path: 'user',
                select: '-password',
                match: { role: 'doctor' }
            })
            .select('-availability')
            .lean();

        console.log(`Found ${doctors.length} doctors before filtering`);
        if (doctors.length === 0) {
            // If no doctors found, let's check what doctors we have in the database
            const allDoctors = await DoctorProfile.find()
                .populate('user', '-password')
                .select('location user')
                .lean();
            console.log('All doctors in database:', allDoctors.map(d => ({
                id: d._id,
                name: d.user ? `${d.user.firstName} ${d.user.lastName}` : 'No user',
                location: d.location
            })));
        }

        // Filter out doctors where user is null (in case of role mismatch)
        const filteredDoctors = doctors.filter(doc => doc.user !== null);

        console.log(`Found ${filteredDoctors.length} doctors after filtering`);

        // Format response
        const formattedDoctors = filteredDoctors.map(doc => ({
            _id: doc._id,
            specialization: doc.specialization,
            experience: doc.experience,
            consultationFee: doc.consultationFee,
            languages: doc.languages,
            bio: doc.bio,
            rating: doc.rating,
            location: doc.location,
            qualifications: doc.qualifications,
            doctor: {
                _id: doc.user._id,
                firstName: doc.user.firstName,
                lastName: doc.user.lastName,
                email: doc.user.email,
                phone: doc.user.phone,
                hospitalId: doc.user.hospitalId
            }
        }));

        // Return formatted response
        return res.json(formattedDoctors);

    } catch (error) {
        console.error('Error searching doctors:', {
            error: error.message,
            stack: error.stack,
            query: req.query
        });
        res.status(500).json({
            success: false,
            message: 'Failed to search doctors',
            error: error.message
        });
    }
};

// @desc    Get doctor availability
// @route   GET /api/doctors/:doctorId/availability
// @access  Private
const getDoctorAvailability = async (req, res) => {
    try {
        const { date } = req.query;
        const doctor = await DoctorProfile.findById(req.params.doctorId)
            .populate('user', '-password');

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        if (date) {
            const checkDate = new Date(date);
            const isAvailable = doctor.isAvailableAt(checkDate);
            const nextSlot = doctor.getNextAvailableSlot(checkDate);

            res.json({
                success: true,
                data: {
                    isAvailable,
                    nextAvailableSlot: nextSlot,
                    availability: doctor.availability
                }
            });
        } else {
            const nextSlot = doctor.getNextAvailableSlot();
            res.json({
                success: true,
                data: {
                    nextAvailableSlot: nextSlot,
                    availability: doctor.availability
                }
            });
        }
    } catch (error) {
        console.error('Error getting doctor availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get doctor availability',
            error: error.message
        });
    }
};

module.exports = {
    searchDoctors,
    getDoctorAvailability
}; 
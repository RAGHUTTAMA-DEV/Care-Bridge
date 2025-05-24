const mongoose = require('mongoose');
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
require('dotenv').config();

const checkData = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check total doctors
        const totalDoctors = await DoctorProfile.countDocuments();
        console.log(`Total doctors in database: ${totalDoctors}`);

        // Get all doctors with their locations
        const doctors = await DoctorProfile.find()
            .populate('user', 'firstName lastName email role')
            .select('location specialization user')
            .lean();

        console.log('\nDoctors in database:');
        doctors.forEach(doc => {
            console.log({
                name: doc.user ? `${doc.user.firstName} ${doc.user.lastName}` : 'No user',
                email: doc.user?.email,
                role: doc.user?.role,
                specialization: doc.specialization,
                location: doc.location
            });
        });

        // Check if any doctors have location data
        const doctorsWithLocation = doctors.filter(d => d.location && d.location.coordinates);
        console.log(`\nDoctors with location data: ${doctorsWithLocation.length}`);

        if (doctorsWithLocation.length === 0) {
            console.log('\nNo doctors have location data. You may need to seed the database.');
            console.log('Run: node src/scripts/seedData.js');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkData(); 
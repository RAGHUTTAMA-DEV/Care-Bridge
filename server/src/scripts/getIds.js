const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
require('dotenv').config();

const getIds = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get hospital
        const hospital = await Hospital.findOne({ name: 'Narayana Health City' });
        console.log('\nHospital:');
        console.log({
            name: hospital.name,
            id: hospital._id
        });

        // Get doctors
        const doctors = await User.find({ role: 'doctor' });
        console.log('\nDoctors:');
        doctors.forEach(doc => {
            console.log({
                name: `${doc.firstName} ${doc.lastName}`,
                id: doc._id,
                email: doc.email
            });
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

getIds(); 
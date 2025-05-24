const mongoose = require('mongoose');
const Queue = require('../models/Queue');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
require('dotenv').config();

const seedQueues = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get a test hospital and doctor
        const hospital = await Hospital.findOne({ name: 'Narayana Health City' });
        const doctor = await User.findOne({ role: 'doctor' });

        if (!hospital || !doctor) {
            console.error('Test hospital or doctor not found');
            process.exit(1);
        }

        // Create test queues
        const queues = [
            {
                hospital: hospital._id,
                doctor: doctor._id,
                date: new Date(),
                status: 'active',
                patients: [],
                averageWaitTime: 30
            },
            {
                hospital: hospital._id,
                doctor: doctor._id,
                date: new Date(Date.now() + 86400000), // Tomorrow
                status: 'active',
                patients: [],
                averageWaitTime: 30
            }
        ];

        // Clear existing queues
        await Queue.deleteMany({});
        console.log('Cleared existing queues');

        // Insert new queues
        const createdQueues = await Queue.insertMany(queues);
        console.log(`Created ${createdQueues.length} test queues`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding queues:', error);
        process.exit(1);
    }
};

// Run the seed function
seedQueues(); 
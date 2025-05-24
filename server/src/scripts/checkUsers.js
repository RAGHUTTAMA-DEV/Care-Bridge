const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const checkUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find().select('-password');
        console.log(`\nTotal users in database: ${users.length}`);

        console.log('\nUsers in database:');
        users.forEach(user => {
            console.log({
                id: user._id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                name: `${user.firstName} ${user.lastName}`,
                hospitalId: user.hospitalId
            });
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUsers(); 
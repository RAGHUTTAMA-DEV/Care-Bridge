const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const DoctorProfile = require('../models/DoctorProfile');

// Sample data
const hospitals = [
    {
        name: "Apollo Hospital",
        address: "154 Bannerghatta Road, Bangalore",
        location: {
            type: "Point",
            coordinates: [77.5946, 12.9716] // [longitude, latitude]
        },
        phone: "+91 80 2630 4050",
        email: "apollo.bangalore@apollohospitals.com"
    },
    {
        name: "Manipal Hospital",
        address: "98 HAL Airport Road, Bangalore",
        location: {
            type: "Point",
            coordinates: [77.6650, 12.9716]
        },
        phone: "+91 80 2502 4444",
        email: "bangalore@manipalhospitals.com"
    },
    {
        name: "Fortis Hospital",
        address: "154 Bannerghatta Road, Bangalore",
        location: {
            type: "Point",
            coordinates: [77.5848, 12.9279]
        },
        phone: "+91 80 6621 4444",
        email: "bangalore@fortishealthcare.com"
    },
    {
        name: "Narayana Health City",
        address: "258/A, Bommasandra Industrial Area, Hosur Road, Bangalore",
        location: {
            type: "Point",
            coordinates: [77.6646886, 12.8385278] // Same as user's location for testing
        },
        phone: "+91 80 2783 5000",
        email: "bangalore@narayanahealth.org"
    }
];

const doctors = [
    {
        user: {
            email: "dr.smith@example.com",
            password: "password123",
            firstName: "John",
            lastName: "Smith",
            role: "doctor",
            dob: new Date("1980-01-15"),
            address: "123 Doctor Lane, Bangalore",
            phone: "+91 9876543210"
        },
        profile: {
            specialization: "Cardiology",
            qualifications: [{
                degree: "MD",
                institution: "Harvard Medical School",
                year: 2010
            }],
            experience: 12,
            consultationFee: 1500,
            address: "123 Doctor Lane, Bangalore",
            availability: [
                {
                    day: "Monday",
                    startTime: "09:00",
                    endTime: "17:00",
                    isAvailable: true
                },
                {
                    day: "Wednesday",
                    startTime: "09:00",
                    endTime: "17:00",
                    isAvailable: true
                }
            ],
            languages: ["English", "Hindi"],
            bio: "Experienced cardiologist with expertise in interventional cardiology",
            location: {
                type: "Point",
                coordinates: [77.5946, 12.9716]
            }
        }
    },
    {
        user: {
            email: "dr.patel@example.com",
            password: "password123",
            firstName: "Priya",
            lastName: "Patel",
            role: "doctor",
            dob: new Date("1985-05-20"),
            address: "456 Medical Street, Bangalore",
            phone: "+91 9876543211"
        },
        profile: {
            specialization: "Pediatrics",
            qualifications: [{
                degree: "MD",
                institution: "AIIMS Delhi",
                year: 2012
            }],
            experience: 8,
            consultationFee: 1200,
            address: "456 Medical Street, Bangalore",
            availability: [
                {
                    day: "Tuesday",
                    startTime: "10:00",
                    endTime: "18:00",
                    isAvailable: true
                },
                {
                    day: "Thursday",
                    startTime: "10:00",
                    endTime: "18:00",
                    isAvailable: true
                }
            ],
            languages: ["English", "Hindi", "Kannada"],
            bio: "Pediatrician specializing in child development and nutrition",
            location: {
                type: "Point",
                coordinates: [77.6650, 12.9716]
            }
        }
    }
];

const patients = [
    {
        email: "patient1@example.com",
        password: "password123",
        firstName: "Rahul",
        lastName: "Kumar",
        role: "patient",
        dob: new Date("1990-08-15"),
        address: "789 Patient Street, Bangalore",
        phone: "+91 9876543212"
    },
    {
        email: "patient2@example.com",
        password: "password123",
        firstName: "Ananya",
        lastName: "Singh",
        role: "patient",
        dob: new Date("1995-03-25"),
        address: "321 Health Avenue, Bangalore",
        phone: "+91 9876543213"
    }
];

const staff = [
    {
        email: "staff1@example.com",
        password: "password123",
        firstName: "Admin",
        lastName: "User",
        role: "staff",
        dob: new Date("1988-12-10"),
        address: "555 Staff Road, Bangalore",
        phone: "+91 9876543214"
    }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Seed function
const seedDatabase = async () => {
    try {
        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Hospital.deleteMany({}),
            DoctorProfile.deleteMany({})
        ]);
        console.log('Cleared existing data');

        // Create hospitals
        const createdHospitals = await Hospital.insertMany(hospitals);
        console.log('Created hospitals');

        // Create staff and assign to first hospital
        const createdStaff = await Promise.all(
            staff.map(async (staffData) => {
                const user = await User.create({
                    ...staffData,
                    hospitalId: createdHospitals[0]._id
                });
                return user;
            })
        );
        console.log('Created staff');

        // Create doctors and their profiles
        const createdDoctors = await Promise.all(
            doctors.map(async (doctorData) => {
                const user = await User.create({
                    ...doctorData.user,
                    hospitalId: createdHospitals[0]._id
                });
                const profile = await DoctorProfile.create({
                    ...doctorData.profile,
                    user: user._id
                });
                return { user, profile };
            })
        );
        console.log('Created doctors');

        // Create patients
        const createdPatients = await Promise.all(
            patients.map(patientData => User.create(patientData))
        );
        console.log('Created patients');

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run the seed function
seedDatabase(); 
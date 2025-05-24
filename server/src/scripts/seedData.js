const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const Queue = require('../models/Queue');

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
            phone: "+91 9876543210",
            hospitalId: null // Will be set to Narayana Hospital ID
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
                coordinates: [77.6646886, 12.8385278] // Narayana Hospital coordinates
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
            phone: "+91 9876543211",
            hospitalId: null // Will be set to Narayana Hospital ID
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
                coordinates: [77.6646886, 12.8385278] // Narayana Hospital coordinates
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

// Sample appointment data
const appointments = [
    {
        appointmentTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        reason: "Regular checkup",
        status: "approved",
        approvalStatus: "approved",
        notes: "Patient requested a general health checkup",
        messages: [{
            message: "Please bring your previous medical records",
            isRead: true
        }]
    },
    {
        appointmentTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        reason: "Follow-up consultation",
        status: "pending",
        approvalStatus: "pending",
        notes: "Follow-up after previous treatment"
    },
    {
        appointmentTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        reason: "Cardiac consultation",
        status: "completed",
        approvalStatus: "approved",
        notes: "Regular cardiac checkup completed",
        messages: [{
            message: "Test results are normal",
            isRead: true
        }]
    }
];

// Update the queues array to include hospital-specific queues
const queues = [
    {
        // Narayana Hospital Queue
        hospitalId: null, // Will be set to Narayana Hospital ID
        date: new Date(),
        status: 'active',
        averageWaitTime: 45,
        patients: [
            {
                status: 'waiting',
                appointmentTime: new Date(Date.now() + 30 * 60000),
                priority: 1,
                reason: 'Regular checkup',
                estimatedWaitTime: 45
            },
            {
                status: 'in-progress',
                appointmentTime: new Date(),
                priority: 2,
                reason: 'Follow-up consultation',
                estimatedWaitTime: 30
            }
        ]
    },
    {
        // Fortis Hospital Queue
        hospitalId: null, // Will be set to Fortis Hospital ID
        date: new Date(),
        status: 'active',
        averageWaitTime: 30,
        patients: [
            {
                status: 'waiting',
                appointmentTime: new Date(Date.now() + 45 * 60000),
                priority: 1,
                reason: 'Cardiac consultation',
                estimatedWaitTime: 30
            }
        ]
    },
    {
        // Apollo Hospital Queue
        hospitalId: null, // Will be set to Apollo Hospital ID
        date: new Date(),
        status: 'active',
        averageWaitTime: 40,
        patients: [
            {
                status: 'waiting',
                appointmentTime: new Date(Date.now() + 60 * 60000),
                priority: 1,
                reason: 'General checkup',
                estimatedWaitTime: 40
            }
        ]
    },
    {
        // Manipal Hospital Queue
        hospitalId: null, // Will be set to Manipal Hospital ID
        date: new Date(),
        status: 'active',
        averageWaitTime: 35,
        patients: [
            {
                status: 'waiting',
                appointmentTime: new Date(Date.now() + 15 * 60000),
                priority: 1,
                reason: 'Pediatric consultation',
                estimatedWaitTime: 35
            }
        ]
    }
];

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
if (!process.env.MONGODB_URI) {
    console.error('MongoDB URI is not set in environment variables');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB successfully');
        return seedDatabase();
    })
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
            DoctorProfile.deleteMany({}),
            Appointment.deleteMany({}),
            Queue.deleteMany({})
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
        const narayanaHospital = createdHospitals.find(h => h.name === "Narayana Health City");
        if (!narayanaHospital) {
            throw new Error("Narayana Hospital not found in created hospitals");
        }

        const createdDoctors = await Promise.all(
            doctors.map(async (doctorData) => {
                const user = await User.create({
                    ...doctorData.user,
                    hospitalId: narayanaHospital._id // Assign all doctors to Narayana Hospital
                });
                const profile = await DoctorProfile.create({
                    ...doctorData.profile,
                    user: user._id
                });
                return { user, profile };
            })
        );
        console.log('Created doctors for Narayana Hospital');

        // Create patients
        const createdPatients = await Promise.all(
            patients.map(patientData => User.create(patientData))
        );
        console.log('Created patients');

        // Create appointments
        console.log('Starting to create appointments...');
        const createdAppointments = await Promise.all(
            appointments.map(async (appointmentData, index) => {
                console.log(`Creating appointment ${index + 1}:`, {
                    appointmentTime: appointmentData.appointmentTime,
                    status: appointmentData.status,
                    patient: createdPatients[index % createdPatients.length]._id,
                    doctor: createdDoctors[0].user._id,
                    hospital: createdHospitals[0]._id
                });

                const appointment = await Appointment.create({
                    ...appointmentData,
                    patient: createdPatients[index % createdPatients.length]._id,
                    doctor: createdDoctors[0].user._id, // Assign to first doctor
                    hospital: createdHospitals[0]._id, // Assign to first hospital
                    approvedBy: appointmentData.status === 'approved' ? createdStaff[0]._id : undefined, // Only set approvedBy for approved appointments
                    approvedAt: appointmentData.status === 'approved' ? new Date() : undefined,
                    messages: appointmentData.messages ? appointmentData.messages.map(msg => ({
                        ...msg,
                        sender: createdStaff[0]._id // Messages from staff
                    })) : []
                });

                console.log(`Created appointment ${index + 1}:`, {
                    id: appointment._id,
                    appointmentTime: appointment.appointmentTime,
                    status: appointment.status,
                    patient: appointment.patient,
                    doctor: appointment.doctor
                });

                return appointment;
            })
        );
        console.log(`Created ${createdAppointments.length} appointments`);

        // Create queues for each hospital
        console.log('Creating queues for all hospitals...');
        const createdQueues = await Promise.all(
            createdHospitals.map(async (hospital) => {
                // Find doctors for this hospital
                const hospitalDoctors = createdDoctors.filter(doc => 
                    doc.user.hospitalId.toString() === hospital._id.toString()
                );

                if (hospitalDoctors.length === 0) {
                    console.log(`No doctors found for ${hospital.name}, skipping queue creation`);
                    return [];
                }

                // Create queues for each doctor in this hospital
                const hospitalQueues = await Promise.all(
                    hospitalDoctors.map(async (doctor) => {
                        // Get queue template for this hospital
                        const queueTemplate = queues.find(q => 
                            q.hospitalId === null && 
                            (hospital.name.includes('Narayana') ? q.patients.length === 2 :
                             hospital.name.includes('Fortis') ? q.averageWaitTime === 30 :
                             hospital.name.includes('Apollo') ? q.averageWaitTime === 40 :
                             hospital.name.includes('Manipal') ? q.averageWaitTime === 35 : false)
                        );

                        if (!queueTemplate) {
                            console.log(`No queue template found for ${hospital.name}`);
                            return null;
                        }

                        // Assign patients to the queue
                        const queuePatients = queueTemplate.patients.map((patientData, pIndex) => ({
                            ...patientData,
                            patient: createdPatients[pIndex % createdPatients.length]._id
                        }));

                        const queue = await Queue.create({
                            ...queueTemplate,
                            hospital: hospital._id,
                            doctor: doctor.user._id,
                            patients: queuePatients,
                            status: 'active'
                        });

                        console.log(`Created queue for Dr. ${doctor.user.firstName} ${doctor.user.lastName} at ${hospital.name}:`, {
                            id: queue._id,
                            status: queue.status,
                            patientsCount: queue.patients.length,
                            averageWaitTime: queue.averageWaitTime,
                            waitingPatients: queue.patients.filter(p => p.status === 'waiting').length
                        });

                        return queue;
                    })
                );

                return hospitalQueues.filter(q => q !== null);
            })
        );

        // Flatten the array of queues
        const allQueues = createdQueues.flat();
        console.log(`Created ${allQueues.length} queues across all hospitals`);
        
        // Log queue distribution
        createdHospitals.forEach(hospital => {
            const hospitalQueues = allQueues.filter(q => q.hospital.toString() === hospital._id.toString());
            console.log(`${hospital.name} has ${hospitalQueues.length} active queues`);
        });

        // Verify queues were created
        const totalQueues = await Queue.countDocuments();
        console.log(`Total queues in database after seeding: ${totalQueues}`);

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}; 
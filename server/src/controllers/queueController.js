// Get queues for a hospital
exports.getHospitalQueues = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        console.log('Fetching queues for hospital:', hospitalId);

        const queues = await Queue.find({ hospitalId })
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialization qualifications experience consultationFee availability',
                populate: {
                    path: 'profile',
                    select: 'qualifications experience consultationFee availability'
                }
            })
            .populate({
                path: 'patients.patient',
                select: 'firstName lastName age gender phoneNumber'
            })
            .lean();

        console.log('Found queues:', queues.length);
        
        // Process queues to ensure doctor data is properly structured
        const processedQueues = queues.map(queue => {
            const doctorData = queue.doctor || {};
            return {
                ...queue,
                doctor: {
                    ...doctorData,
                    firstName: doctorData.firstName || 'Unknown',
                    lastName: doctorData.lastName || 'Doctor',
                    specialization: doctorData.specialization || 'General Medicine',
                    qualifications: doctorData.qualifications || [],
                    experience: doctorData.experience || 0,
                    consultationFee: doctorData.consultationFee || 0,
                    availability: doctorData.availability || {}
                },
                patients: queue.patients.map(p => ({
                    ...p,
                    patient: p.patient || { firstName: 'Unknown', lastName: 'Patient' }
                }))
            };
        });

        res.json(processedQueues);
    } catch (error) {
        console.error('Error fetching hospital queues:', error);
        res.status(500).json({ message: 'Error fetching hospital queues', error: error.message });
    }
};

// Get queue by ID
exports.getQueueById = async (req, res) => {
    try {
        const { queueId } = req.params;
        const queue = await Queue.findById(queueId)
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialization qualifications experience consultationFee availability',
                populate: {
                    path: 'profile',
                    select: 'qualifications experience consultationFee availability'
                }
            })
            .populate({
                path: 'patients.patient',
                select: 'firstName lastName age gender phoneNumber'
            });

        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        res.json(queue);
    } catch (error) {
        console.error('Error fetching queue:', error);
        res.status(500).json({ message: 'Error fetching queue', error: error.message });
    }
};

// Add patient to queue
exports.addPatientToQueue = async (req, res) => {
    try {
        const { queueId } = req.params;
        const { patientId, reason, appointmentTime, status = 'waiting', priority = 'normal' } = req.body;

        // Validate queue exists
        const queue = await Queue.findById(queueId);
        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        // Check if patient is already in any active queue
        const existingQueue = await Queue.findOne({
            'patients.patient': patientId,
            'patients.status': { $in: ['waiting', 'in_progress'] }
        });

        if (existingQueue) {
            return res.status(400).json({ 
                message: 'Patient is already in an active queue',
                queueId: existingQueue._id
            });
        }

        // Add patient to queue
        queue.patients.push({
            patient: patientId,
            status,
            priority,
            reason,
            appointmentTime: appointmentTime || new Date(),
            estimatedWaitTime: queue.averageWaitTime || 30
        });

        await queue.save();

        // Populate the updated queue
        const updatedQueue = await Queue.findById(queueId)
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialization qualifications experience consultationFee availability',
                populate: {
                    path: 'profile',
                    select: 'qualifications experience consultationFee availability'
                }
            })
            .populate({
                path: 'patients.patient',
                select: 'firstName lastName age gender phoneNumber'
            });

        res.json(updatedQueue);
    } catch (error) {
        console.error('Error adding patient to queue:', error);
        res.status(500).json({ message: 'Error adding patient to queue', error: error.message });
    }
};

// Update patient status in queue
exports.updatePatientStatus = async (req, res) => {
    try {
        const { queueId, patientId } = req.params;
        const { status } = req.body;

        const queue = await Queue.findById(queueId);
        if (!queue) {
            return res.status(404).json({ message: 'Queue not found' });
        }

        const patientIndex = queue.patients.findIndex(p => 
            p.patient.toString() === patientId
        );

        if (patientIndex === -1) {
            return res.status(404).json({ message: 'Patient not found in queue' });
        }

        queue.patients[patientIndex].status = status;
        await queue.save();

        // Populate the updated queue
        const updatedQueue = await Queue.findById(queueId)
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialization qualifications experience consultationFee availability',
                populate: {
                    path: 'profile',
                    select: 'qualifications experience consultationFee availability'
                }
            })
            .populate({
                path: 'patients.patient',
                select: 'firstName lastName age gender phoneNumber'
            });

        res.json(updatedQueue);
    } catch (error) {
        console.error('Error updating patient status:', error);
        res.status(500).json({ message: 'Error updating patient status', error: error.message });
    }
};

// Get doctor's queue
exports.getDoctorQueue = async (req, res) => {
    try {
        const { doctorId } = req.params;
        console.log('Fetching queue for doctor:', doctorId);

        // Validate doctorId
        if (!doctorId) {
            return res.status(400).json({ message: 'Doctor ID is required' });
        }

        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        console.log('Date range:', { startOfDay, endOfDay });

        // Find active queue for today
        const queue = await Queue.findOne({ 
            doctor: doctorId,
            status: 'active',
            date: {
                $gte: startOfDay,
                $lt: endOfDay
            }
        });

        if (!queue) {
            console.log('No active queue found for doctor:', doctorId);
            return res.json([]); // Return empty array instead of null
        }

        // Populate the queue data
        const populatedQueue = await Queue.findById(queue._id)
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialization qualifications experience consultationFee availability',
                populate: {
                    path: 'profile',
                    select: 'qualifications experience consultationFee availability'
                }
            })
            .populate({
                path: 'patients.patient',
                select: 'firstName lastName age gender phoneNumber'
            });

        if (!populatedQueue) {
            console.log('Queue not found after population:', queue._id);
            return res.json([]);
        }

        console.log('Found queue for doctor:', populatedQueue._id);
        
        // Process queue to ensure doctor data is properly structured
        const processedQueue = {
            ...populatedQueue.toObject(), // Convert to plain object
            doctor: {
                ...(populatedQueue.doctor || {}),
                firstName: populatedQueue.doctor?.firstName || 'Unknown',
                lastName: populatedQueue.doctor?.lastName || 'Doctor',
                specialization: populatedQueue.doctor?.specialization || 'General Medicine',
                qualifications: populatedQueue.doctor?.qualifications || [],
                experience: populatedQueue.doctor?.experience || 0,
                consultationFee: populatedQueue.doctor?.consultationFee || 0,
                availability: populatedQueue.doctor?.availability || {}
            },
            patients: (populatedQueue.patients || []).map(p => ({
                ...p,
                patient: p.patient || { firstName: 'Unknown', lastName: 'Patient' }
            }))
        };

        res.json([processedQueue]); // Return as array to maintain consistency
    } catch (error) {
        console.error('Error fetching doctor queue:', error);
        // Send more detailed error information
        res.status(500).json({ 
            message: 'Error fetching doctor queue', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}; 
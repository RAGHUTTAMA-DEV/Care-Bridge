import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { queueService, hospitalService } from '../../services/api';
import { initializeSocket, subscribeToQueueUpdates, disconnectSocket } from '../../services/socket';

// Error Boundary Component
class QueueManagementErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Queue Management Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="bg-red-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
                        <p className="mt-2 text-sm text-red-700">
                            {this.state.error?.message || 'An error occurred while managing queues'}
                        </p>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

const StaffQueueManagement = () => {
    const { user } = useAuth();
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeQueues, setActiveQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showCreateQueueModal, setShowCreateQueueModal] = useState(false);
    const [formData, setFormData] = useState({
        doctorId: '',
        date: new Date().toISOString().split('T')[0],
        maxPatients: 20
    });

    // Initialize socket connection
    useEffect(() => {
        if (user?.token) {
            initializeSocket(user.token);
        }
        return () => {
            disconnectSocket();
        };
    }, [user?.token]);

    // Subscribe to queue updates
    useEffect(() => {
        if (user?.hospitalId) {
            const unsubscribe = subscribeToQueueUpdates(user.hospitalId, (updatedQueue) => {
                console.log('Received queue update:', updatedQueue);
                setActiveQueues(prevQueues => {
                    const index = prevQueues.findIndex(q => q._id === updatedQueue._id);
                    if (index === -1) {
                        // New queue
                        return [...prevQueues, updatedQueue];
                    }
                    // Update existing queue
                    const newQueues = [...prevQueues];
                    newQueues[index] = updatedQueue;
                    return newQueues;
                });

                // Update pending requests
                setPendingRequests(prevRequests => {
                    const newRequests = prevRequests.filter(
                        request => request.queueId !== updatedQueue._id
                    );
                    const waitingPatients = updatedQueue.patients
                        .filter(patient => patient.status === 'waiting')
                        .map(patient => ({
                            ...patient,
                            queueId: updatedQueue._id,
                            doctor: updatedQueue.doctor,
                            patient: patient.patient || patient
                        }));
                    return [...newRequests, ...waitingPatients];
                });
            });

            return () => unsubscribe();
        }
    }, [user?.hospitalId]);

    useEffect(() => {
        if (user?.hospitalId) {
            fetchData();
        } else {
            setError('No hospital assigned to your account');
            setLoading(false);
        }
    }, [user, refreshTrigger]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch doctors in the hospital
            const doctorsResponse = await hospitalService.getHospitalDoctors(user.hospitalId);
            console.log('Raw doctors response:', doctorsResponse);
            
            // Handle different response formats for doctors
            let doctorsData = [];
            if (Array.isArray(doctorsResponse)) {
                doctorsData = doctorsResponse;
            } else if (doctorsResponse.doctors) {
                doctorsData = doctorsResponse.doctors;
            } else if (doctorsResponse.data) {
                doctorsData = doctorsResponse.data;
            }

            // Process doctor data to ensure consistent format
            doctorsData = doctorsData.map(doc => ({
                _id: doc._id,
                firstName: doc.firstName,
                lastName: doc.lastName,
                specialization: doc.profile?.specialization,
                hospitalId: doc.hospitalId,
                email: doc.email,
                phone: doc.phone,
                profile: doc.profile
            })).filter(doc => doc && doc._id && doc.hospitalId === user.hospitalId);

            console.log('Processed doctors data:', doctorsData);
            
            if (doctorsData.length === 0) {
                setError('No doctors found in this hospital');
            } else {
                setDoctors(doctorsData);
            }

            // Fetch active queues
            const queuesResponse = await queueService.getHospitalQueues(user.hospitalId);
            console.log('Queues response:', queuesResponse);
            
            // Handle different response formats for queues
            const queuesData = Array.isArray(queuesResponse) ? queuesResponse : 
                             (queuesResponse.data || []);
            
            // Filter and process active queues with safe defaults
            const activeQueues = queuesData
                .filter(queue => queue && queue.status === 'active')
                .map(queue => ({
                    ...queue,
                    doctor: queue.doctor || {},
                    patients: queue.patients || [],
                    waitingPatients: (queue.patients || []).filter(p => p?.status === 'waiting'),
                    inProgressPatients: (queue.patients || []).filter(p => p?.status === 'in_progress'),
                    completedPatients: (queue.patients || []).filter(p => p?.status === 'completed'),
                    waitingCount: (queue.patients || []).filter(p => p?.status === 'waiting').length,
                    inProgressCount: (queue.patients || []).filter(p => p?.status === 'in_progress').length,
                    completedCount: (queue.patients || []).filter(p => p?.status === 'completed').length,
                    averageWaitTime: queue.averageWaitTime || 30,
                    maxPatients: queue.maxPatients || 20
                }));
            
            console.log('Processed active queues:', activeQueues);
            setActiveQueues(activeQueues);

            // Get pending requests from active queues with safe defaults
            const pendingRequests = activeQueues.flatMap(queue => 
                (queue.patients || [])
                    .filter(patient => patient && patient.status === 'waiting')
                    .map(patient => ({
                        ...patient,
                        queueId: queue._id,
                        doctor: queue.doctor || {},
                        patient: patient.patient || patient,
                        position: (queue.patients || []).filter(p => p?.status === 'waiting').findIndex(p => p._id === patient._id) + 1,
                        estimatedWaitTime: patient.estimatedWaitTime || queue.averageWaitTime || 30
                    }))
            );
            console.log('Pending requests:', pendingRequests);
            setPendingRequests(pendingRequests);
        } catch (err) {
            console.error('Error fetching queue data:', err);
            setError(err.response?.data?.message || 'Failed to fetch queue data');
            // Set empty arrays as fallback
            setActiveQueues([]);
            setPendingRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchQueueData = async () => {
        try {
            setLoading(true);
            setError('');

            // Get active queues for the hospital
            const queuesResponse = await queueService.getHospitalQueues(user.hospitalId);
            console.log('Raw queues response:', queuesResponse);
            
            // Handle different response formats
            const queuesData = Array.isArray(queuesResponse) ? queuesResponse : 
                             (queuesResponse.data || []);
            
            // Process queues with better status handling
            const processedQueues = queuesData.map(queue => {
                const patients = queue.patients || [];
                const waitingPatients = patients.filter(p => p.status === 'waiting');
                const inProgressPatients = patients.filter(p => p.status === 'in_progress');
                const completedPatients = patients.filter(p => p.status === 'completed');
                
                return {
                    ...queue,
                    currentPatient: inProgressPatients[0] || null,
                    waitingPatients,
                    inProgressPatients,
                    completedPatients,
                    waitingCount: waitingPatients.length,
                    inProgressCount: inProgressPatients.length,
                    completedCount: completedPatients.length,
                    averageWaitTime: queue.averageWaitTime || 30,
                    lastUpdated: new Date()
                };
            });

            console.log('Processed queues:', processedQueues);
            setActiveQueues(processedQueues);

            // Update pending requests
            const pendingRequests = processedQueues.flatMap(queue => 
                queue.waitingPatients.map(patient => ({
                    ...patient,
                    queueId: queue._id,
                    doctor: queue.doctor,
                    patient: patient.patient || patient,
                    position: queue.waitingPatients.findIndex(p => p._id === patient._id) + 1,
                    estimatedWaitTime: patient.estimatedWaitTime || queue.averageWaitTime,
                    hospitalName: queue.hospitalName || 'Unknown Hospital'
                }))
            );
            
            console.log('Pending requests:', pendingRequests);
            setPendingRequests(pendingRequests);
        } catch (err) {
            console.error('Error fetching queue data:', err);
            setError(err.response?.data?.message || 'Failed to fetch queue data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveRequest = async (queueId, patientId) => {
        try {
            setError('');
            console.log('Approving request:', { queueId, patientId });
            await queueService.updatePatientStatus(queueId, patientId, 'in_progress');
            setRefreshTrigger(prev => prev + 1); // Trigger refresh
            setError('Request approved successfully');
        } catch (err) {
            console.error('Error approving request:', err);
            setError(err.response?.data?.message || 'Failed to approve request');
        }
    };

    const handleRejectRequest = async (queueId, patientId) => {
        try {
            setError('');
            console.log('Rejecting request:', { queueId, patientId });
            await queueService.updatePatientStatus(queueId, patientId, 'cancelled');
            setRefreshTrigger(prev => prev + 1); // Trigger refresh
            setError('Request rejected successfully');
        } catch (err) {
            console.error('Error rejecting request:', err);
            setError(err.response?.data?.message || 'Failed to reject request');
        }
    };

    const handleUpdateQueueStatus = async (queueId, status) => {
        try {
            setError('');
            console.log('Updating queue status:', { queueId, status });
            
            // Validate status before sending
            const validStatuses = ['active', 'paused', 'closed'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
            }

            // Find queue in local state to verify it exists
            const queue = activeQueues.find(q => q._id === queueId);
            if (!queue) {
                throw new Error('Queue not found');
            }

            // Verify user has permission
            if (user.role === 'staff' && user.hospitalId !== queue.hospital) {
                throw new Error('You do not have permission to update this queue');
            }
            if (user.role === 'doctor' && user._id !== queue.doctor._id) {
                throw new Error('You do not have permission to update this queue');
            }

            // If closing queue, confirm with user
            if (status === 'closed' && queue.patients.some(p => p.status === 'waiting')) {
                const confirmed = window.confirm(
                    'Closing the queue will cancel all waiting patients. Are you sure you want to proceed?'
                );
                if (!confirmed) {
                    return;
                }
            }

            const response = await queueService.updateQueueStatus(queueId, status);
            console.log('Queue status update response:', response);
            
            // Update local state with the response data
            setActiveQueues(prevQueues => 
                prevQueues.map(queue => 
                    queue._id === queueId ? response : queue
                )
            );
            
            setError('Queue status updated successfully');
        } catch (err) {
            console.error('Error updating queue status:', err);
            // Handle specific error cases
            if (err.response?.status === 403) {
                setError('You do not have permission to update this queue');
            } else if (err.response?.status === 404) {
                setError('Queue not found');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err.message) {
                setError(err.message);
            } else {
                setError('Failed to update queue status');
            }
        }
    };

    const handleDoctorSelect = (doctorId) => {
        setSelectedDoctor(doctorId || null);
    };

    const handleCreateQueue = async (e) => {
        e.preventDefault();
        try {
            setError('');
            if (!formData.doctorId) {
                throw new Error('Please select a doctor');
            }
            
            const queueData = {
                hospitalId: user.hospitalId,
                doctorId: formData.doctorId,
                date: new Date(formData.date).toISOString()
            };
            
            console.log('Creating queue with data:', queueData);
            const response = await queueService.createQueue(queueData);
            console.log('Queue creation response:', response);
            
            setShowCreateQueueModal(false);
            setFormData({
                doctorId: '',
                date: new Date().toISOString().split('T')[0],
                maxPatients: 20
            });
            setRefreshTrigger(prev => prev + 1);
            setError('Queue created successfully');
        } catch (err) {
            console.error('Queue creation error:', err);
            setError(err.response?.data?.message || 'Failed to create queue');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <QueueManagementErrorBoundary>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg">
                    {/* Header */}
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                    Queue Management
                                </h3>
                                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                    Manage patient queue requests and active queues
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateQueueModal(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Create New Queue
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className={`p-4 ${
                            error.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                            {error}
                        </div>
                    )}

                    {/* Create Queue Modal */}
                    {showCreateQueueModal && (
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Queue</h3>
                                <form onSubmit={handleCreateQueue}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Select Doctor
                                            </label>
                                            <select
                                                name="doctorId"
                                                value={formData.doctorId}
                                                onChange={handleInputChange}
                                                required
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                            >
                                                <option value="">Select a doctor</option>
                                                {doctors.map((doctor) => {
                                                    const hasActiveQueue = activeQueues.some(queue => 
                                                        queue.doctor?._id === doctor._id && queue.status === 'active'
                                                    );
                                                    return (
                                                        <option 
                                                            key={doctor._id} 
                                                            value={doctor._id}
                                                            disabled={hasActiveQueue}
                                                        >
                                                            Dr. {doctor.firstName} {doctor.lastName} 
                                                            {doctor.specialization ? ` - ${doctor.specialization}` : ''}
                                                            {hasActiveQueue ? ' (Has Active Queue)' : ''}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleInputChange}
                                                required
                                                min={new Date().toISOString().split('T')[0]}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Maximum Patients
                                            </label>
                                            <input
                                                type="number"
                                                name="maxPatients"
                                                value={formData.maxPatients}
                                                onChange={handleInputChange}
                                                min="1"
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateQueueModal(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Create Queue
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Doctor Selection */}
                    <div className="p-4 border-b border-gray-200">
                        <label className="block text-sm font-medium text-gray-700">Filter by Doctor</label>
                        <select
                            value={selectedDoctor || ''}
                            onChange={(e) => handleDoctorSelect(e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            <option value="">All Doctors</option>
                            {doctors.map((doctor) => {
                                const hasActiveQueue = activeQueues.some(queue => 
                                    queue.doctor?._id === doctor._id && queue.status === 'active'
                                );
                                return (
                                    <option key={doctor._id} value={doctor._id}>
                                        Dr. {doctor.firstName} {doctor.lastName} 
                                        {doctor.specialization ? ` - ${doctor.specialization}` : ''}
                                        {hasActiveQueue ? ' (Has Active Queue)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                        {doctors.length === 0 && !loading && (
                            <p className="mt-2 text-sm text-red-600">
                                No doctors available in this hospital
                            </p>
                        )}
                    </div>

                    {/* Pending Requests */}
                    <div className="p-4">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Pending Requests</h4>
                        {pendingRequests.length === 0 ? (
                            <p className="text-gray-500">No pending requests</p>
                        ) : (
                            <div className="space-y-4">
                                {pendingRequests
                                    .filter(request => !selectedDoctor || request.doctor?._id === selectedDoctor)
                                    .map((request) => (
                                        <div key={`${request.queueId}-${request._id}`} className="bg-gray-50 p-4 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">
                                                        {request.patient?.firstName || request.firstName} {request.patient?.lastName || request.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Doctor: Dr. {request.doctor?.firstName} {request.doctor?.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Requested: {new Date(request.appointmentTime || request.requestedAt).toLocaleString()}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Reason: {request.reason}
                                                    </p>
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleApproveRequest(request.queueId, request._id)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(request.queueId, request._id)}
                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Active Queues */}
                    <div className="p-4 border-t border-gray-200">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Active Queues</h4>
                        {!activeQueues || activeQueues.length === 0 ? (
                            <p className="text-gray-500">No active queues</p>
                        ) : (
                            <div className="space-y-4">
                                {activeQueues
                                    .filter(queue => !selectedDoctor || queue.doctor?._id === selectedDoctor)
                                    .map((queue) => (
                                        <div key={queue._id} className="bg-gray-50 p-4 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">
                                                        Dr. {queue.doctor?.firstName || 'Unknown'} {queue.doctor?.lastName || 'Doctor'}
                                                        {queue.doctor?.specialization && 
                                                            <span className="text-gray-500"> - {queue.doctor.specialization}</span>
                                                        }
                                                    </p>
                                                    <div className="mt-2 grid grid-cols-3 gap-4">
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-gray-500">Waiting</p>
                                                            <p className="text-lg font-semibold text-blue-600">{queue.waitingCount || 0}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-gray-500">In Progress</p>
                                                            <p className="text-lg font-semibold text-yellow-600">{queue.inProgressCount || 0}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-gray-500">Completed</p>
                                                            <p className="text-lg font-semibold text-green-600">{queue.completedCount || 0}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end space-y-2">
                                                    <div className="text-sm text-gray-500">
                                                        Status: <span className={`font-medium ${
                                                            queue.status === 'active' ? 'text-green-600' : 
                                                            queue.status === 'paused' ? 'text-yellow-600' : 
                                                            'text-red-600'
                                                        }`}>
                                                            {queue.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        {queue.status === 'active' && (
                                                            <button
                                                                onClick={() => handleUpdateQueueStatus(queue._id, 'paused')}
                                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
                                                            >
                                                                Pause Queue
                                                            </button>
                                                        )}
                                                        {queue.status === 'paused' && (
                                                            <button
                                                                onClick={() => handleUpdateQueueStatus(queue._id, 'active')}
                                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                                                            >
                                                                Resume Queue
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleUpdateQueueStatus(queue._id, 'closed')}
                                                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                                                        >
                                                            Close Queue
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Current Patient */}
                                            {queue.currentPatient && (
                                                <div className="mt-4 border-t border-gray-200 pt-4">
                                                    <h5 className="text-sm font-medium text-gray-900 mb-2">Current Patient</h5>
                                                    <div className="bg-blue-50 p-3 rounded-lg">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-medium text-blue-900">
                                                                    {queue.currentPatient.patient?.firstName} {queue.currentPatient.patient?.lastName}
                                                                </p>
                                                                <p className="text-sm text-blue-700">
                                                                    Reason: {queue.currentPatient.reason}
                                                                </p>
                                                                <p className="text-sm text-blue-700">
                                                                    Started: {new Date(queue.currentPatient.startedAt || queue.currentPatient.appointmentTime).toLocaleTimeString()}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleApproveRequest(queue._id, queue.currentPatient._id, 'completed')}
                                                                className="text-sm text-green-600 hover:text-green-800"
                                                            >
                                                                Complete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Waiting Patients */}
                                            {queue.waitingPatients.length > 0 && (
                                                <div className="mt-4 border-t border-gray-200 pt-4">
                                                    <h5 className="text-sm font-medium text-gray-900 mb-2">Waiting Patients</h5>
                                                    <div className="space-y-2">
                                                        {queue.waitingPatients.map((patient, index) => (
                                                            <div key={patient._id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {patient.patient?.firstName} {patient.patient?.lastName}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500">
                                                                        Position: {index + 1} • Est. Wait: {patient.estimatedWaitTime || queue.averageWaitTime} mins
                                                                    </p>
                                                                    <p className="text-sm text-gray-500">
                                                                        Reason: {patient.reason}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500">
                                                                        Joined: {new Date(patient.appointmentTime).toLocaleTimeString()}
                                                                    </p>
                                                                </div>
                                                                <div className="flex space-x-2">
                                                                    <button
                                                                        onClick={() => handleApproveRequest(queue._id, patient._id)}
                                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                                    >
                                                                        Start
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRejectRequest(queue._id, patient._id)}
                                                                        className="text-xs text-red-600 hover:text-red-800"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </QueueManagementErrorBoundary>
    );
};

export default StaffQueueManagement; 
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { queueService, hospitalService } from '../../services/api';

// Error Boundary Component
class QueueErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Queue Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="bg-red-50 p-4 rounded-lg">
                        <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
                        <p className="mt-2 text-sm text-red-700">
                            {this.state.error?.message || 'An error occurred while loading the queue'}
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

const JoinQueue = () => {
    const { user } = useAuth();
    const [hospitals, setHospitals] = useState([]);
    const [activeQueues, setActiveQueues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [requestReason, setRequestReason] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedQueue, setSelectedQueue] = useState(null);
    const [locationPermission, setLocationPermission] = useState('prompt'); // 'prompt', 'granted', 'denied'
    const [successMessage, setSuccessMessage] = useState('');
    const [appointmentTime, setAppointmentTime] = useState(null);

    const fetchNearbyHospitals = async (latitude, longitude) => {
        try {
            setLoading(true);
            setError('');

            console.log('Fetching hospitals with coordinates:', { latitude, longitude });

            // Fetch nearby hospitals with proper parameters
            const response = await hospitalService.getNearbyHospitals(
                latitude,
                longitude,
                10000 // maxDistance in meters (10km)
            );

            console.log('Raw hospital API Response:', response);

            // Fix: Handle different response formats
            let hospitalsData = [];
            if (Array.isArray(response)) {
                hospitalsData = response;
            } else if (response?.data) {
                if (Array.isArray(response.data)) {
                    hospitalsData = response.data;
                } else if (response.data.data && Array.isArray(response.data.data)) {
                    hospitalsData = response.data.data;
                } else if (typeof response.data === 'object') {
                    hospitalsData = [response.data];
                }
            }
            
            console.log('Processed hospitalsData:', hospitalsData);
            console.log('hospitalsData length:', hospitalsData.length);

            if (hospitalsData.length > 0) {
                setHospitals(hospitalsData);

                // Fetch active queues for each hospital
                console.log('Fetching queues for hospitals...');
                const queuesPromises = hospitalsData.map(async hospital => {
                    try {
                        const queueResponse = await queueService.getHospitalQueues(hospital._id);
                        // Handle different response formats
                        const queuesData = Array.isArray(queueResponse) ? queueResponse : 
                                         (queueResponse.data || []);
                        
                        // Filter for active queues and add hospital info
                        const activeQueues = queuesData
                            .filter(queue => queue.status === 'active')
                            .map(queue => ({
                                ...queue,
                                hospitalId: hospital._id,
                                hospitalName: hospital.name,
                                doctor: queue.doctor || {},
                                patients: queue.patients || []
                            }));
                        
                        console.log(`Active queues for ${hospital.name}:`, activeQueues);
                        return activeQueues;
                    } catch (err) {
                        console.error(`Error fetching queues for hospital ${hospital._id}:`, err);
                        return [];
                    }
                });

                const queuesResponses = await Promise.all(queuesPromises);
                const allQueues = queuesResponses.flat();
                console.log('All processed queues:', allQueues);
                setActiveQueues(allQueues);
            } else {
                console.log('No hospitals found in the area');
                setHospitals([]);
                setActiveQueues([]);
            }
        } catch (err) {
            console.error('Error fetching hospitals:', err);
            setError(err.message || 'Failed to fetch nearby hospitals');
            setHospitals([]);
            setActiveQueues([]);
        } finally {
            setLoading(false);
        }
    };

    const handleGetLocation = async () => {
        try {
            setError('');
            setLoading(true);
            
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                );
            });

            if (!position?.coords?.latitude || !position?.coords?.longitude) {
                throw new Error('Invalid location data received');
            }

            setLocationPermission('granted');
            await fetchNearbyHospitals(
                position.coords.latitude,
                position.coords.longitude
            );
        } catch (err) {
            console.error('Error getting location:', err);
            setLocationPermission('denied');
            setError(err.message || 'Please enable location access to find nearby hospitals');
            setHospitals([]);
            setActiveQueues([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestJoinQueue = async (queueId) => {
        try {
            setError('');
            setLoading(true);

            // Validate user is logged in
            if (!user) {
                throw new Error('Please log in to join a queue');
            }

            // Validate request reason
            if (!requestReason.trim()) {
                throw new Error('Please provide a reason for your visit');
            }

            // Find the queue in active queues
            const queue = activeQueues.find(q => q._id === queueId);
            if (!queue) {
                throw new Error('Queue not found');
            }

            // Check if queue is active
            if (queue.status !== 'active') {
                throw new Error(`Cannot join queue - queue is ${queue.status}`);
            }

            // Check if user is already in any queue
            const existingQueue = activeQueues.find(q => 
                q.patients.some(p => 
                    (p.patient?._id === user._id || p.patient === user._id) && 
                    ['waiting', 'in_progress'].includes(p.status)
                )
            );

            if (existingQueue) {
                const patientInQueue = existingQueue.patients.find(p => 
                    (p.patient?._id === user._id || p.patient === user._id)
                );
                
                if (existingQueue._id === queueId) {
                    throw new Error(`You are already in this queue (status: ${patientInQueue.status})`);
                } else {
                    throw new Error(`You are already in another queue for Dr. ${existingQueue.doctor.firstName} ${existingQueue.doctor.lastName} (status: ${patientInQueue.status})`);
                }
            }

            // Check queue capacity
            const waitingCount = queue.patients.filter(p => p.status === 'waiting').length;
            if (waitingCount >= (queue.maxPatients || 20)) {
                throw new Error('Queue is at maximum capacity. Please try again later.');
            }

            console.log('Requesting to join queue:', {
                queueId,
                patientId: user._id,
                reason: requestReason,
                appointmentTime: appointmentTime || new Date()
            });

            const response = await queueService.addPatientToQueue(
                queueId,
                user._id,
                requestReason.trim(),
                appointmentTime || new Date()
            );

            console.log('Queue join response:', response);

            // Validate response
            if (!response || !response._id) {
                throw new Error('Invalid response from server');
            }

            // Update local state
            setActiveQueues(prevQueues => 
                prevQueues.map(q => 
                    q._id === queueId ? response : q
                )
            );

            // Show success message and close modal
            setSuccessMessage('Successfully joined the queue!');
            setShowRequestModal(false);
            setRequestReason('');
            setAppointmentTime(null);
            setSelectedQueue(null);

            // Clear success message after 5 seconds
            setTimeout(() => {
                setSuccessMessage('');
            }, 5000);

        } catch (err) {
            console.error('Error joining queue:', err);
            // Handle specific error cases
            if (err.response?.status === 400) {
                setError(err.response.data.message || 'Invalid request');
            } else if (err.response?.status === 403) {
                setError('You do not have permission to join this queue');
            } else if (err.response?.status === 404) {
                setError('Queue not found');
            } else if (err.message) {
                setError(err.message);
            } else {
                setError('Failed to join queue. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const openRequestModal = (queue) => {
        setSelectedQueue(queue);
        setShowRequestModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <QueueErrorBoundary>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg">
                    {/* Header */}
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Join Queue
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            View and join queues from nearby hospitals
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">
                                        {error}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-green-700">
                                        {successMessage}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Location Permission Section */}
                    {locationPermission === 'prompt' && (
                        <div className="p-4 border-b border-gray-200">
                            <div className="text-center">
                                <p className="text-gray-600 mb-4">
                                    To find nearby hospitals, we need access to your location
                                </p>
                                <button
                                    onClick={handleGetLocation}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Find Nearby Hospitals
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="p-4 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p className="mt-2 text-sm text-gray-500">Loading nearby hospitals...</p>
                        </div>
                    )}

                    {/* Hospitals and Queues List */}
                    {!loading && locationPermission === 'granted' && (
                        <div className="p-4">
                            {hospitals.length === 0 ? (
                                <p className="text-gray-500">No nearby hospitals found</p>
                            ) : (
                                <div className="space-y-6">
                                    {hospitals.map((hospital) => (
                                        <div key={hospital._id} className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="text-lg font-medium text-gray-900 mb-4">
                                                {hospital.name}
                                            </h4>
                                            <p className="text-sm text-gray-500 mb-4">
                                                {hospital.address}
                                            </p>
                                            
                                            {/* Hospital's Active Queues */}
                                            <div className="space-y-4">
                                                {activeQueues
                                                    .filter(queue => queue.hospitalId === hospital._id)
                                                    .length > 0 ? (
                                                    activeQueues
                                                        .filter(queue => queue.hospitalId === hospital._id)
                                                        .map((queue) => {
                                                            const waitingCount = queue.patients.filter(p => p.status === 'waiting').length;
                                                            const isUserInQueue = queue.patients.some(p => 
                                                                (p.patient?._id === user?._id || p.patient === user?._id) && 
                                                                ['waiting', 'in_progress'].includes(p.status)
                                                            );
                                                            
                                                            return (
                                                                <div key={queue._id} className="bg-white p-4 rounded-lg shadow">
                                                                    <div className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-medium">
                                                                                Dr. {queue.doctor.firstName} {queue.doctor.lastName}
                                                                                {queue.doctor.specialization && 
                                                                                    <span className="text-gray-500"> - {queue.doctor.specialization}</span>
                                                                                }
                                                                            </p>
                                                                            <div className="mt-2 grid grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <p className="text-sm text-gray-500">
                                                                                        Waiting Patients: {waitingCount}
                                                                                    </p>
                                                                                    <p className="text-sm text-gray-500">
                                                                                        Est. Wait Time: {queue.averageWaitTime} mins
                                                                                    </p>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm text-gray-500">
                                                                                        Status: <span className={`font-medium ${
                                                                                            queue.status === 'active' ? 'text-green-600' : 
                                                                                            queue.status === 'paused' ? 'text-yellow-600' : 
                                                                                            'text-red-600'
                                                                                        }`}>
                                                                                            {queue.status}
                                                                                        </span>
                                                                                    </p>
                                                                                    {isUserInQueue && (
                                                                                        <p className="text-sm text-blue-600 font-medium">
                                                                                            You are in this queue
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => openRequestModal(queue)}
                                                                            disabled={queue.status !== 'active' || isUserInQueue}
                                                                            className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white 
                                                                                ${queue.status === 'active' && !isUserInQueue 
                                                                                    ? 'bg-blue-600 hover:bg-blue-700' 
                                                                                    : 'bg-gray-400 cursor-not-allowed'}`}
                                                                        >
                                                                            {isUserInQueue ? 'Already in Queue' : 'Request to Join'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic">
                                                        No active queues at this hospital at the moment
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Location Denied Message */}
                    {locationPermission === 'denied' && (
                        <div className="p-4 text-center">
                            <p className="text-red-600 mb-4">
                                Location access is required to find nearby hospitals
                            </p>
                            <button
                                onClick={handleGetLocation}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Request Modal */}
                {showRequestModal && selectedQueue && (
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Request to Join Queue
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Please provide a reason for joining the queue:
                            </p>
                            <textarea
                                value={requestReason}
                                onChange={(e) => setRequestReason(e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                rows="3"
                                placeholder="Enter your reason for joining the queue..."
                            />
                            <div className="mt-4 flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleRequestJoinQueue(selectedQueue._id)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </QueueErrorBoundary>
    );
};

export default JoinQueue; 
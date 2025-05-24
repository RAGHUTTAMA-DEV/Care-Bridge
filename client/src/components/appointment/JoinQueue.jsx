import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { queueService, hospitalService } from '../../services/api';

// Enhanced Error Boundary Component
class QueueErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null,
            errorInfo: null,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Queue Error:', error, errorInfo);
        this.setState({ errorInfo });
        
        // Log error to monitoring service if available
        if (window.errorReportingService) {
            window.errorReportingService.logError(error, {
                component: 'JoinQueue',
                errorInfo
            });
        }
    }

    handleRetry = () => {
        this.setState({ 
            hasError: false, 
            error: null, 
            errorInfo: null,
            retryCount: this.state.retryCount + 1 
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <div className="text-center">
                            <svg 
                                className="mx-auto h-12 w-12 text-red-500" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                                />
                            </svg>
                            <h3 className="mt-4 text-lg font-medium text-gray-900">
                                Something went wrong
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">
                                {this.state.error?.message || 'An error occurred while loading the queue'}
                            </p>
                            {this.state.errorInfo && (
                                <details className="mt-4 text-left">
                                    <summary className="text-sm text-gray-500 cursor-pointer">
                                        Error Details
                                    </summary>
                                    <pre className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-auto">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}
                            <div className="mt-6">
                                <button
                                    onClick={this.handleRetry}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
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
    const [hospitalQueues, setHospitalQueues] = useState({}); // Map of hospitalId to queues
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [requestReason, setRequestReason] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedQueue, setSelectedQueue] = useState(null);
    const [locationPermission, setLocationPermission] = useState('prompt'); // 'prompt', 'granted', 'denied'
    const [successMessage, setSuccessMessage] = useState('');
    const [appointmentTime, setAppointmentTime] = useState(null);
    const [lastUpdates, setLastUpdates] = useState({}); // Map of hospitalId to last update time

    // Add error handling wrapper for async operations
    const safeAsyncOperation = async (operation, errorMessage) => {
        try {
            return await operation();
        } catch (error) {
            console.error(errorMessage, error);
            setError(error.message || errorMessage);
            throw error; // Re-throw to be caught by error boundary
        }
    };

    // Fetch active queues for a hospital
    const fetchActiveQueues = async (hospitalId) => {
        return safeAsyncOperation(
            async () => {
                console.log('Fetching active queues for hospital:', hospitalId);
                const response = await queueService.getHospitalQueues(hospitalId);
                
                if (!response) {
                    throw new Error('No response received from server');
                }
                
                // Process the queue data - handle different response formats
                let queueData = [];
                if (Array.isArray(response)) {
                    queueData = response;
                } else if (response && typeof response === 'object') {
                    if (Array.isArray(response.data)) {
                        queueData = response.data;
                    } else if (response.data && typeof response.data === 'object') {
                        queueData = [response.data];
                    } else if (response.queues && Array.isArray(response.queues)) {
                        queueData = response.queues;
                    }
                }
                
                console.log('Processed queue data:', queueData);
                
                // Filter active queues and process them
                const activeQueues = queueData
                    .filter(queue => {
                        if (!queue) return false;
                        const isActive = queue.status === 'active';
                        const hasPatients = Array.isArray(queue.patients) && queue.patients.length > 0;
                        const hasDoctor = queue.doctor && (typeof queue.doctor === 'object' || typeof queue.doctor === 'string');
                        console.log(`Queue ${queue._id} status:`, { isActive, hasPatients, hasDoctor });
                        return isActive && hasPatients && hasDoctor;
                    })
                    .map(queue => {
                        // Ensure doctor data is properly populated
                        const doctorData = typeof queue.doctor === 'object' ? queue.doctor : 
                            (queue.doctorDetails || { firstName: 'Unknown', lastName: 'Doctor' });
                        
                        return {
                            ...queue,
                            waitingCount: queue.patients.filter(p => 
                                ['waiting', 'scheduled'].includes(p.status)
                            ).length,
                            estimatedWaitTime: queue.averageWaitTime || 30,
                            doctorName: doctorData.firstName ? 
                                `${doctorData.firstName} ${doctorData.lastName || ''}` : 
                                'Unknown Doctor',
                            specialization: doctorData.specialization || 'General Medicine',
                            doctor: doctorData
                        };
                    });

                console.log('Active queues for hospital:', hospitalId, activeQueues);
                return activeQueues;
            },
            `Failed to fetch queues for hospital ${hospitalId}`
        );
    };

    // Fetch all hospitals and their queues
    const fetchAllHospitalsAndQueues = async () => {
        return safeAsyncOperation(
            async () => {
                setLoading(true);
                setError('');

                // Fetch all hospitals
                const response = await hospitalService.getAllHospitals();
                console.log('Raw hospital API Response:', response);

                // Handle different response formats
                let hospitalsData = [];
                if (Array.isArray(response)) {
                    hospitalsData = response;
                } else if (response && typeof response === 'object') {
                    if (Array.isArray(response.data)) {
                        hospitalsData = response.data;
                    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                        hospitalsData = response.data.data;
                    } else if (response.data && typeof response.data === 'object') {
                        hospitalsData = [response.data];
                    } else if (response.hospitals && Array.isArray(response.hospitals)) {
                        hospitalsData = response.hospitals;
                    }
                }
                
                console.log('Processed hospitalsData:', hospitalsData);
                
                if (hospitalsData.length > 0) {
                    setHospitals(hospitalsData);

                    // Fetch active queues for each hospital
                    const queuePromises = hospitalsData.map(async hospital => {
                        try {
                            const queues = await fetchActiveQueues(hospital._id);
                            return { hospitalId: hospital._id, queues };
                        } catch (err) {
                            console.error(`Error fetching queues for hospital ${hospital._id}:`, err);
                            return { hospitalId: hospital._id, queues: [] };
                        }
                    });

                    const queueResults = await Promise.all(queuePromises);
                    const newHospitalQueues = {};
                    const newLastUpdates = {};
                    
                    queueResults.forEach(({ hospitalId, queues }) => {
                        newHospitalQueues[hospitalId] = queues;
                        newLastUpdates[hospitalId] = Date.now();
                    });

                    setHospitalQueues(newHospitalQueues);
                    setLastUpdates(newLastUpdates);
                } else {
                    console.log('No hospitals found');
                    setHospitals([]);
                    setHospitalQueues({});
                }
            },
            'Failed to fetch hospitals and queues'
        );
    };

    // Set up polling for queue updates
    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            if (!mounted) return;
            try {
                await fetchAllHospitalsAndQueues();
            } catch (error) {
                if (mounted) {
                    console.error('Error in initial data fetch:', error);
                }
            }
        };

        fetchData();
        const pollInterval = setInterval(fetchData, 5000);

        return () => {
            mounted = false;
            clearInterval(pollInterval);
        };
    }, []);

    const handleGetLocation = async () => {
        return safeAsyncOperation(
            async () => {
                setError('');
                setLoading(true);
                
                // First check if geolocation is supported
                if (!navigator.geolocation) {
                    throw new Error('Geolocation is not supported by your browser. Please use a modern browser to access this feature.');
                }

                // Check if we already have location permission
                if (navigator.permissions && navigator.permissions.query) {
                    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
                    if (permissionStatus.state === 'denied') {
                        throw new Error('Location access was denied. Please enable location access in your browser settings to find nearby hospitals.');
                    }
                }

                const position = await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('Location request is taking longer than expected. Please check your internet connection and try again.'));
                    }, 15000);

                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            clearTimeout(timeoutId);
                            resolve(pos);
                        },
                        (err) => {
                            clearTimeout(timeoutId);
                            let errorMessage;
                            switch (err.code) {
                                case err.PERMISSION_DENIED:
                                    errorMessage = 'Location access was denied. Please enable location access in your browser settings.';
                                    break;
                                case err.POSITION_UNAVAILABLE:
                                    errorMessage = 'Location information is unavailable. Please check your device\'s location services.';
                                    break;
                                case err.TIMEOUT:
                                    errorMessage = 'Location request timed out. Please check your internet connection.';
                                    break;
                                default:
                                    errorMessage = 'An error occurred while getting your location.';
                            }
                            reject(new Error(errorMessage));
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 0
                        }
                    );
                });

                if (!position?.coords?.latitude || !position?.coords?.longitude) {
                    throw new Error('Invalid location data received. Please try again.');
                }

                setLocationPermission('granted');
                await fetchAllHospitalsAndQueues();

                // Store the location in localStorage for future use
                localStorage.setItem('lastKnownLocation', JSON.stringify({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: Date.now()
                }));
            },
            'Failed to get location'
        );
    };

    // Add a useEffect to try using last known location on mount
    useEffect(() => {
        const tryLastKnownLocation = async () => {
            const lastKnownLocation = localStorage.getItem('lastKnownLocation');
            if (lastKnownLocation) {
                const { latitude, longitude, timestamp } = JSON.parse(lastKnownLocation);
                // Only use if less than 1 hour old
                if (Date.now() - timestamp < 3600000) {
                    try {
                        await fetchAllHospitalsAndQueues();
                        setError('Using your last known location. For more accurate results, please enable location access.');
                        setLocationPermission('granted');
                    } catch (err) {
                        console.error('Error using last known location:', err);
                    }
                }
            }
        };

        tryLastKnownLocation();
    }, []);

    const handleRequestJoinQueue = async (queueId) => {
        return safeAsyncOperation(
            async () => {
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
                const queue = hospitalQueues[selectedHospital]?.find(q => q._id === queueId);
                if (!queue) {
                    throw new Error('Queue not found');
                }

                // Check if queue is active
                if (queue.status !== 'active') {
                    throw new Error(`Cannot join queue - queue is ${queue.status}`);
                }

                // Check if user is already in any queue
                const existingQueue = hospitalQueues[selectedHospital]?.find(q => 
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
                setHospitalQueues(prevQueues => ({
                    ...prevQueues,
                    [selectedHospital]: prevQueues[selectedHospital].map(q => 
                        q._id === queueId ? response : q
                    )
                }));

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
            },
            'Failed to join queue'
        );
    };

    const openRequestModal = (queue) => {
        setSelectedQueue(queue);
        setShowRequestModal(true);
    };

    // Render hospital card
    const renderHospitalCard = (hospital) => {
        const queues = hospitalQueues[hospital._id] || [];
        const lastUpdate = lastUpdates[hospital._id];

        return (
            <div key={hospital._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">{hospital.name}</h3>
                            <p className="text-sm text-gray-600">{hospital.address}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">
                                {queues.length} Active Queue{queues.length !== 1 ? 's' : ''}
                            </p>
                            {lastUpdate && (
                                <p className="text-xs text-gray-500">
                                    Last updated: {new Date(lastUpdate).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {queues.length > 0 ? (
                        <div className="mt-4 space-y-4">
                            {queues.map(queue => (
                                <div key={queue._id} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{queue.doctorName}</h4>
                                            <p className="text-sm text-gray-600">{queue.specialization}</p>
                                            {queue.doctor?.qualifications && (
                                                <p className="text-xs text-gray-500">
                                                    {queue.doctor.qualifications.map(q => q.degree).join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">
                                                {queue.waitingCount} Patient{queue.waitingCount !== 1 ? 's' : ''} Waiting
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Est. Wait: {queue.estimatedWaitTime} mins
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => {
                                                setSelectedHospital(hospital._id);
                                                openRequestModal(queue);
                                            }}
                                            disabled={loading}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Join Queue
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-4 text-center py-4">
                            <p className="text-gray-500">No active queues available</p>
                        </div>
                    )}
                </div>
            </div>
        );
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
                            Available Hospital Queues
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            View and join queues from all hospitals
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
                            <p className="mt-2 text-sm text-gray-500">Loading hospitals and queues...</p>
                        </div>
                    )}

                    {/* Hospitals and Queues List */}
                    {!loading && locationPermission === 'granted' && (
                        <div className="p-4">
                            {hospitals.length === 0 ? (
                                <p className="text-gray-500">No hospitals found</p>
                            ) : (
                                <div className="space-y-6">
                                    {hospitals.map((hospital) => renderHospitalCard(hospital))}
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

// Add prop types validation
JoinQueue.propTypes = {
    // Add any props if needed
};

export default JoinQueue; 
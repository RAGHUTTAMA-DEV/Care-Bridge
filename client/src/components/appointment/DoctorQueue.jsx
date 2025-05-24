import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { queueService } from '../../services/api';
import { format } from 'date-fns';

const DoctorQueue = () => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentAppointment, setCurrentAppointment] = useState(null);
    const [prescription, setPrescription] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [lastUpdate, setLastUpdate] = useState(Date.now());
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch queue data
    const fetchQueue = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            console.log('Fetching queue for doctor:', user._id);
            const response = await queueService.getDoctorQueue(user._id);
            console.log('Queue API Response:', response);

            if (!response || !Array.isArray(response)) {
                setQueue([]);
                setError('No queues found');
                return;
            }

            // Process queue data
            const queueData = response.map(queue => ({
                ...queue,
                doctor: queue.doctor || {
                    firstName: 'Unknown',
                    lastName: 'Doctor',
                    specialization: 'General Medicine'
                },
                patients: (queue.patients || []).map(p => ({
                    ...p,
                    patient: p.patient || { firstName: 'Unknown', lastName: 'Patient' }
                }))
            }));

            console.log('Processed queue data:', queueData);
            setQueue(queueData);
            setError('');
            setLastUpdate(Date.now());

            // Update current appointment if needed
            if (!currentAppointment || currentAppointment.status !== 'in_progress') {
                let inProgressAppointment = null;
                for (const queueItem of queueData) {
                    const inProgressPatient = queueItem.patients.find(p => p.status === 'in_progress');
                    if (inProgressPatient) {
                        inProgressAppointment = {
                            ...inProgressPatient,
                            queueId: queueItem._id,
                            hospital: queueItem.hospital,
                            doctor: queueItem.doctor,
                            date: queueItem.date
                        };
                        break;
                    }
                }
                setCurrentAppointment(inProgressAppointment);
            }
        } catch (err) {
            console.error('Error fetching queue:', err);
            if (!silent) setError(err.message || 'Failed to fetch queue data');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [user._id, currentAppointment]);

    // Set up polling for real-time updates
    useEffect(() => {
        fetchQueue();
        const pollInterval = setInterval(() => fetchQueue(true), 5000);
        return () => clearInterval(pollInterval);
    }, [fetchQueue]);

    // Handle starting consultation
    const handleStartConsultation = async (patientId, queueId) => {
        try {
            setActionLoading(true);
            setError('');

            const updatedQueue = await queueService.updatePatientStatus(
                queueId,
                patientId,
                'in_progress'
            );

            console.log('Updated queue after starting consultation:', updatedQueue);
            await fetchQueue(true);
        } catch (err) {
            console.error('Error starting consultation:', err);
            setError(err.message || 'Failed to start consultation');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle completing consultation
    const handleCompleteConsultation = async () => {
        if (!currentAppointment) return;

        try {
            setActionLoading(true);
            setError('');

            const updatedQueue = await queueService.updatePatientStatus(
                currentAppointment.queueId,
                currentAppointment.patient._id,
                'completed',
                {
                    prescription: prescription.trim(),
                    followUpDate: followUpDate || null
                }
            );

            console.log('Updated queue after completing consultation:', updatedQueue);
            setCurrentAppointment(null);
            setPrescription('');
            setFollowUpDate('');
            await fetchQueue(true);
        } catch (err) {
            console.error('Error completing consultation:', err);
            setError(err.message || 'Failed to complete consultation');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle no-show
    const handleNoShow = async (patientId, queueId) => {
        try {
            setActionLoading(true);
            setError('');

            const updatedQueue = await queueService.updatePatientStatus(
                queueId,
                patientId,
                'no_show'
            );

            console.log('Updated queue after marking no-show:', updatedQueue);
            await fetchQueue(true);
        } catch (err) {
            console.error('Error marking no-show:', err);
            setError(err.message || 'Failed to mark patient as no-show');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-4 flex items-center justify-between">
                <button
                    onClick={() => fetchQueue()}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh Queue
                        </>
                    )}
                </button>
                <span className="text-sm text-gray-500">
                    Last updated: {new Date(lastUpdate).toLocaleTimeString()}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Consultation */}
                <div className="lg:col-span-1">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Current Consultation</h2>
                        
                        {currentAppointment?.patient ? (
                            <div>
                                <div className="flex items-center mb-4">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <span className="text-xl font-medium text-blue-600">
                                            {currentAppointment.patient?.firstName?.[0] || '?'}
                                        </span>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            {currentAppointment.patient?.firstName} {currentAppointment.patient?.lastName}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Queue #{currentAppointment.queueNumber || currentAppointment.position || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {currentAppointment.reason && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-medium text-gray-700">Reason for Visit</h4>
                                        <p className="mt-1 text-sm text-gray-600">{currentAppointment.reason}</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="prescription" className="block text-sm font-medium text-gray-700">
                                            Prescription
                                        </label>
                                        <textarea
                                            id="prescription"
                                            rows="3"
                                            value={prescription}
                                            onChange={(e) => setPrescription(e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            placeholder="Enter prescription details"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700">
                                            Follow-up Date
                                        </label>
                                        <input
                                            type="date"
                                            id="followUpDate"
                                            value={followUpDate}
                                            onChange={(e) => setFollowUpDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>

                                    <button
                                        onClick={handleCompleteConsultation}
                                        disabled={actionLoading}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        {actionLoading ? 'Completing...' : 'Complete Consultation'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No active consultation</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Start a consultation from the queue
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Queue List */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Today's Queue</h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {format(new Date(), 'MMMM d, yyyy')} • {queue.reduce((total, q) => total + (q.patients?.length || 0), 0)} patients
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                        <button 
                                            onClick={() => setError('')}
                                            className="text-sm text-red-600 underline hover:text-red-800"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {queue.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No patients in queue</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Patients will appear here when they check in
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {queue.map(queueItem => (
                                    <li key={queueItem._id} className="px-4 py-4 sm:px-6">
                                        <div className="mb-2">
                                            <h3 className="text-sm font-medium text-gray-900">
                                                Queue for {format(new Date(queueItem.date), 'MMMM d, yyyy')}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {queueItem.patients?.length || 0} patients
                                            </p>
                                        </div>
                                        {queueItem.patients?.map(patient => {
                                            const patientName = patient.patient?.firstName 
                                                ? `${patient.patient.firstName} ${patient.patient.lastName || ''}`
                                                : 'Unknown';
                                            const patientInitial = patient.patient?.firstName?.[0] || '?';
                                            const patientTime = patient.appointmentTime 
                                                ? new Date(patient.appointmentTime).toLocaleTimeString()
                                                : 'N/A';
                                            const patientStatus = patient.status || 'waiting';

                                            return (
                                                <div key={patient._id} className="mt-2 bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                <span className="text-lg font-medium text-blue-600">
                                                                    {patientInitial}
                                                                </span>
                                                            </div>
                                                            <div className="ml-4">
                                                                <h3 className="text-sm font-medium text-gray-900">
                                                                    {patientName}
                                                                </h3>
                                                                <p className="text-sm text-gray-500">
                                                                    {patientTime}
                                                                </p>
                                                                {patient.reason && (
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        Reason: {patient.reason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            {patientStatus === 'waiting' && !currentAppointment && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleStartConsultation(patient.patient._id, queueItem._id)}
                                                                        disabled={actionLoading}
                                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                    >
                                                                        {actionLoading ? 'Starting...' : 'Start Consultation'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleNoShow(patient.patient._id, queueItem._id)}
                                                                        disabled={actionLoading}
                                                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                                                    >
                                                                        {actionLoading ? 'Marking...' : 'No Show'}
                                                                    </button>
                                                                </>
                                                            )}
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                patientStatus === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                                                                patientStatus === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                                                                patientStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {patientStatus === 'waiting' ? 'Waiting' :
                                                                 patientStatus === 'in_progress' ? 'In Progress' :
                                                                 patientStatus === 'completed' ? 'Completed' : 'No Show'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorQueue;
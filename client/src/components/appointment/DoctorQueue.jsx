import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        fetchQueue();
        // Refresh queue every minute
        const interval = setInterval(fetchQueue, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchQueue = async () => {
        try {
            setLoading(true);
            const response = await queueService.getDoctorQueues(user._id);
            // Handle the response structure correctly
            const queueData = response?.data || [];
            setQueue(Array.isArray(queueData) ? queueData : []);
            
            // Set current appointment if there's one in progress
            const inProgress = Array.isArray(queueData) ? 
                queueData.find(a => a?.status === 'in_progress') : null;
            if (inProgress) {
                setCurrentAppointment(inProgress);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch queue');
        } finally {
            setLoading(false);
        }
    };

    const handleStartConsultation = async (patientId) => {
        try {
            const response = await queueService.updatePatientStatus(currentQueue._id, patientId, 'in_progress');
            if (response.success) {
                fetchQueue();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start consultation');
        }
    };

    const handleCompleteConsultation = async () => {
        if (!currentAppointment) return;

        try {
            const response = await queueService.updatePatientStatus(currentQueue._id, currentAppointment._id, 'completed');
            if (response.success) {
                setCurrentAppointment(null);
                setPrescription('');
                setFollowUpDate('');
                fetchQueue();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to complete consultation');
        }
    };

    const handleNoShow = async (patientId) => {
        try {
            const response = await queueService.updatePatientStatus(currentQueue._id, patientId, 'no_show');
            if (response.success) {
                fetchQueue();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark as no show');
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading queue...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                                            {currentAppointment.patient?.firstName || 'Unknown'} {currentAppointment.patient?.lastName || ''}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Queue #{currentAppointment.queueNumber || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                {currentAppointment.symptoms && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-medium text-gray-700">Symptoms</h4>
                                        <p className="mt-1 text-sm text-gray-600">{currentAppointment.symptoms}</p>
                                    </div>
                                )}

                                {currentAppointment.notes && (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                                        <p className="mt-1 text-sm text-gray-600">{currentAppointment.notes}</p>
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
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        Complete Consultation
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
                                {format(new Date(), 'MMMM d, yyyy')}
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
                                {queue.map((appointment) => (
                                    <li key={appointment._id} className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <span className="text-lg font-medium text-blue-600">
                                                        {appointment.patient?.firstName?.[0] || '?'}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <h3 className="text-sm font-medium text-gray-900">
                                                        {appointment.patient?.firstName || 'Unknown'} {appointment.patient?.lastName || ''}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">
                                                        Queue #{appointment.queueNumber || 'N/A'} • {appointment.startTime || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                {appointment.status === 'scheduled' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStartConsultation(appointment._id)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            Start
                                                        </button>
                                                        <button
                                                            onClick={() => handleNoShow(appointment._id)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                                        >
                                                            No Show
                                                        </button>
                                                    </>
                                                )}
                                                {appointment.status === 'in_queue' && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        Waiting
                                                    </span>
                                                )}
                                                {appointment.status === 'in_progress' && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                        In Progress
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {appointment.symptoms && (
                                            <p className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                                            </p>
                                        )}
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
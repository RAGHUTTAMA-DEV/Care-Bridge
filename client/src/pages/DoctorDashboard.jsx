import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { appointmentService, queueService } from '../services/api';
import { format } from 'date-fns';

const DoctorDashboard = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('appointments');

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchAppointments(),
                fetchQueue()
            ]);
        };
        fetchData();
        
        // Refresh data every minute
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await appointmentService.getAppointments({ upcoming: true });
            console.log('Fetched appointments:', response); // Debug log
            if (Array.isArray(response)) {
                // Sort appointments by appointmentTime
                const sortedAppointments = [...response].sort((a, b) => 
                    new Date(a.appointmentTime) - new Date(b.appointmentTime)
                );
                setAppointments(sortedAppointments);
            } else {
                console.error('Invalid appointments data:', response);
                setAppointments([]);
            }
            setError('');
        } catch (err) {
            console.error('Failed to fetch appointments:', err);
            setError(err.message || 'Failed to fetch appointments');
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchQueue = async () => {
        try {
            const response = await queueService.getDoctorQueues(user._id);
            setQueue(Array.isArray(response?.data) ? response.data : []);
        } catch (err) {
            console.error('Failed to fetch queue:', err);
            setError(err.message || 'Failed to fetch queue');
        }
    };

    const handleStatusUpdate = async (appointmentId, newStatus) => {
        try {
            await appointmentService.updateAppointmentStatus(appointmentId, newStatus);
            // Refresh both appointments and queue after status update
            await Promise.all([fetchAppointments(), fetchQueue()]);
        } catch (err) {
            setError(err.message || 'Failed to update appointment status');
        }
    };

    const handleQueueAction = async (queueId, patientId, action) => {
        try {
            switch (action) {
                case 'start':
                    await queueService.updatePatientStatus(queueId, patientId, 'in_progress');
                    break;
                case 'complete':
                    await queueService.updatePatientStatus(queueId, patientId, 'completed');
                    break;
                case 'no_show':
                    await queueService.updatePatientStatus(queueId, patientId, 'no_show');
                    break;
                default:
                    throw new Error('Invalid action');
            }
            await fetchQueue();
        } catch (err) {
            setError(err.message || 'Failed to update queue status');
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'scheduled':
            case 'pending':
                return 'bg-blue-100 text-blue-800';
            case 'in_progress':
            case 'in-progress':
                return 'bg-yellow-100 text-yellow-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
            case 'no_show':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white shadow rounded-lg">
                {/* Header */}
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Doctor Dashboard
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Manage your appointments and patient queue
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-400">
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

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        {['appointments', 'queue'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`${
                                    activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm capitalize`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Patient
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date & Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {appointments.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                                    No appointments found
                                                </td>
                                            </tr>
                                        ) : (
                                            appointments.map((appointment) => {
                                                const appointmentDate = new Date(appointment.appointmentTime);
                                                return (
                                                    <tr key={appointment._id}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {appointment.patient?.firstName || 'Unknown'} {appointment.patient?.lastName || ''}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {appointment.patient?.phone || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900">
                                                                {format(appointmentDate, 'MMM d, yyyy')}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {format(appointmentDate, 'hh:mm a')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                                                                {appointment.status || 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            {appointment.status === 'pending' && (
                                                                <button
                                                                    onClick={() => handleStatusUpdate(appointment._id, 'approved')}
                                                                    className="text-blue-600 hover:text-blue-900 mr-4"
                                                                >
                                                                    Approve
                                                                </button>
                                                            )}
                                                            {appointment.status === 'approved' && (
                                                                <button
                                                                    onClick={() => handleStatusUpdate(appointment._id, 'completed')}
                                                                    className="text-green-600 hover:text-green-900 mr-4"
                                                                >
                                                                    Complete
                                                                </button>
                                                            )}
                                                            {['pending', 'approved'].includes(appointment.status) && (
                                                                <button
                                                                    onClick={() => handleStatusUpdate(appointment._id, 'cancelled')}
                                                                    className="text-red-600 hover:text-red-900"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Queue Tab */}
                {activeTab === 'queue' && (
                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Position
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Patient
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Appointment Time
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {queue.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                                No patients in queue
                                            </td>
                                        </tr>
                                    ) : (
                                        queue.map((item, index) => (
                                            <tr key={item._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {item.patient?.firstName || 'Unknown'} {item.patient?.lastName || ''}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {item.patient?.phone || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {item.appointment?.date ? format(new Date(item.appointment.date), 'MMM d, yyyy') : 'N/A'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {item.appointment?.time || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(item.status)}`}>
                                                        {item.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    {item.status === 'scheduled' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleQueueAction(item._id, item.patient?._id, 'start')}
                                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                            >
                                                                Start
                                                            </button>
                                                            <button
                                                                onClick={() => handleQueueAction(item._id, item.patient?._id, 'no_show')}
                                                                className="text-red-600 hover:text-red-900"
                                                            >
                                                                No Show
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'in_progress' && (
                                                        <button
                                                            onClick={() => handleQueueAction(item._id, item.patient?._id, 'complete')}
                                                            className="text-green-600 hover:text-green-900"
                                                        >
                                                            Complete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorDashboard; 
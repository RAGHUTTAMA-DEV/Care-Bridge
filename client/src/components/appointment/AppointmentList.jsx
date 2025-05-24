import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/api';
import { format } from 'date-fns';

const AppointmentList = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('upcoming'); // upcoming, past, all

    useEffect(() => {
        fetchAppointments();
    }, [filter]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await appointmentService.getAppointments({
                upcoming: filter === 'upcoming' ? 'true' : undefined,
                status: filter === 'past' ? 'completed' : undefined
            });
            
            // Debug log to see the actual response structure
            console.log('Appointments response:', response);
            
            // The response is already the data array, no need to access .data
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
            setError(''); // Clear any previous errors
        } catch (err) {
            console.error('Fetch appointments error:', err);
            setError(err.message || 'Failed to fetch appointments');
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (appointmentId, newStatus) => {
        try {
            const response = await appointmentService.updateAppointmentStatus(appointmentId, {
                status: newStatus
            });
            if (response.success) {
                fetchAppointments();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update appointment status');
        }
    };

    const handleCancel = async (appointmentId) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) {
            return;
        }

        try {
            const response = await appointmentService.cancelAppointment(appointmentId);
            if (response.success) {
                fetchAppointments();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to cancel appointment');
        }
    };

    const getStatusBadgeColor = (status) => {
        const colors = {
            scheduled: 'bg-blue-100 text-blue-800',
            in_queue: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-purple-100 text-purple-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            no_show: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    // Helper function to format appointment date and time
    const formatAppointmentDateTime = (appointment) => {
        try {
            // Try different possible field names
            const dateTime = appointment.appointmentTime || appointment.date || appointment.dateTime;
            const time = appointment.startTime || appointment.time;
            
            if (dateTime) {
                const date = new Date(dateTime);
                if (time) {
                    return `${format(date, 'MMMM d, yyyy')} at ${time}`;
                } else {
                    return format(date, 'MMMM d, yyyy \'at\' h:mm a');
                }
            }
            return 'Date not available';
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    };

    // Helper function to get patient/doctor name safely
    const getPersonName = (person) => {
        if (!person) return 'Unknown';
        const firstName = person.firstName || person.name || '';
        const lastName = person.lastName || '';
        return `${firstName} ${lastName}`.trim() || 'Unknown';
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading appointments...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Filter Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {['upcoming', 'past', 'all'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`${
                                filter === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
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

            {/* Debug info - remove this in production */}
            <div className="mb-4 p-2 bg-gray-100 text-xs">
                <p>Debug: Found {appointments.length} appointments</p>
                <p>Filter: {filter}</p>
            </div>

            {/* Appointments List */}
            {appointments.length === 0 ? (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        {filter === 'upcoming' 
                            ? 'You have no upcoming appointments.'
                            : filter === 'past'
                                ? 'You have no past appointments.'
                                : 'You have no appointments.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {appointments.map((appointment) => (
                            <li key={appointment._id}>
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <span className="text-xl font-medium text-blue-600">
                                                        {user.role === 'doctor' 
                                                            ? (appointment.patient?.firstName?.[0] || 'P')
                                                            : (appointment.doctor?.firstName?.[0] || 'D')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {user.role === 'doctor'
                                                        ? `Patient: ${getPersonName(appointment.patient)}`
                                                        : `Dr. ${getPersonName(appointment.doctor)}`}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {formatAppointmentDateTime(appointment)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(appointment.status)}`}>
                                                {appointment.status?.replace('_', ' ') || 'Unknown'}
                                            </span>
                                            {appointment.queueNumber && (
                                                <span className="text-sm text-gray-500">
                                                    Queue #{appointment.queueNumber}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        {appointment.symptoms && (
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                                            </p>
                                        )}
                                        {appointment.notes && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">Notes:</span> {appointment.notes}
                                            </p>
                                        )}
                                        {appointment.prescription && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">Prescription:</span> {appointment.prescription}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 flex justify-end space-x-3">
                                        {user.role === 'doctor' && appointment.status === 'in_queue' && (
                                            <button
                                                onClick={() => handleStatusUpdate(appointment._id, 'in_progress')}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Start Consultation
                                            </button>
                                        )}
                                        {user.role === 'doctor' && appointment.status === 'in_progress' && (
                                            <button
                                                onClick={() => handleStatusUpdate(appointment._id, 'completed')}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                            >
                                                Complete
                                            </button>
                                        )}
                                        {['scheduled', 'in_queue'].includes(appointment.status) && (
                                            <button
                                                onClick={() => handleCancel(appointment._id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default AppointmentList;
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/api';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const listItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
};

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

            // Check if user is authenticated
            if (!user) {
                console.error('No authenticated user found');
                setError('Please login to view appointments');
                setLoading(false);
                return;
            }

            console.log('Fetching appointments with filters:', filters);

            const filters = {
                upcoming: filter === 'upcoming' ? 'true' : undefined
            };
            if (filter === 'past') {
                filters.status = 'completed';
            }
            const response = await appointmentService.getAppointments(filters);
            
            console.log('Appointments response:', response);
            
            if (response.success) {
                const appointmentsData = response.data;
                // Sort appointments by appointmentTime
                // Sort appointments by date
                const sortedAppointments = [...appointmentsData].sort((a, b) =>
                    new Date(a.appointmentTime || a.date) - new Date(b.appointmentTime || b.date)
                );

                setAppointments(sortedAppointments);
                console.log('Debug:', response.meta); // Log performance metrics
            } else {
                console.error('Invalid response format:', response);
                setError('Failed to load appointments: Invalid response format');
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
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
            >
                <motion.div
                    className="rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
                    animate={{
                        rotate: 360,
                        transition: {
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear"
                        }
                    }}
                />
                <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-sm text-gray-600"
                >
                    Loading appointments...
                </motion.p>
            </motion.div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Filter Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {['upcoming', 'past', 'all'].map((tab) => (
                        <motion.button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`${
                                filter === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                            whileHover={{ y: -2 }}
                            whileTap={{ y: 0 }}
                            animate={{
                                borderBottomColor: filter === tab ? '#3B82F6' : 'transparent',
                                transition: { duration: 0.2 }
                            }}
                        >
                            {tab}
                        </motion.button>
                    ))}
                </nav>
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-red-50 border-l-4 border-red-400 p-4 mb-6"
                    >
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
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {process.env.NODE_ENV === 'development' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                            duration: 0.3,
                            ease: "easeInOut"
                        }}
                        className="overflow-hidden"
                    >
                        <motion.div
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-4 p-2 bg-gray-100 text-xs"
                        >
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                Debug: Found {appointments.length} appointments
                            </motion.p>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                            >
                                Filter: {filter}
                            </motion.p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Appointments List */}
            <AnimatePresence mode="wait">
                {appointments.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="text-center py-12"
                    >
                        <motion.svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                        </motion.svg>
                        <motion.h3
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-2 text-sm font-medium text-gray-900"
                        >
                            No appointments found
                        </motion.h3>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mt-1 text-sm text-gray-500"
                        >
                            {filter === 'upcoming'
                                ? 'You have no upcoming appointments.'
                                : filter === 'past'
                                    ? 'You have no past appointments.'
                                    : 'You have no appointments.'}
                        </motion.p>
                    </motion.div>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white shadow overflow-hidden sm:rounded-md"
                >
                    <ul className="divide-y divide-gray-200">
                        {appointments.map((appointment, index) => (
                            <motion.li
                                key={appointment._id}
                                variants={listItemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{ delay: index * 0.1 }}
                            >
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.1 + 0.2 }}
                                    className="px-4 py-4 sm:px-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0">
                                                <motion.div
                                                    className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{
                                                        type: "spring",
                                                        delay: index * 0.1 + 0.2
                                                    }}
                                                >
                                                    <motion.span
                                                        className="text-xl font-medium text-blue-600"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.1 + 0.3 }}
                                                    >
                                                        {user.role === 'doctor' 
                                                            ? (appointment.patient?.firstName?.[0] || 'P')
                                                            : (appointment.doctor?.firstName?.[0] || 'D')}
                                                    </motion.span>
                                                </motion.div>
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
                                        <motion.div
                                            className="flex items-center space-x-4"
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: index * 0.1 + 0.3 }}
                                        >
                                            <motion.span
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(appointment.status)}`}
                                                whileHover={{ scale: 1.05 }}
                                                layout
                                            >
                                                {appointment.status?.replace('_', ' ') || 'Unknown'}
                                            </motion.span>
                                            {appointment.queueNumber && (
                                                <motion.span
                                                    className="text-sm text-gray-500"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.1 + 0.4 }}
                                                >
                                                    Queue #{appointment.queueNumber}
                                                </motion.span>
                                            )}
                                        </motion.div>
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
                                    <motion.div
                                        className="mt-4 flex justify-end space-x-3"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.1 + 0.3 }}
                                    >
                                        {user.role === 'doctor' && appointment.status === 'in_queue' && (
                                            <motion.button
                                                whileHover={buttonVariants.hover}
                                                whileTap={buttonVariants.tap}
                                                onClick={() => handleStatusUpdate(appointment._id, 'in_progress')}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Start Consultation
                                            </motion.button>
                                        )}
                                        {user.role === 'doctor' && appointment.status === 'in_progress' && (
                                            <motion.button
                                                whileHover={buttonVariants.hover}
                                                whileTap={buttonVariants.tap}
                                                onClick={() => handleStatusUpdate(appointment._id, 'completed')}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                            >
                                                Complete
                                            </motion.button>
                                        )}
                                        {['scheduled', 'in_queue'].includes(appointment.status) && (
                                            <motion.button
                                                whileHover={buttonVariants.hover}
                                                whileTap={buttonVariants.tap}
                                                onClick={() => handleCancel(appointment._id)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            >
                                                Cancel
                                            </motion.button>
                                        )}
                                    </motion.div>
                                </motion.div>
                            </motion.li>
                        ))}
                    </ul>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default AppointmentList;
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorService, queueService } from '../../services/api';
import DiseasePrediction from './DiseasePrediction';

const PatientDashboard = () => {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('appointments');  // Options: appointments, queues, prediction
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [formData, setFormData] = useState({
        specialization: '',
        date: '',
        reason: ''
    });

    useEffect(() => {
        fetchPatientData();
    }, []);

    const fetchPatientData = async () => {
        try {
            setLoading(true);
            const [appointmentsResponse, queuesResponse] = await Promise.all([
                doctorService.getPatientAppointments(user._id),
                queueService.getPatientQueues(user._id)
            ]);
            setAppointments(appointmentsResponse.data);
            setQueues(queuesResponse.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch patient data');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearchDoctors = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const response = await doctorService.searchDoctors({
                specialization: formData.specialization,
                date: formData.date
            });
            setSelectedDoctor(response.data[0]); // For simplicity, selecting first doctor
            setError('Doctor found. Please select a time slot to book appointment.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to search doctors');
        }
    };

    const handleBookAppointment = async (timeSlot) => {
        try {
            setError('');
            await doctorService.bookAppointment(selectedDoctor._id, {
                patientId: user._id,
                date: formData.date,
                timeSlot,
                reason: formData.reason
            });
            await fetchPatientData();
            setFormData(prev => ({
                ...prev,
                specialization: '',
                date: '',
                reason: ''
            }));
            setSelectedDoctor(null);
            setError('Appointment booked successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to book appointment');
        }
    };

    const handleJoinQueue = async (queueId) => {
        try {
            setError('');
            await queueService.joinQueue(queueId, user._id);
            await fetchPatientData();
            setError('Successfully joined the queue');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join queue');
        }
    };

    const handleLeaveQueue = async (queueId) => {
        try {
            setError('');
            await queueService.leaveQueue(queueId, user._id);
            await fetchPatientData();
            setError('Successfully left the queue');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to leave queue');
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
            <div className="bg-white shadow rounded-lg">
                {/* Dashboard Header */}
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Patient Dashboard
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Manage your appointments and queue status
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        {['appointments', 'queues', 'prediction'].map((tab) => (
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

                {/* Error Message */}
                {error && (
                    <div className={`p-4 ${
                        error.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                        {error}
                    </div>
                )}

                {/* Appointments Tab */}
                {activeTab === 'appointments' && (
                    <div className="p-6">
                        {/* Book Appointment Form */}
                        {!selectedDoctor ? (
                            <form onSubmit={handleSearchDoctors} className="mb-8">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Specialization
                                        </label>
                                        <input
                                            type="text"
                                            name="specialization"
                                            value={formData.specialization}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="Enter specialization"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Preferred Date
                                        </label>
                                        <input
                                            type="date"
                                            name="date"
                                            value={formData.date}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="submit"
                                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Search Doctors
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="mb-8">
                                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                    <div className="px-4 py-5 sm:px-6">
                                        <h4 className="text-lg font-medium text-gray-900">
                                            Book Appointment with Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {selectedDoctor.specialization}
                                        </p>
                                    </div>
                                    <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Reason for Visit
                                            </label>
                                            <textarea
                                                name="reason"
                                                rows={3}
                                                value={formData.reason}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                            {selectedDoctor.availability?.timeSlots?.map((slot) => (
                                                <button
                                                    key={slot}
                                                    onClick={() => handleBookAppointment(slot)}
                                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Appointments List */}
                        <div className="mt-8">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Your Appointments</h4>
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {appointments.map((appointment) => (
                                        <li key={appointment._id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {new Date(appointment.date).toLocaleDateString()} at {appointment.timeSlot}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Reason: {appointment.reason}
                                                    </p>
                                                </div>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    appointment.status === 'confirmed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : appointment.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {appointment.status}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Disease Prediction Tab */}
                {activeTab === 'prediction' && (
                    <div className="p-6">
                        <DiseasePrediction />
                    </div>
                )}

                {/* Queues Tab */}
                {activeTab === 'queues' && (
                    <div className="p-6">
                        <div className="mt-8">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Your Queue Status</h4>
                            <div className="space-y-6">
                                {queues.map((queue) => (
                                    <div key={queue._id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                                        <div className="px-4 py-5 sm:px-6">
                                            <h5 className="text-lg font-medium text-gray-900">
                                                {queue.name}
                                            </h5>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Doctor: Dr. {queue.doctor?.firstName} {queue.doctor?.lastName}
                                            </p>
                                        </div>
                                        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Your Position: {queue.patients.findIndex(p => p.patient === user._id || p.patient._id === user._id) + 1} of {queue.patients.length}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Status: {queue.patients.find(p => p.patient === user._id || p.patient._id === user._id)?.status || 'waiting'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Estimated Wait: {queue.patients.find(p => p.patient === user._id || p.patient._id === user._id)?.estimatedWaitTime || queue.averageWaitTime} minutes
                                                    </p>
                                                </div>
                                                {queue.patients.find(p => p.patient === user._id || p.patient._id === user._id) ? (
                                                    <button
                                                        onClick={() => handleLeaveQueue(queue._id)}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    >
                                                        Leave Queue
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleJoinQueue(queue._id)}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Join Queue
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientDashboard; 
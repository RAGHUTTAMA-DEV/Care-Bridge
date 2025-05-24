import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { appointmentService } from '../../services/api';

const BookAppointment = ({ doctor }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        date: '',
        startTime: '',
        symptoms: '',
        notes: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await appointmentService.bookAppointment({
                doctorId: doctor._id,
                ...formData
            });

            if (response.success) {
                navigate('/appointments', { 
                    state: { message: 'Appointment booked successfully!' }
                });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to book appointment');
        } finally {
            setLoading(false);
        }
    };

    // Get available time slots for the selected date
    const getAvailableTimeSlots = () => {
        if (!formData.date || !doctor.availability) return [];

        const dayOfWeek = new Date(formData.date).getDay();
        const dayAvailability = doctor.availability.find(a => a.day === dayOfWeek);
        
        if (!dayAvailability) return [];

        const slots = [];
        const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
        const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);
        
        let currentTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        const slotDuration = doctor.avgConsultationTime || 15; // default 15 minutes

        while (currentTime + slotDuration <= endTime) {
            const hours = Math.floor(currentTime / 60);
            const minutes = currentTime % 60;
            slots.push(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
            );
            currentTime += slotDuration;
        }

        return slots;
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Book Appointment with Dr. {doctor.firstName} {doctor.lastName}
            </h2>

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

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Date
                    </label>
                    <input
                        type="date"
                        name="date"
                        id="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.date}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                        Time
                    </label>
                    <select
                        name="startTime"
                        id="startTime"
                        required
                        value={formData.startTime}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="">Select a time slot</option>
                        {getAvailableTimeSlots().map(slot => (
                            <option key={slot} value={slot}>
                                {slot}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
                        Symptoms
                    </label>
                    <textarea
                        name="symptoms"
                        id="symptoms"
                        rows="3"
                        value={formData.symptoms}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Please describe your symptoms"
                    />
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Additional Notes
                    </label>
                    <textarea
                        name="notes"
                        id="notes"
                        rows="2"
                        value={formData.notes}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Any additional information for the doctor"
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                            ${loading 
                                ? 'bg-blue-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                            }`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Booking...
                            </>
                        ) : (
                            'Book Appointment'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BookAppointment; 
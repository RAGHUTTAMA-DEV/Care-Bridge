import React, { useState } from 'react';
import { healthcareService } from '../services/healthcareService';

const DoctorDetails = ({ doctor }) => {
    const [availability, setAvailability] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');

    const checkAvailability = async (date = null) => {
        try {
            setLoading(true);
            setError(null);
            const data = await healthcareService.checkDoctorAvailability(doctor._id, date);
            setAvailability(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Dr. {doctor.user.firstName} {doctor.user.lastName}
            </h2>

            <div className="space-y-4">
                {/* Basic Info */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Specialization:</span> {doctor.specialization}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Experience:</span> {doctor.experience} years
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                <span className="font-medium">Consultation Fee:</span> ${doctor.consultationFee}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Languages:</span> {doctor.languages.join(', ')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Qualifications */}
                {doctor.qualifications && doctor.qualifications.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Qualifications</h3>
                        <div className="space-y-2">
                            {doctor.qualifications.map((qual, index) => (
                                <div key={index} className="text-sm text-gray-600">
                                    <p className="font-medium">{qual.degree}</p>
                                    <p>{qual.institution} ({qual.year})</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bio */}
                {doctor.bio && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                        <p className="text-sm text-gray-600">{doctor.bio}</p>
                    </div>
                )}

                {/* Availability Checker */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Check Availability</h3>
                    <div className="space-y-4">
                        <div>
                            <input
                                type="datetime-local"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => checkAvailability(selectedDate)}
                                disabled={loading || !selectedDate}
                                className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                {loading ? 'Checking...' : 'Check Availability'}
                            </button>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {availability && (
                            <div className="mt-4">
                                {availability.isAvailable ? (
                                    <div className="p-4 bg-green-50 text-green-700 rounded-md">
                                        <p className="font-medium">Available at selected time!</p>
                                        <button className="mt-2 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                            Book Appointment
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
                                        <p>Not available at selected time.</p>
                                        {availability.nextAvailableSlot && (
                                            <p className="mt-2">
                                                Next available slot: {formatDate(availability.nextAvailableSlot)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Weekly Schedule</h4>
                                    <div className="space-y-2">
                                        {availability.currentAvailability.map((slot) => (
                                            <div
                                                key={slot.day}
                                                className={`p-2 rounded ${
                                                    slot.isAvailable ? 'bg-green-50' : 'bg-red-50'
                                                }`}
                                            >
                                                <p className="font-medium">{slot.day}</p>
                                                <p className="text-sm">
                                                    {slot.isAvailable
                                                        ? `${slot.startTime} - ${slot.endTime}`
                                                        : 'Not Available'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoctorDetails; 
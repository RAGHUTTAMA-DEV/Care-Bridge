import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/api';
import { useGeolocation } from '../../hooks/useGeolocation';
import BookAppointment from '../appointment/BookAppointment';

const DoctorSearch = () => {
    const { user } = useAuth();
    const { location, error: locationError } = useGeolocation();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    const searchNearbyDoctors = async () => {
        try {
            setLoading(true);
            setError('');

            if (!location) {
                setError('Please allow location access to find nearby doctors');
                return;
            }

            // Debug logging
            console.log('Searching nearby doctors with location:', location);

            const response = await doctorService.searchDoctors({
                latitude: location.latitude,
                longitude: location.longitude,
                maxDistance: '20000' // 20km radius
            });
            
            // Debug logging
            console.log('Raw API response:', response);

            // Response is already the data array
            const doctors = Array.isArray(response) ? response : [];
            
            console.log('Found doctors:', {
                count: doctors.length,
                doctors: doctors
            });

            setDoctors(doctors);
        } catch (err) {
            console.error('Search error:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
            setError(err.response?.data?.message || 'Failed to find nearby doctors');
            setDoctors([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (location) {
            searchNearbyDoctors();
        }
    }, [location]);

    const handleBookAppointment = (doctor) => {
        setSelectedDoctor(doctor);
    };

    const handleCloseBooking = () => {
        setSelectedDoctor(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Location Error */}
            {locationError && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                {locationError}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* General Error */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
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

            {/* Loading State */}
            {loading && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Finding nearby doctors...</p>
                </div>
            )}

            {/* Booking Modal */}
            {selectedDoctor && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Book Appointment
                                </h2>
                                <button
                                    onClick={handleCloseBooking}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <BookAppointment doctor={selectedDoctor} onClose={handleCloseBooking} />
                        </div>
                    </div>
                </div>
            )}

            {/* Results */}
            {!loading && doctors.length > 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {doctors.map(doctor => (
                        <div key={doctor._id} className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="text-xl font-medium text-blue-600">
                                                {doctor?.doctor?.firstName?.[0] || ''}{doctor?.doctor?.lastName?.[0] || ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-medium text-gray-900">
                                            Dr. {doctor?.doctor?.firstName || ''} {doctor?.doctor?.lastName || ''}
                                        </h3>
                                        <p className="text-sm text-gray-500">{doctor?.specialization || 'Not specified'}</p>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        {doctor?.experience || 0} years experience
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500 mt-2">
                                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        ₹{doctor?.consultationFee || 0} consultation fee
                                    </div>
                                    <div className="flex items-center text-sm text-gray-500 mt-2">
                                        <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        {doctor?.doctor?.phone || 'Not available'}
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <button
                                        onClick={() => handleBookAppointment(doctor)}
                                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Book Appointment
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No Results */}
            {!loading && doctors.length === 0 && !error && (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No doctors found nearby</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Please make sure you have allowed location access.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DoctorSearch; 
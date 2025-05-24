import React, { useState, useEffect } from 'react';
import { healthcareService } from '../services/healthcareService';
import DoctorCard from './DoctorCard';

const HospitalDetails = ({ hospital }) => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await healthcareService.getHospitalDoctors(hospital._id);
                setDoctors(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();
    }, [hospital._id]);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{hospital.name}</h2>

            <div className="space-y-6">
                {/* Hospital Information */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Hospital Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Address:</span>
                                <br />
                                {hospital.address.street}
                                <br />
                                {hospital.address.city}, {hospital.address.state} {hospital.address.zipCode}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                                <span className="font-medium">Phone:</span> {hospital.phone}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">Email:</span> {hospital.email}
                            </p>
                            {hospital.website && (
                                <p className="text-sm text-gray-600 mt-2">
                                    <span className="font-medium">Website:</span>{' '}
                                    <a
                                        href={hospital.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline"
                                    >
                                        {hospital.website}
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Doctors List */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Doctors</h3>
                    
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-600">Loading doctors...</p>
                        </div>
                    ) : error ? (
                        <div className="text-red-600 text-sm p-4 bg-red-50 rounded-md">
                            {error}
                        </div>
                    ) : doctors.length === 0 ? (
                        <p className="text-gray-600 text-sm">No doctors available at this hospital.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {doctors.map((doctor) => (
                                <div
                                    key={doctor._id}
                                    className="cursor-pointer"
                                    onClick={() => setSelectedDoctor(doctor)}
                                >
                                    <DoctorCard doctor={doctor} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Doctor Details */}
                {selectedDoctor && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        Doctor Details
                                    </h3>
                                    <button
                                        onClick={() => setSelectedDoctor(null)}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <DoctorDetails doctor={selectedDoctor} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalDetails; 
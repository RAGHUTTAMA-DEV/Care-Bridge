import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hospitalService } from '../../services/api';
import DoctorCard from '../DoctorCard';

const HospitalDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHospitalDetails = async () => {
            try {
                const data = await hospitalService.getHospitalDetails(id);
                setHospital(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch hospital details');
            } finally {
                setLoading(false);
            }
        };

        fetchHospitalDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    if (!hospital) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Hospital not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                        <h1 className="text-3xl font-bold text-gray-900">{hospital.name}</h1>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">{hospital.address}</p>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                                <dd className="mt-1 text-sm text-gray-900">{hospital.phone}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Email</dt>
                                <dd className="mt-1 text-sm text-gray-900">{hospital.email}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">About</dt>
                                <dd className="mt-1 text-sm text-gray-900">{hospital.description}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Services</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    <ul className="list-disc pl-5 space-y-1">
                                        {hospital.services?.map((service, index) => (
                                            <li key={index}>{service}</li>
                                        ))}
                                    </ul>
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>

                {/* Doctors Section */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Doctors</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {hospital.doctors?.map((doctor) => (
                            <DoctorCard key={doctor._id} doctor={doctor} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HospitalDetails; 
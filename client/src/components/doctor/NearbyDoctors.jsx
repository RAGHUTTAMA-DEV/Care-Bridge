import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/api';
import { hospitalService } from '../../services/api';

const NearbyDoctors = () => {
    const { user } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        specialization: '',
        experience: '',
        maxFee: '',
        languages: '',
        rating: ''
    });
    const [userLocation, setUserLocation] = useState(null);

    // Get user's location
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setError("Please enable location access to find nearby doctors");
                }
            );
        } else {
            setError("Geolocation is not supported by your browser");
        }
    }, []);

    // Fetch doctors and hospitals when location is available
    useEffect(() => {
        const fetchData = async () => {
            if (!userLocation) return;

            try {
                setLoading(true);
                setError(null);

                // Fetch nearby hospitals first
                const hospitalsResponse = await hospitalService.getNearbyHospitals(
                    userLocation.latitude,
                    userLocation.longitude,
                    10000 // 10km radius
                );

                if (hospitalsResponse.success) {
                    setHospitals(hospitalsResponse.data);
                    
                    // Get doctors from these hospitals
                    const hospitalDoctors = await Promise.all(
                        hospitalsResponse.data.map(hospital => 
                            doctorService.getHospitalDoctors(hospital._id)
                        )
                    );

                    // Fetch nearby doctors
                    const doctorsResponse = await doctorService.searchDoctors({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        maxDistance: 20000, // 20km radius
                        ...filters
                    });

                    if (doctorsResponse.success) {
                        // Combine nearby doctors with hospital doctors
                        const allDoctors = [
                            ...doctorsResponse.data,
                            ...hospitalDoctors.flatMap(response => response.data || [])
                        ];

                        // Remove duplicates based on doctor ID
                        const uniqueDoctors = Array.from(
                            new Map(allDoctors.map(doc => [doc._id, doc])).values()
                        );

                        setDoctors(uniqueDoctors);
                    }
                }
            } catch (err) {
                setError(err.message || "Failed to fetch doctors");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userLocation, filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // The useEffect will handle the search when filters change
    };

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                {error}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Nearby Doctors</h2>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
            </div>

            {showFilters && (
                <form onSubmit={handleSearch} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Specialization</label>
                            <input
                                type="text"
                                name="specialization"
                                value={filters.specialization}
                                onChange={handleFilterChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="e.g., Cardiology"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min Experience (years)</label>
                            <input
                                type="number"
                                name="experience"
                                value={filters.experience}
                                onChange={handleFilterChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Max Fee</label>
                            <input
                                type="number"
                                name="maxFee"
                                value={filters.maxFee}
                                onChange={handleFilterChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Languages</label>
                            <input
                                type="text"
                                name="languages"
                                value={filters.languages}
                                onChange={handleFilterChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="e.g., English, Hindi"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min Rating</label>
                            <input
                                type="number"
                                name="rating"
                                value={filters.rating}
                                onChange={handleFilterChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                min="0"
                                max="5"
                                step="0.1"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {doctors.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-600">No doctors found nearby. Try adjusting your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {doctors.map(doctor => (
                        <div key={doctor._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-center mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold text-gray-800">
                                        Dr. {doctor.doctor.firstName} {doctor.doctor.lastName}
                                    </h3>
                                    <p className="text-gray-600">{doctor.specialization}</p>
                                </div>
                                {doctor.rating && (
                                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {doctor.rating.toFixed(1)} ★
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2 text-gray-600">
                                <p><span className="font-medium">Experience:</span> {doctor.experience} years</p>
                                <p><span className="font-medium">Fee:</span> ₹{doctor.consultationFee}</p>
                                <p><span className="font-medium">Languages:</span> {doctor.languages.join(', ')}</p>
                                {doctor.bio && (
                                    <p className="text-sm mt-2">{doctor.bio}</p>
                                )}
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <button
                                    onClick={() => {/* Handle book appointment */}}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Book Appointment
                                </button>
                                <button
                                    onClick={() => {/* Handle view profile */}}
                                    className="px-4 py-2 text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {hospitals.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Nearby Hospitals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {hospitals.map(hospital => (
                            <div key={hospital._id} className="bg-white rounded-lg shadow-md p-6">
                                <h4 className="text-lg font-semibold text-gray-800">{hospital.name}</h4>
                                <p className="text-gray-600 mt-2">{hospital.address}</p>
                                <p className="text-gray-600">{hospital.phone}</p>
                                <button
                                    onClick={() => {/* Handle view hospital */}}
                                    className="mt-4 px-4 py-2 text-blue-500 hover:text-blue-600 transition-colors"
                                >
                                    View Hospital
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NearbyDoctors; 
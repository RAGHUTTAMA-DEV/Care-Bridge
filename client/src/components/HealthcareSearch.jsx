import React, { useState, useEffect } from 'react';
import { useHealthcare } from '../context/HealthcareContext';
import { hospitalService, doctorService } from '../services/api';
import DoctorCard from './DoctorCard';
import HospitalCard from './HospitalCard';
import SearchFilters from './SearchFilters';

const HealthcareSearch = () => {
    const {
        userLocation,
        searchType, 
        setSearchType,
        searchFilters,
        updateSearchFilters,
        loading,
        setLoading,
        error,
        setError
    } = useHealthcare();

    const [results, setResults] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);

    const handleSearch = async () => {
        if (!userLocation) {
            setError('Please allow location access to search');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setSelectedItem(null);

            let response;
            if (searchType === 'doctors') {
                if (searchFilters.specialization) {
                    response = await doctorService.findDoctorsBySpecialization(
                        searchFilters.specialization,
                        { 
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude,
                            maxDistance: searchFilters.distance * 1000
                        }
                    );
                } else {
                    response = await doctorService.findNearbyDoctors({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        maxDistance: searchFilters.distance * 1000
                    });
                }
            } else {
                response = await hospitalService.findNearbyHospitals({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    maxDistance: searchFilters.distance * 1000
                });
            }

            if (response.success === false) {
                throw new Error(response.message || 'Search failed');
            }

            setResults(response.data || []);
        } catch (err) {
            setError(err.message || 'Failed to perform search');
        } finally {
            setLoading(false);
        }
    };

    const handleItemSelect = async (item) => {
        if (searchType === 'hospitals') {
            try {
                setLoading(true);
                const response = await hospitalService.getHospitalDoctors(item._id);
                if (response.success === false) {
                    throw new Error(response.message || 'Failed to fetch hospital details');
                }
                setSelectedItem({ ...item, doctors: response.data });
            } catch (err) {
                setError(err.message || 'Failed to fetch hospital details');
            } finally {
                setLoading(false);
            }
        } else {
            setSelectedItem(item);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search Type Toggle */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex rounded-md shadow-sm">
                        <button
                            onClick={() => setSearchType('doctors')}
                            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                                searchType === 'doctors'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Find Doctors
                        </button>
                        <button
                            onClick={() => setSearchType('hospitals')}
                            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                                searchType === 'hospitals'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Find Hospitals
                        </button>
                    </div>
                </div>

                {/* Search Filters */}
                <SearchFilters
                    searchType={searchType}
                    filters={searchFilters}
                    onFilterChange={updateSearchFilters}
                    onSearch={handleSearch}
                />

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Results Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    {/* Results List */}
                    <div className="lg:col-span-2 space-y-4">
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Searching...</p>
                            </div>
                        ) : results.length > 0 ? (
                            results.map((item) => (
                                <div
                                    key={item._id}
                                    onClick={() => handleItemSelect(item)}
                                    className="cursor-pointer"
                                >
                                    {searchType === 'doctors' ? (
                                        <DoctorCard doctor={item} />
                                    ) : (
                                        <HospitalCard hospital={item} />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No {searchType} found in your area. Try adjusting your search filters.
                            </div>
                        )}
                    </div>

                    {/* Selected Item Details */}
                    <div className="lg:col-span-1">
                        {selectedItem && (
                            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
                                {searchType === 'doctors' ? (
                                    <DoctorDetails doctor={selectedItem} />
                                ) : (
                                    <HospitalDetails hospital={selectedItem} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HealthcareSearch; 
import React, { useState, useEffect } from 'react';
import { useHealthcare } from '../context/HealthcareContext';
import { hospitalService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HospitalCard from './HospitalCard';

const FindNearbyHospitals = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const { 
        userLocation, 
        getUserLocation, 
        error: locationError, 
        setError: setLocationError,
        permissionState,
        loading: locationLoading,
        setLoading: setLocationLoading
    } = useHealthcare();
    
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [maxDistance, setMaxDistance] = useState(34); // in kilometers

    // Check authentication on mount
    useEffect(() => {
        if (!isAuthenticated) {
            setError('Please log in to search for nearby hospitals');
            // Redirect to login after a short delay
            const timer = setTimeout(() => {
                navigate('/login');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, navigate]);

    const handleGetLocation = async () => {
        try {
            setError('');
            setLocationError(null);
            setLocationLoading(true);
            
            const location = await getUserLocation();
            if (location) {
                // Automatically search for hospitals when location is obtained
                searchNearbyHospitals(location);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLocationLoading(false);
        }
    };

    const searchNearbyHospitals = async (position) => {
        try {
            setLoading(true);
            setError('');

            if (!isAuthenticated) {
                setError('Please log in to search for nearby hospitals');
                navigate('/login');
                return;
            }

            const response = await hospitalService.findNearbyHospitals({
                latitude: position.latitude,
                longitude: position.longitude,
                maxDistance: maxDistance * 1000 // convert to meters
            });

            if (response.success === false) {
                throw new Error(response.message || 'Failed to find nearby hospitals');
            }

            const hospitalsData = response.data || [];
            setHospitals(hospitalsData);
            
            if (hospitalsData.length === 0) {
                setError(`No hospitals found within ${maxDistance} kilometers of your location`);
            }
        } catch (err) {
            console.error('Error searching for hospitals:', err);
            setError(err.message || 'Failed to find nearby hospitals. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSearch = (e) => {
        e.preventDefault();
        if (!userLocation) {
            handleGetLocation();
            return;
        }
        searchNearbyHospitals(userLocation);
    };

    const handleDistanceChange = (e) => {
        setMaxDistance(Number(e.target.value));
    };

    const renderLocationButton = () => {
        if (permissionState === 'denied') {
            return (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
                    <p className="mb-2">Location access was denied. To enable location access:</p>
                    <ol className="list-decimal list-inside mb-4">
                        <li>Click the lock/info icon in your browser's address bar</li>
                        <li>Find "Location" in the permissions list</li>
                        <li>Change it to "Allow"</li>
                        <li>Refresh the page</li>
                    </ol>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Refresh Page After Enabling Location
                    </button>
                </div>
            );
        }

        if (!userLocation) {
            return (
                <div className="mb-6">
                    <button
                        onClick={handleGetLocation}
                        disabled={locationLoading}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {locationLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Getting Location...
                            </>
                        ) : (
                            'Enable Location Services'
                        )}
                    </button>
                    {permissionState === 'prompt' && (
                        <p className="mt-2 text-sm text-gray-600">
                            Click the button above to allow location access. When prompted by your browser, click "Allow".
                        </p>
                    )}
                </div>
            );
        }

        return null;
    };

    // If not authenticated, show message and redirect
    if (!isAuthenticated) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Authentication Required
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Please log in to search for nearby hospitals.
                        </p>
                        <p className="text-sm text-gray-500">
                            Redirecting to login page...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Find Nearby Hospitals
                </h2>

                {renderLocationButton()}

                {/* Search Controls */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search Radius (km)
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={maxDistance}
                                onChange={handleDistanceChange}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="text-sm text-gray-500 mt-1">
                                {maxDistance} kilometers
                            </div>
                        </div>
                        <button
                            onClick={handleManualSearch}
                            disabled={loading || locationLoading || (!userLocation && permissionState === 'denied')}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Searching...
                                </>
                            ) : (
                                'Search Nearby'
                            )}
                        </button>
                    </div>
                </div>

                {/* Error Messages */}
                {(error || locationError) && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
                        <p className="font-medium">Error</p>
                        <p className="mt-1">{error || locationError}</p>
                    </div>
                )}

                {/* Location Status */}
                {!userLocation && !error && !locationError && permissionState === 'prompt' && (
                    <div className="mb-6 p-4 bg-yellow-50 text-yellow-700 rounded-md">
                        <p className="font-medium">Location Access Required</p>
                        <p className="mt-1">To find nearby hospitals, we need access to your location. Click the "Enable Location Services" button above and allow location access when prompted by your browser.</p>
                    </div>
                )}

                {/* Results */}
                {loading ? (
                    <div className="text-center py-12">
                        <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-2 text-gray-600">Searching for nearby hospitals...</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.isArray(hospitals) && hospitals.map((hospital) => (
                                <HospitalCard 
                                    key={hospital._id} 
                                    hospital={hospital}
                                    distance={hospital.distance ? Math.round(hospital.distance / 1000) : null}
                                />
                            ))}
                        </div>

                        {/* No Results */}
                        {!loading && hospitals.length === 0 && userLocation && !error && (
                            <div className="text-center py-12">
                                <p className="text-gray-500">
                                    No hospitals found within {maxDistance} kilometers of your location
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FindNearbyHospitals; 
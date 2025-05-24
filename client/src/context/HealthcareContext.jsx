import React, { createContext, useContext, useState, useEffect } from 'react';

const HealthcareContext = createContext();

export const useHealthcare = () => {
    const context = useContext(HealthcareContext);
    if (!context) {
        throw new Error('useHealthcare must be used within a HealthcareProvider');
    }
    return context;
};

export const HealthcareProvider = ({ children }) => {
    const [userLocation, setUserLocation] = useState(null);
    const [searchType, setSearchType] = useState('doctors'); // 'doctors' or 'hospitals'
    const [searchFilters, setSearchFilters] = useState({
        distance: 10,
        specialization: '',
        date: null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [permissionState, setPermissionState] = useState('prompt');

    useEffect(() => {
        // Check initial permission state
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' })
                .then(permissionStatus => {
                    setPermissionState(permissionStatus.state);
                    
                    // Listen for permission changes
                    permissionStatus.onchange = () => {
                        setPermissionState(permissionStatus.state);
                        if (permissionStatus.state === 'granted') {
                            getUserLocation();
                        } else if (permissionStatus.state === 'denied') {
                            setError('Location access was denied. Please enable location access in your browser settings.');
                        }
                    };
                })
                .catch(() => {
                    // If permissions API is not supported, we'll handle it in getUserLocation
                    setPermissionState('prompt');
                });
        }
    }, []);

    const getUserLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const error = new Error('Geolocation is not supported by your browser');
                setError(error.message);
                setPermissionState('denied');
                reject(error);
                return;
            }

            // Set a timeout for the geolocation request
            const timeoutId = setTimeout(() => {
                const error = new Error('Location request timed out. Please try again.');
                setError(error.message);
                reject(error);
            }, 10000); // 10 second timeout

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    setUserLocation(location);
                    setError(null);
                    setPermissionState('granted');
                    resolve(location);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    let errorMessage;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access was denied. Please enable location access in your browser settings.';
                            setPermissionState('denied');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is unavailable. Please try again.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please try again.';
                            break;
                        default:
                            errorMessage = 'An error occurred while getting your location. Please try again.';
                    }
                    setError(errorMessage);
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    };

    const updateSearchFilters = (filters) => {
        setSearchFilters(prev => ({ ...prev, ...filters }));
    };

    const value = {
        userLocation,
        getUserLocation,
        searchType,
        setSearchType,
        searchFilters,
        updateSearchFilters,
        loading,
        setLoading,
        error,
        setError,
        permissionState
    };

    return (
        <HealthcareContext.Provider value={value}>
            {children}
        </HealthcareContext.Provider>
    );
};

export default HealthcareContext; 
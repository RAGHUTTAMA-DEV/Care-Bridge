import React from 'react';
import FindNearbyHospitals from '../components/FindNearbyHospitals';
import ErrorBoundary from '../components/ErrorBoundary';

const FindHealthcare = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <ErrorBoundary>
                <FindNearbyHospitals />
            </ErrorBoundary>
        </div>
    );
};

export default FindHealthcare; 
import React from 'react';

const HospitalCard = ({ hospital }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        {hospital.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {hospital.address}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">Phone:</span> {hospital.phone}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Email:</span> {hospital.email}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    View Details
                </button>
            </div>
        </div>
    );
};

export default HospitalCard; 
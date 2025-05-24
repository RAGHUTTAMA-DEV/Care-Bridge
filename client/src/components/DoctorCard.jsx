import React from 'react';

const DoctorCard = ({ doctor }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        Dr. {doctor.user.firstName} {doctor.user.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        {doctor.specialization}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                        ${doctor.consultationFee}
                    </p>
                    <p className="text-xs text-gray-500">Consultation Fee</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-gray-600">
                        <span className="font-medium">Experience:</span> {doctor.experience} years
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Languages:</span> {doctor.languages.join(', ')}
                    </p>
                </div>
                <div>
                    {doctor.qualifications && doctor.qualifications.length > 0 && (
                        <p className="text-sm text-gray-600">
                            <span className="font-medium">Qualifications:</span>{' '}
                            {doctor.qualifications.map(q => q.degree).join(', ')}
                        </p>
                    )}
                </div>
            </div>

            {doctor.bio && (
                <p className="mt-4 text-sm text-gray-600 line-clamp-2">
                    {doctor.bio}
                </p>
            )}

            <div className="mt-4 flex justify-end">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    View Details
                </button>
            </div>
        </div>
    );
};

export default DoctorCard; 
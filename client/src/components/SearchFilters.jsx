import React from 'react';

const SearchFilters = ({ searchType, filters, onFilterChange, onSearch }) => {
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        onFilterChange({ [name]: value });
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Distance Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Distance (km)
                    </label>
                    <input
                        type="number"
                        name="distance"
                        value={filters.distance}
                        onChange={handleInputChange}
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Specialization Filter (only for doctors) */}
                {searchType === 'doctors' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Specialization
                        </label>
                        <input
                            type="text"
                            name="specialization"
                            value={filters.specialization}
                            onChange={handleInputChange}
                            placeholder="e.g., Cardiology"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}

                {/* Date Filter (only for doctors) */}
                {searchType === 'doctors' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Preferred Date
                        </label>
                        <input
                            type="datetime-local"
                            name="date"
                            value={filters.date || ''}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}

                {/* Search Button */}
                <div className="md:col-span-3 flex justify-end">
                    <button
                        onClick={onSearch}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Search
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchFilters; 
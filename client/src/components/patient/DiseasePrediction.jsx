import React, { useState, useEffect, useRef } from 'react';
import diseasePredictionService from '../../services/diseasePrediction';

const DiseasePrediction = () => {
    const [symptoms, setSymptoms] = useState([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        loadSymptoms();

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadSymptoms = async () => {
        try {
            setLoading(true);
            const symptomsList = await diseasePredictionService.getSymptoms();
            setSymptoms(symptomsList);
        } catch (err) {
            setError('Failed to load symptoms. Please try again later.');
            console.error('Error loading symptoms:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredSymptoms = symptoms.filter(symptom =>
        symptom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSymptomToggle = (symptom) => {
        setSelectedSymptoms(prev => {
            if (prev.includes(symptom)) {
                return prev.filter(s => s !== symptom);
            }
            return [...prev, symptom];
        });
    };

    const handlePrediction = async () => {
        if (selectedSymptoms.length === 0) {
            setError('Please select at least one symptom');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setPrediction(null);
            
            const result = await diseasePredictionService.predictDisease(selectedSymptoms);
            setPrediction(result);
            setIsDropdownOpen(false);
        } catch (err) {
            setError('Failed to predict disease. Please try again.');
            console.error('Error predicting disease:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSelectedSymptoms([]);
        setPrediction(null);
        setError(null);
        setSearchTerm('');
    };

    if (loading && !symptoms.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8">Disease Prediction</h2>
                    
                    {error && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 animate-fade-in">
                            {error}
                        </div>
                    )}

                    <div className="mb-8 relative" ref={dropdownRef}>
                        <label className="block text-lg font-semibold text-gray-700 mb-3">
                            Select Your Symptoms
                        </label>
                        
                        <div className="relative">
                            <div
                                className="border-2 border-gray-200 rounded-lg p-3 min-h-[45px] cursor-pointer hover:border-blue-300 transition-colors"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                {selectedSymptoms.length === 0 ? (
                                    <span className="text-gray-400">Click to select symptoms...</span>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedSymptoms.map(symptom => (
                                            <span
                                                key={symptom}
                                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center"
                                            >
                                                {symptom}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSymptomToggle(symptom);
                                                    }}
                                                    className="ml-2 hover:text-blue-800"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                                    <div className="p-2 border-b">
                                        <input
                                            type="text"
                                            placeholder="Search symptoms..."
                                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {filteredSymptoms.map((symptom) => (
                                            <div
                                                key={symptom}
                                                className={`p-2 hover:bg-gray-50 cursor-pointer ${
                                                    selectedSymptoms.includes(symptom)
                                                        ? 'bg-blue-50'
                                                        : ''
                                                }`}
                                                onClick={() => handleSymptomToggle(symptom)}
                                            >
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSymptoms.includes(symptom)}
                                                        onChange={() => {}}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <span className="ml-3 text-gray-700">
                                                        {symptom}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredSymptoms.length === 0 && (
                                            <div className="p-4 text-center text-gray-500">
                                                No symptoms found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={handlePrediction}
                            disabled={loading || selectedSymptoms.length === 0}
                            className={`flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all
                                ${loading || selectedSymptoms.length === 0
                                    ? 'bg-blue-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}
                            `}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Analyzing...
                                </span>
                            ) : 'Predict Disease'}
                        </button>

                        <button
                            onClick={handleReset}
                            className="px-6 py-3 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    {prediction && (
                        <div className="bg-green-50 rounded-xl p-6 animate-fade-in">
                            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                                Prediction Result
                            </h3>
                            <div className="mb-4">
                                <span className="font-medium text-gray-700">Predicted Disease: </span>
                                <span className="text-blue-700 font-semibold text-lg">
                                    {prediction.disease}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-700">Precautions:</span>
                                <ul className="mt-3 space-y-3">
                                    {prediction.precautions.map((precaution, index) => (
                                        <li key={index} className="text-gray-600 flex items-start bg-white p-3 rounded-lg shadow-sm">
                                            <span className="text-green-500 mr-3 text-lg">•</span>
                                            {precaution}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiseasePrediction;
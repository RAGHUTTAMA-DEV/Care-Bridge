import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { doctorService } from '../../services/api';

const DoctorProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [formData, setFormData] = useState({
        specialization: '',
        experience: '',
        consultationFee: '',
        languages: '',
        bio: '',
        address: '',
        availability: {
            day: 'Monday',
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: true
        },
        qualification: {
            degree: '',
            institution: '',
            year: ''
        },
        achievement: {
            title: '',
            year: '',
            description: ''
        }
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await doctorService.getProfile();
            setProfile(response.data);
            setFormData(prev => ({
                ...prev,
                specialization: response.data.specialization || '',
                experience: response.data.experience || '',
                consultationFee: response.data.consultationFee || '',
                languages: response.data.languages?.join(', ') || '',
                bio: response.data.bio || '',
                address: response.data.address || ''
            }));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvailabilityChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            availability: {
                ...prev.availability,
                [name]: value
            }
        }));
    };

    const handleQualificationChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            qualification: {
                ...prev.qualification,
                [name]: value
            }
        }));
    };

    const handleAchievementChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            achievement: {
                ...prev.achievement,
                [name]: value
            }
        }));
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const updateData = {
                specialization: formData.specialization,
                experience: parseInt(formData.experience),
                consultationFee: parseFloat(formData.consultationFee),
                languages: formData.languages.split(',').map(lang => lang.trim()),
                bio: formData.bio,
                address: formData.address
            };
            const response = await doctorService.updateProfile(updateData);
            setProfile(response.data);
            setError('Profile updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        }
    };

    const handleAvailabilityUpdate = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const { day, startTime, endTime, isAvailable } = formData.availability;
            const response = await doctorService.updateAvailability(day, {
                startTime,
                endTime,
                isAvailable
            });
            setProfile(response.data);
            setError('Availability updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update availability');
        }
    };

    const handleAddQualification = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const response = await doctorService.addQualification(formData.qualification);
            setProfile(response.data);
            setFormData(prev => ({
                ...prev,
                qualification: {
                    degree: '',
                    institution: '',
                    year: ''
                }
            }));
            setError('Qualification added successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add qualification');
        }
    };

    const handleAddAchievement = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const response = await doctorService.addAchievement(formData.achievement);
            setProfile(response.data);
            setFormData(prev => ({
                ...prev,
                achievement: {
                    title: '',
                    year: '',
                    description: ''
                }
            }));
            setError('Achievement added successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add achievement');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white shadow rounded-lg">
                {/* Profile Header */}
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Doctor Profile
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Manage your professional profile and availability
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        {['profile', 'availability', 'qualifications', 'achievements'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`${
                                    activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm capitalize`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Error Message */}
                {error && (
                    <div className={`p-4 ${
                        error.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                        {error}
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Specialization
                                </label>
                                <input
                                    type="text"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Years of Experience
                                </label>
                                <input
                                    type="number"
                                    name="experience"
                                    value={formData.experience}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Consultation Fee
                                </label>
                                <input
                                    type="number"
                                    name="consultationFee"
                                    value={formData.consultationFee}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Languages (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    name="languages"
                                    value={formData.languages}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full address for location-based search"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                                <p className="mt-1 text-sm text-gray-500">
                                    Your address will be used to help patients find you. Make sure to provide a complete and accurate address.
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Bio
                            </label>
                            <textarea
                                name="bio"
                                rows={4}
                                value={formData.bio}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Update Profile
                            </button>
                        </div>
                    </form>
                )}

                {/* Availability Tab */}
                {activeTab === 'availability' && (
                    <form onSubmit={handleAvailabilityUpdate} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Day
                                </label>
                                <select
                                    name="day"
                                    value={formData.availability.day}
                                    onChange={handleAvailabilityChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                >
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                        <option key={day} value={day}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Available
                                </label>
                                <div className="mt-1">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            name="isAvailable"
                                            checked={formData.availability.isAvailable}
                                            onChange={(e) => handleAvailabilityChange({
                                                target: {
                                                    name: 'isAvailable',
                                                    value: e.target.checked
                                                }
                                            })}
                                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                        />
                                        <span className="ml-2">Available on this day</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Start Time
                                </label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formData.availability.startTime}
                                    onChange={handleAvailabilityChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    End Time
                                </label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={formData.availability.endTime}
                                    onChange={handleAvailabilityChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Update Availability
                            </button>
                        </div>
                    </form>
                )}

                {/* Qualifications Tab */}
                {activeTab === 'qualifications' && (
                    <div className="p-6">
                        <form onSubmit={handleAddQualification} className="space-y-6 mb-8">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Degree
                                    </label>
                                    <input
                                        type="text"
                                        name="degree"
                                        value={formData.qualification.degree}
                                        onChange={handleQualificationChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Institution
                                    </label>
                                    <input
                                        type="text"
                                        name="institution"
                                        value={formData.qualification.institution}
                                        onChange={handleQualificationChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Year
                                    </label>
                                    <input
                                        type="number"
                                        name="year"
                                        value={formData.qualification.year}
                                        onChange={handleQualificationChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Add Qualification
                                </button>
                            </div>
                        </form>

                        {/* List of Qualifications */}
                        <div className="mt-8">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Current Qualifications</h4>
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {profile?.qualifications?.map((qual, index) => (
                                        <li key={index} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{qual.degree}</p>
                                                    <p className="text-sm text-gray-500">{qual.institution}</p>
                                                </div>
                                                <p className="text-sm text-gray-500">{qual.year}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Achievements Tab */}
                {activeTab === 'achievements' && (
                    <div className="p-6">
                        <form onSubmit={handleAddAchievement} className="space-y-6 mb-8">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.achievement.title}
                                        onChange={handleAchievementChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Year
                                    </label>
                                    <input
                                        type="number"
                                        name="year"
                                        value={formData.achievement.year}
                                        onChange={handleAchievementChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Description
                                </label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    value={formData.achievement.description}
                                    onChange={handleAchievementChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Add Achievement
                                </button>
                            </div>
                        </form>

                        {/* List of Achievements */}
                        <div className="mt-8">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Current Achievements</h4>
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {profile?.achievements?.map((achievement, index) => (
                                        <li key={index} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{achievement.title}</p>
                                                    <p className="text-sm text-gray-500">{achievement.description}</p>
                                                </div>
                                                <p className="text-sm text-gray-500">{achievement.year}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DoctorProfile; 
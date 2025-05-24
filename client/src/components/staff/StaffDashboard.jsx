import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hospitalService, doctorService, queueService } from '../../services/api';

const StaffDashboard = () => {
    const { user } = useAuth();
    const [hospital, setHospital] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [queues, setQueues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [selectedQueue, setSelectedQueue] = useState(null);
    const [formData, setFormData] = useState({
        doctorId: '',
        specialization: '',
        queueName: '',
        maxPatients: 20
    });

    useEffect(() => {
        if (user?.hospitalId) {
            fetchHospitalData();
        } else {
            setError('No hospital assigned to your account');
            setLoading(false);
        }
    }, [user]);

    const fetchHospitalData = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch hospital details
            const hospitalResponse = await hospitalService.getHospital(user.hospitalId);
            setHospital(hospitalResponse.data);

            // Fetch doctors and queues in parallel
            const [doctorsResponse, queuesResponse] = await Promise.all([
                hospitalService.getHospitalDoctors(user.hospitalId),
                queueService.getHospitalQueues(user.hospitalId)
            ]);

            // Extract doctors from the response
            const doctorsData = doctorsResponse.doctors || [];
            setDoctors(doctorsData);

            // Extract queues from the response
            const queuesData = queuesResponse.data || [];
            setQueues(queuesData);

            console.log('Fetched data:', {
                hospital: hospitalResponse.data,
                doctors: doctorsData,
                queues: queuesData
            });
        } catch (err) {
            console.error('Error fetching hospital data:', err);
            setError(err.response?.data?.message || 'Failed to fetch hospital data');
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

    const handleAssignDoctor = async (e) => {
        e.preventDefault();
        try {
            setError('');
            await hospitalService.assignDoctor(user.hospitalId, formData.doctorId);
            await fetchHospitalData();
            setFormData(prev => ({ ...prev, doctorId: '' }));
            setError('Doctor assigned successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign doctor');
        }
    };

    const handleRemoveDoctor = async (doctorId) => {
        try {
            setError('');
            await hospitalService.removeDoctor(user.hospitalId, doctorId);
            await fetchHospitalData();
            setError('Doctor removed successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove doctor');
        }
    };

    const handleCreateQueue = async (e) => {
        e.preventDefault();
        try {
            setError('');
            await queueService.createQueue(user.hospitalId, {
                name: formData.queueName,
                maxPatients: parseInt(formData.maxPatients),
                doctorId: selectedDoctor?._id
            });
            await fetchHospitalData();
            setFormData(prev => ({ ...prev, queueName: '', maxPatients: 20 }));
            setSelectedDoctor(null);
            setError('Queue created successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create queue');
        }
    };

    const handleUpdateQueueStatus = async (queueId, patientId, status) => {
        try {
            setError('');
            await queueService.updatePatientStatus(queueId, patientId, status);
            await fetchHospitalData();
            setError('Queue status updated successfully');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update queue status');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error && !hospital) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">
                            Error Loading Dashboard
                        </h2>
                        <p className="text-gray-600 mb-4">
                            {error}
                        </p>
                        <button
                            onClick={fetchHospitalData}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white shadow rounded-lg">
                {/* Dashboard Header */}
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Hospital Dashboard
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        {hospital?.name} - Manage doctors and queues
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        {['overview', 'doctors', 'queues'].map((tab) => (
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

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="p-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Doctors
                                    </dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {doctors.length}
                                    </dd>
                                </div>
                            </div>
                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Active Queues
                                    </dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {queues.filter(q => q.status === 'active').length}
                                    </dd>
                                </div>
                            </div>
                            <div className="bg-white overflow-hidden shadow rounded-lg">
                                <div className="px-4 py-5 sm:p-6">
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Patients in Queue
                                    </dt>
                                    <dd className="mt-1 text-3xl font-semibold text-gray-900">
                                        {queues.reduce((total, queue) => total + (queue.patients?.length || 0), 0)}
                                    </dd>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Doctors Tab */}
                {activeTab === 'doctors' && (
                    <div className="p-6">
                        {/* Assign Doctor Form */}
                        <form onSubmit={handleAssignDoctor} className="mb-8">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Doctor ID
                                    </label>
                                    <input
                                        type="text"
                                        name="doctorId"
                                        value={formData.doctorId}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Enter doctor's ID"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Assign Doctor
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Doctors List */}
                        <div className="mt-8">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Assigned Doctors</h4>
                            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                                <ul className="divide-y divide-gray-200">
                                    {doctors.map((doctor) => (
                                        <li key={doctor._id} className="px-6 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {doctor.firstName} {doctor.lastName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {doctor.specialization}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveDoctor(doctor._id)}
                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Queues Tab */}
                {activeTab === 'queues' && (
                    <div className="p-6">
                        {/* Create Queue Form */}
                        <form onSubmit={handleCreateQueue} className="mb-8">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Queue Name
                                    </label>
                                    <input
                                        type="text"
                                        name="queueName"
                                        value={formData.queueName}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Enter queue name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Max Patients
                                    </label>
                                    <input
                                        type="number"
                                        name="maxPatients"
                                        value={formData.maxPatients}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Create Queue
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Queues List */}
                        <div className="mt-8">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Active Queues</h4>
                            <div className="space-y-6">
                                {queues.map((queue) => (
                                    <div key={queue._id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                                        <div className="px-4 py-5 sm:px-6">
                                            <h5 className="text-lg font-medium text-gray-900">
                                                {queue.name}
                                            </h5>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Doctor: {queue.doctor?.firstName} {queue.doctor?.lastName}
                                            </p>
                                        </div>
                                        <div className="border-t border-gray-200">
                                            <ul className="divide-y divide-gray-200">
                                                {queue.patients.map((patient) => (
                                                    <li key={patient._id} className="px-4 py-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {patient.firstName} {patient.lastName}
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    Status: {patient.status}
                                                                </p>
                                                            </div>
                                                            <div className="flex space-x-2">
                                                                <button
                                                                    onClick={() => handleUpdateQueueStatus(queue._id, patient._id, 'in_progress')}
                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                >
                                                                    Start
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateQueueStatus(queue._id, patient._id, 'completed')}
                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                                >
                                                                    Complete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffDashboard; 
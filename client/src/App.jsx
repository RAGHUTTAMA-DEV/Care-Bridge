import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import ChatWidget from './components/ChatWidget';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import DoctorSearch from './components/doctor/DoctorSearch';
import HospitalSearch from './components/hospital/HospitalSearch';
import DoctorProfile from './components/doctor/DoctorProfile';
import HospitalDetails from './components/hospital/HospitalDetails';
import NotFound from './components/NotFound';
import NearbyDoctors from './components/doctor/NearbyDoctors';
import AppointmentList from './components/appointment/AppointmentList';
import BookAppointment from './components/appointment/BookAppointment';
import DoctorQueue from './components/appointment/DoctorQueue';
import StaffQueueManagement from './components/staff/StaffQueueManagement';
import JoinQueue from './components/appointment/JoinQueue';
import DoctorDashboard from './pages/DoctorDashboard';
import DiseasePrediction from './components/patient/DiseasePrediction';

// Protected Route component
const ProtectedRoute = ({ children, roles = [] }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <>
            <Navigation />
            {children}
        </>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <Router>
                <div className="relative">
                    <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Doctor Dashboard */}
                    <Route
                        path="/doctor/dashboard"
                        element={
                            <ProtectedRoute roles={['doctor']}>
                                <DoctorDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Appointment Routes */}
                    <Route
                        path="/appointments"
                        element={
                            <ProtectedRoute>
                                <AppointmentList />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/appointments/book/:doctorId"
                        element={
                            <ProtectedRoute roles={['patient']}>
                                <BookAppointment />
                            </ProtectedRoute>
                        }
                    />

                    {/* Disease Prediction Route */}
                    <Route
                        path="/disease-prediction"
                        element={
                            <ProtectedRoute roles={['patient']}>
                                <DiseasePrediction />
                            </ProtectedRoute>
                        }
                    />

                    {/* Queue Management Routes */}
                    <Route
                        path="/doctor/queue"
                        element={
                            <ProtectedRoute roles={['doctor']}>
                                <DoctorQueue />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/staff/queue-management"
                        element={
                            <ProtectedRoute roles={['staff']}>
                                <StaffQueueManagement />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/join-queue"
                        element={
                            <ProtectedRoute roles={['patient']}>
                                <JoinQueue />
                            </ProtectedRoute>
                        }
                    />

                    {/* Doctor Search */}
                    <Route
                        path="/doctors/search"
                        element={
                            <ProtectedRoute>
                                <DoctorSearch />
                            </ProtectedRoute>
                        }
                    />

                    {/* Hospital Search */}
                    <Route
                        path="/hospitals/search"
                        element={
                            <ProtectedRoute>
                                <HospitalSearch />
                            </ProtectedRoute>
                        }
                    />

                    {/* Doctor Routes */}
                    <Route
                        path="/doctor/profile"
                        element={
                            <ProtectedRoute roles={['doctor']}>
                                <DoctorProfile />
                            </ProtectedRoute>
                        }
                    />

                    {/* Hospital Routes */}
                    <Route
                        path="/hospital/:id"
                        element={
                            <ProtectedRoute>
                                <HospitalDetails />
                            </ProtectedRoute>
                        }
                    />

                    {/* Nearby Doctors */}
                    <Route
                        path="/doctors"
                        element={
                            <ProtectedRoute>
                                <NearbyDoctors />
                            </ProtectedRoute>
                        }
                    />

                    {/* Redirect root to dashboard if authenticated, otherwise to login */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <Navigate to="/dashboard" replace />
                            </ProtectedRoute>
                        }
                    />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                    </Routes>
                    <ChatWidget />
                </div>
            </Router>
        </AuthProvider>
    );
};

export default App; 
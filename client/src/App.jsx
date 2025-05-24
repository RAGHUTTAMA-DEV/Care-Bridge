import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navigation from './components/Navigation';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import DoctorSearch from './components/doctor/DoctorSearch';
import HospitalSearch from './components/hospital/HospitalSearch';
import DoctorProfile from './components/doctor/DoctorProfile';
import HospitalDetails from './components/hospital/HospitalDetails';
import NotFound from './components/NotFound';
import NearbyDoctors from './components/doctor/NearbyDoctors';

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
            </Router>
        </AuthProvider>
    );
};

export default App; 
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize authentication state
    useEffect(() => {
        const initAuth = () => {
            try {
                const currentUser = authService.getCurrentUser();
                const formattedUser = formatUserData(currentUser);
                if (formattedUser) {
                    setUser(formattedUser);
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
                // Clear invalid data
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const formatUserData = (data) => {
        if (!data) return null;
        return {
            id: data.id,
            email: data.email,
            role: data.role || 'patient',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phone: data.phone || '',
            hospitalId: data.hospitalId,
        };
    };

    const register = async (userData) => {
        try {
            setError(null);
            const data = await authService.register(userData);
            const formattedUser = formatUserData(data);
            if (data.token && formattedUser) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(formattedUser));
                setUser(formattedUser);
                return formattedUser;
            }
            throw new Error('Invalid response from server');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            throw err;
        }
    };

    const login = async (credentials) => {
        try {
            setError(null);
            const data = await authService.login(credentials);
            const formattedUser = formatUserData(data);
            if (data.token && formattedUser) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(formattedUser));
                setUser(formattedUser);
                return formattedUser;
            }
            throw new Error('Invalid response from server');
        } catch (err) {
            const errorMessage = err.message || 'Login failed';
            setError(errorMessage);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = {
        user,
        loading,
        error,
        register,
        login,
        logout,
        isAuthenticated: !!user,
        isStaff: user?.role === 'staff',
        isDoctor: user?.role === 'doctor',
        isPatient: user?.role === 'patient'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext; 
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to add auth token and log requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Log request details for debugging
        console.log('API Request:', {
            url: config.url,
            method: config.method,
            data: config.data,
            headers: { ...config.headers, Authorization: token ? 'Bearer [REDACTED]' : undefined }
        });
        return config;
    },
    (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor to handle common errors and log responses
api.interceptors.response.use(
    (response) => {
        // Log successful responses for debugging
        console.log('API Response:', {
            url: response.config.url,
            status: response.status,
            data: response.data
        });

        // Return the response data directly
        return response.data;
    },
    (error) => {
        // Log error responses for debugging
        console.error('API Error:', {
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            // Only redirect if we're not already on the login page
            if (!window.location.pathname.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            // Return a rejected promise with the error message from the server
            return Promise.reject(new Error(error.response?.data?.message || 'Authentication failed'));
        }

        // Handle other errors
        const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
        return Promise.reject(new Error(errorMessage));
    }
);

// Auth services
const authService = {
    register: async (userData) => {
        try {
            const data = await api.post('/auth/register', userData);
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));
            }
            return data;
        } catch (error) {
            throw error;
        }
    },
    login: async (credentials) => {
        try {
            const data = await api.post('/auth/login', credentials);
            if (!data || !data.token) {
                throw new Error('Invalid response from server');
            }
            return data;
        } catch (error) {
            throw error;
        }
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    },
    getCurrentUser: () => {
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return null;
            return JSON.parse(userStr);
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return null;
        }
    }
};

// Doctor services
const doctorService = {
    getProfile: () => api.get('/doctors/profile'),
    updateProfile: (profileData) => api.put('/doctors/profile', profileData),
    updateAvailability: (day, availability) => api.put(`/doctors/profile/availability/${day}`, availability),
    addQualification: (qualification) => api.post('/doctors/profile/qualifications', qualification),
    addAchievement: (achievement) => api.post('/doctors/profile/achievements', achievement),
    getHospitalDoctors: async (hospitalId) => {
        try {
            const response = await api.get(`/hospitals/${hospitalId}/doctors`);
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    },
    findNearbyDoctors: (params) => api.get('/doctors/near', { params }),
    findDoctorsBySpecialization: (specialization, params) => 
        api.get(`/doctors/specialization/${specialization}/near`, { params }),
    checkAvailability: (doctorId, date) => api.get(`/doctors/${doctorId}/availability`, { params: { date } }),
    searchDoctors: async (filters) => {
        try {
            const response = await api.get('/doctors/search', { params: filters });
            // Response interceptor already returns data directly
            return response;
        } catch (error) {
            throw handleApiError(error);
        }
    },
    getDoctorAvailability: async (doctorId, date) => {
        const params = date ? `?date=${date}` : '';
        const response = await api.get(`/doctors/${doctorId}/availability${params}`);
        return response.data;
    },
    getDoctorProfile: async () => {
        const response = await api.get('/doctors/profile');
        return response.data;
    },
    updateDoctorProfile: async (profileData) => {
        const response = await api.put('/doctors/profile', profileData);
        return response.data;
    },
    addQualification: async (qualificationData) => {
        const response = await api.post('/doctors/profile/qualifications', qualificationData);
        return response.data;
    },
    addAchievement: async (achievementData) => {
        const response = await api.post('/doctors/profile/achievements', achievementData);
        return response.data;
    }
};

// Hospital services
const hospitalService = {
    createHospital: (hospitalData) => api.post('/hospitals', hospitalData),
    getAllHospitals: () => api.get('/hospitals'),
    getHospital: (id) => api.get(`/hospitals/${id}`),
    updateHospital: (id, hospitalData) => api.put(`/hospitals/${id}`, hospitalData),
    assignDoctor: (hospitalId, doctorId) => api.post(`/hospitals/${hospitalId}/doctors/${doctorId}`),
    removeDoctor: (hospitalId, doctorId) => api.delete(`/hospitals/${hospitalId}/doctors/${doctorId}`),
    getHospitalDoctors: (hospitalId) => api.get(`/hospitals/${hospitalId}/doctors`),
    findNearbyHospitals: ({ latitude, longitude, maxDistance }) => 
        api.get('/hospitals/near', { params: { latitude, longitude, maxDistance } }),
    getNearbyHospitals: async (latitude, longitude, maxDistance = 10000) => {
        try {
            const response = await api.get(`/hospitals/near`, {
                params: { latitude, longitude, maxDistance }
            });
            return response.data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
};

// Queue services
const queueService = {
    // Get all queues for a hospital
    getHospitalQueues: async (hospitalId) => {
        try {
            const response = await api.get(`/queues/hospital/${hospitalId}`);
            console.log('Queue API Response:', response);
            return response.data;
        } catch (error) {
            console.error('Error fetching hospital queues:', error);
            throw error;
        }
    },

    // Get queue by ID
    getQueueById: async (queueId) => {
        try {
            const response = await api.get(`/queues/${queueId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching queue:', error);
            throw error;
        }
    },

    // Add patient to queue
    addPatientToQueue: async (queueId, patientId, reason, appointmentTime) => {
        try {
            const response = await api.post(`/queues/${queueId}/patients`, {
                patientId,
                reason,
                appointmentTime: appointmentTime || new Date(),
                status: 'waiting',
                priority: 'normal'
            });
            console.log('Add patient response:', response);
            return response.data;
        } catch (error) {
            console.error('Error adding patient to queue:', error);
            throw error;
        }
    },

    // Update patient status in queue
    updatePatientStatus: async (queueId, patientId, status) => {
        try {
            const response = await api.put(`/queues/${queueId}/patients/${patientId}`, {
                status
            });
            return response.data;
        } catch (error) {
            console.error('Error updating patient status:', error);
            throw error;
        }
    },

    // Remove patient from queue
    removePatientFromQueue: async (queueId, patientId) => {
        try {
            const response = await api.delete(`/queues/${queueId}/patients/${patientId}`);
            return response.data;
        } catch (error) {
            console.error('Error removing patient from queue:', error);
            throw error;
        }
    },

    // Get patient's current queue
    getPatientQueue: async (patientId) => {
        try {
            const response = await api.get(`/queues/patient/${patientId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching patient queue:', error);
            throw error;
        }
    },

    // Get doctor's queue
    getDoctorQueue: async (doctorId) => {
        try {
            if (!doctorId) {
                throw new Error('Doctor ID is required');
            }

            const response = await api.get(`/queues/doctor/${doctorId}`);
            console.log('Doctor queue response:', response);

            // Ensure we're returning an array
            if (!Array.isArray(response)) {
                console.warn('Expected array response for doctor queue, got:', typeof response);
                return Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
            }

            return response;
        } catch (error) {
            console.error('Error fetching doctor queue:', error);
            // Enhance error message with more details
            const enhancedError = new Error(
                error.response?.data?.message || 
                error.message || 
                'Failed to fetch doctor queue'
            );
            enhancedError.status = error.response?.status;
            enhancedError.data = error.response?.data;
            throw enhancedError;
        }
    },

    // Update queue status
    updateQueueStatus: async (queueId, status) => {
        try {
            const response = await api.put(`/queues/${queueId}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating queue status:', error);
            throw error;
        }
    },

    // Update queue average wait time
    updateQueueWaitTime: async (queueId, averageWaitTime) => {
        try {
            const response = await api.put(`/queues/${queueId}/wait-time`, { averageWaitTime });
            return response.data;
        } catch (error) {
            console.error('Error updating queue wait time:', error);
            throw error;
        }
    }
};

// Appointment Service
const appointmentService = {
    // Get appointments with filters
    getAppointments: async (filters = {}) => {
        try {
            const queryParams = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value);
                }
            });
            const response = await api.get(`/appointments?${queryParams.toString()}`);
            return response;
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
            throw error;
        }
    },

    // Request a new appointment
    requestAppointment: async (appointmentData) => {
        try {
            const response = await api.post('/appointments', {
                ...appointmentData,
                status: 'pending',
                approvalStatus: 'pending'
            });
            return response;
        } catch (error) {
            console.error('Failed to request appointment:', error);
            throw error;
        }
    },

    // Update appointment approval status (doctor only)
    updateAppointmentApproval: async (appointmentId, { approvalStatus, approvalMessage }) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/approval`, {
                approvalStatus,
                approvalMessage
            });
            return response;
        } catch (error) {
            console.error('Failed to update appointment approval:', error);
            throw error;
        }
    },

    // Update appointment status
    updateAppointmentStatus: async (appointmentId, status) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/status`, { status });
            return response;
        } catch (error) {
            console.error('Failed to update appointment status:', error);
            throw error;
        }
    },

    // Add message to appointment
    addAppointmentMessage: async (appointmentId, message) => {
        try {
            const response = await api.post(`/appointments/${appointmentId}/messages`, { message });
            return response;
        } catch (error) {
            console.error('Failed to add appointment message:', error);
            throw error;
        }
    },

    // Mark messages as read
    markMessagesAsRead: async (appointmentId) => {
        try {
            const response = await api.patch(`/appointments/${appointmentId}/messages/read`);
            return response;
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
            throw error;
        }
    },

    // Cancel appointment
    cancelAppointment: async (appointmentId, reason) => {
        try {
            const response = await api.delete(`/appointments/${appointmentId}`, {
                data: { reason }
            });
            return response;
        } catch (error) {
            console.error('Failed to cancel appointment:', error);
            throw error;
        }
    },

    // Get appointment details
    getAppointmentDetails: async (appointmentId) => {
        try {
            const response = await api.get(`/appointments/${appointmentId}`);
            return response;
        } catch (error) {
            console.error('Failed to get appointment details:', error);
            throw error;
        }
    }
};

// Export all services
export {
    authService,
    doctorService,
    hospitalService,
    queueService,
    appointmentService
};

export default api;
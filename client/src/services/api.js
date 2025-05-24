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
export const authService = {
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
export const doctorService = {
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
            return response.data;
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
export const hospitalService = {
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
export const queueService = {
    createQueue: (queueData) => api.post('/queues', queueData),
    addPatientToQueue: (queueId, patientData) => api.post(`/queues/${queueId}/patients`, patientData),
    updatePatientStatus: (queueId, patientId, status) => 
        api.put(`/queues/${queueId}/patients/${patientId}`, { status }),
    getQueueStatus: (queueId) => api.get(`/queues/${queueId}`),
    getDoctorQueues: (doctorId, date) => api.get(`/queues/doctor/${doctorId}`, { params: { date } }),
    updateQueueStatus: (queueId, status) => api.put(`/queues/${queueId}/status`, { status }),
    getHospitalQueues: (hospitalId) => api.get(`/queues/hospital/${hospitalId}`)
};

// Appointment Service
export const appointmentService = {
    // Book a new appointment
    bookAppointment: async (appointmentData) => {
        const response = await api.post('/appointments', appointmentData);
        return response.data;
    },

    // Get appointments for the current user
    getAppointments: async (filters = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value);
            }
        });
        const response = await api.get(`/appointments?${params.toString()}`);
        return response.data;
    },

    // Get doctor's queue
    getDoctorQueue: async (doctorId) => {
        const response = await api.get(`/appointments/queue/${doctorId}`);
        return response.data;
    },

    // Update appointment status
    updateAppointmentStatus: async (appointmentId, statusData) => {
        const response = await api.patch(`/appointments/${appointmentId}/status`, statusData);
        return response.data;
    },

    // Cancel appointment
    cancelAppointment: async (appointmentId) => {
        const response = await api.delete(`/appointments/${appointmentId}`);
        return response.data;
    }
};

export default api; 
import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (token) => {
    if (!socket) {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        
        socket = io(API_URL, {
            auth: {
                token
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socket.on('connect', () => {
            console.log('Socket connected successfully');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }
    return socket;
};

export const getSocket = () => {
    if (!socket) {
        throw new Error('Socket not initialized. Call initializeSocket first.');
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// Queue event handlers
export const subscribeToQueueUpdates = (hospitalId, callback) => {
    const socket = getSocket();
    const eventName = `queue_update:${hospitalId}`;
    
    socket.off(eventName);
    
    socket.on(eventName, (data) => {
        console.log(`Received queue update for hospital ${hospitalId}:`, data);
        callback(data);
    });
    
    return () => {
        console.log(`Unsubscribing from queue updates for hospital ${hospitalId}`);
        socket.off(eventName);
    };
};

export const subscribeToPatientUpdates = (patientId, callback) => {
    const socket = getSocket();
    const eventName = `patient_update:${patientId}`;
    
    socket.off(eventName);
    
    socket.on(eventName, (data) => {
        console.log(`Received patient update for patient ${patientId}:`, data);
        callback(data);
    });
    
    return () => {
        console.log(`Unsubscribing from patient updates for patient ${patientId}`);
        socket.off(eventName);
    };
}; 
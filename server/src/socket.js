const socketIO = require('socket.io');
let io;

const initializeSocket = (server) => {
    io = socketIO(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Join hospital room
        socket.on('join:hospital', (hospitalId) => {
            if (hospitalId) {
                socket.join(`hospital:${hospitalId}`);
                console.log(`Socket ${socket.id} joined hospital room: ${hospitalId}`);
            }
        });

        // Join patient room
        socket.on('join:patient', (patientId) => {
            if (patientId) {
                socket.join(`patient:${patientId}`);
                socket.join(`user:${patientId}`);
                console.log(`Socket ${socket.id} joined patient room: ${patientId}`);
            }
        });

        // Join doctor room
        socket.on('join:doctor', (doctorId) => {
            if (doctorId) {
                socket.join(`doctor:${doctorId}`);
                socket.join(`user:${doctorId}`);
                console.log(`Socket ${socket.id} joined doctor room: ${doctorId}`);
            }
        });

        // Join user room (for general notifications)
        socket.on('join:user', (userId) => {
            if (userId) {
                socket.join(`user:${userId}`);
                console.log(`Socket ${socket.id} joined user room: ${userId}`);
            }
        });

        // Handle appointment events
        socket.on('appointment:request', (data) => {
            const { doctorId, patientId } = data;
            if (doctorId) {
                io.to(`doctor:${doctorId}`).emit('appointment:request', data);
            }
            if (patientId) {
                io.to(`patient:${patientId}`).emit('appointment:request', data);
            }
        });

        socket.on('appointment:update', (data) => {
            const { doctorId, patientId } = data;
            if (doctorId) {
                io.to(`doctor:${doctorId}`).emit('appointment:update', data);
            }
            if (patientId) {
                io.to(`patient:${patientId}`).emit('appointment:update', data);
            }
        });

        socket.on('appointment:message', (data) => {
            const { appointmentId, recipientId } = data;
            if (recipientId) {
                io.to(`user:${recipientId}`).emit('appointment:message', data);
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

// Export both the io instance and the initialization function
module.exports = {
    io: null, // Will be set after initialization
    initializeSocket: (server) => {
        io = initializeSocket(server);
        module.exports.io = io; // Update the exported io instance
        return io;
    }
}; 
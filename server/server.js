// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const hospitalRoutes = require('./src/routes/hospitalRoutes');
const queueRoutes = require('./src/routes/queueRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');

// Check required environment variables
const requiredEnvVars = {
    MONGODB_URI: 'MongoDB connection string',
    JWT_SECRET: 'JWT secret key for authentication'
};

for (const [key, desc] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
        console.error(`${key} (${desc}) is not defined in environment variables`);
        process.exit(1);
    }
}

// API configuration (optional for chat/image analysis features)
const API_KEY = process.env.OPENAI_API_KEY;
const API_BASE_URL = 'https://api.openai.com/v1';

// Just log a warning if OpenAI API key is missing, don't prevent server startup
if (!API_KEY) {
    console.warn('\nOpenAI API key not found - chat and image analysis features will be disabled');
    console.warn('To enable these features, add OPENAI_API_KEY to your .env file\n');
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Helper functions
const callAPI = async (endpoint, data, headers = {}) => {
    try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': '*/*',
                ...headers
            }
        });
        return response.data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error.response?.data || error.message);
        throw error;
    }
};

const mockOcrResponse = (text) => ({
    pages: [{
        text: text || 'Sample medical report text. Patient shows normal vital signs...',
        page_number: 1
    }]
});

// Socket.io configuration
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Configure middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
    credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Connection with error handling
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected successfully');
    // Start the server only after successful database connection
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// API routes
const apiRouter = express.Router();

// Chat endpoint
apiRouter.post('/chat', async (req, res) => {
    if (!API_KEY) {
        return res.status(503).json({ error: 'Chat feature is not available - OpenAI API key not configured' });
    }

    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Sending chat message:', message);

        const apiResponse = await callAPI('/chat/completions', {
            model: "gpt-4",
            messages: [
                { role: "user", content: message }
            ]
        });

        const responseText = apiResponse.choices?.[0]?.message?.content;
        if (!responseText) {
            throw new Error('Invalid response from chat API');
        }

        console.log('Chat response received');
        res.json({ response: responseText });

    } catch (error) {
        console.error('Chat error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error.response?.data || error.message
        });
    }
});

// Image analysis endpoint
apiRouter.post('/analyze-image', async (req, res) => {
    if (!API_KEY) {
        return res.status(503).json({ error: 'Image analysis feature is not available - OpenAI API key not configured' });
    }

    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        console.log('Processing image...');
        const ocrResponse = mockOcrResponse();
        const extractedText = ocrResponse.pages[0].text;

        const analysisResponse = await callAPI('/chat/completions', {
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a medical expert. Analyze the given medical report text and provide a clear summary."
                },
                {
                    role: "user",
                    content: `Analyze this medical report text and provide a clear summary:\n\n${extractedText}`
                }
            ]
        });

        const analysis = analysisResponse.choices?.[0]?.message?.content;
        if (!analysis) {
            throw new Error('Failed to analyze the medical text');
        }

        res.json({
            text: extractedText,
            analysis: analysis
        });

    } catch (error) {
        console.error('Image analysis error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to analyze image',
            details: error.response?.data || error.message
        });
    }
});

// Mount API routes
app.use('/api', apiRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    // Join hospital room for queue updates
    socket.on('join-hospital', (hospitalId) => {
        socket.join(`hospital-${hospitalId}`);
        console.log(`Socket ${socket.id} joined hospital-${hospitalId}`);
    });

    // Join patient room for personal updates
    socket.on('join-patient', (patientId) => {
        socket.join(`patient-${patientId}`);
        console.log(`Socket ${socket.id} joined patient-${patientId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Make io accessible to routes
app.set('io', io);

// Queue event emitter
const emitQueueUpdate = (hospitalId, queueData) => {
    io.to(`hospital-${hospitalId}`).emit('queue-update', queueData);
};

const emitPatientUpdate = (patientId, queueData) => {
    io.to(`patient-${patientId}`).emit('patient-queue-update', queueData);
};

// Export the emit functions
module.exports = { server, emitQueueUpdate, emitPatientUpdate };

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/appointments', appointmentRoutes);

// Basic route for testing
app.get('/', (req, res) => {
    res.send('CareBridge Backend is running!');
});

// Error handling middleware with detailed logging
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
    });
    
    // Send appropriate error response
    res.status(err.status || 500).json({
        message: err.message || 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
}); 

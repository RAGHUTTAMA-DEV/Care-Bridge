// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cron = require('node-cron');
const { generateDailyQueues } = require('./src/services/queueGenerationService');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const hospitalRoutes = require('./src/routes/hospitalRoutes');
const queueRoutes = require('./src/routes/queueRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');

// Check required environment variables
if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
}

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not defined in environment variables');
    process.exit(1);
}

// API configuration
const API_KEY = 'ad7fc0396a7341249d50805b747ce132';
const API_BASE_URL = 'https://api.aimlapi.com/v1';

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
const configureSocketIO = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('New client connected');

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });

        // Add more socket event handlers here
    });

    return io;
};

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

// API routes
const apiRouter = express.Router();

// Chat endpoint
apiRouter.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Sending chat message:', message);

        const apiResponse = await callAPI('/chat/completions', {
            model: "gpt-4o",
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
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        console.log('Processing image...');
        const ocrResponse = mockOcrResponse();
        const extractedText = ocrResponse.pages[0].text;

        const analysisResponse = await callAPI('/chat/completions', {
            model: "gpt-4o",
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

// Initialize Socket.IO
const io = configureSocketIO(server);

// Database connection and server startup
const startServer = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');

        // Generate queues on server startup
        try {
            await generateDailyQueues();
            console.log('Initial queue generation completed');
        } catch (error) {
            console.error('Failed to generate initial queues:', error);
        }

        // Schedule daily queue generation at midnight
        cron.schedule('0 0 * * *', async () => {
            try {
                await generateDailyQueues();
                console.log('Daily queue generation completed');
            } catch (error) {
                console.error('Failed to generate daily queues:', error);
            }
        });

        // Start the server
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            if (API_KEY) {
                console.log(`API Key configured: ${API_KEY.slice(0,4)}...${API_KEY.slice(-4)}`);
            } else {
                console.warn('API Key not configured');
            }
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

// Start the server
startServer();

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

import axios from 'axios';

const API_URL = 'http://localhost:5001/api';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Service for disease prediction functionality
 * @class DiseasePredictionService
 */
class DiseasePredictionService {
    constructor() {
        this.client = axios.create({
            baseURL: API_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            }
        });
        this.symptomsCache = {
            data: null,
            timestamp: null
        };
    }

    /**
     * Validates the symptoms array
     * @param {string[]} symptoms - Array of symptom strings
     * @throws {Error} If symptoms validation fails
     */
    validateSymptoms(symptoms) {
        if (!Array.isArray(symptoms)) {
            throw new Error('Symptoms must be an array');
        }
        if (symptoms.length === 0) {
            throw new Error('At least one symptom is required');
        }
        if (!symptoms.every(symptom => typeof symptom === 'string')) {
            throw new Error('All symptoms must be strings');
        }
    }

    /**
     * Fetches the list of available symptoms
     * @returns {Promise<string[]>} Array of available symptoms
     * @throws {Error} If fetching symptoms fails
     */
    async getSymptoms() {
        try {
            // Check cache first
            if (this.symptomsCache.data && 
                (Date.now() - this.symptomsCache.timestamp) < CACHE_DURATION) {
                return this.symptomsCache.data;
            }

            const response = await this.client.get('/symptoms');
            const symptoms = response.data.symptoms;

            // Update cache
            this.symptomsCache = {
                data: symptoms,
                timestamp: Date.now()
            };

            return symptoms;
        } catch (error) {
            return this.handleError('Failed to fetch symptoms', error);
        }
    }

    /**
     * Predicts disease based on provided symptoms
     * @param {string[]} symptoms - Array of symptom strings
     * @returns {Promise<{disease: string, precautions: string[]}>} Predicted disease and precautions
     * @throws {Error} If prediction fails or validation fails
     */
    async predictDisease(symptoms) {
        try {
            this.validateSymptoms(symptoms);

            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                try {
                    const response = await this.client.post('/predict', { symptoms });
                    return {
                        disease: response.data.disease,
                        precautions: response.data.precautions
                    };
                } catch (error) {
                    attempts++;
                    if (attempts === maxAttempts || !this.isRetryableError(error)) {
                        throw error;
                    }
                    await this.delay(1000 * attempts); // Exponential backoff
                }
            }
        } catch (error) {
            return this.handleError('Failed to predict disease', error);
        }
    }

    /**
     * Checks if the error is retryable
     * @param {Error} error - The error to check
     * @returns {boolean} Whether the error is retryable
     */
    isRetryableError(error) {
        return (
            !error.response || // Network errors
            error.response.status === 429 || // Rate limiting
            error.response.status >= 500 // Server errors
        );
    }

    /**
     * Handles service errors
     * @param {string} message - Error message prefix
     * @param {Error} error - The error object
     * @throws {Error} Enhanced error with detailed message
     */
    handleError(message, error) {
        console.error(message, error);
        const errorMessage = error.response?.data?.error || error.message;
        const errorDetails = error.response?.data?.details || '';
        throw new Error(`${message}: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`);
    }

    /**
     * Utility method for delay
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clears the symptoms cache
     */
    clearCache() {
        this.symptomsCache = {
            data: null,
            timestamp: null
        };
    }
}

// Create a singleton instance
const diseasePredictionService = new DiseasePredictionService();

export default diseasePredictionService;
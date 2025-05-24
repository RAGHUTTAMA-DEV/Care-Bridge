import { FlaskApiAdapter } from './adapters/FlaskApiAdapter';

// Create API adapter instance
// You can swap this with any other adapter that implements the ApiAdapter interface
const apiAdapter = new FlaskApiAdapter();

// API service with error handling
const api = {
  // Get all available symptoms
  getSymptoms: async () => {
    const response = await apiAdapter.getSymptoms();
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Send selected symptoms and get prediction
  predictDisease: async (symptoms) => {
    const response = await apiAdapter.predictDisease(symptoms);
    if (!response.success) {
      throw new Error(response.error);
    }
    return {
      disease: response.data.disease,
      precautions: response.data.precautions
    };
  }
};

export default api;

// Example of how to create an adapter for a different backend:
/*
export class DjangoApiAdapter extends ApiAdapter {
  constructor() {
    super();
    this.client = axios.create({
      baseURL: 'http://your-django-api.com/api',
      timeout: 5000
    });
  }

  async getSymptoms() {
    try {
      const response = await this.client.get('/symptoms/');
      return ApiResponse.success(response.data.results);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async predictDisease(symptoms) {
    try {
      const response = await this.client.post('/predict/', {
        symptom_list: symptoms
      });
      
      return ApiResponse.success(
        new PredictionResult(
          response.data.predicted_disease,
          response.data.recommended_precautions
        )
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    // Handle Django REST framework specific error responses
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      errorMessage = error.response.data.detail || 
                    error.response.data.message ||
                    error.response.data.error;
    } else if (error.request) {
      errorMessage = 'Unable to connect to the server';
    } else {
      errorMessage = error.message;
    }

    return ApiResponse.error(errorMessage);
  }
}
*/
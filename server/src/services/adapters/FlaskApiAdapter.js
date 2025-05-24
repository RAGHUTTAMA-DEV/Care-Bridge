import axios from 'axios';
import { ApiAdapter, ApiResponse, PredictionResult } from './ApiAdapter';
import API_CONFIG from '../../config/api.config';

export class FlaskApiAdapter extends ApiAdapter {
  constructor() {
    super();
    this.client = axios.create({
      baseURL: API_CONFIG.baseUrl,
      timeout: API_CONFIG.timeouts.default
    });
  }

  async getSymptoms() {
    try {
      const response = await this.client.get(API_CONFIG.endpoints.symptoms);
      return ApiResponse.success(response.data.symptoms);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async predictDisease(symptoms) {
    try {
      const response = await this.client.post(API_CONFIG.endpoints.predict, {
        symptoms
      });
      
      return ApiResponse.success(
        new PredictionResult(
          response.data.disease,
          response.data.precautions
        )
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    let errorMessage = 'An unexpected error occurred';

    if (error.response) {
      // Server responded with error
      errorMessage = error.response.data.error || error.response.data.message;
    } else if (error.request) {
      // Request made but no response
      errorMessage = 'Unable to connect to the server';
    } else {
      // Error in request setup
      errorMessage = error.message;
    }

    return ApiResponse.error(errorMessage);
  }
}
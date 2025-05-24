// Abstract class for API adapters
export class ApiAdapter {
  async getSymptoms() {
    throw new Error('getSymptoms method must be implemented');
  }

  async predictDisease(symptoms) {
    throw new Error('predictDisease method must be implemented');
  }

  handleError(error) {
    throw new Error('handleError method must be implemented');
  }
}

// Interface for prediction result
export class PredictionResult {
  constructor(disease, precautions) {
    this.disease = disease;
    this.precautions = precautions;
  }
}

// Interface for API response
export class ApiResponse {
  constructor(success, data, error = null) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  static success(data) {
    return new ApiResponse(true, data);
  }

  static error(error) {
    return new ApiResponse(false, null, error);
  }
}
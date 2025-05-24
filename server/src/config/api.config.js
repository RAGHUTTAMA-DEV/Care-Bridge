const API_CONFIG = {
  baseUrl: 'http://localhost:5000',  // Flask ML service
  endpoints: {
    symptoms: '/api/symptoms',
    predict: '/api/predict'
  },
  timeouts: {
    default: 5000,  // 5 seconds
    predict: 10000  // 10 seconds for predictions
  }
};

export default API_CONFIG;
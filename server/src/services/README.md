# Disease Prediction API Integration

This directory contains the API integration layer for the Disease Prediction system. It uses an adapter pattern to make it easy to integrate with different backend implementations.

## Structure


```
services/
├── adapters/
│   ├── ApiAdapter.js     # Base adapter interface
│   └── FlaskApiAdapter.js # Flask implementation
├── api.js               # Main API service
└── README.md           # This file
```


## How to Add a New Backend

1. Create a new adapter in the `adapters` directory that extends `ApiAdapter`
2. Implement the required methods:
   - `getSymptoms()`
   - `predictDisease(symptoms)`
   - `handleError(error)`
3. Update `api.js` to use your new adapter

### Example Implementation

```javascript
import { ApiAdapter, ApiResponse, PredictionResult } from './ApiAdapter';

export class NewBackendAdapter extends ApiAdapter {
  constructor() {
    super();
    this.client = // Your HTTP client setup
  }

  async getSymptoms() {
    // Implement symptoms retrieval
  }

  async predictDisease(symptoms) {
    // Implement disease prediction
  }

  handleError(error) {
    // Implement error handling
  }
}
```

## API Response Format

The API adapters return standardized responses using the `ApiResponse` class:

```javascript
{
  success: boolean,
  data: {
    // For getSymptoms():
    symptoms: string[]
    
    // For predictDisease():
    disease: string,
    precautions: string[]
  },
  error: string | null
}
```

## Configuration

API endpoints and settings are managed in `config/api.config.js`. Update this file to match your backend configuration.

## Usage

```javascript
import api from './services/api';

// Get symptoms
const symptoms = await api.getSymptoms();

// Predict disease
const prediction = await api.predictDisease(['symptom1', 'symptom2']);
```

## Error Handling

All API calls are wrapped with proper error handling. Errors are standardized across different backend implementations through the adapter pattern.
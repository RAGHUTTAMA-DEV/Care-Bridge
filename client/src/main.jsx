import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { HealthcareProvider } from './context/HealthcareContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <HealthcareProvider>
                <App />
            </HealthcareProvider>
        </AuthProvider>
    </React.StrictMode>
); 
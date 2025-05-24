from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import numpy as np

app = Flask(__name__)
CORS(app) 


model = joblib.load('server/models/disease_model.pkl')
mlb = joblib.load('server/models/symptom_encoder.pkl')
precaution_mapping = joblib.load('server/models/precaution_mapping.pkl')

@app.route('/api/symptoms', methods=['GET'])
def get_symptoms():
    """Return list of all possible symptoms"""
    all_symptoms = mlb.classes_.tolist()
    return jsonify({
        'symptoms': all_symptoms
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    """Predict disease based on provided symptoms"""
    try:
        data = request.get_json()
        selected_symptoms = data.get('symptoms', [])
        
        if not selected_symptoms:
            return jsonify({
                'error': 'No symptoms provided'
            }), 400

        input_data = mlb.transform([selected_symptoms])
        prediction = model.predict(input_data)[0]
        precautions = precaution_mapping.get(prediction, ["No data available"])

        return jsonify({
            'disease': prediction,
            'precautions': precautions
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
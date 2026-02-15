from flask import Flask, request, jsonify
import redis
import json
import os
from datetime import datetime
import numpy as np
from models.scoring_model import ScoringModel

app = Flask(__name__)

# Redis connection
redis_client = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=6379, decode_responses=True)

# Initialize ML model
scoring_model = ScoringModel()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "ai-scoring-service"})

@app.route('/score', methods=['POST'])
def score_driver():
    """
    Score a driver for assignment using AI model
    """
    try:
        data = request.get_json()

        # Extract features
        features = {
            'driver_id': data['driverId'],
            'pickup_lat': data['pickupLat'],
            'pickup_lng': data['pickupLng'],
            'drop_lat': data['dropLat'],
            'drop_lng': data['dropLng'],
            'eta_minutes': data['etaMinutes'],
            'capacity_score': data['capacityScore'],
            'surge_multiplier': data['surgeMultiplier'],
            'vehicle_type': data['vehicleType'],
            'time_of_day': data['timeOfDay'],
            'day_of_week': data['dayOfWeek'],
            'driver_rating': data.get('driverRating', 4.5),
            'acceptance_rate': data.get('acceptanceRate', 0.85),
            'completion_rate': data.get('completionRate', 0.92),
            'battery_level': data.get('batteryLevel', 80),
            'current_load': data.get('currentLoad', 1),
            'max_capacity': data.get('maxCapacity', 3)
        }

        # Get AI score
        ai_score = scoring_model.predict(features)

        # Cache the score for 5 minutes
        cache_key = f"ai_score:{data['driverId']}:{data['orderId']}"
        redis_client.setex(cache_key, 300, str(ai_score))

        return jsonify({
            "driverId": data['driverId'],
            "aiScore": ai_score,
            "features": features,
            "timestamp": datetime.utcnow().isoformat()
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/feedback', methods=['POST'])
def record_feedback():
    """
    Record assignment outcome for online learning
    """
    try:
        data = request.get_json()

        feedback = {
            'order_id': data['orderId'],
            'driver_id': data['driverId'],
            'assignment_score': data['assignmentScore'],
            'actual_eta': data['actualEta'],
            'was_accepted': data['wasAccepted'],
            'was_completed': data['wasCompleted'],
            'customer_rating': data.get('customerRating'),
            'timestamp': datetime.utcnow().isoformat()
        }

        # Store feedback in Redis for batch processing
        feedback_key = f"feedback:{data['orderId']}"
        redis_client.setex(feedback_key, 86400, json.dumps(feedback))  # 24 hours

        # Trigger online learning if needed
        if scoring_model.supports_online_learning:
            scoring_model.update_online(feedback)

        return jsonify({"status": "feedback recorded", "orderId": data['orderId']})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/batch_train', methods=['POST'])
def batch_train():
    """
    Trigger batch training with accumulated feedback
    """
    try:
        # Get all feedback from Redis
        feedback_keys = redis_client.keys("feedback:*")
        feedback_data = []

        for key in feedback_keys:
            feedback = json.loads(redis_client.get(key))
            feedback_data.append(feedback)
            redis_client.delete(key)  # Remove processed feedback

        if feedback_data:
            # Train model with new data
            scoring_model.batch_train(feedback_data)
            return jsonify({"status": "batch training completed", "samples": len(feedback_data)})
        else:
            return jsonify({"status": "no feedback data available"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/model_info', methods=['GET'])
def model_info():
    """
    Get information about the current model
    """
    return jsonify({
        "model_type": scoring_model.model_type,
        "version": scoring_model.version,
        "last_trained": scoring_model.last_trained,
        "supports_online_learning": scoring_model.supports_online_learning,
        "feature_importance": scoring_model.get_feature_importance()
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3011))
    app.run(host='0.0.0.0', port=port, debug=True)

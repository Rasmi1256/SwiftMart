import numpy as np
import pandas as pd
from datetime import datetime
import pickle
import os
from typing import Dict, List, Any, Optional
import xgboost as xgb
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow import keras

class ScoringModel:
    def __init__(self, model_type: str = "xgboost"):
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.version = "1.0.0"
        self.last_trained = None
        self.supports_online_learning = model_type == "xgboost"

        # Feature columns
        self.feature_columns = [
            'pickup_lat', 'pickup_lng', 'drop_lat', 'drop_lng',
            'eta_minutes', 'capacity_score', 'surge_multiplier',
            'vehicle_type_encoded', 'time_of_day_encoded', 'day_of_week_encoded',
            'driver_rating', 'acceptance_rate', 'completion_rate',
            'battery_level', 'current_load', 'max_capacity'
        ]

        self.target_column = 'assignment_score'

        # Initialize model
        self._initialize_model()

    def _initialize_model(self):
        """Initialize the ML model based on type"""
        if self.model_type == "xgboost":
            self.model = xgb.XGBRegressor(
                objective='reg:squarederror',
                n_estimators=100,
                max_depth=6,
                learning_rate=0.1,
                random_state=42
            )
        elif self.model_type == "neural_network":
            self.model = self._build_neural_network()
            self.supports_online_learning = False
        else:
            raise ValueError(f"Unsupported model type: {self.model_type}")

    def _build_neural_network(self) -> keras.Model:
        """Build neural network model"""
        model = keras.Sequential([
            keras.layers.Dense(64, activation='relu', input_shape=(len(self.feature_columns),)),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(16, activation='relu'),
            keras.layers.Dense(1, activation='sigmoid')
        ])

        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )

        return model

    def _preprocess_features(self, features: Dict[str, Any]) -> np.ndarray:
        """Preprocess input features"""
        # Encode categorical features
        processed_features = features.copy()

        # Encode vehicle type
        if 'vehicle_type' in processed_features:
            if processed_features['vehicle_type'] not in self.label_encoders:
                self.label_encoders[processed_features['vehicle_type']] = len(self.label_encoders)
            processed_features['vehicle_type_encoded'] = self.label_encoders[processed_features['vehicle_type']]

        # Encode time of day
        time_of_day_map = {'morning': 0, 'afternoon': 1, 'evening': 2, 'night': 3}
        processed_features['time_of_day_encoded'] = time_of_day_map.get(processed_features.get('time_of_day', 'morning'), 0)

        # Encode day of week
        day_of_week_map = {'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
                          'thursday': 4, 'friday': 5, 'saturday': 6}
        processed_features['day_of_week_encoded'] = day_of_week_map.get(processed_features.get('day_of_week', 'monday'), 1)

        # Extract feature values in correct order
        feature_values = []
        for col in self.feature_columns:
            value = processed_features.get(col, 0)
            if isinstance(value, (int, float)):
                feature_values.append(float(value))
            else:
                feature_values.append(0.0)

        return np.array(feature_values).reshape(1, -1)

    def predict(self, features: Dict[str, Any]) -> float:
        """Predict assignment score for a driver"""
        if self.model is None:
            # Return default score if model not trained
            return self._default_scoring(features)

        try:
            processed_features = self._preprocess_features(features)
            processed_features = self.scaler.transform(processed_features)

            if self.model_type == "xgboost":
                prediction = self.model.predict(processed_features)[0]
            else:  # neural network
                prediction = self.model.predict(processed_features)[0][0]

            # Ensure prediction is between 0 and 1
            return max(0.0, min(1.0, float(prediction)))

        except Exception as e:
            print(f"Prediction error: {e}")
            return self._default_scoring(features)

    def _default_scoring(self, features: Dict[str, Any]) -> float:
        """Default scoring logic when model is not available"""
        eta_score = max(0, 1 - (features.get('eta_minutes', 30) / 60))  # Better for lower ETA
        capacity_score = features.get('capacity_score', 0.5)
        surge_score = features.get('surge_multiplier', 1.0)

        # Weighted combination
        return (eta_score * 0.5 + capacity_score * 0.3 + surge_score * 0.2)

    def batch_train(self, feedback_data: List[Dict[str, Any]]):
        """Train model with batch of feedback data"""
        if not feedback_data:
            return

        try:
            # Convert feedback to training data
            df = pd.DataFrame(feedback_data)

            # Create target variable (assignment success score)
            df[self.target_column] = df.apply(self._calculate_target_score, axis=1)

            # Prepare features
            X = []
            y = []

            for _, row in df.iterrows():
                features = self._extract_features_from_feedback(row)
                if features:
                    processed_features = self._preprocess_features(features)
                    X.append(processed_features[0])
                    y.append(row[self.target_column])

            if not X or not y:
                return

            X = np.array(X)
            y = np.array(y)

            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

            # Fit scaler
            self.scaler.fit(X_train)

            # Scale features
            X_train_scaled = self.scaler.transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)

            # Train model
            if self.model_type == "xgboost":
                self.model.fit(X_train_scaled, y_train)
            else:  # neural network
                self.model.fit(X_train_scaled, y_train, epochs=50, batch_size=32, validation_split=0.2, verbose=0)

            self.last_trained = datetime.utcnow().isoformat()

            # Save model
            self._save_model()

        except Exception as e:
            print(f"Training error: {e}")

    def update_online(self, feedback: Dict[str, Any]):
        """Online learning update (for XGBoost)"""
        if not self.supports_online_learning or self.model is None:
            return

        try:
            features = self._extract_features_from_feedback(feedback)
            if not features:
                return

            target_score = self._calculate_target_score(pd.Series(feedback))

            processed_features = self._preprocess_features(features)
            processed_features = self.scaler.transform(processed_features)

            # Online update for XGBoost (simplified)
            # In practice, you'd use a proper online learning approach
            current_pred = self.model.predict(processed_features)[0]
            error = target_score - current_pred

            # Simple online update (this is a simplification)
            # Real online learning would require more sophisticated techniques
            if abs(error) > 0.1:  # Only update on significant errors
                self.model.n_estimators += 1
                # Re-fit with new sample (simplified approach)

        except Exception as e:
            print(f"Online update error: {e}")

    def _calculate_target_score(self, feedback_row) -> float:
        """Calculate target score from feedback"""
        score = 0.0

        # Base score from acceptance
        if feedback_row.get('was_accepted', False):
            score += 0.3

        # Score from completion
        if feedback_row.get('was_completed', False):
            score += 0.4

        # Score from customer rating
        rating = feedback_row.get('customer_rating', 3.0)
        score += (rating / 5.0) * 0.3

        return min(1.0, score)

    def _extract_features_from_feedback(self, feedback_row) -> Optional[Dict[str, Any]]:
        """Extract features from feedback data"""
        # This would need to be enhanced with actual feature extraction logic
        # For now, return None as we need more context
        return None

    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance scores"""
        if self.model is None or self.model_type != "xgboost":
            return {}

        try:
            importance = self.model.feature_importances_
            return dict(zip(self.feature_columns, importance.tolist()))
        except:
            return {}

    def _save_model(self):
        """Save model to disk"""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'label_encoders': self.label_encoders,
                'version': self.version,
                'last_trained': self.last_trained,
                'model_type': self.model_type
            }

            os.makedirs('models', exist_ok=True)
            with open('models/scoring_model.pkl', 'wb') as f:
                pickle.dump(model_data, f)

        except Exception as e:
            print(f"Save model error: {e}")

    def load_model(self):
        """Load model from disk"""
        try:
            if os.path.exists('models/scoring_model.pkl'):
                with open('models/scoring_model.pkl', 'rb') as f:
                    model_data = pickle.load(f)

                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.label_encoders = model_data['label_encoders']
                self.version = model_data['version']
                self.last_trained = model_data['last_trained']
                self.model_type = model_data['model_type']

        except Exception as e:
            print(f"Load model error: {e}")

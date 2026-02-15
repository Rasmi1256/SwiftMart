from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import json
from datetime import datetime, timedelta
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
import schedule
import time
import threading

app = Flask(__name__)
CORS(app)

# Configuration
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', 'demo_key')
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres123@postgres:5432/swiftmart')
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')
port = int(os.getenv('PORT', 5002))

# Initialize connections
redis_client = redis.from_url(REDIS_URL)

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def calculate_weather_impact(weather_data):
    """Calculate weather impact on routing speed and safety"""
    condition = weather_data.get('condition', 'CLEAR')
    precipitation = weather_data.get('precipitation', 0)
    visibility = weather_data.get('visibility', 10000)
    wind_speed = weather_data.get('windSpeed', 0)

    # Base multipliers
    speed_multiplier = 1.0
    risk_factor = 1.0

    # Weather condition impacts
    if condition == 'RAIN':
        if precipitation > 10:  # Heavy rain
            speed_multiplier *= 0.7
            risk_factor *= 1.3
        elif precipitation > 2:  # Moderate rain
            speed_multiplier *= 0.85
            risk_factor *= 1.1
        else:  # Light rain
            speed_multiplier *= 0.95
            risk_factor *= 1.05

    elif condition == 'SNOW':
        if precipitation > 5:  # Heavy snow
            speed_multiplier *= 0.5
            risk_factor *= 2.0
        else:  # Light snow
            speed_multiplier *= 0.75
            risk_factor *= 1.5

    elif condition == 'FOG':
        if visibility < 500:  # Dense fog
            speed_multiplier *= 0.6
            risk_factor *= 1.8
        elif visibility < 1000:  # Moderate fog
            speed_multiplier *= 0.8
            risk_factor *= 1.3

    # Wind impact (for bikes/scooters)
    if wind_speed > 30:  # Strong wind
        speed_multiplier *= 0.9
        risk_factor *= 1.2

    return {
        'speedMultiplier': round(speed_multiplier, 2),
        'riskFactor': round(risk_factor, 2)
    }

@app.route('/weather/<location>', methods=['GET'])
def get_weather(location):
    """Get current weather for a location"""
    try:
        # Check cache first
        cache_key = f"weather:{location}"
        cached_data = redis_client.get(cache_key)

        if cached_data:
            return jsonify(json.loads(cached_data))

        # Fetch from OpenWeather API
        url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={OPENWEATHER_API_KEY}&units=metric"
        response = requests.get(url)

        if response.status_code != 200:
            return jsonify({'error': 'Weather API unavailable'}), 503

        data = response.json()

        # Transform data
        weather_info = {
            'location': location,
            'timestamp': datetime.now().isoformat(),
            'temperature': data['main']['temp'],
            'humidity': data['main']['humidity'],
            'precipitation': 0,  # OpenWeather doesn't provide precipitation directly
            'windSpeed': data['wind']['speed'] * 3.6,  # Convert m/s to km/h
            'windDirection': data['wind'].get('deg'),
            'visibility': data.get('visibility', 10000),
            'condition': data['weather'][0]['main'].upper(),
            'severity': 'MILD'
        }

        # Calculate impact
        impact = calculate_weather_impact(weather_info)
        weather_info.update(impact)

        # Cache for 15 minutes
        redis_client.setex(cache_key, 900, json.dumps(weather_info))

        # Store in database
        store_weather_data(weather_info)

        return jsonify(weather_info)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/weather/impact/<location>', methods=['GET'])
def get_weather_impact(location):
    """Get weather impact factors for routing"""
    try:
        weather_data = get_weather(location).get_json()
        if 'error' in weather_data:
            return jsonify(weather_data), 503

        return jsonify({
            'location': location,
            'speedMultiplier': weather_data.get('speedMultiplier', 1.0),
            'riskFactor': weather_data.get('riskFactor', 1.0),
            'condition': weather_data.get('condition', 'CLEAR'),
            'severity': weather_data.get('severity', 'MILD')
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/weather/route-impact', methods=['POST'])
def get_route_weather_impact():
    """Calculate weather impact for a route with multiple segments"""
    try:
        data = request.get_json()
        segments = data.get('segments', [])  # List of lat,lng points

        if not segments:
            return jsonify({'error': 'No segments provided'}), 400

        total_impact = {
            'speedMultiplier': 1.0,
            'riskFactor': 1.0,
            'worstCondition': 'CLEAR',
            'segments': []
        }

        for segment in segments:
            # Use centroid of segment for weather lookup
            lat = (segment[0][0] + segment[1][0]) / 2
            lng = (segment[0][1] + segment[1][1]) / 2
            location = f"{lat},{lng}"

            impact = get_weather_impact(location).get_json()
            if 'error' not in impact:
                total_impact['speedMultiplier'] *= impact.get('speedMultiplier', 1.0)
                total_impact['riskFactor'] = max(total_impact['riskFactor'], impact.get('riskFactor', 1.0))

                if impact.get('severity') == 'SEVERE':
                    total_impact['worstCondition'] = 'SEVERE'
                elif impact.get('severity') == 'MODERATE' and total_impact['worstCondition'] != 'SEVERE':
                    total_impact['worstCondition'] = 'MODERATE'

                total_impact['segments'].append({
                    'segment': segment,
                    'impact': impact
                })

        return jsonify(total_impact)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def store_weather_data(weather_data):
    """Store weather data in database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO weather_data
            (location, timestamp, temperature, humidity, precipitation, wind_speed,
             wind_direction, visibility, condition, severity, speed_multiplier, risk_factor, source)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            weather_data['location'],
            weather_data['timestamp'],
            weather_data['temperature'],
            weather_data['humidity'],
            weather_data['precipitation'],
            weather_data['windSpeed'],
            weather_data.get('windDirection'),
            weather_data['visibility'],
            weather_data['condition'],
            weather_data['severity'],
            weather_data['speedMultiplier'],
            weather_data['riskFactor'],
            'OPENWEATHER'
        ))

        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error storing weather data: {e}")

def cleanup_old_weather_data():
    """Clean up weather data older than 24 hours"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cutoff_time = datetime.now() - timedelta(hours=24)
        cursor.execute("DELETE FROM weather_data WHERE timestamp < %s", (cutoff_time,))

        conn.commit()
        cursor.close()
        conn.close()

        print("Cleaned up old weather data")

    except Exception as e:
        print(f"Error cleaning up weather data: {e}")

# Background task for cleanup
def run_scheduler():
    schedule.every(1).hours.do(cleanup_old_weather_data)

    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == '__main__':
    # Start cleanup scheduler in background
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

    app.run(host='0.0.0.0', port=port, debug=True)

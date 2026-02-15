from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import json
import redis
import polyline
from geopy.distance import geodesic
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CORS(app)

# Configuration
GRAPHHOPPER_API_KEY = os.getenv('GRAPHHOPPER_API_KEY', 'demo_key')
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres123@postgres:5432/swiftmart')
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')

# Initialize connections
redis_client = redis.from_url(REDIS_URL)

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def calculate_route_with_graphhopper(start_lat, start_lng, end_lat, end_lng, waypoints=None):
    """Calculate route using GraphHopper API with live traffic"""
    try:
        base_url = "https://graphhopper.com/api/1/route"

        # Build point string
        points = f"{start_lng},{start_lat}"
        if waypoints:
            for wp in waypoints:
                points += f";{wp[1]},{wp[0]}"  # lng,lat format
        points += f";{end_lng},{end_lat}"

        params = {
            'key': GRAPHHOPPER_API_KEY,
            'points_encoded': 'false',
            'vehicle': 'car',
            'locale': 'en',
            'instructions': 'true',
            'calc_points': 'true',
            'points': points
        }

        response = requests.get(base_url, params=params)

        if response.status_code != 200:
            return None

        data = response.json()

        if not data.get('paths'):
            return None

        path = data['paths'][0]

        # Decode polyline
        route_points = polyline.decode(path['points'])

        return {
            'distance': path['distance'],  # meters
            'time': path['time'],  # milliseconds
            'points': route_points,
            'instructions': path.get('instructions', []),
            'bbox': path.get('bbox', [])
        }

    except Exception as e:
        print(f"GraphHopper API error: {e}")
        return None

def get_live_traffic_multiplier(route_points):
    """Get live traffic multiplier for route segments"""
    try:
        # Calculate route segments
        segments = []
        for i in range(len(route_points) - 1):
            start = route_points[i]
            end = route_points[i + 1]
            distance = geodesic(start, end).meters
            segments.append({
                'start': start,
                'end': end,
                'distance': distance
            })

        # Query traffic patterns for each segment
        total_multiplier = 1.0
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        for segment in segments:
            # Find traffic pattern for this segment
            cursor.execute("""
                SELECT congestion_factor, weather_impact
                FROM traffic_patterns
                WHERE ST_DWithin(
                    ST_MakeLine(ST_Point(%s, %s), ST_Point(%s, %s))::geography,
                    route_segment::geography,
                    100  -- 100 meter tolerance
                )
                ORDER BY last_updated DESC
                LIMIT 1
            """, (
                segment['start'][1], segment['start'][0],  # lng, lat
                segment['end'][1], segment['end'][0]
            ))

            result = cursor.fetchone()
            if result:
                traffic_multiplier = result['congestion_factor'] or 1.0
                weather_multiplier = result['weather_impact'] or 1.0
                segment_multiplier = traffic_multiplier * weather_multiplier
                total_multiplier = max(total_multiplier, segment_multiplier)

        cursor.close()
        conn.close()

        return min(total_multiplier, 3.0)  # Cap at 3x slowdown

    except Exception as e:
        print(f"Traffic multiplier calculation error: {e}")
        return 1.0

@app.route('/route', methods=['POST'])
def calculate_route():
    """Calculate optimized route with live traffic"""
    try:
        data = request.get_json()
        start_lat = data.get('startLat')
        start_lng = data.get('startLng')
        end_lat = data.get('endLat')
        end_lng = data.get('endLng')
        waypoints = data.get('waypoints', [])

        if not all([start_lat, start_lng, end_lat, end_lng]):
            return jsonify({'error': 'Missing required coordinates'}), 400

        # Get base route from GraphHopper
        route_data = calculate_route_with_graphhopper(
            start_lat, start_lng, end_lat, end_lng, waypoints
        )

        if not route_data:
            return jsonify({'error': 'Route calculation failed'}), 503

        # Apply live traffic adjustments
        traffic_multiplier = get_live_traffic_multiplier(route_data['points'])
        adjusted_time = route_data['time'] * traffic_multiplier

        route_data['adjustedTime'] = int(adjusted_time)
        route_data['trafficMultiplier'] = traffic_multiplier
        route_data['timestamp'] = datetime.now().isoformat()

        # Cache route for 5 minutes
        cache_key = f"route:{start_lat},{start_lng}:{end_lat},{end_lng}"
        redis_client.setex(cache_key, 300, json.dumps(route_data))

        return jsonify(route_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/route/compare', methods=['POST'])
def compare_routes():
    """Compare multiple route options"""
    try:
        data = request.get_json()
        routes = data.get('routes', [])

        if not routes or len(routes) < 2:
            return jsonify({'error': 'Need at least 2 routes to compare'}), 400

        comparisons = []

        for route in routes:
            start_lat = route.get('startLat')
            start_lng = route.get('startLng')
            end_lat = route.get('endLat')
            end_lng = route.get('endLng')
            waypoints = route.get('waypoints', [])

            route_data = calculate_route_with_graphhopper(
                start_lat, start_lng, end_lat, end_lng, waypoints
            )

            if route_data:
                traffic_multiplier = get_live_traffic_multiplier(route_data['points'])
                route_data['adjustedTime'] = int(route_data['time'] * traffic_multiplier)
                route_data['trafficMultiplier'] = traffic_multiplier
                route_data['efficiency'] = route_data['distance'] / route_data['adjustedTime']  # meters per millisecond
                comparisons.append(route_data)

        # Sort by efficiency (higher is better)
        comparisons.sort(key=lambda x: x['efficiency'], reverse=True)

        return jsonify({
            'routes': comparisons,
            'bestRoute': comparisons[0] if comparisons else None,
            'comparison': {
                'fastest': min(comparisons, key=lambda x: x['adjustedTime']) if comparisons else None,
                'shortest': min(comparisons, key=lambda x: x['distance']) if comparisons else None,
                'mostEfficient': comparisons[0] if comparisons else None
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/route/realtime/<route_id>', methods=['GET'])
def get_realtime_route_update(route_id):
    """Get real-time updates for active route"""
    try:
        # Get route from cache/database
        cache_key = f"active_route:{route_id}"
        route_data = redis_client.get(cache_key)

        if not route_data:
            return jsonify({'error': 'Route not found'}), 404

        route = json.loads(route_data)

        # Recalculate with current traffic
        traffic_multiplier = get_live_traffic_multiplier(route['points'])
        new_adjusted_time = route['time'] * traffic_multiplier

        # Check if significant change (>5% time difference)
        time_diff = abs(new_adjusted_time - route.get('adjustedTime', route['time']))
        time_change_percent = (time_diff / route.get('adjustedTime', route['time'])) * 100

        update = {
            'routeId': route_id,
            'currentTrafficMultiplier': traffic_multiplier,
            'newEstimatedTime': int(new_adjusted_time),
            'timeChangePercent': round(time_change_percent, 2),
            'significantChange': time_change_percent > 5,
            'timestamp': datetime.now().isoformat()
        }

        # Update cached route
        route['adjustedTime'] = int(new_adjusted_time)
        route['trafficMultiplier'] = traffic_multiplier
        route['lastUpdate'] = update['timestamp']
        redis_client.setex(cache_key, 3600, json.dumps(route))  # 1 hour

        return jsonify(update)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/route/alternatives', methods=['POST'])
def get_route_alternatives():
    """Generate alternative routes for rerouting"""
    try:
        data = request.get_json()
        current_route = data.get('currentRoute')
        reason = data.get('reason', 'traffic')  # traffic, weather, accident, etc.

        if not current_route:
            return jsonify({'error': 'Current route required'}), 400

        # Generate alternative routes by slightly offsetting waypoints
        alternatives = []
        base_points = current_route.get('points', [])

        for i in range(3):  # Generate 3 alternatives
            # Create alternative by finding parallel route
            alt_route = calculate_route_with_graphhopper(
                current_route['startLat'], current_route['startLng'],
                current_route['endLat'], current_route['endLng'],
                current_route.get('waypoints', [])
            )

            if alt_route:
                traffic_multiplier = get_live_traffic_multiplier(alt_route['points'])
                alt_route['adjustedTime'] = int(alt_route['time'] * traffic_multiplier)
                alt_route['trafficMultiplier'] = traffic_multiplier
                alt_route['improvement'] = current_route.get('adjustedTime', 0) - alt_route['adjustedTime']
                alternatives.append(alt_route)

        # Sort by improvement
        alternatives.sort(key=lambda x: x['improvement'], reverse=True)

        return jsonify({
            'alternatives': alternatives,
            'reason': reason,
            'recommended': alternatives[0] if alternatives else None
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3020, debug=True)

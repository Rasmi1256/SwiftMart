from flask import Flask, jsonify, request
from flask_cors import CORS
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
from datetime import datetime, timedelta
import threading
import time
import atexit
from psycopg2.pool import SimpleConnectionPool


app = Flask(__name__)
CORS(app)

# Configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres123@postgres:5432/swiftmart')
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379')

# Initialize connections
redis_client = redis.from_url(REDIS_URL)

db_pool = SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=DATABASE_URL
)

@atexit.register
def close_db_pool():
    db_pool.closeall()

def get_db_connection():
    return db_pool.getconn()

def release_db_connection(conn):
    db_pool.putconn(conn)


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'driver-state-service'})

@app.route('/driver/<driver_id>/state', methods=['GET'])
def get_driver_state(driver_id):
    """Get current state of a driver"""
    try:
        # Check cache first
        cache_key = f"driver_state:{driver_id}"
        cached_state = redis_client.get(cache_key)

        if cached_state:
            return jsonify(json.loads(cached_state))

        # Fetch from database
        conn = get_db_connection()

        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("""
                SELECT * FROM driver_states
                WHERE driver_id = %s
                ORDER BY timestamp DESC
                LIMIT 1
            """, (driver_id,))
            result = cursor.fetchone()
            cursor.close()
        finally:
           
            release_db_connection(conn)
   
 

        if result:
            state_data = dict(result)
            # Cache for 30 seconds
            redis_client.setex(cache_key, 30, json.dumps(state_data))
            return jsonify(state_data)
        else:
            return jsonify({'error': 'Driver state not found'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/driver/<driver_id>/state', methods=['POST'])
def update_driver_state(driver_id):
    """Update driver state"""
    try:
        data = request.get_json()

        required_fields = ['status', 'location_lat', 'location_lng']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO driver_states
            (driver_id, status, location_lat, location_lng, battery_level,
             speed, heading, timestamp, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            driver_id,
            data['status'],
            data['location_lat'],
            data['location_lng'],
            data.get('battery_level'),
            data.get('speed'),
            data.get('heading'),
            datetime.now(),
            json.dumps(data.get('metadata', {}))
        ))

        conn.commit()
        cursor.close()
        conn.close()

        # Update cache
        cache_key = f"driver_state:{driver_id}"
        state_data = {
            'driver_id': driver_id,
            'status': data['status'],
            'location_lat': data['location_lat'],
            'location_lng': data['location_lng'],
            'battery_level': data.get('battery_level'),
            'speed': data.get('speed'),
            'heading': data.get('heading'),
            'timestamp': datetime.now().isoformat(),
            'metadata': data.get('metadata', {})
        }
        redis_client.setex(cache_key, 30, json.dumps(state_data))

        return jsonify({'message': 'Driver state updated successfully'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/drivers/active', methods=['GET'])
def get_active_drivers():
    """Get all active drivers"""
    try:
        # Get from cache first
        cache_key = "active_drivers"
        cached_data = redis_client.get(cache_key)

        if cached_data:
            return jsonify(json.loads(cached_data))

        # Fetch from database
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get drivers active in last 5 minutes
        cutoff_time = datetime.now() - timedelta(minutes=5)

        cursor.execute("""
            SELECT DISTINCT ON (driver_id) * FROM driver_states
            WHERE timestamp > %s AND status IN ('active', 'busy', 'en_route')
            ORDER BY driver_id, timestamp DESC
        """, (cutoff_time,))

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        active_drivers = [dict(row) for row in results]

        # Cache for 30 seconds
        redis_client.setex(cache_key, 30, json.dumps(active_drivers))

        return jsonify(active_drivers)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/driver/<driver_id>/history', methods=['GET'])
def get_driver_history(driver_id):
    """Get driver state history"""
    try:
        hours = int(request.args.get('hours', 24))  # Default 24 hours

        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cutoff_time = datetime.now() - timedelta(hours=hours)

        cursor.execute("""
            SELECT * FROM driver_states
            WHERE driver_id = %s AND timestamp > %s
            ORDER BY timestamp DESC
        """, (driver_id, cutoff_time))

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return jsonify([dict(row) for row in results])

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def cleanup_old_states():
    """Clean up driver states older than 7 days"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cutoff_time = datetime.now() - timedelta(days=7)
        cursor.execute("DELETE FROM driver_states WHERE timestamp < %s", (cutoff_time,))

        deleted_count = cursor.rowcount
        conn.commit()
        cursor.close()
        conn.close()

        print(f"Cleaned up {deleted_count} old driver states")

    except Exception as e:
        print(f"Error cleaning up driver states: {e}")

# Background cleanup task
def run_cleanup_scheduler():
    while True:
        cleanup_old_states()
        time.sleep(3600)  # Run every hour

if __name__ == '__main__':
    # Start cleanup scheduler in background
    cleanup_thread = threading.Thread(target=run_cleanup_scheduler, daemon=True)
    cleanup_thread.start()

    app.run(host='0.0.0.0', port=3019, debug=True)

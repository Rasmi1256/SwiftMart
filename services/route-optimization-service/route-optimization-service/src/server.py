from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'route-optimization-service'})

@app.route('/api/route/optimize', methods=['POST'])
def optimize_route():
    # Placeholder for route optimization logic
    data = request.get_json()
    return jsonify({
        'message': 'Route optimization endpoint',
        'data': data
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT',3000))
    app.run(host='0.0.0.0', port=port, debug=True)

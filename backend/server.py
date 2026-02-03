#!/usr/bin/env python3
"""
WeGoAI Backend Server
Runs the AI suggestion service for local development and production.

Usage:
    python backend/server.py           # Run on default port 5328
    PORT=8000 python backend/server.py # Run on custom port
"""
import http.server
import os
import sys

# Add backend directory to path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

# Load .env file from project root
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
env_path = os.path.join(PROJECT_ROOT, '.env')

if os.path.exists(env_path):
    print(f"Loading environment from {env_path}")
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
                except ValueError:
                    pass
else:
    print("Warning: .env file not found")

# Import handler after environment is loaded
try:
    from ai.handlers import handler
except ImportError as e:
    print(f"Error importing ai.handlers: {e}")
    print("Make sure you are running this script from the project root.")
    sys.exit(1)


class DevHandler(handler):
    """Development handler with request logging."""
    
    def do_POST(self):
        print(f"[AI Server] POST {self.path}")
        if self.path.startswith('/api/ai/suggest'):
            try:
                super().do_POST()
            except Exception as e:
                print(f"Error in do_POST: {e}")
                self.send_error(500, str(e))
        else:
            self.send_error(404, f"Endpoint {self.path} not found")

    def do_OPTIONS(self):
        print(f"[AI Server] OPTIONS {self.path}")
        if self.path.startswith('/api/ai/suggest'):
            super().do_OPTIONS()
        else:
            self.send_error(404)


def main():
    PORT = int(os.environ.get('PORT', 5328))
    HOST = os.environ.get('HOST', '127.0.0.1')
    
    server_address = (HOST, PORT)
    print(f"\n🤖 WeGoAI Backend Server")
    print(f"   Running at http://{HOST}:{PORT}")
    print(f"   Endpoint: POST /api/ai/suggest")
    print(f"\n   Press Ctrl+C to stop\n")
    
    httpd = http.server.HTTPServer(server_address, DevHandler)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    main()

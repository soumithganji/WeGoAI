import http.server
import os
import sys

# Add project root to sys.path so we can import from api.ai
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load .env file manually
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
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

try:
    from api.ai.suggest import handler
except ImportError as e:
    print(f"Error importing api.ai.suggest: {e}")
    print("Make sure you are running this script from the project root or scripts folder.")
    sys.exit(1)

class DevHandler(handler):
    def do_POST(self):
        print(f"[AI Server] POST {self.path}")
        # Next.js might rewrite /api/ai/suggest?tripId=... 
        # The handler in suggest.py reads body.
        
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
        # Only allow our endpoint
        if self.path.startswith('/api/ai/suggest'):
             super().do_OPTIONS()
        else:
             self.send_error(404)
        
if __name__ == "__main__":
    PORT = 5328
    server_address = ('127.0.0.1', PORT)
    print(f"Starting AI Development Server at http://127.0.0.1:{PORT}")
    print("Use this for local development with 'npm run dev'")
    print("Press Ctrl+C to stop")
    
    httpd = http.server.HTTPServer(server_address, DevHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

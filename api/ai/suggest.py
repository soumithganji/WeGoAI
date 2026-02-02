"""
Vercel Python Serverless Function for AI Suggestions
Endpoint: POST /api/ai/suggest
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Add the api/ai directory to the path for local imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from crew import create_suggestion_crew, plan_itinerary


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            query = body.get('query', '')
            trip_context = body.get('tripContext', {})
            chat_history = body.get('chatHistory', [])
            action = body.get('action', 'suggest')  # 'suggest' or 'plan'
            scope = body.get('scope', 'everything')  # for planning: 'everything', 'day 2', etc.
            
            # Run appropriate crew action
            if action == 'plan':
                result = plan_itinerary(trip_context, chat_history, scope)
            else:
                result = create_suggestion_crew(query, trip_context, chat_history)
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'result': result
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            import traceback
            traceback.print_exc()
            error_response = {
                'success': False,
                'error': str(e)
            }
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

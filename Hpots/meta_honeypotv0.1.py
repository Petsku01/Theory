"""
Honeypot to Detect Honeypot Hunters (meta_honeypotv0.1.py).
-pk

Overview: Low-interaction honeypot mimicking other honeypots (e.g., Cowrie, Dionaea) to capture anti-honeypot scans or exploits. Logs HTTP requests to fake management interfaces (/admin, /status), detects honeypot scanners (e.g., Shodan, honeypot-checker), and alerts on suspicious payloads.


How to Run:
1. Install Python 3.6+ and Flask: `pip install flask`.
2. Save as `meta_honeypotv0.1.py`.
3. Run: `python meta_honeypotv0.1.py --port 8080 --https` (omit --https for HTTP).
4. Test: `curl -H "User-Agent: Mozilla/5.0 (compatible; Shodan)" http://localhost:8080/admin`
5. Logs: `meta_honeypot.log` (text alerts) and `meta_honeypot.jsonl` (structured JSON lines).
6. Stop: Ctrl+C for graceful shutdown.
7. Docker: `docker build -t meta-honeypot . && docker run -p 8080:8080 meta-honeypot`.

Security: Isolate in VM/Docker (e.g., `docker run -p 8080:8080 python:3.12 bash -c "pip install flask && python meta_honeypotv0.1.py"`). Expose only to controlled networks. Comply with laws on monitoring.
"""

from flask import Flask, request, Response
import logging
import json
import argparse
import signal
import sys
from datetime import datetime

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

class MetaHoneypot:
    def __init__(self, port, log_file, https=False):
        self.port = port
        self.log_file = log_file
        self.https = https
        self.setup_logging()
        signal.signal(signal.SIGINT, self.signal_handler)

    def setup_logging(self):
        handler = logging.FileHandler(self.log_file)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logger.addHandler(handler)

    def log_activity(self, activity):
        try:
            with open(self.log_file + '.jsonl', 'a') as f:
                json.dump(activity, f)
                f.write('\n')
        except Exception as e:
            logger.error(f"JSON log error: {e}")

    def detect_honeypot_scanner(self, headers, body):
        """Detect known honeypot scanners or suspicious payloads."""
        suspicious_agents = ['shodan', 'censys', 'honeypot-checker', 'nmap']
        user_agent = headers.get('User-Agent', '').lower()
        for agent in suspicious_agents:
            if agent in user_agent:
                return True, f"Honeypot scanner detected: {user_agent[:50]}"
        if body and any(keyword in body.lower() for keyword in ['cowrie', 'dionaea', 'honeyd', 'kippo']):
            return True, f"Suspicious payload targeting honeypot: {body[:50]}..."
        return False, None

    @app.route('/<path:path>', methods=['GET', 'POST'])
    def catch_all(path):
        """Mimic honeypot management interfaces (e.g., Cowrie/Dionaea dashboards)."""
        activity = {
            'timestamp': datetime.now().isoformat(),
            'remote_ip': request.remote_addr,
            'method': request.method,
            'path': f"/{path}",
            'headers': dict(request.headers),
            'body': request.get_data(as_text=True) if request.data else None
        }
        logger.info(f"Request from {activity['remote_ip']}: {activity['method']} {activity['path']}")
        alert = False
        alert_msg = None
        if activity['headers'] or activity['body']:
            alert, alert_msg = honeypot.detect_honeypot_scanner(activity['headers'], activity['body'])
            if alert:
                logger.critical(f"ALERT: {alert_msg}")
                activity['alert'] = alert_msg
        activity['events'] = [{'type': 'honeypot_request', 'path': path, 'suspicious': alert}]
        honeypot.log_activity(activity)

        # Simulate honeypot admin response (e.g., fake Cowrie dashboard)
        if path in ['admin', 'status', 'dashboard']:
            return Response(
                """<html><head><title>Honeypot Admin (Cowrie v2.5.0)</title></head>
                <body><h1>Login to Honeypot Dashboard</h1><form>Username: <input type="text"><br>Password: <input type="password"><br><input type="submit" value="Login"></form></body></html>""",
                mimetype='text/html'
            )
        return "Honeypot Service: Unauthorized", 401

    def run(self):
        try:
            ssl_context = 'adhoc' if self.https else None
            app.run(host='0.0.0.0', port=self.port, debug=False, ssl_context=ssl_context)
        except Exception as e:
            logger.error(f"Server error: {e}")
            sys.exit(1)

    def signal_handler(self, sig, frame):
        logger.info("Shutdown signal received.")
        sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Meta-Honeypot for Honeypot Hunters')
    parser.add_argument('--port', type=int, default=8080, help='Port (default: 8080)')
    parser.add_argument('--log_file', default='meta_honeypot.log', help='Log file (default: meta_honeypot.log)')
    parser.add_argument('--https', action='store_true', help='Enable HTTPS (adhoc cert)')
    args = parser.parse_args()
    honeypot = MetaHoneypot(args.port, args.log_file, args.https)
    honeypot.run()

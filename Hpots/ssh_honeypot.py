"""
Low-interaction SSH honeypot to log attacker activity.
-pk

How to Run:
1. Ensure Python 3.6+ is installed.
2. Save this file as `honeypot.py`.
3. Run with default settings: `python honeypot.py`
   - Optional arguments:
     --bind <address> (default: 0.0.0.0, all interfaces)
     --port <port> (default: 2222, non-privileged port)
     --log_file <file> (default: honeypot.log)
     --banner <string> (default: realistic OpenSSH banner)
   Example: `python honeypot.py --port 2222 --log_file mylog.log`
4. Test by connecting: `telnet localhost 2222` or `ssh localhost -p 2222`
5. Logs are saved to `<log_file>` (text) and `<log_file>.json` (structured JSON).
6. Stop with Ctrl+C for graceful shutdown.

Security Notes:
- Run in an isolated environment (e.g., Docker: `docker run -p 2222:2222 python:3.12 python honeypot.py`).
- Do not expose to the public internet without firewall rules and monitoring.
- Ensure compliance with local laws regarding network monitoring.
"""

import socket
import threading
import logging
import json
import os
import signal
import argparse
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

class Honeypot:
    def __init__(self, bind, port, log_file, banner):
        self.bind = bind
        self.port = port
        self.log_file = log_file
        self.banner = banner
        self.server_socket = None
        self.setup_logging()
        signal.signal(signal.SIGINT, self.signal_handler)

    def setup_logging(self):
        handler = logging.FileHandler(self.log_file)
        handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        logging.getLogger().addHandler(handler)

    def log_activity(self, activity):
        with open(self.log_file + '.json', 'a') as f:
            json.dump(activity, f)
            f.write('\n')

    def handle_client(self, client_socket, client_address):
        activity = {
            'timestamp': datetime.now().isoformat(),
            'ip': client_address[0],
            'port': client_address[1],
            'events': []
        }
        try:
            client_socket.settimeout(30)
            logging.info(f"Connection from {client_address[0]}:{client_address[1]}")
            activity['events'].append({'type': 'connection'})

            client_version = client_socket.recv(1024).decode('utf-8', errors='ignore').strip()
            if client_version:
                logging.info(f"Client version from {client_address[0]}: {client_version}")
                activity['events'].append({'type': 'client_version', 'data': client_version})

            client_socket.send(f"{self.banner}\r\n".encode('utf-8'))

            for attempt in range(3):
                client_socket.send(b"login: ")
                username = client_socket.recv(1024).decode('utf-8', errors='ignore').strip()
                if username:
                    logging.info(f"Username attempt {attempt+1} from {client_address[0]}: {username}")
                    activity['events'].append({'type': 'username', 'attempt': attempt+1, 'data': username})
                    client_socket.send(b"password: ")
                    password = client_socket.recv(1024).decode('utf-8', errors='ignore').strip()
                    if password:
                        logging.info(f"Password attempt {attempt+1} from {client_address[0]}: {password}")
                        activity['events'].append({'type': 'password', 'attempt': attempt+1, 'data': password})
                        client_socket.send(b"Login incorrect\r\n")

            client_socket.send(b"$ ")
            while True:
                data = client_socket.recv(1024)
                if not data:
                    break
                command = data.decode('utf-8', errors='ignore').strip()
                logging.info(f"Command from {client_address[0]}: {command}")
                activity['events'].append({'type': 'command', 'data': command})
                client_socket.send(b"command not found\r\n$ ")

        except socket.timeout:
            logging.warning(f"Timeout for {client_address[0]}:{client_address[1]}")
            activity['events'].append({'type': 'timeout'})
        except Exception as e:
            logging.error(f"Error handling client {client_address}: {e}")
            activity['events'].append({'type': 'error', 'data': str(e)})
        finally:
            self.log_activity(activity)
            client_socket.close()
            logging.info(f"Connection closed for {client_address[0]}:{client_address[1]}")

    def start(self):
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            self.server_socket.bind((self.bind, self.port))
            self.server_socket.listen(5)
            logging.info(f"Honeypot started on {self.bind}:{self.port}")
            while True:
                client_socket, client_address = self.server_socket.accept()
                client_thread = threading.Thread(target=self.handle_client, args=(client_socket, client_address))
                client_thread.start()
        except Exception as e:
            logging.error(f"Server error: {e}")
        finally:
            self.stop()

    def stop(self):
        if self.server_socket:
            self.server_socket.close()
            logging.info("Honeypot server stopped.")

    def signal_handler(self, sig, frame):
        logging.info("Received shutdown signal.")
        self.stop()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Low-interaction SSH honeypot')
    parser.add_argument('--bind', default='0.0.0.0', help='Bind address (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=2222, help='Port to listen on (default: 2222)')
    parser.add_argument('--log_file', default='honeypot.log', help='Log file (default: honeypot.log)')
    parser.add_argument('--banner', default='SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.1', help='SSH banner (default: realistic OpenSSH)')
    args = parser.parse_args()

    honeypot = Honeypot(args.bind, args.port, args.log_file, args.banner)
    honeypot.start()

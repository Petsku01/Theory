from flask import Flask, request
import logging
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)

# Configure logging to save IPs to a file
logging.basicConfig(
    filename="visitor_ips.log",
    level=logging.INFO,
    format="%(asctime)s - IP: %(message)s"
)

@app.route('/')
def home():
    # Get the visitor's IP address
    visitor_ip = request.remote_addr
    
    # Check for X-Forwarded-For header (if behind a proxy/load balancer)
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        visitor_ip = forwarded_for.split(',')[0]  # Take the first IP in the chain
    
    # Log the IP address
    logging.info(visitor_ip)
    
    # Return a simple webpage
    return """
    <html>
        <head><title>IP Grabber</title></head>
        <body>
            <h1>IP Grabber</h1>
            <p>Your IP address has been logged: <strong>{}</strong></p>
        </body>
    </html>
    """.format(visitor_ip)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

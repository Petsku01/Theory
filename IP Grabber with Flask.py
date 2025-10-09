# Flask is not fulyy secure
# -pk

from flask import Flask, request
import logging
import ipaddress

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
    try:
        # Get the visitor's IP address
        visitor_ip = request.remote_addr
        # Check for X-Forwarded-For header (if behind a proxy/load balancer)
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            try:
                candidate_ip = forwarded_for.split(',')[0].strip()
                ipaddress.ip_address(candidate_ip)  # Validate IP
                visitor_ip = candidate_ip
            except IndexError as e:
                logging.warning(f"IndexError in X-Forwarded-For: {forwarded_for} - {e}")
            except ValueError as e:
                logging.warning(f"Invalid IP in X-Forwarded-For: {forwarded_for} - {e}")
        # Log the IP address
        logging.info(visitor_ip)
        # Return a simple webpage
        return """
IP Grabber
Your IP address has been logged: {}
""".format(visitor_ip)
    except Exception as e:
        logging.error(f"Error processing request: {e}")
        return "An error occurred while processing your request.", 500

@app.errorhandler(400)
def bad_request(error):
    logging.error(f"400 error: {error}")
    return "Bad request.", 400

@app.errorhandler(404)
def not_found(error):
    logging.error(f"404 error: {error}")
    return "Page not found.", 404

@app.errorhandler(405)
def method_not_allowed(error):
    logging.error(f"405 error: {error}")
    return "Method not allowed.", 405

@app.errorhandler(500)
def internal_error(error):
    logging.error(f"500 error: {error}")
    return "Internal server error.", 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

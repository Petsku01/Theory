Warning: All User data is stored in memory and lost on server restart. Use a database (MongoDB) for saving.

1. Install Node.js:

Ensure Node.js is installed (download from https://nodejs.org/).

2. Backend:

Save server.js in a project directory.
Navigate to the directory in a terminal and run:

bash

npm init -y
npm install express bcrypt speakeasy qrcode cors


Start the server:
bash
node server.js

3. Set Up Frontend:

Save index.html in a directory accessible to a web server (e.g., use a simple HTTP server or open directly in a browser with CORS enabled).

For testig, you can use a Node.js HTTP server:
bash

npm install -g http-server
http-server
Access the frontend at http://localhost:8080 (or the port shown by http-server).

4.Test:

Register:
        Enter a username and password in the registration form and click "Register".
        A QR code will appear; scan it with an authenticator app (e.g., Google Authenticator).

Login:
        Enter the same username, password, and the TOTP code from the authenticator app.
        If successful, you’ll see "Login successful!".
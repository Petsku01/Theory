1. Azure AD Configuration:

    Replace <TENANT_ID> in server.js with your Azure AD Directory (tenant) ID.
    Replace <CLIENT_ID> with your Application (client) ID from the app registration.


    Optionally, generate a client secret in Azure AD (App registrations > Certificates & secrets) and add it as <CLIENT_SECRET>. If omitted, the flow uses PKCE.


    Ensure the redirect URI (http://localhost:3000/auth/callback) is added in Azure AD.

2. Install Dependencies:

    Save server.js and index.html in a project directory.
    Run:
    bash

    npm init -y
    npm install express passport passport-azure-ad cors

3. Run:

    Start the backend:
    bash

node server.js
Access the frontend at http://localhost:3000.
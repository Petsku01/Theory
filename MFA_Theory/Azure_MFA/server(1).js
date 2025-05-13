const express = require('express');
const passport = require('passport');
const { OIDCStrategy } = require('passport-azure-ad');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// Azure AD configuration
const config = {
    identityMetadata: 'https://login.microsoftonline.com/<TENANT_ID>/v2.0/.well-known/openid-configuration',
    clientID: '<CLIENT_ID>',
    responseType: 'code',
    responseMode: 'query',
    redirectUrl: 'http://localhost:3000/auth/callback',
    allowHttpForRedirectUrl: true, // For local testing
    clientSecret: '<CLIENT_SECRET>', // Optional, generate in Azure AD if needed
    validateIssuer: true,
    passReqToCallback: false,
    scope: ['openid', 'profile', 'email']
};

// Passport strategy for Azure AD
passport.use(new OIDCStrategy({
    ...config
}, (iss, sub, profile, accessToken, refreshToken, done) => {
    // User authenticated; profile contains user info
    return done(null, { id: profile.oid, displayName: profile.displayName, accessToken });
}));

// Serialize/deserialize user for session (minimal for demo)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Routes
app.get('/auth/azuread', passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }));

app.get('/auth/callback', passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/?error=Authentication failed'
}), (req, res) => {
    // Successful authentication
    res.redirect('/?message=Login successful! Welcome ' + req.user.displayName);
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
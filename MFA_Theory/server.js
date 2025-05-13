const express = require('express');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// In-memory user storage (replace with a database in production)
const users = {};

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (users[username]) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
            name: `MFA-Demo:${username}`,
            issuer: 'MFA-Demo'
        });

        // Generate QR code URL for authenticator app
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Store user data
        users[username] = {
            password: hashedPassword,
            totpSecret: secret.base32
        };

        res.json({ message: 'Registration successful', qrCodeUrl });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password, totpCode } = req.body;

    const user = users[username];
    if (!user) {
        return res.status(400).json({ message: 'Invalid username or password' });
    }

    try {
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: 'Invalid username or password' });
        }

        // Verify TOTP code
        const isValidTotp = speakeasy.totp.verify({
            secret: user.totpSecret,
            encoding: 'base32',
            token: totpCode,
            window: 1 // Allow 30-second window for clock drift
        });

        if (!isValidTotp) {
            return res.status(400).json({ message: 'Invalid TOTP code' });
        }

        res.json({ message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
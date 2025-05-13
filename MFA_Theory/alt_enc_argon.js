// Alt encryption as argon2
// not functional

const express = require('express');
const argon2 = require('argon2');
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
        // Hash the password with Argon2
        const hashedPassword = await argon2.hash(password, {
            type: argon2.argon2id, // Use Argon2id variants
            memoryCost: 2 ** 16,   // 64 MB memory (adjust based on server capacity)
            timeCost: 3,           // 3 iterations, best
            parallelism: 1         // Single thread
        });

        // Generate TOTP secret
        // #Demo
        const secret = speakeasy.generateSecret({
            name: `MFA-Demo:${username}`,
            issuer: 'MFA-Demo'
        });

        // Generate QR code URL for authenticator app
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Store user data
        // base32
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
        // Verifies password with Argon2
        const passwordMatch = await argon2.verify(user.password, password);
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

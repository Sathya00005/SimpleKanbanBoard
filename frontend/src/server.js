const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// ----------------------
// MUST BE FIRST (IMPORTANT)
// ----------------------
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Preflight handling
app.options('*', cors());

// ----------------------
// TEST ROUTE (IMPORTANT DEBUG)
// ----------------------
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ----------------------
// SIGNUP API
// ----------------------
app.post('/api/auth/signup', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            error: 'Missing fields'
        });
    }

    return res.status(201).json({
        message: 'User created successfully'
    });
});

// ----------------------
// START SERVER
// ----------------------
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { createTask, getTasks } from './task.controller.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());


// Health
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

// Signup
app.post('/api/auth/signup', (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    return res.status(201).json({
        message: 'User created successfully'
    });
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    return res.json({
        message: 'Login successful',
        token: 'mock-token'
    });
});

// Tasks API
app.post('/api/tasks', createTask);
app.get('/api/tasks', getTasks);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export { app };
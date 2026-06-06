import express from 'express';
import { sessionMiddleware, loginRateLimiter } from './session.config.js';
import { signup, login } from './auth.controller.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(express.json());
// Apply the secure session middleware to all routes
app.use(sessionMiddleware);

// Routes
// Apply rate limiting specifically to the login route
app.post('/api/auth/login', loginRateLimiter, login);
app.post('/api/auth/signup', signup);

// A protected route example to demonstrate authentication
app.get('/api/profile', (req, res) => {
  if (req.session.userId) {
    res.json({ message: `Authenticated as user ${req.session.userId}` });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { app }; // Export for testing purposes
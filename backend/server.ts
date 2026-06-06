import express from 'express';
import { sessionMiddleware, loginRateLimiter } from './session.config.js';
import { signup, login } from './auth.controller.js';
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(express.json());
app.use(sessionMiddleware);

// Auth routes
app.post('/api/auth/login', loginRateLimiter, login);
app.post('/api/auth/signup', signup);

// Task schema validation endpoint
app.post('/api/tasks/validate-schema', (req, res) => {
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      valid: false,
      error: 'Task name is required',
    });
  }

  res.status(200).json({
    valid: true,
    task: {
      name,
      description,
    },
  });
});

// Protected route example
app.get('/api/profile', (req, res) => {
  if (req.session.userId) {
    res.json({
      message: `Authenticated as user ${req.session.userId}`,
    });
  } else {
    res.status(401).json({
      error: 'Unauthorized',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { app };
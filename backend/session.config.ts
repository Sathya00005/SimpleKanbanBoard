import session from 'express-session';
import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret', // Should be from env vars
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevents client-side JS from reading the cookie
    secure: isProduction, // Ensures cookie is sent over HTTPS only
    sameSite: 'strict', // Mitigates CSRF attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
});
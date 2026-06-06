import request from 'supertest';
import bcrypt from 'bcrypt';
import express from 'express';
import { describe, it, expect, afterEach, jest } from '@jest/globals';
import { signup, login } from './auth.controller.js';
// Set up an isolated Express app for routing the tests
const app = express();
app.use(express.json());
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
// Mock the Prisma database layer with a correct module path
jest.mock('./db.js', () => ({
    user: {
        create: jest.fn(),
        findUnique: jest.fn(),
    },
}));
import { user as dbUser } from './db.js'; // Corrected path to Prisma client instantiation
describe('Auth Endpoints', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /api/auth/signup', () => {
        it('should create a new user and return 201', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: 'hashedpassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            dbUser.findUnique.mockResolvedValue(null);
            dbUser.create.mockResolvedValue(mockUser);
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User created successfully');
        });
        it('should return 400 if email or password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com' }); // missing password
            expect(res.statusCode).toEqual(400);
        });
        it('should return 409 if user already exists', async () => {
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: 'hashedpassword',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            dbUser.findUnique.mockResolvedValue(mockUser);
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ email: 'test@example.com', password: 'password123' });
            expect(res.statusCode).toEqual(409);
            expect(res.body).toHaveProperty('error', 'User already exists');
        });
    });
    describe('POST /api/auth/login', () => {
        it('should return 200 on successful login', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            dbUser.findUnique.mockResolvedValue(mockUser);
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Login successful');
        });
        it('should return 400 if email or password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com' }); // missing password
            expect(res.statusCode).toEqual(400);
        });
        it('should return 401 with incorrect password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                id: '1',
                email: 'test@example.com',
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            dbUser.findUnique.mockResolvedValue(mockUser);
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });
            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('error', 'Invalid credentials');
        });
    });
});
//# sourceMappingURL=auth.integration.test.js.map
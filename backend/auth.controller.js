import bcrypt from 'bcrypt';
import { user as dbUser } from './db.js'; // Corrected path to Prisma client instantiation
const saltRounds = 12;
export const signup = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const existingUser = await dbUser.findUnique({ where: { email } });
    if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = await dbUser.create({
        data: { email, password: hashedPassword },
    });
    // Automatically log in user upon successful sign-up
    req.session.userId = user.id;
    res.status(201).json({ message: 'User created successfully and logged in' });
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await dbUser.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Create session
    req.session.userId = user.id;
    res.status(200).json({ message: 'Login successful' });
};
//# sourceMappingURL=auth.controller.js.map
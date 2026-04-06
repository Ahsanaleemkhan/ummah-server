const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { createUser, findUserByEmail } = require('../utils/userStore');

const JWT_SECRET = process.env.JWT_SECRET || 'ummah-travel-dev-secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const getAdminConfig = () => ({
    id: 'ADM001',
    name: process.env.ADMIN_NAME || 'Super Admin',
    email: process.env.ADMIN_EMAIL || 'admin@ummahtravel.com',
});

const createToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });

const isAdminPasswordValid = async (password) => {
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;

    if (passwordHash) {
        return bcrypt.compare(password, passwordHash);
    }

    const fallbackPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    return password === fallbackPassword;
};

const createAdminUserPayload = (userRecord) => ({
    id: userRecord.id || 'ADM001',
    name: userRecord.name || 'Super Admin',
    email: userRecord.email,
    role: 'admin',
});

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const userPayload = {
            id: `USR${Date.now()}`,
            name,
            email,
            password: hashedPassword,
            role: 'customer',
            createdAt: new Date().toISOString(),
        };

        const user = await createUser(userPayload);

        // Generate JWT
        const token = createToken({ id: user.id, name: user.name, email: user.email, role: user.role });

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = createToken({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role || 'customer',
        });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role || 'customer' },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/auth/admin/login
router.post('/admin/login', validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const dbUser = await findUserByEmail(email);

        if (dbUser) {
            const dbRole = String(dbUser.role || '').toLowerCase();
            if (dbRole !== 'admin' || !dbUser.password) {
                return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
            }

            const isDbPasswordValid = await bcrypt.compare(password, dbUser.password);
            if (!isDbPasswordValid) {
                return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
            }

            const adminUser = createAdminUserPayload(dbUser);
            const token = createToken(adminUser);

            return res.json({
                success: true,
                message: 'Admin login successful',
                token,
                user: adminUser,
            });
        }

        const adminConfig = getAdminConfig();

        if (String(email).toLowerCase() !== adminConfig.email.toLowerCase()) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        const validPassword = await isAdminPasswordValid(password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }

        const adminUser = createAdminUserPayload(adminConfig);

        const token = createToken(adminUser);

        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            user: adminUser,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});

// GET /api/auth/admin/me - Get current admin profile
router.get('/admin/me', authMiddleware, requireRole('admin'), (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});

module.exports = router;

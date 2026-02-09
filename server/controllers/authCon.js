const bcrypt = require('bcryptjs');
const User = require('../models/User');

const handleLogin = async (req, res) => {
    try {
        const { SignJWT } = await import('jose');
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        const token = await new SignJWT({
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

const handleRegister = async (req, res) => {
    try {
        const { SignJWT } = await import('jose');
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            email,
            passwordHash,
            role: 'user',
            registeredContests: []
        });

        await newUser.save();

        // Generate JWT token
        const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
        const token = await new SignJWT({
            userId: newUser._id.toString(),
            email: newUser.email,
            role: newUser.role
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(secret);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                _id: newUser._id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    handleLogin,
    handleRegister
}
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { getAuthConfig, isEmailDomainAllowed } = require('../utils/authConfig');
const { verifyGoogleIdToken } = require('../helpers/googleIdToken');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handleLogin = async (req, res, next) => {
    try {
        const { SignJWT } = await import('jose');
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Google-only accounts have no password to compare against.
        if (!user.passwordHash) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Admins keep password login so disabling it can never lock them out.
        if (!getAuthConfig().credentialsEnabled && user.role !== 'admin') {
            return res.status(403).json({ code: 'PasswordLoginDisabled', message: 'Password login is disabled. Sign in with Google.' });
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
        next(error);
    }
}

const handleRegister = async (req, res, next) => {
    try {
        const { SignJWT } = await import('jose');
        const { email, password, name } = req.body;

        if (!getAuthConfig().credentialsEnabled) {
            return res.status(403).json({ code: 'RegistrationDisabled', message: 'Registration is disabled. Sign in with Google.' });
        }

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ message: 'Email is already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name.trim(),
            email: normalizedEmail,
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
        next(error);
    }
}

// Checks the verified token's claims against our policy; returns the profile to store or an error.
const resolveGoogleProfile = (payload, allowedDomains) => {
    if (!payload?.sub || !payload.email) {
        return { error: { status: 401, code: 'GoogleSignInFailed', message: 'Google account has no email' } };
    }
    // Linking by email is only safe when Google vouches that the user owns the mailbox.
    if (payload.email_verified !== true) {
        return { error: { status: 403, code: 'GoogleEmailNotVerified', message: 'Google email is not verified' } };
    }
    const email = payload.email.toLowerCase().trim();
    if (!isEmailDomainAllowed(email, allowedDomains)) {
        return { error: { status: 403, code: 'GoogleDomainNotAllowed', message: 'This Google account is not from an allowed domain' } };
    }
    const name = (payload.name || email.split('@')[0]).trim().slice(0, 100);
    return { profile: { googleId: payload.sub, email, name, avatar: payload.picture } };
};

const findOrCreateGoogleUser = async ({ googleId, email, name, avatar }) => {
    const byGoogleId = await User.findOne({ googleId });
    if (byGoogleId) return byGoogleId;

    // Existing credential account with the same (Google-verified) email: link it.
    const byEmail = await User.findOne({ email });
    if (byEmail) {
        if (byEmail.googleId && byEmail.googleId !== googleId) {
            return null;
        }
        byEmail.googleId = googleId;
        if (!byEmail.avatar && avatar) byEmail.avatar = avatar;
        await byEmail.save();
        return byEmail;
    }

    try {
        return await User.create({
            email,
            name,
            avatar,
            googleId,
            authProvider: 'google',
            role: 'user',
            registeredContests: []
        });
    } catch (error) {
        // Two concurrent first sign-ins: the loser picks up the row the winner created.
        if (error?.code === 11000) return User.findOne({ googleId });
        throw error;
    }
};

const handleGoogleAuth = async (req, res, next) => {
    try {
        const { googleEnabled, googleClientId, googleAllowedDomains } = getAuthConfig();
        if (!googleEnabled) {
            return res.status(403).json({ code: 'GoogleSignInDisabled', message: 'Google sign-in is disabled' });
        }

        const { idToken } = req.body || {};
        if (typeof idToken !== 'string' || !idToken) {
            return res.status(400).json({ message: 'idToken is required' });
        }

        let payload;
        try {
            payload = await verifyGoogleIdToken(idToken, googleClientId);
        } catch {
            return res.status(401).json({ code: 'GoogleSignInFailed', message: 'Invalid Google token' });
        }

        const { profile, error } = resolveGoogleProfile(payload, googleAllowedDomains);
        if (error) {
            return res.status(error.status).json({ code: error.code, message: error.message });
        }

        const user = await findOrCreateGoogleUser(profile);
        if (!user) {
            return res.status(409).json({ code: 'OAuthAccountNotLinked', message: 'This email is linked to a different Google account' });
        }

        res.json({
            success: true,
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    handleLogin,
    handleRegister,
    handleGoogleAuth,
    _resolveGoogleProfile: resolveGoogleProfile
}
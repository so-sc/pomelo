const { hashPassword, verifyPassword } = require('../utils/passwords');
const User = require('../models/User');
const { CREDENTIALS, isProviderEnabled } = require('../auth/config');
const { oauthProviders } = require('../auth/providers');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handleLogin = async (req, res, next) => {
    try {
        const { SignJWT } = await import('jose');
        const { email, password } = req.body;

        if (!isProviderEnabled(CREDENTIALS)) {
            return res.status(403).json({ success: false, code: 'PasswordLoginDisabled', error: 'Password login is disabled' });
        }

        if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Provider-only accounts have no password to compare against.
        if (!user.passwordHash) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const passwordsMatch = await verifyPassword(password, user.passwordHash);
        if (!passwordsMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
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

        if (!isProviderEnabled(CREDENTIALS)) {
            return res.status(403).json({ success: false, code: 'RegistrationDisabled', error: 'Registration is disabled' });
        }

        if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string' || !email || !password || !name) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'Email is already registered' });
        }

        const passwordHash = await hashPassword(password, 10);

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

// Checks a provider's verified profile against our policy; returns what to store or an error.
const resolveProfile = (profile) => {
    if (!profile?.providerAccountId || !profile.email) {
        return { error: { status: 401, code: 'OAuthSignInFailed', message: 'Account has no email' } };
    }
    // Linking by email is only safe when the provider vouches that the user owns the mailbox.
    if (profile.emailVerified !== true) {
        return { error: { status: 403, code: 'OAuthEmailNotVerified', message: 'Email is not verified' } };
    }
    const email = profile.email.toLowerCase().trim();
    const name = (profile.name || email.split('@')[0]).trim().slice(0, 100);
    return { profile: { providerAccountId: String(profile.providerAccountId), email, name, avatar: profile.avatar } };
};

const findOrCreateOAuthUser = async (provider, { providerAccountId, email, name, avatar }) => {
    const account = { provider, providerAccountId };
    const linked = await User.findOne({ accounts: { $elemMatch: account } });
    if (linked) return linked;

    if (await User.exists({ email })) {
        // The provider has proven this person owns the mailbox; nobody else proved anything.
        // Drop the password so whoever registered this email before them loses access.
        const user = await User.findOneAndUpdate(
            { email, 'accounts.provider': { $ne: provider } },
            { $push: { accounts: account }, $unset: { passwordHash: 1 } },
            { returnDocument: 'after' }
        );
        // Null: the email is already linked to a different account at this provider.
        if (user && !user.avatar && avatar) {
            user.avatar = avatar;
            await user.save();
        }
        return user;
    }

    try {
        return await User.create({
            email,
            name,
            avatar,
            accounts: [account],
            role: 'user',
            registeredContests: []
        });
    } catch (error) {
        // Two concurrent first sign-ins: the loser picks up the row the winner created.
        if (error?.code === 11000) return User.findOne({ accounts: { $elemMatch: account } });
        throw error;
    }
};

const handleOAuth = async (req, res, next) => {
    try {
        const providerId = req.params.provider;
        const provider = Object.hasOwn(oauthProviders, providerId) ? oauthProviders[providerId] : null;
        if (!provider || !isProviderEnabled(providerId)) {
            return res.status(403).json({ success: false, code: 'OAuthProviderDisabled', error: 'This sign-in method is disabled' });
        }

        let verified;
        try {
            verified = await provider.verify(req.body || {}, process.env);
        } catch {
            return res.status(401).json({ success: false, code: 'OAuthSignInFailed', error: 'Invalid sign-in token' });
        }

        const { profile, error } = resolveProfile(verified);
        if (error) {
            return res.status(error.status).json({ success: false, code: error.code, error: error.message });
        }

        const user = await findOrCreateOAuthUser(provider.id, profile);
        if (!user) {
            return res.status(409).json({ success: false, code: 'OAuthAccountNotLinked', error: 'This email is linked to a different account' });
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
    handleOAuth,
    _resolveProfile: resolveProfile
}

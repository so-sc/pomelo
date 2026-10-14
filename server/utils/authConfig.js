// Auth method toggles. The admin daemon derives these from config.yaml (`auth:`) and
// passes them to the containers as env vars, so they are read per call, not cached.

const parseBool = (value, fallback) => {
    if (value === undefined || value === '') return fallback;
    return !['false', '0', 'no', 'off'].includes(String(value).trim().toLowerCase());
};

const parseDomains = (value) =>
    String(value || '')
        .split(',')
        .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
        .filter(Boolean);

const getAuthConfig = (env = process.env) => {
    const googleClientId = env.GOOGLE_CLIENT_ID || '';
    // Enabled without a client ID is a misconfiguration; treat it as off.
    const googleEnabled = parseBool(env.AUTH_GOOGLE_ENABLED, false) && !!googleClientId;
    return {
        // Password login can only be turned off when Google is there to replace it.
        credentialsEnabled: parseBool(env.AUTH_CREDENTIALS_ENABLED, true) || !googleEnabled,
        googleEnabled,
        googleClientId,
        googleAllowedDomains: parseDomains(env.AUTH_GOOGLE_ALLOWED_DOMAINS),
    };
};

// An empty list means any Google account may sign in.
const isEmailDomainAllowed = (email, allowedDomains) => {
    if (!allowedDomains.length) return true;
    const domain = String(email || '').toLowerCase().split('@')[1];
    return !!domain && allowedDomains.includes(domain);
};

module.exports = { getAuthConfig, isEmailDomainAllowed, parseBool, parseDomains };

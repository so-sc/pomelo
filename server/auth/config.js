// Which sign-in methods are on. The admin daemon derives AUTH_PROVIDERS from config.yaml
// (`auth.providers`) and passes it to the containers, so it is read per call, not cached.
const { oauthProviders } = require('./providers');

const CREDENTIALS = 'credentials';

const parseProviderList = (value) =>
    String(value ?? CREDENTIALS)
        .split(',')
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);

// Enabled providers that are actually usable. If none are, password login stays on so
// a misconfiguration can never leave nobody able to sign in.
const getEnabledProviders = (env = process.env) => {
    const enabled = parseProviderList(env.AUTH_PROVIDERS).filter((id) =>
        id === CREDENTIALS || (oauthProviders[id] && oauthProviders[id].isConfigured(env))
    );
    return enabled.length ? [...new Set(enabled)] : [CREDENTIALS];
};

const isProviderEnabled = (id, env = process.env) => getEnabledProviders(env).includes(id);

module.exports = { CREDENTIALS, getEnabledProviders, isProviderEnabled, parseProviderList };

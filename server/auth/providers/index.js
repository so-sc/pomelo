// OAuth providers the backend can verify. To add one, create a module exposing
// { id, isConfigured(env), verify(body, env) } and register it here.
const google = require('./google');

const oauthProviders = {
    [google.id]: google,
};

module.exports = { oauthProviders };

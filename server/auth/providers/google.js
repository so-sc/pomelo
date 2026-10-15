// Google sign-in. We verify the OIDC id_token ourselves rather than trusting the email NextAuth
// hands us: signature against Google's published keys, issuer, audience (our client ID) and expiry.
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

let jwks = null;

const verifyIdToken = async (idToken, clientId) => {
    const { createRemoteJWKSet, jwtVerify } = await import('jose');
    // jose caches and rotates the fetched keys on the JWKS object, so keep one instance.
    if (!jwks) jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

    const { payload } = await jwtVerify(idToken, jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: clientId,
    });
    return payload;
};

module.exports = {
    id: 'google',

    isConfigured: (env) => !!env.GOOGLE_CLIENT_ID,

    // Returns the normalised profile, or throws if the token is not valid for this app.
    async verify(body, env) {
        if (typeof body?.idToken !== 'string' || !body.idToken) {
            throw new Error('idToken is required');
        }
        const payload = await verifyIdToken(body.idToken, env.GOOGLE_CLIENT_ID);
        return {
            providerAccountId: payload.sub,
            email: payload.email,
            emailVerified: payload.email_verified === true,
            name: payload.name,
            avatar: payload.picture,
        };
    },
};

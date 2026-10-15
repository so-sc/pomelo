const test = require('node:test');
const assert = require('node:assert');

const { getEnabledProviders } = require('../auth/config');
const { _resolveProfile: resolveProfile } = require('../controllers/authCon');

test('getEnabledProviders defaults to password login only', () => {
    assert.deepStrictEqual(getEnabledProviders({}), ['credentials']);
});

test('getEnabledProviders drops providers that are unknown or missing credentials', () => {
    assert.deepStrictEqual(getEnabledProviders({ AUTH_PROVIDERS: 'credentials,google,github' }), ['credentials']);
    assert.deepStrictEqual(
        getEnabledProviders({ AUTH_PROVIDERS: ' Credentials , google ', GOOGLE_CLIENT_ID: 'id' }),
        ['credentials', 'google']
    );
});

test('getEnabledProviders allows Google-only once Google is configured', () => {
    assert.deepStrictEqual(getEnabledProviders({ AUTH_PROVIDERS: 'google', GOOGLE_CLIENT_ID: 'id' }), ['google']);
});

test('getEnabledProviders keeps password login on when nothing usable is enabled', () => {
    assert.deepStrictEqual(getEnabledProviders({ AUTH_PROVIDERS: 'google' }), ['credentials']);
    assert.deepStrictEqual(getEnabledProviders({ AUTH_PROVIDERS: '' }), ['credentials']);
});

test('resolveProfile refuses an unverified email so it cannot hijack an account', () => {
    const { error } = resolveProfile({ providerAccountId: '1', email: 'a@b.com', emailVerified: false });
    assert.strictEqual(error.code, 'OAuthEmailNotVerified');
});

test('resolveProfile normalises the email and falls back to it for the name', () => {
    const { profile } = resolveProfile({ providerAccountId: 42, email: ' Jo@College.edu', emailVerified: true });
    assert.deepStrictEqual(profile, { providerAccountId: '42', email: 'jo@college.edu', name: 'jo', avatar: undefined });
});

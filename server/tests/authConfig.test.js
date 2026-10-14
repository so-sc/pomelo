const test = require('node:test');
const assert = require('node:assert');

const { getAuthConfig, isEmailDomainAllowed } = require('../utils/authConfig');
const { _resolveGoogleProfile: resolveGoogleProfile } = require('../controllers/authCon');

test('getAuthConfig defaults to password login only', () => {
    const cfg = getAuthConfig({});
    assert.strictEqual(cfg.credentialsEnabled, true);
    assert.strictEqual(cfg.googleEnabled, false);
    assert.deepStrictEqual(cfg.googleAllowedDomains, []);
});

test('getAuthConfig treats Google as off when no client ID is set', () => {
    assert.strictEqual(getAuthConfig({ AUTH_GOOGLE_ENABLED: 'true' }).googleEnabled, false);
    assert.strictEqual(getAuthConfig({ AUTH_GOOGLE_ENABLED: 'true', GOOGLE_CLIENT_ID: 'id' }).googleEnabled, true);
});

test('getAuthConfig keeps password login on when Google cannot replace it', () => {
    assert.strictEqual(getAuthConfig({ AUTH_CREDENTIALS_ENABLED: 'false' }).credentialsEnabled, true);
});

test('getAuthConfig parses the disabled flag and domain list', () => {
    const cfg = getAuthConfig({
        AUTH_GOOGLE_ENABLED: 'true',
        GOOGLE_CLIENT_ID: 'id',
        AUTH_CREDENTIALS_ENABLED: 'false',
        AUTH_GOOGLE_ALLOWED_DOMAINS: ' SOSC.org.in, @college.edu ,,',
    });
    assert.strictEqual(cfg.credentialsEnabled, false);
    assert.deepStrictEqual(cfg.googleAllowedDomains, ['sosc.org.in', 'college.edu']);
});

test('isEmailDomainAllowed matches the exact domain, not a suffix', () => {
    assert.strictEqual(isEmailDomainAllowed('a@any.com', []), true);
    assert.strictEqual(isEmailDomainAllowed('A@College.edu', ['college.edu']), true);
    assert.strictEqual(isEmailDomainAllowed('a@evilcollege.edu', ['college.edu']), false);
    assert.strictEqual(isEmailDomainAllowed('a@college.edu.evil.com', ['college.edu']), false);
});

test('resolveGoogleProfile refuses an unverified email so it cannot hijack an account', () => {
    const { error } = resolveGoogleProfile({ sub: '1', email: 'a@b.com', email_verified: false }, []);
    assert.strictEqual(error.code, 'GoogleEmailNotVerified');
});

test('resolveGoogleProfile enforces the allowed domains', () => {
    const { error } = resolveGoogleProfile({ sub: '1', email: 'a@gmail.com', email_verified: true }, ['college.edu']);
    assert.strictEqual(error.code, 'GoogleDomainNotAllowed');
});

test('resolveGoogleProfile normalises the email and falls back to it for the name', () => {
    const { profile } = resolveGoogleProfile({ sub: '42', email: ' Jo@College.edu', email_verified: true }, ['college.edu']);
    assert.deepStrictEqual(profile, { googleId: '42', email: 'jo@college.edu', name: 'jo', avatar: undefined });
});

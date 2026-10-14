// Which sign-in methods are on. The admin daemon derives these env vars from config.yaml (`auth:`);
// the server applies the same rules in server/utils/authConfig.js.
export type AuthMethods = {
    credentials: boolean;
    google: boolean;
};

function parseBool(value: string | undefined, fallback: boolean) {
    if (value === undefined || value === "") return fallback;
    return !["false", "0", "no", "off"].includes(value.trim().toLowerCase());
}

export function getGoogleAllowedDomains(): string[] {
    return (process.env.AUTH_GOOGLE_ALLOWED_DOMAINS || "")
        .split(",")
        .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean);
}

export function getAuthMethods(): AuthMethods {
    const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
    const google = parseBool(process.env.AUTH_GOOGLE_ENABLED, false) && googleConfigured;
    return {
        // Password login is only "off" when Google can actually replace it. Admins keep it regardless.
        credentials: parseBool(process.env.AUTH_CREDENTIALS_ENABLED, true) || !google,
        google,
    };
}

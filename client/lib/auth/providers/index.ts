// Sign-in providers. To add one, create a module exporting an AuthProviderEntry and list it
// here; the server needs a matching verifier in server/auth/providers.
import { credentials } from "./credentials";
import { google } from "./google";
import type { AuthProviderEntry } from "./types";

const registry: AuthProviderEntry[] = [credentials, google];

export type AuthMethods = {
    credentials: boolean;
    oauth: { id: string; label: string }[];
};

/**
 * Providers that are switched on (AUTH_PROVIDERS, set by the admin daemon from config.yaml)
 * and have their secrets. If none are, password login stays on so nobody is locked out.
 * Mirrors server/auth/config.js.
 */
export function getEnabledProviders(): AuthProviderEntry[] {
    const ids = (process.env.AUTH_PROVIDERS ?? credentials.id)
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);
    const enabled = registry.filter((p) => ids.includes(p.id) && p.isConfigured());
    return enabled.length ? enabled : [credentials];
}

export function getProviderEntry(id: string): AuthProviderEntry | undefined {
    return registry.find((p) => p.id === id);
}

/** What the login and register pages should offer. */
export function getAuthMethods(): AuthMethods {
    const enabled = getEnabledProviders();
    return {
        credentials: enabled.includes(credentials),
        oauth: enabled
            .filter((p) => p.toBackendPayload)
            .map(({ id, label }) => ({ id, label })),
    };
}

import type { Account } from "next-auth"
import type { Provider } from "next-auth/providers"

export type AuthProviderEntry = {
    /** Matches the NextAuth provider id and the `auth.providers` key in config.yaml. */
    id: string;
    label: string;
    /** Whether the secrets this provider needs are present in the environment. */
    isConfigured(): boolean;
    create(): Provider;
    /** OAuth only: what the backend needs to verify the sign-in (POST /api/auth/oauth/:id). */
    toBackendPayload?(account: Account): Record<string, unknown>;
}

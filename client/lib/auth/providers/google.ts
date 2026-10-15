import Google from "next-auth/providers/google"
import type { AuthProviderEntry } from "./types";

export const google: AuthProviderEntry = {
    id: "google",
    label: "Google",
    isConfigured: () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    create: () => Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: { params: { prompt: "select_account" } },
    }),
    // The backend verifies this id_token against Google itself.
    toBackendPayload: (account) => ({ idToken: account.id_token }),
}

import Credentials from "next-auth/providers/credentials"
import { CredentialsSignin } from "next-auth"
import { z } from "zod"
import { getBaseUrl } from "@/lib/env";
import { clientIpHeaders } from "@/lib/client-ip";
import type { AuthProviderEntry } from "./types";

// A failed authorize() otherwise always reads "Invalid credentials". The code reaches the
// login action (actions/auth.ts), so a busy server isn't mistaken for a wrong password.
export const LOGIN_RATE_LIMITED = "rate_limited";
export const LOGIN_UNAVAILABLE = "unavailable";

class LoginFailure extends CredentialsSignin {
    constructor(code: string) {
        super();
        this.code = code;
    }
}

export const credentials: AuthProviderEntry = {
    id: "credentials",
    label: "Email & password",
    isConfigured: () => true,
    create: () => Credentials({
        async authorize(credentials) {
            const parsedCredentials = z
                .object({ email: z.string().email(), password: z.string().min(6) })
                .safeParse(credentials);

            if (parsedCredentials.success) {
                const { email, password } = parsedCredentials.data;

                let res: Response;
                try {
                    res = await fetch(`${getBaseUrl()}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(await clientIpHeaders()) },
                        body: JSON.stringify({ email, password })
                    });
                } catch (error: any) {
                    console.error(`Auth API error: ${error.message || 'Unknown error'}`);
                    throw new LoginFailure(LOGIN_UNAVAILABLE);
                }

                if (res.status === 429) throw new LoginFailure(LOGIN_RATE_LIMITED);
                if (res.status >= 500) throw new LoginFailure(LOGIN_UNAVAILABLE);

                const data = await res.json().catch(() => ({}));
                if (res.ok && data.success && data.user) {
                    return data.user;
                }

                return null;
            }

            return null;
        },
    }),
}

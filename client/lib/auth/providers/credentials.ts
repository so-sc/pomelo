import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { getBaseUrl } from "@/lib/env";
import type { AuthProviderEntry } from "./types";

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

                try {
                    const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await res.json();

                    if (res.ok && data.success && data.user) {
                        return data.user;
                    }


                    return null;
                } catch (error: any) {
                    console.error(`Auth API error: ${error.message || 'Unknown error'}`);
                    return null;
                }
            }


            return null;
        },
    }),
}


import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { SignJWT } from "jose"

// Helper to mint a token for the Express Request
// this minting happens on Next.js server side.
async function mintBackendToken(user: any) {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
    const alg = 'HS256'

    const jwt = await new SignJWT({
        userId: user._id || user.id,
        role: user.role,
        email: user.email
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime('1h') // Short lived
        .sign(secret)

    return jwt
}

export const authConfig = {
    pages: {
        signIn: '/auth/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const userRole = auth?.user?.role;

            const isAdminPage = nextUrl.pathname.startsWith('/admin');
            const isUserPage = ['/attempt', '/join', '/test'].some(path => nextUrl.pathname.startsWith(path));

            if (isAdminPage) {
                if (isLoggedIn && userRole === 'admin') return true;
                return false; // Redirect to login
            }

            if (isUserPage) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role
                token.id = (user as any).id || (user as any)._id

                // Mint a fresh backend token
                const backendToken = await mintBackendToken(user);
                token.backendToken = backendToken;
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                session.user.role = token.role as string
                session.user.id = token.id as string
                session.backendToken = token.backendToken as string
            }
            return session
        },
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;

                    try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                        });

                        const data = await res.json();

                        if (res.ok && data.success && data.user) {
                            return data.user;
                        }

                        console.log('Login failed:', data.message);
                        return null;
                    } catch (error) {
                        console.error('Auth API error:', error);
                        return null;
                    }
                }

                console.log('Invalid credentials format');
                return null;
            },
        }),
    ],
} satisfies NextAuthConfig


import type { NextAuthConfig } from "next-auth"
import { SignJWT, decodeJwt } from "jose"
import { getBaseUrl } from "@/lib/env";
import { clientIpHeaders } from "@/lib/client-ip";
import { getEnabledProviders, getProviderEntry } from "@/lib/auth/providers";

// Helper to mint a token for the Express Request
// this minting happens on Next.js server side.
interface User {
    id?: string;
    _id?: string;
    email?: string | null;
    role?: string;
    name?: string | null;
}

// Helper to mint a token for the Express Request
// this minting happens on Next.js server side.
const BACKEND_TOKEN_TTL_SECONDS = 2 * 24 * 60 * 60;
const REFRESH_MARGIN_SECONDS = 10 * 60;

// The NextAuth session outlives the backend token by weeks; without a refresh the user
// stays "signed in" while every backend call 401s.
export function shouldRefreshBackendToken(
    expSeconds: number | undefined,
    nowSeconds: number
): boolean {
    if (!expSeconds) return true;
    return nowSeconds >= expSeconds - REFRESH_MARGIN_SECONDS;
}

async function mintBackendToken(user: User) {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
    const alg = 'HS256'
    const exp = Math.floor(Date.now() / 1000) + BACKEND_TOKEN_TTL_SECONDS

    const jwt = await new SignJWT({
        userId: user._id || user.id,
        role: user.role,
        email: user.email
    })
        .setProtectedHeader({ alg })
        .setIssuedAt()
        .setExpirationTime(exp)
        .sign(secret)

    return { jwt, exp }
}

export const authConfig = {
    secret: process.env.AUTH_SECRET,
    logger: {
        error(error: any) {
            if (error?.name === 'CredentialsSignin' || error?.type === 'CredentialsSignin' || error?.code === 'credentials') return;
            console.error(error);
        }
    },
    pages: {
        signIn: '/auth/login',
    },
    callbacks: {
        async signIn({ user, account }: { user: any; account?: any }) {
            const entry = account ? getProviderEntry(account.provider) : undefined;
            if (!entry?.toBackendPayload) return true;

            // The backend verifies the provider's token itself, then finds, links or creates the user.
            try {
                const res = await fetch(`${getBaseUrl()}/api/auth/oauth/${entry.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(await clientIpHeaders()) },
                    body: JSON.stringify(entry.toBackendPayload(account))
                });
                const data = await res.json().catch(() => ({}));

                if (res.ok && data.success && data.user) {
                    // Without an adapter Auth.js passes this same object to the jwt callback,
                    // so the session carries our database id and role, not the provider's.
                    Object.assign(user, {
                        id: String(data.user._id),
                        _id: data.user._id,
                        role: data.user.role,
                        name: data.user.name,
                        email: data.user.email,
                        image: data.user.avatar ?? user.image,
                    });
                    return true;
                }

                return `/auth/login?error=${encodeURIComponent(data.code || "OAuthSignInFailed")}`;
            } catch (error: any) {
                console.error(`OAuth API error: ${error.message || 'Unknown error'}`);
                return "/auth/login?error=OAuthSignInFailed";
            }
        },
        authorized({ auth, request }: { auth: any; request: any }) {
            const nextUrl = request?.nextUrl;
            if (!nextUrl) return true;

            const isLoggedIn = !!auth?.user
            const userRole = (auth?.user as any)?.role;

            const isAdminPage = nextUrl.pathname.startsWith('/admin');
            const isUserPage = ['/attempt', '/join', '/test'].some(path => nextUrl.pathname.startsWith(path));

            // Auth.js's own redirect puts an absolute URL built from AUTH_URL in callbackUrl,
            // whose host can differ from the browser's; a path always round-trips.
            const toLogin = () => {
                const login = nextUrl.clone();
                login.pathname = '/auth/login';
                login.search = '';
                login.searchParams.set('callbackUrl', `${nextUrl.pathname}${nextUrl.search}`);
                return Response.redirect(login);
            };

            if (isAdminPage) {
                if (isLoggedIn && userRole === 'admin') return true;
                return toLogin();
            }

            if (isUserPage) {
                if (isLoggedIn) return true;
                return toLogin();
            }

            return true;
        },
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                const u = user as User;
                token.role = u.role
                // _id first: for credentials sign-ins Auth.js fills `id` with a random UUID.
                token.id = String(u._id || u.id)
                token.email = u.email

                // Mint a fresh backend token — if this fails, sign-in must fail too,
                // otherwise the user ends up "signed in" with every backend call 401ing silently.
                try {
                    const minted = await mintBackendToken(u);
                    token.backendToken = minted.jwt
                    token.backendTokenExp = minted.exp
                } catch (error) {
                    console.error("Failed to mint backend token:", error);
                    throw new Error("Failed to establish backend session");
                }

                return token
            }

            // `user` is only set at sign-in, so this is the only place a long-lived
            // session can renew its short-lived backend token.
            if (token.id && shouldRefreshBackendToken(token.backendTokenExp, Math.floor(Date.now() / 1000))) {
                try {
                    // The user id comes from the backend token minted at sign-in, which is the
                    // database id even for sessions whose token.id predates the fix above.
                    const minted = await mintBackendToken({
                        id: String(decodeJwt(token.backendToken as string).userId ?? token.id),
                        role: token.role as string,
                        email: token.email as string,
                    });
                    token.backendToken = minted.jwt
                    token.backendTokenExp = minted.exp
                } catch (error) {
                    // Keep the existing token; the next request tries again.
                    console.error("Failed to refresh backend token:", error);
                }
            }

            return token
        },
        async session({ session, token }: { session: any; token: any }) {
            if (token && session.user) {
                session.user.role = token.role as string
                session.user.id = token.id as string
                session.user.email = token.email as string
                session.backendToken = token.backendToken as string
            }
            return session
        },
    },
    providers: getEnabledProviders().map((p) => p.create()),
} satisfies NextAuthConfig

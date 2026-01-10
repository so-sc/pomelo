import { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            role: string
            id: string
        } & DefaultSession["user"]
        backendToken: string
    }

    interface User {
        role: string
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        role: string
        id: string
        backendToken: string
    }
}

"use server";

import { signIn } from "@/auth";
import { AuthError, CredentialsSignin } from "next-auth";
import { LOGIN_RATE_LIMITED, LOGIN_UNAVAILABLE } from "@/lib/auth/providers/credentials";
import { z } from "zod";
import { getBaseUrl } from "@/lib/env";
import { clientIpHeaders } from "@/lib/client-ip";

const RegisterSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6),
});

export async function authenticate(prevState: string | undefined, formData: FormData) {
    try {
        await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false,
        });
        return "success";
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin": {
                    const { code } = error as CredentialsSignin;
                    if (code === LOGIN_RATE_LIMITED) return "Too many sign-in attempts. Please wait a minute and try again.";
                    if (code === LOGIN_UNAVAILABLE) return "The server is busy or unreachable. Please try again in a moment.";
                    return "Invalid credentials.";
                }
                default:
                    return "Something went wrong.";
            }
        }
        throw error;
    }
}

export async function register(prevState: string | undefined, formData: FormData) {
    const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return "Invalid fields";
    }

    const { name, email, password } = validatedFields.data;

    try {
        const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await clientIpHeaders()) },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            return data.error || "Registration failed";
        }

        return "success";

    } catch (error) {
        console.error("Registration error:", error);
        return "Network Error: Failed to Register User during API call.";
    }
}

import { auth } from "@/auth";

import { getBaseUrl } from "@/lib/env";
const BASE_URL = getBaseUrl();

type Collection = "questions" | "contests" | "submissions";

interface QueryOptions {
    projection?: Record<string, number | boolean>;
    limit?: number;
    sort?: Record<string, 1 | -1>;
    populate?: string | string[] | Record<string, unknown>[];
}

interface PageOptions extends QueryOptions {
    skip?: number;
    /** Plain term; the server escapes it and matches the collection's whitelisted fields. */
    search?: string;
}

async function post(path: string, body: Record<string, unknown>) {
    const session = await auth();
    const token = session?.backendToken;

    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        cache: "no-store",
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error(`Non-JSON response from ${BASE_URL}${path}:`, text.slice(0, 500)); // Log first 500 chars
        throw new Error(`Received non-JSON response: ${text.slice(0, 100)}...`);
    }

    const json = await res.json();
    if (!json.success) {
        throw new Error(json.error || "DB Fetch Error");
    }

    return json;
}

export const db = {
    find: async <T = unknown>(collection: Collection, filter: Record<string, unknown> = {}, options: QueryOptions = {}) => {
        try {
            const json = await post("/api/admin/data", { collection, filter, ...options });
            return json.data as T[];
        } catch (error) {
            console.error(`db.find error [${collection}]:`, error);
            throw error;
        }
    },

    /** Like find, but asks the server for a total count so callers can paginate. */
    findPage: async <T = unknown>(collection: Collection, filter: Record<string, unknown> = {}, options: PageOptions = {}) => {
        try {
            const json = await post("/api/admin/data", { collection, filter, count: true, ...options });
            return { data: json.data as T[], total: (json.total as number) ?? 0 };
        } catch (error) {
            console.error(`db.findPage error [${collection}]:`, error);
            throw error;
        }
    },

    findOne: async <T = unknown>(collection: Collection, filter: Record<string, unknown> = {}, options: QueryOptions = {}) => {
        try {
            const json = await post("/api/admin/data/one", { collection, filter, ...options });
            return json.data as T | null;
        } catch (error) {
            console.error(`db.findOne error [${collection}]:`, error);
            throw error;
        }
    },
};

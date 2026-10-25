import { fetchBackend } from "@/lib/fetch";

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
    const json = await fetchBackend(path, { method: "POST", body: JSON.stringify(body) });
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

// Sign-in providers the admin can switch on, shared by the daemon and the admin UI.
// To add one: list it here, then add matching entries in client/lib/auth/providers and
// server/auth/providers, and pass its secrets through docker/app/docker-compose.yaml.

export type AuthProviderSecret = {
  /** app.env key */
  key: string;
  label: string;
  /** Mask the value in the UI. */
  sensitive?: boolean;
  placeholder?: string;
};

export type AuthProviderDescriptor = {
  /** Key under `auth.providers` in config.yaml and in AUTH_PROVIDERS. */
  id: string;
  label: string;
  description: string;
  secrets: AuthProviderSecret[];
  /** OAuth redirect path to register with the provider. */
  callbackPath?: string;
};

export const CREDENTIALS_PROVIDER = "credentials";

export const AUTH_PROVIDERS: AuthProviderDescriptor[] = [
  {
    id: CREDENTIALS_PROVIDER,
    label: "Email & password",
    description: "Users register and sign in with an email and password.",
    secrets: [],
  },
  {
    id: "google",
    label: "Google",
    description:
      "New Google users get the user role. An existing account with the same verified email is linked, and its password is removed.",
    secrets: [
      { key: "GOOGLE_CLIENT_ID", label: "Client ID", placeholder: "1234-abc.apps.googleusercontent.com" },
      { key: "GOOGLE_CLIENT_SECRET", label: "Client secret", sensitive: true },
    ],
    callbackPath: "/api/auth/callback/google",
  },
];

/** Password login is on unless explicitly disabled; every other provider is off unless enabled. */
export function isProviderEnabled(cfg: any, id: string): boolean {
  const enabled = cfg?.auth?.providers?.[id]?.enabled;
  return id === CREDENTIALS_PROVIDER ? enabled !== false : enabled === true;
}

/** Ids of the enabled providers, in registry order. Never empty: falls back to password login. */
export function resolveEnabledProviders(cfg: any): string[] {
  const enabled = AUTH_PROVIDERS.filter((p) => isProviderEnabled(cfg, p.id)).map((p) => p.id);
  return enabled.length ? enabled : [CREDENTIALS_PROVIDER];
}

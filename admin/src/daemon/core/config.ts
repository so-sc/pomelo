import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import YAML from "yaml";
import type { Paths } from "./types";
import { AUTH_PROVIDERS, isProviderEnabled } from "../../shared/auth-providers";

export function defaultConfigYaml() {
  return [
    "# Pomelo Platform Configuration",
    "app:",
    "  name: \"Pomelo\"",
    "  theme: \"dark\"",
    "  domain: \"localhost\"",
    "  protocol: \"http\"",
    "",
    "ports:",
    "  admin: 8462",
    "  caddyHttp: 80",
    "  caddyHttps: 443",
    "",
    "infrastructure:",
    "  database:",
    "    mode: \"internal\"",
    "  citron:",
    "    mode: \"internal\"",
    "",
    "# Sign-in methods. Google needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in app.env.",
    "auth:",
    "  providers:",
    "    credentials:",
    "      enabled: true",
    "    google:",
    "      enabled: false",
  ].join("\n") + "\n";
}

export function parseConfigYaml(paths: Paths) {
  if (!existsSync(paths.configFile)) return null;
  try {
    return YAML.parse(readFileSync(paths.configFile, "utf8"));
  } catch {
    return null;
  }
}

export function getConfigSnapshot(paths: Paths) {
  const appEnv = existsSync(paths.envFile)
    ? readFileSync(paths.envFile, "utf8")
    : "";
  const configYaml = existsSync(paths.configFile)
    ? readFileSync(paths.configFile, "utf8")
    : "";
  const caddyfile = existsSync(paths.caddyFile)
    ? readFileSync(paths.caddyFile, "utf8")
    : "";
  const citron = existsSync(paths.citronConfFile)
    ? readFileSync(paths.citronConfFile, "utf8")
    : "";
  const citronLanguages = existsSync(paths.citronLanguagesFile)
    ? readFileSync(paths.citronLanguagesFile, "utf8")
    : "";
  return { appEnv, configYaml, caddyfile, citron, citronLanguages };
}

export function updateConfig(paths: Paths, payload: any) {
  let finalAppEnv = typeof payload.appEnv === "string" ? payload.appEnv : (existsSync(paths.envFile) ? readFileSync(paths.envFile, "utf8") : "");

  let configDoc: any = {};
  if (typeof payload.configYaml === "string") {
    writeFileSync(paths.configFile, payload.configYaml);
    try {
      configDoc = YAML.parse(payload.configYaml) || {};
      const domain = configDoc.app?.domain;
      const protocol = configDoc.app?.protocol;
      if (domain && protocol) {
        writeFileSync(paths.caddyFile, buildCaddyfile(domain, protocol));
      }
    } catch (e) {}
  } else if (existsSync(paths.configFile)) {
    try {
      configDoc = YAML.parse(readFileSync(paths.configFile, "utf8")) || {};
    } catch (e) {}
  }

  if (configDoc.infrastructure?.database?.mode === "internal") {
    finalAppEnv = upsertEnv(finalAppEnv, "MONGODB_URI", "mongodb://mongo:27017/pomelo");
  }
  if (configDoc.infrastructure?.citron?.mode === "internal") {
    finalAppEnv = upsertEnv(finalAppEnv, "CITRON_URL", "http://citron:2358");
  }

  if (finalAppEnv) {
    writeFileSync(paths.envFile, finalAppEnv);
  }
  if (typeof payload.caddyfile === "string") {
    // If the UI sends a caddyfile explicitly, it will overwrite the generated one here
    writeFileSync(paths.caddyFile, payload.caddyfile);
  }
  if (typeof payload.citron === "string") {
    writeFileSync(paths.citronConfFile, payload.citron);
  }
  if (typeof payload.citronLanguages === "string") {
    writeFileSync(paths.citronLanguagesFile, payload.citronLanguages);
  }
  return { saved: true };
}

export function validateConfig(paths: Paths) {
  const appEnv = existsSync(paths.envFile)
    ? readFileSync(paths.envFile, "utf8")
    : "";
  const envErrors = [
    ...validateEnv(appEnv),
    ...validateAuthConfig(parseConfigYaml(paths) || {}, parseEnv(appEnv)),
  ];
  return { envErrors };
}

export function validateAuthConfig(cfg: any, env: Record<string, string>) {
  const enabled = AUTH_PROVIDERS.filter((p) => isProviderEnabled(cfg, p.id));
  const errors: string[] = [];
  if (!enabled.length) {
    errors.push("At least one sign-in method must be enabled");
  }
  for (const provider of enabled) {
    const missing = provider.secrets.filter((s) => !env[s.key]).map((s) => s.key);
    if (missing.length) {
      errors.push(`${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} required when ${provider.label} sign-in is enabled`);
    }
  }
  return errors;
}

export function validateEnv(content: string) {
  const env = parseEnv(content);
  const required = [
    "AUTH_SECRET",
    "MONGODB_URI",
    "CITRON_URL",
  ];
  const errors: string[] = [];
  for (const key of required) {
    if (!env[key]) errors.push(`${key} is required`);
  }
  return errors;
}

export function parseEnv(content: string) {
  const env: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

export function isValidPort(value: string | number) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 && num < 65536;
}

export function ensureConfigDefaults(paths: Paths, releaseDir: string) {
  if (!existsSync(paths.envFile)) {
    writeFileSync(paths.envFile, defaultEnv());
  }

  if (!existsSync(paths.configFile)) {
    writeFileSync(paths.configFile, defaultConfigYaml());
  }

  if (!existsSync(paths.caddyFile)) {
    const caddy = join(releaseDir, "config", "caddy", "Caddyfile");
    if (existsSync(caddy)) {
      writeFileSync(paths.caddyFile, readFileSync(caddy, "utf8"));
    } else {
      writeFileSync(paths.caddyFile, defaultCaddyfile());
    }
  }

  if (!existsSync(paths.citronConfFile)) {
    const shipped = join(releaseDir, "config", "citron", "citron.conf");
    if (existsSync(shipped)) {
      writeFileSync(paths.citronConfFile, readFileSync(shipped, "utf8"));
    }
  }

  if (!existsSync(paths.citronLanguagesFile)) {
    const shipped = join(releaseDir, "config", "citron", "languages.toml");
    if (existsSync(shipped)) {
      writeFileSync(paths.citronLanguagesFile, readFileSync(shipped, "utf8"));
    }
  }
}

export function defaultEnv() {
  return [
    "# Auto-generated by pomelod fallback",
    `AUTH_SECRET=${genSecret(64)}`,
    "MONGODB_URI=mongodb://mongo:27017/pomelo",
    "CITRON_URL=http://citron:2358",
    "",
  ].join("\n");
}

export function upsertEnv(text: string, key: string, value: string) {
  const lines = text.split(/\r?\n/);
  let found = false;
  const next = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  return next.join("\n");
}

export function buildCaddyfile(dom: string, proto: string) {
  if (proto === "https") {
    return [
      `https://${dom} {`,
      "\tencode zstd gzip",
      "\tlog {",
      "\t\toutput file /var/log/caddy/access.log",
      "\t}",
      "",
      "\treverse_proxy client:3000",
      "}",
      "",
    ].join("\n");
  }
  return [
    "{",
    "\tauto_https off",
    "}",
    "",
    `http://${dom}:80 {`,
    "\tencode zstd gzip",
    "\tlog {",
    "\t\toutput file /var/log/caddy/access.log",
    "\t}",
    "",
    "\treverse_proxy client:3000",
    "}",
    "",
  ].join("\n");
}

export function defaultCaddyfile() {
  return buildCaddyfile("localhost", "http");
}

function genSecret(length = 32) {
  return randomBytes(length).toString("base64url").slice(0, length);
}

import { getComposeConfig } from "../core/paths";
import { getCurrentReleaseDir } from "../core/release";
import { parseConfigYaml } from "../core/config";
import type { Paths } from "../core/types";

/**
 * Descriptor for a shell command to execute.
 */
export type CommandDescriptor = {
  cmd: string[];
  cwd: string;
  env: Record<string, string>;
};

/**
 * ComposeCommand — single source of truth for Docker Compose invocations.
 *
 * Reads config once and produces correct command descriptors for any
 * compose operation, respecting infrastructure mode (internal/external)
 * for database and judge0 profiles.
 *
 * Usage:
 *   const compose = ComposeCommand.from(paths);
 *   const desc = compose.up();          // full start with build
 *   const desc = compose.stop();        // stop all
 *   const desc = compose.ps();          // list containers as JSON
 *   const desc = compose.reloadCaddy(); // exec caddy reload (no restart)
 *   const desc = compose.restartCaddy(); // full container restart (for port changes)
 *   const desc = compose.restartServices("judge0-server", "judge0-workers");
 *
 * For teardown (uninstall), use the minimal factory:
 *   const desc = ComposeCommand.forTeardown(paths).down();
 */
export class ComposeCommand {
  private readonly baseArgs: string[];
  private readonly cwd: string;
  private readonly env: Record<string, string>;

  private constructor(baseArgs: string[], cwd: string, env: Record<string, string>) {
    this.baseArgs = baseArgs;
    this.cwd = cwd;
    this.env = env;
  }

  /**
   * Build a ComposeCommand from the current config state.
   */
  static from(paths: Paths): ComposeCommand {
    const cfg = getComposeConfig();
    const releaseDir = getCurrentReleaseDir(paths);
    const cfgYaml = parseConfigYaml(paths) || {};

    // Derive environment
    const caddyHttp = cfgYaml.ports?.caddyHttp ?? 80;
    const caddyHttps = cfgYaml.ports?.caddyHttps ?? 443;
    const dbMode = cfgYaml.infrastructure?.database?.mode ?? "internal";
    const judgeMode = cfgYaml.infrastructure?.judge0?.mode ?? "internal";
    const domain = cfgYaml.app?.domain ?? "localhost";
    const protocol = cfgYaml.app?.protocol ?? "http";

    const profiles: string[] = [];
    if (dbMode === "internal") profiles.push("internal-db");
    if (judgeMode === "internal") profiles.push("internal-judge0");

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      // Bind mounts in the compose files resolve against this. It must be the
      // install root we were actually started with, not the /opt/pomelo default.
      POMELO_ROOT: paths.root,
      DOMAIN: domain,
      PROTOCOL: protocol,
      CADDY_HTTP_PORT: String(caddyHttp),
      CADDY_HTTPS_PORT: String(caddyHttps),
      COMPOSE_PROFILES: profiles.join(","),
    };

    if (dbMode === "internal") {
      env.MONGODB_URI = "mongodb://mongo:27017/pomelo";
    }
    if (judgeMode === "internal") {
      env.JUDGE0_URL = "http://judge0-server:2358";
    }

    // Base args shared by every compose invocation
    const baseArgs = [
      "compose",
      "--project-name", cfg.project,
      "--env-file", paths.envFile,
      "-f", cfg.app,
      "-f", cfg.judge,
      "--project-directory", releaseDir,
    ];

    return new ComposeCommand(baseArgs, releaseDir, env);
  }

  /**
   * Minimal factory for teardown operations (down/stop only).
   *
   * Omits --env-file so Docker Compose does not attempt to interpolate
   * service-level variables like ${DOMAIN}, ${PROTOCOL}, etc., which
   * are irrelevant when stopping/removing containers and would otherwise
   * produce "variable is not set" warnings if config has been deleted.
   */
  static forTeardown(paths: Paths): ComposeCommand {
    const cfg = getComposeConfig();
    const releaseDir = getCurrentReleaseDir(paths);

    const baseArgs = [
      "compose",
      "--project-name", cfg.project,
      "-f", cfg.app,
      "-f", cfg.judge,
      "--project-directory", releaseDir,
    ];

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      POMELO_ROOT: paths.root,
      // Activate ALL profiles during teardown so that previously active
      // internal containers get properly stopped/removed.
      COMPOSE_PROFILES: "internal-db,internal-judge0",
      // Dummy values to prevent "variable is not set" warnings during teardown
      DOMAIN: "localhost",
      PROTOCOL: "http",
      CADDY_HTTP_PORT: "80",
      CADDY_HTTPS_PORT: "443",
      MONGODB_URI: "dummy",
      AUTH_SECRET: "dummy",
      JUDGE0_URL: "dummy",
      REDIS_PASSWORD: "dummy",
      POSTGRES_PASSWORD: "dummy",
    };

    return new ComposeCommand(baseArgs, releaseDir, env);
  }

  // ---------------------------------------------------------------------------
  // Command descriptors
  // ---------------------------------------------------------------------------

  /** Start/rebuild all services (config-aware profiles applied via env). */
  up(): CommandDescriptor {
    return this.describe(["up", "-d", "--build", "--remove-orphans"]);
  }

  /** Stop all services without removing containers. */
  stop(): CommandDescriptor {
    return this.describe(["stop"]);
  }

  /**
   * Stop and remove containers, but preserve data volumes.
   * Use before `up` when profiles may have changed, since
   * `up --remove-orphans` won't stop containers from deactivated profiles.
   */
  downKeepVolumes(): CommandDescriptor {
    return this.describe(["down"]);
  }

  /** Stop and remove containers + volumes. */
  down(): CommandDescriptor {
    return this.describe(["down", "-v"]);
  }

  /** Restart specific services by name. */
  restartServices(...services: string[]): CommandDescriptor {
    return this.describe(["up", "-d", "--build", "--remove-orphans", ...services]);
  }

  /** Reload Caddy config in-place (no container restart, no downtime). */
  reloadCaddy(): CommandDescriptor {
    return this.describe([
      "exec", "caddy",
      "caddy", "reload", "--config", "/etc/caddy/Caddyfile",
    ]);
  }

  /** Full Caddy container restart (needed for port binding changes). */
  restartCaddy(): CommandDescriptor {
    return this.describe(["restart", "caddy"]);
  }

  /** List containers as JSON. */
  ps(): CommandDescriptor {
    return this.describe(["ps", "--format", "json"]);
  }

  /** Fetch logs for given services. */
  logs(opts: { services?: string[]; tail?: number; follow?: boolean }): CommandDescriptor {
    const args = ["logs", "--no-color", "--tail", String(opts.tail ?? 200)];
    if (opts.follow) args.splice(1, 0, "--follow");
    if (opts.services?.length) args.push(...opts.services);
    return this.describe(args);
  }

  /** Build a raw descriptor for arbitrary extra args. */
  raw(extraArgs: string[]): CommandDescriptor {
    return this.describe(extraArgs);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private describe(extraArgs: string[]): CommandDescriptor {
    return {
      cmd: ["docker", ...this.baseArgs, ...extraArgs],
      cwd: this.cwd,
      env: this.env,
    };
  }
}

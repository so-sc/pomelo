import { useEffect, useState } from "react";
import YAML from "yaml";
import { api } from "@/api/index.js";
import type { ConfigSnapshot } from "@/types.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Loader2, Database, Code, Globe, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import { AUTH_PROVIDERS, isProviderEnabled } from "../../../src/shared/auth-providers";

export default function SetupPage() {
  const [config, setConfig] = useState<ConfigSnapshot | null>(null);

  // Form states
  const [mongoMode, setMongoMode] = useState<"internal" | "external">("internal");
  const [mongoUri, setMongoUri] = useState("mongodb://mongo:27017/pomelo");
  const [mongoSaving, setMongoSaving] = useState(false);
  const [mongoTesting, setMongoTesting] = useState(false);
  const [mongoTestMsg, setMongoTestMsg] = useState<{type: "success" | "error", text: string} | null>(null);

  const [citronMode, setCitronMode] = useState<"internal" | "external">("internal");
  const [citronUrl, setCitronUrl] = useState("http://citron:2358");
  const [citronSaving, setCitronSaving] = useState(false);

  const [domain, setDomain] = useState("localhost");
  const [protocol, setProtocol] = useState<"http" | "https">("http");
  const [domainSaving, setDomainSaving] = useState(false);

  const [authEnabled, setAuthEnabled] = useState<Record<string, boolean>>({});
  const [authSecrets, setAuthSecrets] = useState<Record<string, string>>({});
  const [authSaving, setAuthSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const c = await api.getConfig();
      setConfig(c);
      const env = parseEnv(c.appEnv);
      
      let cfgYaml: any = {};
      try {
        cfgYaml = YAML.parse(c.configYaml) || {};
      } catch (e) {}

      if (env.MONGODB_URI) setMongoUri(env.MONGODB_URI);
      if (env.CITRON_URL) setCitronUrl(env.CITRON_URL);

      if (cfgYaml.infrastructure?.database?.mode) {
        setMongoMode(cfgYaml.infrastructure.database.mode);
      }
      if (cfgYaml.infrastructure?.citron?.mode) {
        setCitronMode(cfgYaml.infrastructure.citron.mode);
      }
      if (cfgYaml.app?.domain) setDomain(cfgYaml.app.domain);
      if (cfgYaml.app?.protocol) setProtocol(cfgYaml.app.protocol);

      setAuthEnabled(Object.fromEntries(AUTH_PROVIDERS.map((p) => [p.id, isProviderEnabled(cfgYaml, p.id)])));
      setAuthSecrets(Object.fromEntries(
        AUTH_PROVIDERS.flatMap((p) => p.secrets).map((s) => [s.key, env[s.key] ?? ""])
      ));
    } catch {}
  }

  function updateEnvContent(content: string, updates: Record<string, string>) {
    const lines = (content || "").split(/\r?\n/);
    const newLines = [];
    const updatedKeys = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        newLines.push(line);
        continue;
      }
      const idx = trimmed.indexOf("=");
      if (idx === -1) {
        newLines.push(line);
        continue;
      }
      const key = trimmed.slice(0, idx).trim();
      if (key in updates) {
        newLines.push(`${key}=${updates[key]}`);
        updatedKeys.add(key);
      } else {
        newLines.push(line);
      }
    }

    for (const [key, value] of Object.entries(updates)) {
      if (!updatedKeys.has(key)) {
        newLines.push(`${key}=${value}`);
      }
    }

    return newLines.join("\n");
  }

  /**
   * Apply the restart action returned by the server after a config update.
   * Maps server-side restartAction values to the appropriate API call.
   */
  async function applyRestartAction(restartAction: string) {
    switch (restartAction) {
      case "restart-all":
        await api.restart("all");
        break;
      case "reload-caddy":
        await api.restart("caddy");
        break;
      case "restart-caddy":
        await api.restart("caddy-restart");
        break;
      case "restart-citron":
        await api.restart("citron");
        break;
      // "none" — nothing to do
    }
  }

  function updateYaml(content: string, updates: (doc: any) => void) {
    let doc: any = {};
    try {
      doc = YAML.parse(content) || {};
    } catch {}
    updates(doc);
    return YAML.stringify(doc);
  }

  async function handleSaveMongo() {
    setMongoSaving(true);
    setMongoTestMsg(null);
    try {
      if (mongoMode === "external") {
        try {
          await api.testConnection({ type: "mongo", uri: mongoUri });
        } catch (err: any) {
          setMongoTestMsg({ type: "error", text: `Connection test failed. Save aborted.\n${err.message}` });
          setMongoSaving(false);
          return;
        }
      }

      const newEnv = updateEnvContent(config?.appEnv || "", { MONGODB_URI: mongoUri });
      const newYaml = updateYaml(config?.configYaml || "", (doc) => {
        if (!doc.infrastructure) doc.infrastructure = {};
        if (!doc.infrastructure.database) doc.infrastructure.database = {};
        doc.infrastructure.database.mode = mongoMode;
      });
      const result = await api.updateConfig({ appEnv: newEnv, configYaml: newYaml });
      await loadConfig();
      await applyRestartAction((result as any)?.restartAction ?? "restart-all");
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("action-error", { detail: err.message || String(err) }));
    }
    setMongoSaving(false);
  }

  async function handleTestMongo() {
    setMongoTesting(true);
    setMongoTestMsg(null);
    try {
      await api.testConnection({ type: "mongo", uri: mongoUri });
      setMongoTestMsg({ type: "success", text: "Connection successful. Read/write verified." });
    } catch (err: any) {
      setMongoTestMsg({ type: "error", text: err.message || "Connection failed" });
    }
    setMongoTesting(false);
  }

  async function handleSaveCitron() {
    setCitronSaving(true);
    try {
      const newEnv = updateEnvContent(config?.appEnv || "", { CITRON_URL: citronUrl });
      const newYaml = updateYaml(config?.configYaml || "", (doc) => {
        if (!doc.infrastructure) doc.infrastructure = {};
        if (!doc.infrastructure.citron) doc.infrastructure.citron = {};
        doc.infrastructure.citron.mode = citronMode;
      });
      const result = await api.updateConfig({ appEnv: newEnv, configYaml: newYaml });
      await loadConfig();
      await applyRestartAction((result as any)?.restartAction ?? "restart-all");
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("action-error", { detail: err.message || String(err) }));
    }
    setCitronSaving(false);
  }

  async function handleSaveDomain() {
    setDomainSaving(true);
    try {
      const newYaml = updateYaml(config?.configYaml || "", (doc) => {
        if (!doc.app) doc.app = {};
        doc.app.domain = domain;
        doc.app.protocol = protocol;
      });
      // Server generates Caddyfile from configYaml automatically
      const result = await api.updateConfig({ configYaml: newYaml });
      await loadConfig();
      await applyRestartAction((result as any)?.restartAction ?? "restart-all");
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("action-error", { detail: err.message || String(err) }));
    }
    setDomainSaving(false);
  }

  const authMissingSecrets = AUTH_PROVIDERS.some(
    (p) => authEnabled[p.id] && p.secrets.some((s) => !authSecrets[s.key]?.trim())
  );
  const authNoneEnabled = !AUTH_PROVIDERS.some((p) => authEnabled[p.id]);

  async function handleSaveAuth() {
    setAuthSaving(true);
    try {
      const secrets = Object.fromEntries(
        AUTH_PROVIDERS.filter((p) => authEnabled[p.id])
          .flatMap((p) => p.secrets)
          .map((s) => [s.key, authSecrets[s.key].trim()])
      );
      const newEnv = updateEnvContent(config?.appEnv || "", secrets);
      const newYaml = updateYaml(config?.configYaml || "", (doc) => {
        if (!doc.auth) doc.auth = {};
        if (!doc.auth.providers) doc.auth.providers = {};
        for (const p of AUTH_PROVIDERS) {
          doc.auth.providers[p.id] = { ...doc.auth.providers[p.id], enabled: !!authEnabled[p.id] };
        }
      });
      const result = await api.updateConfig({ appEnv: newEnv, configYaml: newYaml });
      await loadConfig();
      await applyRestartAction((result as any)?.restartAction ?? "restart-all");
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent("action-error", { detail: err.message || String(err) }));
    }
    setAuthSaving(false);
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Configuration Setup</h2>
        <p className="text-sm text-muted-foreground">
          Configure the core services for your Pomelo deployment. Saving any section will automatically restart the required containers to apply the changes.
        </p>
      </div>



      <div className="space-y-10">
        {/* MongoDB Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <h3 className="text-lg font-medium">MongoDB</h3>
          </div>
          <div className="pl-7 space-y-5">
            <RadioGroup value={mongoMode} onValueChange={(v) => setMongoMode(v as "internal" | "external")} className="gap-4">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="internal" id="mongo-self" className="mt-0.5" />
                <div>
                  <Label htmlFor="mongo-self" className="cursor-pointer">Self-hosted (Docker)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Uses the bundled MongoDB container. Recommended for most setups.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="external" id="mongo-ext" className="mt-0.5" />
                <div>
                  <Label htmlFor="mongo-ext" className="cursor-pointer">External MongoDB</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Connect to your own MongoDB Atlas or self-managed instance.</p>
                </div>
              </div>
            </RadioGroup>
            {mongoMode === "external" && (
              <div className="space-y-2">
                <Label htmlFor="mongo-uri">MongoDB URI</Label>
                <Input
                  id="mongo-uri"
                  value={mongoUri}
                  onChange={(e) => setMongoUri(e.target.value)}
                  placeholder="mongodb+srv://user:pass@cluster.example.com/pomelo"
                  className="font-mono text-xs"
                />
              </div>
            )}
            {mongoTestMsg && (
              <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${
                mongoTestMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
                  : "bg-destructive/10 border border-destructive/20 text-destructive"
              }`}>
                {mongoTestMsg.type === "success" ? (
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span className="whitespace-pre-wrap">{mongoTestMsg.text}</span>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleSaveMongo} disabled={mongoSaving || mongoTesting}>
                {mongoSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save & Restart
              </Button>
              {mongoMode === "external" && (
                <Button variant="outline" onClick={handleTestMongo} disabled={mongoSaving || mongoTesting}>
                  {mongoTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>
              )}
            </div>
          </div>
        </section>

        <Separator />

        {/* Citron Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            <h3 className="text-lg font-medium">Citron Execution Engine</h3>
          </div>
          <div className="pl-7 space-y-5">
            <RadioGroup value={citronMode} onValueChange={(v) => setCitronMode(v as "internal" | "external")} className="gap-4">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="internal" id="judge-self" className="mt-0.5" />
                <div>
                  <Label htmlFor="judge-self" className="cursor-pointer">Self-hosted (Docker)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Runs Citron in Docker alongside the app. Sandboxed, and not privileged.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="external" id="judge-ext" className="mt-0.5" />
                <div>
                  <Label htmlFor="judge-ext" className="cursor-pointer">External Citron</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Connect to a separately hosted Citron instance.</p>
                </div>
              </div>
            </RadioGroup>
            {citronMode === "external" && (
              <div className="space-y-2">
                <Label htmlFor="judge-url">Citron URL</Label>
                <Input
                  id="judge-url"
                  value={citronUrl}
                  onChange={(e) => setCitronUrl(e.target.value)}
                  placeholder="https://citron.example.com:2358"
                  className="font-mono text-xs"
                />
              </div>
            )}
            <Button onClick={handleSaveCitron} disabled={citronSaving}>
              {citronSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save & Restart
            </Button>
          </div>
        </section>

        <Separator />

        {/* Domain Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <h3 className="text-lg font-medium">Domain & Protocol</h3>
          </div>
          <div className="pl-7 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                The domain where Pomelo will be accessible. Use <code className="text-xs bg-muted px-1 rounded">localhost</code> for local development.
              </p>
            </div>
            
            <div className="space-y-3">
              <Label>Protocol</Label>
              <RadioGroup value={protocol} onValueChange={(v) => setProtocol(v as "http" | "https")} className="gap-3">
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="http" id="proto-http" className="mt-0.5" />
                  <div>
                    <Label htmlFor="proto-http" className="cursor-pointer">HTTP</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">No SSL. Suitable for local or internal use.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="https" id="proto-https" className="mt-0.5" />
                  <div>
                    <Label htmlFor="proto-https" className="cursor-pointer">HTTPS</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Caddy will automatically provision SSL certificates via Let's Encrypt.</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleSaveDomain} disabled={domainSaving}>
              {domainSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save & Restart
            </Button>
          </div>
        </section>

        <Separator />

        {/* Authentication Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h3 className="text-lg font-medium">Authentication</h3>
          </div>
          <div className="pl-7 space-y-6">
            {AUTH_PROVIDERS.map((provider) => (
              <div key={provider.id} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label>{provider.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                  </div>
                  <Switch
                    checked={!!authEnabled[provider.id]}
                    onCheckedChange={(v) => setAuthEnabled({ ...authEnabled, [provider.id]: v })}
                  />
                </div>
                {authEnabled[provider.id] && provider.secrets.length > 0 && (
                  <div className="space-y-4 pl-4 border-l">
                    {provider.secrets.map((secret) => (
                      <div key={secret.key} className="space-y-2">
                        <Label htmlFor={`auth-${secret.key}`}>{secret.label}</Label>
                        <Input
                          id={`auth-${secret.key}`}
                          type={secret.sensitive ? "password" : "text"}
                          value={authSecrets[secret.key] ?? ""}
                          onChange={(e) => setAuthSecrets({ ...authSecrets, [secret.key]: e.target.value })}
                          placeholder={secret.placeholder}
                          className="font-mono text-xs"
                        />
                      </div>
                    ))}
                    {provider.callbackPath && (
                      <p className="text-xs text-muted-foreground">
                        Authorised redirect URI:{" "}
                        <code className="text-xs bg-muted px-1 rounded">{`${protocol}://${domain}${provider.callbackPath}`}</code>
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {authNoneEnabled && (
              <p className="text-xs text-destructive">Enable at least one sign-in method.</p>
            )}
            {!authNoneEnabled && authMissingSecrets && (
              <p className="text-xs text-destructive">Fill in the credentials for every enabled sign-in method.</p>
            )}

            <Button onClick={handleSaveAuth} disabled={authSaving || authNoneEnabled || authMissingSecrets}>
              {authSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save & Restart
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function parseEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

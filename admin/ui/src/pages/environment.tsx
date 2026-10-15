import { useEffect, useState } from "react";
import { api } from "@/api/index.js";
import type { ConfigSnapshot } from "@/types.js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function EnvironmentPage() {
  const [config, setConfig] = useState<ConfigSnapshot | null>(null);
  const [tab, setTab] = useState("appenv");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable values
  const [appEnv, setAppEnv] = useState("");
  const [configYaml, setConfigYaml] = useState("");
  const [caddyfile, setCaddyfile] = useState("");
  const [citron, setCitron] = useState("");
  const [citronLanguages, setCitronLanguages] = useState("");

  useEffect(() => {
    api.getConfig().then((c) => {
      setConfig(c);
      setAppEnv(c.appEnv);
      setConfigYaml(c.configYaml);
      setCaddyfile(c.caddyfile);
      setCitron(c.citron);
      setCitronLanguages(c.citronLanguages);
    }).catch(() => {});
  }, []);

  async function performRestart(target: "all" | "caddy" | "citron") {
    try {
      await api.restart(target);
    } catch (err: any) {
      setMessage({ type: "error", text: `Restart error: ${err.message}` });
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateConfig({ appEnv, configYaml, caddyfile, citron, citronLanguages });
      setMessage({ type: "success", text: "Configuration saved successfully." });
      
      const restartAction = (res as any)?.restartAction;
      if (restartAction && restartAction !== "none") {
        await performRestart(restartAction);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
    setSaving(false);
  }

  async function handleValidate() {
    setMessage(null);
    try {
      const result = await api.validateConfig();
      if (result.envErrors?.length) {
        setMessage({ type: "error", text: result.envErrors.join("\n") });
      } else {
        setMessage({ type: "success", text: "Configuration is valid." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Directly edit environment variables, proxy configs, and platform YAML setup. Saving will dynamically restart the relevant Docker containers.
        </p>
      </div>


      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="appenv">app.env</TabsTrigger>
          <TabsTrigger value="config">config.yaml</TabsTrigger>
          <TabsTrigger value="caddy">Caddyfile</TabsTrigger>
          <TabsTrigger value="citron">Citron</TabsTrigger>
          <TabsTrigger value="citron-languages">Languages</TabsTrigger>
        </TabsList>

        <TabsContent value="appenv">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Main environment variables for the application. Contains database URIs, secrets, and service URLs.
            </p>
            <Textarea
              value={appEnv}
              onChange={(e) => setAppEnv(e.target.value)}
              rows={16}
              className="text-xs"
            />
          </div>
        </TabsContent>

        <TabsContent value="config">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Application configuration in YAML format.
            </p>
            <Textarea
              value={configYaml}
              onChange={(e) => setConfigYaml(e.target.value)}
              rows={12}
              className="text-xs font-mono"
            />
          </div>
        </TabsContent>

        <TabsContent value="caddy">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Caddy reverse proxy configuration. Controls domain routing, SSL, and proxy rules.
            </p>
            <Textarea
              value={caddyfile}
              onChange={(e) => setCaddyfile(e.target.value)}
              rows={12}
              className="text-xs font-mono"
            />
          </div>
        </TabsContent>

        <TabsContent value="citron">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Citron execution engine configuration: resource limits, concurrency and
              sandboxing.
            </p>
            <Textarea
              value={citron}
              onChange={(e) => setCitron(e.target.value)}
              rows={10}
              className="text-xs font-mono"
            />
          </div>
        </TabsContent>

        <TabsContent value="citron-languages">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Languages Citron can run. Adding one also requires its toolchain in the
              Citron image.
            </p>
            <Textarea
              value={citronLanguages}
              onChange={(e) => setCitronLanguages(e.target.value)}
              rows={10}
              className="text-xs font-mono"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Messages */}
      {message && (
        <div
          className={`flex items-start gap-2 p-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <pre className="whitespace-pre-wrap text-xs">{message.text}</pre>
        </div>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save All"}
        </Button>
        <Button variant="outline" onClick={handleValidate}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Validate
        </Button>
      </div>
    </div>
  );
}

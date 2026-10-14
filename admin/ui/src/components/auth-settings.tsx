import { useState } from "react";
import YAML from "yaml";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertCircle } from "lucide-react";

type Props = {
  configYaml: string;
  appEnv: string;
  onConfigYamlChange: (value: string) => void;
  onAppEnvChange: (value: string) => void;
};

function readEnv(text: string, key: string) {
  const line = text.split(/\r?\n/).find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf("=") + 1).trim() : "";
}

function writeEnv(text: string, key: string, value: string) {
  const lines = text.split(/\r?\n/);
  const idx = lines.findIndex((l) => l.trim().startsWith(`${key}=`));
  if (idx !== -1) {
    lines[idx] = `${key}=${value}`;
  } else {
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push(`${key}=${value}`, "");
  }
  return lines.join("\n");
}

/**
 * Structured editor for the `auth:` section of config.yaml and the Google secrets in app.env.
 * It edits the same text the other tabs show, so "Save All" persists and restarts as usual.
 */
export function AuthSettings({ configYaml, appEnv, onConfigYamlChange, onAppEnvChange }: Props) {
  // parseDocument (not parse) so admins' comments in config.yaml survive the edit.
  const doc = YAML.parseDocument(configYaml);
  const parseError = doc.errors[0]?.message;

  const googleEnabled = doc.getIn(["auth", "google", "enabled"]) === true;
  const credentialsEnabled = doc.getIn(["auth", "credentials", "enabled"]) !== false;
  const domainsNode = doc.getIn(["auth", "google", "allowedDomains"]) as YAML.YAMLSeq | undefined;
  const domains = YAML.isSeq(domainsNode) ? domainsNode.toJSON().map(String) : [];

  // Kept locally so typing a trailing comma isn't normalised away mid-edit.
  const [domainsText, setDomainsText] = useState(domains.join(", "));

  const clientId = readEnv(appEnv, "GOOGLE_CLIENT_ID");
  const clientSecret = readEnv(appEnv, "GOOGLE_CLIENT_SECRET");

  function setIn(path: string[], value: unknown) {
    const next = YAML.parseDocument(configYaml);
    next.setIn(path, value);
    onConfigYamlChange(String(next));
  }

  function setGoogleEnabled(enabled: boolean) {
    const next = YAML.parseDocument(configYaml);
    next.setIn(["auth", "google", "enabled"], enabled);
    // Without Google, password login is the only way in for students.
    if (!enabled) next.setIn(["auth", "credentials", "enabled"], true);
    onConfigYamlChange(String(next));
  }

  function setCredentialsEnabled(enabled: boolean) {
    if (!enabled && !googleEnabled) return;
    setIn(["auth", "credentials", "enabled"], enabled);
  }

  function commitDomains(text: string) {
    const list = text.split(",").map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
    setDomainsText(list.join(", "));
    const next = YAML.parseDocument(configYaml);
    // Flow style keeps the list on one line, matching the default config.
    const seq = next.createNode(list) as YAML.YAMLSeq;
    seq.flow = true;
    next.setIn(["auth", "google", "allowedDomains"], seq);
    onConfigYamlChange(String(next));
  }

  if (parseError) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-md text-sm bg-destructive/10 border border-destructive/20 text-destructive">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>config.yaml has a syntax error, fix it in the config.yaml tab first: {parseError}</span>
      </div>
    );
  }

  const googleMissingSecrets = googleEnabled && (!clientId || !clientSecret);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose how students sign in. Changes apply after saving, which restarts the app containers.
      </p>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label>Google sign-in</Label>
          <p className="text-xs text-muted-foreground">
            New Google users are created with the <code>user</code> role. Existing accounts with the same
            verified email are linked automatically.
          </p>
        </div>
        <Switch
          checked={googleEnabled}
          onCheckedChange={setGoogleEnabled}
        />
      </div>

      {googleEnabled && (
        <div className="space-y-4 pl-4 border-l">
          <div className="space-y-2">
            <Label htmlFor="google-client-id">Client ID</Label>
            <Input
              id="google-client-id"
              value={clientId}
              onChange={(e) => onAppEnvChange(writeEnv(appEnv, "GOOGLE_CLIENT_ID", e.target.value.trim()))}
              placeholder="1234-abc.apps.googleusercontent.com"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-client-secret">Client secret</Label>
            <Input
              id="google-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => onAppEnvChange(writeEnv(appEnv, "GOOGLE_CLIENT_SECRET", e.target.value.trim()))}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Stored in app.env. Add <code>&lt;your site&gt;/api/auth/callback/google</code> as an authorised
              redirect URI in Google Cloud Console.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="google-domains">Allowed email domains</Label>
            <Input
              id="google-domains"
              value={domainsText}
              onChange={(e) => setDomainsText(e.target.value)}
              onBlur={(e) => commitDomains(e.target.value)}
              placeholder="college.edu, sosc.org.in"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Leave empty to allow any Google account.
            </p>
          </div>
          {googleMissingSecrets && (
            <p className="text-xs text-destructive">Client ID and secret are required for Google sign-in.</p>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label>Password login</Label>
          <p className="text-xs text-muted-foreground">
            When off, students can only use Google and registration is closed. Admins can still sign in with
            a password through the "Admin sign-in" link.
          </p>
        </div>
        <Switch
          checked={credentialsEnabled}
          className={googleEnabled ? undefined : "opacity-50 cursor-not-allowed"}
          onCheckedChange={setCredentialsEnabled}
        />
      </div>
      {!googleEnabled && (
        <p className="text-xs text-muted-foreground -mt-4">Enable Google sign-in before turning password login off.</p>
      )}
    </div>
  );
}

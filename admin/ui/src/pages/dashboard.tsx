import { useEffect, useState } from "react";
import { api } from "@/api/index.js";
import type { Status, StorageUsage } from "@/types.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Square, RotateCcw, CircleDot, HardDrive, Activity, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([api.getStatus(), api.getStorage()]);
      setStatus(s);
      setStorage(st);
    } catch { }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function runAction(action: () => Promise<any>) {
    setRunning(true);
    try {
      await action();
    } catch (err: any) {
      console.error(err);
    } finally {
      // Add a small delay so daemon can fully trigger operation in background
      await new Promise((r) => setTimeout(r, 1000));
      await refresh();
      setRunning(false);
    }
  }

  const containerCount = status?.containers?.length ?? 0;
  const runningContainers = status?.containers?.filter(
    (c) => (c.State || c.state || "").toLowerCase() === "running"
  ).length ?? 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <Badge variant="outline" className="font-mono bg-background">
          v{status?.currentVersion || import.meta.env.VITE_APP_VERSION || "unknown"}
        </Badge>
      </div>

      {/* System Status */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">System Status</h3>
        <div className="grid grid-cols-3 gap-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Docker</span>
            </div>
            <p className="text-2xl font-semibold">
              {loading ? "—" : status?.dockerAvailable ? "Ready" : "Offline"}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Containers</span>
            </div>
            <p className="text-2xl font-semibold">
              {loading ? "—" : `${runningContainers} / ${containerCount}`}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Database</span>
            </div>
            <p className="text-2xl font-semibold">
              {loading ? "—" : formatBytes(storage?.database?.bytes ?? 0)}
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Quick Actions */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Quick Actions</h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              onClick={() => runAction(() => api.start())}
              disabled={running}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start
            </Button>
            <Button
              variant="outline"
              onClick={() => runAction(() => api.stop())}
              disabled={running}
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
            <Button
              variant="outline"
              onClick={() => runAction(() => api.restart())}
              disabled={running}
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </Button>
            <Button variant="ghost" onClick={refresh} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Containers Summary */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Containers</h3>
        {containerCount === 0 ? (
          <p className="text-sm text-muted-foreground">No containers are currently running.</p>
        ) : (
          <div className="space-y-2">
            {status?.containers?.map((c, i) => {
              const name = c.Name || c.name || "unknown";
              const state = (c.State || c.state || "unknown").toLowerCase();
              return (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium font-mono">{name}</span>
                  <Badge variant={state === "running" ? "success" : state === "exited" ? "destructive" : "secondary"}>
                    {state}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* Storage Summary */}
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Storage</h3>
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-muted-foreground">Database</p>
            <p className="text-lg font-semibold">{formatBytes(storage?.database?.bytes ?? 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Uploads</p>
            <p className="text-lg font-semibold">{formatBytes(storage?.uploads?.bytes ?? 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Backups</p>
            <p className="text-lg font-semibold">{formatBytes(storage?.backups?.bytes ?? 0)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(1)} ${units[idx]}`;
}

import { useState } from "react";
import {
  useListApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useUpdateApiKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Webhook,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApiKey {
  id: number;
  key: string;
  name: string;
  appId: string;
  senderName?: string | null;
  webhookUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-accent/10 transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function KeyRow({
  apiKey,
  onRevoke,
  onEdit,
}: {
  apiKey: ApiKey;
  onRevoke: (id: number, name: string) => void;
  onEdit: (apiKey: ApiKey) => void;
}) {
  const [showKey, setShowKey] = useState(false);

  const maskedKey = apiKey.key.replace(/^(pk_live_)(.{4})(.+)(.{4})$/, "$1$2••••••••••••$4");

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card/50 hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground truncate">{apiKey.name}</span>
            <Badge variant={apiKey.isActive ? "default" : "secondary"} className="text-xs shrink-0">
              {apiKey.isActive ? "Active" : "Revoked"}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            App ID: <span className="text-foreground">{apiKey.appId}</span>
          </div>
          {apiKey.senderName && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Sender ID: <span className="text-primary">{apiKey.senderName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(apiKey)}
            className="p-1.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit webhook / sender"
          >
            <Webhook className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRevoke(apiKey.id, apiKey.name)}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Revoke key"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Key value row */}
      <div className="flex items-center gap-2 bg-background/60 border border-border/50 rounded px-3 py-2">
        <KeyRound className="w-3.5 h-3.5 text-primary shrink-0" />
        <code className="flex-1 text-xs font-mono text-muted-foreground truncate">
          {showKey ? apiKey.key : maskedKey}
        </code>
        <button
          onClick={() => setShowKey((v) => !v)}
          className="p-1 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
        <CopyButton text={apiKey.key} />
      </div>

      {/* Webhook URL row */}
      {apiKey.webhookUrl && (
        <div className="flex items-center gap-2 bg-background/60 border border-border/50 rounded px-3 py-2">
          <Webhook className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <span className="flex-1 text-xs text-muted-foreground truncate font-mono">{apiKey.webhookUrl}</span>
          <CopyButton text={apiKey.webhookUrl} />
        </div>
      )}

      {/* Webhook events reference */}
      {apiKey.webhookUrl && (
        <div className="text-xs text-muted-foreground space-y-0.5 pl-1">
          <div className="font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">Webhook events fired:</div>
          {["otp.sent", "otp.delivered", "otp.verified", "otp.failed", "otp.expired"].map((evt) => (
            <div key={evt} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block shrink-0" />
              <code className="text-foreground/70">{evt}</code>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground/60">
        Created {new Date(apiKey.createdAt).toLocaleDateString()} ·{" "}
        {apiKey.lastUsedAt
          ? `Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`
          : "Never used"}
      </div>
    </div>
  );
}

export function Keys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: keys = [], isLoading } = useListApiKeys<ApiKey[]>();

  const createMutation = useCreateApiKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
        setCreateOpen(false);
        setNewKey(null);
        toast({ title: "API key created", description: "Copy the key now — it won't be shown in full again." });
      },
    },
  });

  const revokeMutation = useRevokeApiKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
        setRevokeTarget(null);
        toast({ title: "Key revoked", variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateApiKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
        setEditTarget(null);
        toast({ title: "Key updated" });
      },
    },
  });

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", appId: "", senderName: "", webhookUrl: "" });
  const [newKey, setNewKey] = useState<(ApiKey & { key: string }) | null>(null);

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<{ id: number; name: string } | null>(null);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [editForm, setEditForm] = useState({ webhookUrl: "", senderName: "" });

  const handleCreate = () => {
    if (!form.appId.trim()) {
      toast({ title: "App ID is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          name: form.name || "My App",
          appId: form.appId.trim(),
          webhookUrl: form.webhookUrl.trim() || null,
        },
      },
      {
        onSuccess: (data) => {
          setNewKey(data as ApiKey & { key: string });
          setCreateOpen(false);
          setForm({ name: "", appId: "", senderName: "", webhookUrl: "" });
        },
      },
    );
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    revokeMutation.mutate({ keyId: revokeTarget.id });
  };

  const openEdit = (apiKey: ApiKey) => {
    setEditTarget(apiKey);
    setEditForm({ webhookUrl: apiKey.webhookUrl ?? "", senderName: apiKey.senderName ?? "" });
  };

  const handleUpdate = () => {
    if (!editTarget) return;
    updateMutation.mutate({
      keyId: editTarget.id,
      data: {
        webhookUrl: editForm.webhookUrl.trim() || null,
        name: editTarget.name,
      },
    });
  };

  const activeKeys = (keys as ApiKey[]).filter((k) => k.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase text-foreground flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Each key authenticates an app and configures its sender name + webhook
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 font-mono">
          <Plus className="w-4 h-4" />
          New Key
        </Button>
      </div>

      {/* Usage note */}
      <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <ShieldCheck className="w-4 h-4" />
          How to authenticate API requests
        </div>
        <p className="text-xs text-muted-foreground">
          Include your key in the <code className="text-foreground bg-background/60 px-1 py-0.5 rounded">x-api-key</code> header or as{" "}
          <code className="text-foreground bg-background/60 px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code> on every OTP request.
        </p>
        <code className="block text-xs bg-background/60 border border-border/40 rounded px-3 py-2 text-primary/80 font-mono">
          {"POST /api/otp/send\nx-api-key: pk_live_..."}
        </code>
      </div>

      {/* Webhook payload reference */}
      <div className="border border-cyan-500/20 rounded-lg p-4 bg-cyan-500/5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
          <Webhook className="w-4 h-4" />
          Webhook payload (POST to your URL)
        </div>
        <code className="block text-xs bg-background/60 border border-border/40 rounded px-3 py-2 text-muted-foreground font-mono whitespace-pre">{`{
  "event": "otp.sent" | "otp.delivered" | "otp.verified" | "otp.failed" | "otp.expired",
  "requestId": "uuid",
  "phone": "+12025551234",
  "appId": "your-app-id",
  "timestamp": "2026-06-13T...",
  "meta": { ... }
}`}</code>
      </div>

      {/* Key list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading keys...
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-10 text-center text-muted-foreground space-y-3">
          <KeyRound className="w-8 h-8 mx-auto opacity-30" />
          <p className="text-sm">No API keys yet</p>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            Create your first key
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {(keys as ApiKey[]).map((k) => (
            <KeyRow key={k.id} apiKey={k} onRevoke={(id, name) => setRevokeTarget({ id, name })} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* ── CREATE DIALOG ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border font-mono max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Create API Key
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              The full key is only shown once after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">App Name</Label>
              <Input
                placeholder="My Android App"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-background/60 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                App ID <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="com.example.myapp"
                value={form.appId}
                onChange={(e) => setForm((f) => ({ ...f, appId: e.target.value }))}
                className="bg-background/60 text-sm"
              />
              <p className="text-xs text-muted-foreground">Matches the appId you pass in /otp/send requests</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sender Name (SMS ID)</Label>
              <Input
                placeholder="MyBrand  (max 11 chars for GSM)"
                maxLength={11}
                value={form.senderName}
                onChange={(e) => setForm((f) => ({ ...f, senderName: e.target.value }))}
                className="bg-background/60 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Overrides global sender name for this app. Recipients see this as the SMS sender.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Webhook URL</Label>
              <Input
                placeholder="https://your-app.com/webhooks/sms"
                value={form.webhookUrl}
                onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                className="bg-background/60 text-sm"
              />
              <p className="text-xs text-muted-foreground">Receives POST for every OTP event</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── NEW KEY REVEAL DIALOG ── */}
      <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
        <DialogContent className="bg-card border-border font-mono max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400">
              <ShieldCheck className="w-4 h-4" />
              API Key Created
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Copy this key now — it will never be shown in full again.
            </DialogDescription>
          </DialogHeader>
          {newKey && (
            <div className="space-y-4 py-2">
              <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Your new API key:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-green-400 break-all font-mono">{newKey.key}</code>
                  <CopyButton text={newKey.key} />
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Store this key securely. It cannot be recovered if lost — generate a new one instead.</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>App ID: <span className="text-foreground font-mono">{newKey.appId}</span></div>
                {newKey.senderName && <div>Sender: <span className="text-primary">{newKey.senderName}</span></div>}
                {newKey.webhookUrl && <div className="truncate">Webhook: <span className="text-cyan-400 font-mono">{newKey.webhookUrl}</span></div>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button size="sm" onClick={() => setNewKey(null)}>
              Done, I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="bg-card border-border font-mono max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-cyan-400" />
              Edit Key — {editTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Sender Name (SMS ID)</Label>
              <Input
                placeholder="MyBrand"
                maxLength={11}
                value={editForm.senderName}
                onChange={(e) => setEditForm((f) => ({ ...f, senderName: e.target.value }))}
                className="bg-background/60 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Webhook URL</Label>
              <Input
                placeholder="https://your-app.com/webhooks/sms"
                value={editForm.webhookUrl}
                onChange={(e) => setEditForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                className="bg-background/60 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REVOKE CONFIRM ── */}
      <AlertDialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <AlertDialogContent className="bg-card border-border font-mono">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              Revoke "{revokeTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Any apps using this key will immediately stop working. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

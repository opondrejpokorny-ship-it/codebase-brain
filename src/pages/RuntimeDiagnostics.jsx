import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ServerCog, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

function statusBadge(ok, labelWhenOk = "OK", labelWhenBad = "Missing") {
  return (
    <Badge variant="outline" className={ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}>
      {ok ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
      {ok ? labelWhenOk : labelWhenBad}
    </Badge>
  );
}

function boolText(value) {
  return value ? "true" : "false";
}

function entityReady(data) {
  return Boolean(data?.present && data?.methods?.filter && data?.methods?.create && data?.methods?.update);
}

function EnvFlagRow({ name, data }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <div>
        <p className="font-mono text-xs text-slate-700">{name}</p>
        <p className="text-xs text-slate-400">length: {data?.length || 0}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={data?.present ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-red-50 text-red-700 border-red-200"}>
          present: {boolText(Boolean(data?.present))}
        </Badge>
        <Badge variant="outline" className={data?.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}>
          enabled: {boolText(Boolean(data?.enabled))}
        </Badge>
      </div>
    </div>
  );
}

function EntityRow({ name, data }) {
  const methods = data?.methods || {};
  const required = Boolean(methods.filter && methods.create && methods.update);

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-mono text-sm text-slate-800">{name}</p>
          <p className="text-xs text-slate-400">filter/create/update are required for metadata logging.</p>
        </div>
        {statusBadge(Boolean(data?.present && required), "Ready", data?.present ? "Incomplete" : "Missing")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(methods).map(([method, ok]) => (
          <span key={method} className={`text-xs px-2 py-1 rounded-md ${ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {method}: {boolText(Boolean(ok))}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReadinessCard({ title, ready, readyText, missingText }) {
  return (
    <div className={`rounded-xl border p-4 ${ready ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-start gap-3">
        {ready ? <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" /> : <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5" />}
        <div>
          <h2 className={`font-heading font-semibold ${ready ? "text-emerald-900" : "text-amber-900"}`}>
            {title}: {ready ? "ready" : "not ready yet"}
          </h2>
          <p className={`text-sm mt-1 ${ready ? "text-emerald-800" : "text-amber-800"}`}>
            {ready ? readyText : missingText}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RuntimeDiagnostics() {
  const { toast } = useToast();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("base44RuntimeDiagnostics", {});
      const data = response?.data || response;
      setResult(data);
      toast({ title: "Diagnostics loaded" });
    } catch (error) {
      toast({
        title: "Diagnostics failed",
        description: error?.message || "Could not call base44RuntimeDiagnostics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const entities = result?.base44?.entities?.expected_entities || {};
  const webhookDeliveryReady = entityReady(entities.GitHubWebhookDelivery);
  const installationReady = entityReady(entities.GitHubInstallation);
  const repositoryLinkReady = entityReady(entities.GitHubRepositoryLink);

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors duration-150 cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Dashboard
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-xl font-bold text-slate-900 flex items-center gap-2">
              <ServerCog className="w-5 h-5 text-slate-500" />
              Runtime Diagnostics
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Verify what the deployed Base44 function runtime exposes. This reports only capability presence and never returns secret values.
            </p>
          </div>
          <Button onClick={runDiagnostics} disabled={loading} className="gap-2 cursor-pointer">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ServerCog className="w-4 h-4" />}
            {loading ? "Running…" : "Run Diagnostics"}
          </Button>
        </div>
      </div>

      {!result ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
          Run diagnostics after deploying Base44 functions. The key check is whether <code className="bg-white px-1 rounded">GitHubWebhookDelivery</code>, <code className="bg-white px-1 rounded">GitHubInstallation</code>, and <code className="bg-white px-1 rounded">GitHubRepositoryLink</code> have <code className="bg-white px-1 rounded">filter</code>, <code className="bg-white px-1 rounded">create</code>, and <code className="bg-white px-1 rounded">update</code>.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <ReadinessCard
              title="Webhook delivery persistence"
              ready={webhookDeliveryReady}
              readyText="The runtime appears to expose the required GitHubWebhookDelivery entity methods."
              missingText="The runtime does not expose all required GitHubWebhookDelivery methods yet, or the entity is missing."
            />
            <ReadinessCard
              title="Installation metadata"
              ready={installationReady}
              readyText="The runtime appears to expose the required GitHubInstallation entity methods."
              missingText="GitHubInstallation is missing or incomplete, so installation metadata logging should remain disabled."
            />
            <ReadinessCard
              title="Repository links"
              ready={repositoryLinkReady}
              readyText="The runtime appears to expose the required GitHubRepositoryLink entity methods."
              missingText="GitHubRepositoryLink is missing or incomplete, so repository link logging should remain disabled."
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Runtime</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">Deno {statusBadge(Boolean(result.runtime?.deno_present))}</div>
                <div className="flex items-center justify-between">crypto.subtle {statusBadge(Boolean(result.runtime?.crypto_subtle_present))}</div>
                <div className="flex items-center justify-between">fetch {statusBadge(Boolean(result.runtime?.fetch_present))}</div>
                <div className="flex items-center justify-between">globalThis.base44 {statusBadge(Boolean(result.base44?.global_present))}</div>
                <div className="flex items-center justify-between">base44.entities {statusBadge(Boolean(result.base44?.entities?.entities_present))}</div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Base44 keys</h2>
              {result.base44?.keys?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {result.base44.keys.map((key) => (
                    <span key={key} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-mono">{key}</span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No global Base44 keys detected.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Expected entities</h2>
            <div className="grid lg:grid-cols-2 gap-3">
              {Object.entries(entities).map(([name, data]) => (
                <EntityRow key={name} name={name} data={data} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Environment presence</h2>
            <div>
              {Object.entries(result.env_presence || {}).map(([name, data]) => (
                <EnvFlagRow key={name} name={name} data={data} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-heading font-semibold text-sm text-slate-900 mb-3">Raw diagnostics</h2>
            <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

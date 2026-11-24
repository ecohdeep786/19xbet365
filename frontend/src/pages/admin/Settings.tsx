import { useEffect, useState } from "react";
import { Check, LockKeyhole, RefreshCcw, Save, Settings, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, ErrorState, Input, Select, Skeleton } from "../../components/UI";
import { AdminHeader } from "./AdminLayout";
import { classNames, dateTime } from "../../lib/format";

interface Setting { key: string; value: unknown; description: string; updated_at: string }

const GROUPS: { title: string; description: string; keys: string[] }[] = [
  { title: "Platform identity", description: "Brand copy shown across the public site.", keys: ["platformName", "platformTagline", "supportEmail", "licenseStatus"] },
  { title: "Operations", description: "Availability, gameplay and deposit controls.", keys: ["maintenanceMode", "registrationsEnabled", "maxGameStake", "liveUpdates", "responsibleGaming", "depositMode", "depositMin", "depositMax"] },
  { title: "Deposit configuration", description: "QR payment details, instructions and transparent bonus tiers.", keys: ["depositQrImageUrl", "depositInstructions", "depositBonusTiers"] },
  { title: "Integrations & financial rails", description: "Provider and real-money controls. Locked where licensing is absent.", keys: ["thirdPartyIntegrations", "realMoneyEnabled", "kycRequired"] },
  { title: "Governance", description: "Retention and audit policy.", keys: ["auditRetentionDays"] }
];

const LOCKED = new Set(["realMoneyEnabled"]);

export function AdminSettingsPage() {
  const { push } = useToast();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { const data = await api.adminSettings(); setSettings(data.settings); setDrafts({}); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load configuration."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (key: string) => {
    if (!(key in drafts)) return;
    setBusyKey(key);
    try {
      const data = await api.adminUpdateSetting(key, drafts[key]);
      push(data.message, "success", "Configuration saved");
      setSettings((current) => current.map((item) => item.key === key ? { ...item, value: drafts[key], updated_at: new Date().toISOString() } : item));
      setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
    } catch (err) { push(err instanceof Error ? err.message : "Could not save the setting.", "error"); }
    finally { setBusyKey(null); }
  };

  const setDraft = (key: string, value: unknown) => setDrafts((current) => ({ ...current, [key]: value }));
  const valueOf = (setting: Setting) => (setting.key in drafts ? drafts[setting.key] : setting.value);

  return (
    <div className="admin-page">
      <AdminHeader kicker="Governance" title="Platform configuration" body="Master-only controls for platform identity, operations, integrations, and audit retention. Every change is audited." actions={<><Badge tone="outline"><LockKeyhole size={12} /> Master-only</Badge><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button></>} />
      <div className="settings-warning"><ShieldAlert size={18} /><div><strong>Live payment collection requires an operator gate.</strong><span>The deposit flow is sandbox-first. Setting <code>depositMode</code> to <code>manual_review</code> still requires <code>PAYMENTS_LIVE_ENABLED=true</code> on the server, plus licensing, KYC/AML and payment onboarding. <code>realMoneyEnabled</code> remains hard-locked.</span></div></div>
      {loading ? <div className="settings-groups">{Array.from({ length: 3 }).map((_, index) => <div className="panel" key={index}><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div>)}</div> : error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="settings-groups">
          {GROUPS.map((group) => {
            const items = group.keys.map((key) => settings.find((setting) => setting.key === key)).filter(Boolean) as Setting[];
            const extra = settings.filter((setting) => !GROUPS.some((item) => item.keys.includes(setting.key)));
            return (
              <section className="panel settings-group" key={group.title}>
                <div className="panel-head"><span><Settings size={15} /> {group.title}</span><span className="panel-note">{group.description}</span></div>
                {(group.title === "Governance" ? [...items, ...extra] : items).map((setting) => {
                  const locked = LOCKED.has(setting.key);
                  const value = valueOf(setting);
                  const changed = setting.key in drafts;
                  return (
                    <div className={classNames("setting-row", locked && "locked")} key={setting.key}>
                      <div className="setting-copy"><div><strong>{setting.key}</strong>{locked && <Badge tone="coral">HARD-LOCKED</Badge>}{changed && <Badge tone="amber">Unsaved</Badge>}</div><span>{setting.description}</span><small>Updated {dateTime(setting.updated_at)}</small></div>
                      <div className="setting-control">
                        {typeof setting.value === "boolean" ? (
                          <label className="admin-toggle"><input type="checkbox" checked={!!value} disabled={locked} onChange={(event) => setDraft(setting.key, event.target.checked)} /><span /> {value ? "Enabled" : "Disabled"}</label>
                        ) : typeof setting.value === "number" ? (
                          <Input type="number" value={Number(value)} disabled={locked} onChange={(event) => setDraft(setting.key, Number(event.target.value))} />
                        ) : setting.key === "thirdPartyIntegrations" ? (
                          <Select value={String(value)} disabled={locked} onChange={(event) => setDraft(setting.key, event.target.value)}><option value="disabled">disabled</option><option value="simulation">simulation</option></Select>
                        ) : setting.key === "depositMode" ? (
                          <Select value={String(value)} disabled={locked} onChange={(event) => setDraft(setting.key, event.target.value)}><option value="sandbox">sandbox</option><option value="manual_review">manual_review</option><option value="disabled">disabled</option></Select>
                        ) : (
                          <Input value={String(value ?? "")} disabled={locked} onChange={(event) => setDraft(setting.key, event.target.value)} />
                        )}
                        {changed && !locked && <Button variant="lime" size="sm" loading={busyKey === setting.key} onClick={() => save(setting.key)} icon={<Save size={14} />}>Save</Button>}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      <div className="admin-fineprint"><ShieldCheck size={14} /> Every setting change records before/after values in the hash-chained audit trail.</div>
    </div>
  );
}

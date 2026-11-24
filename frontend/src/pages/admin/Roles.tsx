import { useEffect, useMemo, useState } from "react";
import { Check, LockKeyhole, RefreshCcw, Save, ShieldCheck, UserCog } from "lucide-react";
import { api } from "../../lib/api";
import type { RoleInfo } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, ErrorState, Input, Skeleton } from "../../components/UI";
import { AdminHeader } from "./AdminLayout";
import { classNames } from "../../lib/format";

const GROUP_LABELS: Record<string, string> = {
  network: "Network visibility",
  accounts: "Account operations",
  credits: "Virtual credits",
  games: "Game catalogue",
  content: "Content & promotions",
  promotions: "Content & promotions",
  support: "Support desk",
  security: "Security",
  audit: "Audit trail",
  settings: "Platform configuration",
  roles: "Roles & permissions",
  transfers: "Network transfers",
  reports: "Reporting",
  notifications: "Notifications",
  system: "System health"
};

export function AdminRolesPage() {
  const { isMaster } = useAuth();
  const { push } = useToast();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("admin");
  const [draft, setDraft] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try { const data = await api.adminRoles(); setRoles(data.roles); setPermissions(data.permissions); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load roles."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const selected = roles.find((item) => item.code === selectedCode) || roles[0];
  useEffect(() => { if (selected) setDraft([...selected.permissions]); }, [selected?.code, selected?.permissions]);

  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const permission of permissions) {
      if (filter && !permission.toLowerCase().includes(filter.toLowerCase())) continue;
      const rawGroup = permission.split(".")[0];
      const group = rawGroup === "promotions" ? "content" : rawGroup;
      map.set(group, [...(map.get(group) || []), permission]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, filter]);

  const toggle = (permission: string) => {
    if (selected?.code === "master_admin") return;
    setDraft((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await api.adminUpdateRole(selected.code, draft);
      push(data.message, "success", "Permissions saved");
      await load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not save permissions.", "error"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="admin-page"><Skeleton className="sk-title" /><div className="admin-roles-layout"><Skeleton className="sk-match-block" /><Skeleton className="sk-match-block" /></div></div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="admin-page">
      <AdminHeader kicker="Governance" title="Roles & permissions" body="Delegated authority is explicit. Master Admin permissions are fixed; every other role can be tuned by the Master Admin." actions={<><Badge tone="outline"><LockKeyhole size={12} /> Master-only</Badge><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button></>} />
      <div className="admin-roles-layout">
        <aside className="panel role-list-panel">
          <div className="panel-head"><span><UserCog size={15} /> Roles</span><Badge tone="outline">{roles.length}</Badge></div>
          {roles.map((role) => (
            <button key={role.code} className={classNames("role-list-item", selectedCode === role.code && "active")} onClick={() => setSelectedCode(role.code)}>
              <span className="role-rank">{role.rank}</span>
              <div><strong>{role.name}</strong><span>{role.count} accounts</span></div>
              <em>{role.permissions.length} perms</em>
            </button>
          ))}
          <div className="role-note"><ShieldCheck size={15} /><span>Roles are hierarchical. A staff member can only act on accounts strictly below their rank.</span></div>
        </aside>
        <section className="panel permission-panel">
          <div className="permission-head">
            <div><span className="eyebrow">Editing role</span><h2>{selected?.name}</h2><p>{selected?.description}</p></div>
            <Badge tone={selected?.code === "master_admin" ? "lime" : "cyan"}>{selected?.code === "master_admin" ? "Permissions fixed" : `${draft.length} selected`}</Badge>
          </div>
          <div className="permission-toolbar">
            <Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter permissions" aria-label="Filter permissions" />
            <div><button className="text-btn" onClick={() => setDraft(permissions)} disabled={selected?.code === "master_admin"}>Select all</button><button className="text-btn" onClick={() => setDraft([])} disabled={selected?.code === "master_admin"}>Clear</button></div>
          </div>
          <div className="permission-groups">
            {groups.map(([group, items]) => (
              <div className="permission-group" key={group}>
                <div className="permission-group-head"><strong>{GROUP_LABELS[group] || group}</strong><span>{items.filter((item) => draft.includes(item)).length}/{items.length}</span></div>
                <div className="permission-grid">
                  {items.map((permission) => (
                    <label className={classNames("permission-check", draft.includes(permission) && "checked", selected?.code === "master_admin" && "locked")} key={permission}>
                      <input type="checkbox" checked={draft.includes(permission)} onChange={() => toggle(permission)} disabled={selected?.code === "master_admin"} />
                      <span className="permission-box">{draft.includes(permission) && <Check size={12} />}</span>
                      <span>{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="permission-footer">
            <span><ShieldCheck size={14} /> Changes take effect on the next authenticated request.</span>
            {isMaster && selected?.code !== "master_admin" && <Button variant="lime" loading={busy} icon={<Save size={15} />} onClick={save}>Save permissions</Button>}
          </div>
        </section>
      </div>
    </div>
  );
}

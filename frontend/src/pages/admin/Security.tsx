import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Ban, Coins, Laptop, LockKeyhole, RefreshCcw, ShieldCheck, ShieldAlert, UserRound } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Skeleton, Stat } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, dateTime, relative, vc } from "../../lib/format";

interface SecurityData {
  failedLogins: { id: string; email: string; ip: string; user_agent: string; reason: string; created_at: string; display_name: string | null }[];
  activeSessions: { id: string; ip: string; user_agent: string; created_at: string; last_seen_at: string; expires_at: string; display_name: string; email: string; role_code: string }[];
  suspendedAccounts: { id: string; display_name: string; email: string; suspended_reason: string; updated_at: string }[];
  recentAdjustments: { id: string; amount: number; description: string; created_at: string; display_name: string; type: string }[];
  auditChain: { checked: number; broken: number; intact: boolean };
  auditTip: { event_hash: string; prev_hash: string; created_at: string } | null;
}

export function AdminSecurityPage() {
  const { push } = useToast();
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setData(await api.adminSecurity()); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load security data."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const revoke = async (id: string) => {
    setBusyId(id);
    try { const result = await api.adminRevokeSessions(id); push(result.message, "success"); await load(); }
    catch (err) { push(err instanceof Error ? err.message : "Could not revoke sessions.", "error"); }
    finally { setBusyId(null); }
  };

  if (loading) return <div className="admin-page"><Skeleton className="sk-title" /><div className="admin-stat-grid">{Array.from({ length: 4 }).map((_, index) => <div className="stat" key={index}><Skeleton className="sk-line" /></div>)}</div></div>;
  if (error || !data) return <ErrorState message={error || "No security data."} onRetry={load} />;

  return (
    <div className="admin-page">
      <AdminHeader kicker="Security centre" title="Security & session oversight" body="Failed sign-ins, active sessions, suspended accounts, and the integrity of the append-only audit chain." actions={<><AdminScopePill /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button></>} />
      <div className="admin-stat-grid compact-stats">
        <Stat label="Failed sign-ins" value={data.failedLogins.length} hint="Recent, scoped" tone="coral" icon={<LockKeyhole size={16} />} />
        <Stat label="Active sessions" value={data.activeSessions.length} hint="Non-revoked, unexpired" tone="cyan" icon={<Laptop size={16} />} />
        <Stat label="Suspended accounts" value={data.suspendedAccounts.length} hint="Awaiting review" tone="amber" icon={<Ban size={16} />} />
        <Stat label="Audit chain" value={data.auditChain.intact ? "Intact" : "Broken"} hint={`${data.auditChain.checked} records checked`} tone={data.auditChain.intact ? "lime" : "coral"} icon={<ShieldCheck size={16} />} />
      </div>
      <div className="security-admin-grid">
        <section className="panel">
          <div className="panel-head"><span><LockKeyhole size={15} /> Failed sign-ins</span><Badge tone={data.failedLogins.length ? "coral" : "lime"}>{data.failedLogins.length}</Badge></div>
          {!data.failedLogins.length ? <EmptyState icon={<ShieldCheck size={20} />} title="No failed sign-ins" body="Recent authentication attempts in your scope have all succeeded." /> : (
            <div className="security-event-list">{data.failedLogins.map((item) => <div className="security-event" key={item.id}><span className="security-event-icon danger"><LockKeyhole size={15} /></span><div><strong>{item.email || "Unknown email"}</strong><span>{item.reason || "Invalid credentials"} · {item.ip || "IP unavailable"}</span><small>{item.display_name || "Account not matched"} · {dateTime(item.created_at)}</small></div></div>)}</div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head"><span><Laptop size={15} /> Active sessions</span><Badge tone="outline">{data.activeSessions.length}</Badge></div>
          {!data.activeSessions.length ? <EmptyState icon={<Laptop size={20} />} title="No active sessions" /> : (
            <div className="security-event-list">{data.activeSessions.slice(0, 8).map((session) => <div className="security-event" key={session.id}><span className="security-event-icon"><Laptop size={15} /></span><div><strong>{session.display_name} <em>{session.role_code.replace("_", " ")}</em></strong><span>{session.ip || "IP unavailable"} · last active {relative(session.last_seen_at)}</span><small>{session.user_agent || "Unknown browser"}</small></div></div>)}</div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head"><span><Ban size={15} /> Suspended accounts</span><Badge tone="amber">{data.suspendedAccounts.length}</Badge></div>
          {!data.suspendedAccounts.length ? <EmptyState icon={<ShieldCheck size={20} />} title="No suspended accounts" body="Restrictions will appear here with their recorded reason." /> : (
            <div className="security-event-list">{data.suspendedAccounts.map((account) => <div className="security-event" key={account.id}><span className="security-event-icon amber"><UserRound size={15} /></span><div><strong>{account.display_name}</strong><span>{account.email}</span><small>{account.suspended_reason} · {dateTime(account.updated_at)}</small></div><Button variant="ghost" size="sm" loading={busyId === account.id} onClick={() => revoke(account.id)}>Revoke sessions</Button></div>)}</div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head"><span><Coins size={15} /> Recent credit actions</span><Link to="/admin/credits" className="text-btn">Ledger</Link></div>
          {!data.recentAdjustments.length ? <EmptyState title="No recent adjustments" /> : (
            <div className="security-event-list">{data.recentAdjustments.map((adjustment) => <div className="security-event" key={adjustment.id}><span className={classNames("security-event-icon", adjustment.amount > 0 ? "lime" : "danger")}><Coins size={15} /></span><div><strong>{adjustment.display_name}</strong><span>{adjustment.description.replace("Admin adjustment: ", "")}</span><small>{dateTime(adjustment.created_at)} · {adjustment.type}</small></div><strong className={adjustment.amount > 0 ? "lime-text" : "coral-text"}>{adjustment.amount > 0 ? "+" : ""}{vc(adjustment.amount)}</strong></div>)}</div>
          )}
        </section>
      </div>
      <div className="panel audit-integrity-panel">
        <div className="audit-integrity-icon"><ShieldCheck size={26} /></div>
        <div><h3>Audit chain {data.auditChain.intact ? "verified" : "requires investigation"}</h3><p>{data.auditChain.checked} records checked · {data.auditChain.broken} broken links. Records are append-only at the database layer, and all privileged actions are hash-chained.</p><code>{data.auditTip?.event_hash || "GENESIS"}</code></div>
        <Link to="/admin/audit" className="btn btn-secondary btn-sm">Open audit trail</Link>
      </div>
      <div className="admin-fineprint"><AlertTriangle size={14} /> If you see unexpected privileged activity, suspend the account, revoke sessions, and review the immutable audit trail. Do not attempt to alter records.</div>
    </div>
  );
}

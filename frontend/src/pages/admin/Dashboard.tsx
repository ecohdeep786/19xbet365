import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowLeftRight, ArrowRight, ArrowUpRight, BellRing, Coins, Download, Gauge, LifeBuoy,
  LockKeyhole, Network, RefreshCcw, ScrollText, ShieldAlert, ShieldCheck, Users, WalletCards
} from "lucide-react";
import { api } from "../../lib/api";
import type { AdminOverview } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, ErrorState, ProgressBar, Skeleton, Stat } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, number, relative, vc } from "../../lib/format";

export function AdminDashboard() {
  const { user, isMaster } = useAuth();
  const { push } = useToast();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setData(await api.adminOverview()); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load the control room."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const exportSnapshot = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `19xbet365-admin-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    push("Control-room snapshot exported.", "success");
  };

  if (loading) return <AdminDashboardSkeleton />;
  if (error || !data) return <ErrorState message={error || "No data returned."} onRetry={load} />;

  const metrics = data.metrics;
  const maxSeries = Math.max(1, ...data.series.map((item) => Math.max(item.wagered, item.paid)));
  const signupMax = Math.max(1, ...data.series.map((item) => item.signups));

  return (
    <div className="admin-page">
      <AdminHeader
        kicker="Command centre"
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${user?.displayName.split(" ")[0]}.`}
        body={isMaster ? "A live read on the entire 19X network, operations queue, and integrity chain." : "A scoped read on your delegated branch. Global controls stay outside your authority."}
        actions={<><AdminScopePill label={data.scope.label} /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button><Button variant="lime" size="sm" icon={<Download size={15} />} onClick={exportSnapshot}>Export snapshot</Button></>}
      />

      {data.alerts.pendingTransfers > 0 && (
        <div className="admin-alert-band">
          <ArrowUpRight size={18} /><div><strong>{data.alerts.pendingTransfers} transfer request{data.alerts.pendingTransfers === 1 ? "" : "s"} awaiting review.</strong><span>Hierarchy changes require approval before they take effect.</span></div><Link to="/admin/transfers" className="text-btn">Review queue <ArrowRight size={14} /></Link>
        </div>
      )}

      <div className="admin-stat-grid">
        <Stat label="Network accounts" value={number(metrics.accounts)} hint={`${metrics.activeAccounts} active · ${metrics.newThisWeek} new this week`} tone="cyan" icon={<Users size={16} />} />
        <Stat label="Virtual balance held" value={vc(metrics.virtualBalance, { compact: true })} hint="Across scoped player wallets" tone="lime" icon={<WalletCards size={16} />} />
        <Stat label="Game volume" value={vc(metrics.gameWagered, { compact: true })} hint={`${number(metrics.roundsToday)} rounds today`} icon={<Activity size={16} />} />
        <Stat label="Settlement margin" value={vc(metrics.margin, { compact: true, sign: true })} hint={`${vc(metrics.gamePaid, { compact: true })} returned to players`} tone={metrics.margin >= 0 ? "lime" : "coral"} icon={<Coins size={16} />} />
      </div>

      <div className="admin-dashboard-grid">
        <section className="panel admin-chart-panel">
          <div className="panel-head"><span><Gauge size={15} /> Seven-day network pulse</span><Badge tone="outline">Virtual credits</Badge></div>
          <div className="chart-legend"><span className="legend-cyan">Wagered</span><span className="legend-lime">Returned</span><span className="legend-signup">Signups</span></div>
          <div className="bar-chart" role="img" aria-label="Seven day wagering and signups chart">
            {data.series.map((item) => (
              <div className="chart-col" key={item.day}>
                <div className="chart-bars">
                  <span className="chart-bar cyan" style={{ height: `${Math.max(3, (item.wagered / maxSeries) * 100)}%` }} title={`Wagered ${vc(item.wagered)}`} />
                  <span className="chart-bar lime" style={{ height: `${Math.max(2, (item.paid / maxSeries) * 100)}%` }} title={`Returned ${vc(item.paid)}`} />
                </div>
                <span className="chart-signups" style={{ height: `${Math.max(4, (item.signups / signupMax) * 32)}px` }} title={`${item.signups} signups`} />
                <span className="chart-label">{new Date(item.day).toLocaleDateString("en-GB", { weekday: "short" })}</span>
                <span className="chart-date">{new Date(item.day).getDate()}</span>
              </div>
            ))}
          </div>
          <div className="chart-footer"><span><strong>{number(data.series.reduce((sum, item) => sum + item.signups, 0))}</strong> signups this week</span><span><strong>{vc(data.series.reduce((sum, item) => sum + item.wagered, 0), { compact: true })}</strong> wagered</span></div>
        </section>

        <section className="panel admin-roles-panel">
          <div className="panel-head"><span><Network size={15} /> Network composition</span><Link to="/admin/network" className="text-btn">Hierarchy <ArrowRight size={13} /></Link></div>
          <div className="role-breakdown">
            {data.roleCounts.map((item) => {
              const share = metrics.accounts ? (item.count / metrics.accounts) * 100 : 0;
              return <div key={item.role} className="role-row"><div><span>{item.role.replace("_", " ")}</span><strong>{number(item.count)}</strong></div><ProgressBar value={share} tone={item.role === "master_admin" ? "lime" : item.role === "player" ? "cyan" : "cyan"} /></div>;
            })}
          </div>
          <div className="role-foot"><span>Total scoped</span><strong>{number(metrics.accounts)} accounts</strong></div>
        </section>

        <section className="panel admin-alerts-panel">
          <div className="panel-head"><span><ShieldAlert size={15} /> Operations attention</span><Badge tone={data.alerts.suspended + data.alerts.failedLogins + data.alerts.pendingDeposits > 0 ? "amber" : "lime"}>{data.alerts.suspended + data.alerts.failedLogins + data.alerts.pendingDeposits} flags</Badge></div>
          <div className="alert-list">
            <Link to="/admin/accounts?status=suspended" className="alert-row"><span className="alert-icon amber"><ShieldAlert size={16} /></span><div><strong>Suspended accounts</strong><span>Review restrictions and restoration eligibility.</span></div><strong>{data.alerts.suspended}</strong></Link>
            <Link to="/admin/security" className="alert-row"><span className="alert-icon coral"><LockKeyhole size={16} /></span><div><strong>Failed sign-ins</strong><span>Last 24 hours across the scoped network.</span></div><strong>{data.alerts.failedLogins}</strong></Link>
            <Link to="/admin/credits" className="alert-row"><span className="alert-icon cyan"><Coins size={16} /></span><div><strong>Credit adjustments</strong><span>Manual virtual-credit changes in the last 24 hours.</span></div><strong>{data.alerts.creditActions}</strong></Link>
            <Link to="/admin/support" className="alert-row"><span className="alert-icon lime"><LifeBuoy size={16} /></span><div><strong>Open support tickets</strong><span>{metrics.urgentTickets} high-priority conversations need attention.</span></div><strong>{metrics.openTickets}</strong></Link>
            <Link to="/admin/transfers" className="alert-row"><span className="alert-icon violet"><ArrowLeftRight size={16} /></span><div><strong>Pending transfers</strong><span>Network moves awaiting an approver.</span></div><strong>{data.alerts.pendingTransfers}</strong></Link>
            <Link to="/admin/deposits" className="alert-row"><span className="alert-icon lime"><Coins size={16} /></span><div><strong>Deposits awaiting review</strong><span>Manual QR requests awaiting verification.</span></div><strong>{data.alerts.pendingDeposits}</strong></Link>
          </div>
        </section>

        <section className="panel admin-audit-panel">
          <div className="panel-head"><span><ScrollText size={15} /> Latest audit events</span><Link to="/admin/audit" className="text-btn">Full trail <ArrowRight size={13} /></Link></div>
          <div className="audit-mini-list">
            {data.recentAudit.slice(0, 7).map((event) => (
              <div className="audit-mini-row" key={event.id}>
                <span className="audit-mini-dot" />
                <div><strong>{event.action.replace(/[._]/g, " ")}</strong><span>{event.summary}</span><small>{event.actor_name || "System"} · {relative(event.created_at)}</small></div>
                <code>{event.event_hash.slice(0, 8)}</code>
              </div>
            ))}
          </div>
          <div className="audit-chain-foot"><ShieldCheck size={14} /><span>Chain tip</span><code>{data.auditChainTip?.event_hash.slice(0, 24) || "GENESIS"}…</code><Badge tone="lime">Append-only</Badge></div>
        </section>
      </div>

      <div className="admin-quick-actions">
        <Link to="/admin/accounts"><Users size={18} /><div><strong>Manage accounts</strong><span>Roles, restrictions, credits, sessions</span></div><ArrowRight size={15} /></Link>
        <Link to="/admin/support"><LifeBuoy size={18} /><div><strong>Open support desk</strong><span>Respond, assign, resolve</span></div><ArrowRight size={15} /></Link>
        <Link to="/admin/audit"><ScrollText size={18} /><div><strong>Verify audit chain</strong><span>Every privileged action is recorded</span></div><ArrowRight size={15} /></Link>
        <Link to="/admin/system"><BellRing size={18} /><div><strong>System health</strong><span>Database, engine, integrations</span></div><ArrowRight size={15} /></Link>
      </div>
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="admin-page">
      <Skeleton className="sk-title" />
      <div className="admin-stat-grid">{Array.from({ length: 4 }).map((_, index) => <div className="stat" key={index}><Skeleton className="sk-line w45" /><Skeleton className="sk-line w70" /></div>)}</div>
      <div className="admin-dashboard-grid"><div className="panel"><Skeleton className="sk-game-stage" /></div><div className="panel"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div></div>
    </div>
  );
}

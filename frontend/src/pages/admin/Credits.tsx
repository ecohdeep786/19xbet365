import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Coins, RefreshCcw, ShieldCheck, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Input, Skeleton, Stat } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, dateTime, number, vc } from "../../lib/format";

interface LedgerRow { id: string; amount: number; balance_after: number; description: string; created_at: string; type: string; account_name: string; account_email: string; actor_name: string | null }

export function AdminCreditsPage() {
  const { push } = useToast();
  const [data, setData] = useState<{ summary: { credited: number; debited: number; adjustments: number }; activity: LedgerRow[]; series: { day: string; credited: number; debited: number }[] } | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setData(await api.adminCreditsLedger()); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load credit activity."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => (data?.activity || []).filter((row) => !query.trim() || [row.account_name, row.account_email, row.description, row.actor_name || ""].some((value) => value.toLowerCase().includes(query.toLowerCase()))), [data, query]);
  const maxSeries = Math.max(1, ...(data?.series || []).map((item) => Math.max(item.credited, item.debited)));

  return (
    <div className="admin-page">
      <AdminHeader kicker="Financial integrity" title="Credit activity" body="Every manual virtual-credit adjustment, who made it, and why. These are the only balance changes outside game and bet settlement." actions={<><AdminScopePill /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button><Link to="/admin/accounts" className="btn btn-lime btn-sm">Adjust an account <ArrowRight size={14} /></Link></>} />
      {loading ? <div className="admin-stat-grid">{Array.from({ length: 4 }).map((_, index) => <div className="stat" key={index}><Skeleton className="sk-line" /><Skeleton className="sk-line w70" /></div>)}</div> : error ? <ErrorState message={error} onRetry={load} /> : data && (
        <>
          <div className="admin-stat-grid compact-stats">
            <Stat label="Credited" value={vc(data.summary.credited, { compact: true })} hint="Manual additions" tone="lime" icon={<ArrowDownLeft size={16} />} />
            <Stat label="Debited" value={vc(data.summary.debited, { compact: true })} hint="Manual removals" tone="coral" icon={<ArrowUpRight size={16} />} />
            <Stat label="Adjustments" value={number(data.summary.adjustments)} hint="Lifetime in scope" icon={<Coins size={16} />} />
            <Stat label="Net adjustment" value={vc(data.summary.credited - data.summary.debited, { compact: true, sign: true })} hint="Virtual credits" tone="cyan" icon={<ShieldCheck size={16} />} />
          </div>
          <div className="credits-layout">
            <section className="panel credit-chart-panel">
              <div className="panel-head"><span><Coins size={15} /> 14-day adjustment flow</span><Badge tone="outline">Virtual credits</Badge></div>
              <div className="credit-bars">
                {data.series.length === 0 && <EmptyState title="No adjustments in the last 14 days" body="Credit actions from account management appear here." />}
                {data.series.map((item) => (
                  <div className="credit-bar-col" key={item.day}>
                    <div><span className="credit-bar in" style={{ height: `${Math.max(3, (item.credited / maxSeries) * 100)}%` }} title={`Credited ${vc(item.credited)}`} /><span className="credit-bar out" style={{ height: `${Math.max(3, (item.debited / maxSeries) * 100)}%` }} title={`Debited ${vc(item.debited)}`} /></div>
                    <small>{new Date(item.day).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</small>
                  </div>
                ))}
              </div>
              <div className="chart-legend"><span className="legend-lime">Credited</span><span className="legend-coral">Debited</span></div>
            </section>
            <section className="panel credit-policy-panel">
              <span className="eyebrow"><ShieldCheck size={13} /> Adjustment policy</span>
              <h3>No invisible money.</h3>
              <p>Manual credits are limited to player accounts, require a reason, and are written to both the wallet ledger and the hash-chained audit trail.</p>
              <ul><li>Agent and above with the permission can adjust within scope.</li><li>Master Admin cannot be adjusted.</li><li>Negative balances are rejected by the database.</li><li>Adjustments are never deleted.</li></ul>
              <Link to="/admin/audit" className="text-btn">Review audit trail <ArrowRight size={13} /></Link>
            </section>
          </div>
          <div className="panel admin-table-panel">
            <div className="panel-head"><span><Users size={15} /> Adjustment ledger</span><div className="admin-search compact-search"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search account or reason" aria-label="Search adjustments" /></div></div>
            {!filtered.length ? <EmptyState title="No adjustments found" body="Manual credit changes will appear here with actor and reason." /> : (
              <div className="data-table-wrap"><table className="data-table"><thead><tr><th>When</th><th>Player</th><th>Adjustment</th><th>Reason</th><th>Recorded by</th><th className="num">Balance after</th></tr></thead><tbody>
                {filtered.map((row) => <tr key={row.id}><td className="muted-cell">{dateTime(row.created_at)}</td><td><strong>{row.account_name}</strong><span className="row-sub">{row.account_email}</span></td><td className={classNames("num amount", row.amount > 0 ? "positive" : "negative")}>{row.amount > 0 ? "+" : ""}{vc(row.amount)}</td><td>{row.description.replace("Admin adjustment: ", "")}</td><td className="muted-cell">{row.actor_name || "System"}</td><td className="num">{vc(row.balance_after)}</td></tr>)}
              </tbody></table></div>
            )}
          </div>
          <div className="admin-fineprint"><ShieldCheck size={14} /> Real-money deposits, withdrawals, and redemption are disabled. Virtual-credit adjustments do not create cash value.</div>
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, ShieldAlert, TrendingDown, TrendingUp, Coins, Activity, ArrowDownToLine, ArrowUpFromLine, Percent, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import type { AdminRevenue } from "../../types";
import { Button, EmptyState, ErrorState, Skeleton, Stat } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, number, vc } from "../../lib/format";

export function AdminRevenuePage() {
  const [data, setData] = useState<AdminRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await api.adminRevenue());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load revenue data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMax = useMemo(() => Math.max(1, ...(data?.series || []).map((item) => item.sportsStakes + item.gameStakes)), [data]);
  const depositMax = useMemo(() => Math.max(1, ...(data?.series || []).map((item) => item.deposits)), [data]);
  const ggrPositive = (data?.summary.grossGamingRevenue || 0) >= 0;

  return (
    <div className="admin-page">
      <AdminHeader
        kicker="Finance & risk"
        title="Revenue & risk"
        body="Gross gaming revenue, open liability, deposits and product mix across your authorized scope. Coin values are shown; live cash is not collected while payments are sandboxed."
        actions={<><AdminScopePill /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button></>}
      />
      {loading ? (
        <div className="admin-stat-grid">{Array.from({ length: 8 }).map((_, index) => <div className="stat" key={index}><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div>)}</div>
      ) : error ? <ErrorState message={error} onRetry={load} /> : !data ? null : (
        <>
          <div className="admin-stat-grid">
            <Stat label="Gross gaming revenue" value={vc(data.summary.grossGamingRevenue, { compact: true })} hint={`${data.summary.settledBets + data.summary.settledRounds} settled bets/rounds + fantasy`} tone={ggrPositive ? "lime" : "coral"} icon={ggrPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />} />
            <Stat label="Sportsbook GGR" value={vc(data.summary.sportsGgr, { compact: true })} hint={`${vc(data.summary.sportsStakes, { compact: true })} staked`} tone="cyan" icon={<Coins size={16} />} />
            <Stat label="Games GGR" value={vc(data.summary.gameGgr, { compact: true })} hint={`${vc(data.summary.gameStakes, { compact: true })} staked`} tone="lime" icon={<Activity size={16} />} />
            <Stat label="Fantasy GGR" value={vc(data.summary.fantasyGgr, { compact: true })} hint={`${data.summary.openFantasyEntries} open entries · ${vc(data.summary.fantasyStakes, { compact: true })} fees`} tone="cyan" icon={<Trophy size={16} />} />
            <Stat label="Open exposure" value={vc(data.summary.openExposure, { compact: true })} hint={`${number(data.summary.openBets)} open sports bets`} tone="amber" icon={<ShieldAlert size={16} />} />
            <Stat label="Approved deposits" value={vc(data.summary.depositsApproved, { compact: true })} hint={`${number(data.summary.pendingDeposits)} pending review`} tone="cyan" icon={<ArrowDownToLine size={16} />} />
            <Stat label="Withdrawals paid" value={vc(data.summary.withdrawalsPaid, { compact: true })} hint={`${vc(data.summary.withdrawalsPending, { compact: true })} in ${data.summary.pendingWithdrawals} open requests`} tone="default" icon={<ArrowUpFromLine size={16} />} />
            <Stat label="Promotional cost" value={vc(data.summary.promotionalCost, { compact: true })} hint={`Ongoing bonuses; ${vc(data.summary.welcomeAllocations, { compact: true })} welcome allocations`} tone="default" icon={<Percent size={16} />} />
            <Stat label="Net gaming revenue" value={vc(data.summary.netGamingRevenue, { compact: true })} hint="GGR minus ongoing bonus cost" tone={data.summary.netGamingRevenue >= 0 ? "lime" : "coral"} icon={<Coins size={16} />} />
            <Stat label="Active players (24h)" value={number(data.summary.activePlayers24h)} hint={`${number(data.summary.activeAccounts)} active accounts`} tone="cyan" icon={<Activity size={16} />} />
          </div>

          <div className="admin-dashboard-grid">
            <section className="panel admin-chart-panel">
              <div className="panel-head"><span><TrendingUp size={15} /> Seven-day handle and deposits</span><span className="panel-note">Coins settled by day</span></div>
              <div className="chart-legend"><span className="legend-cyan">Sports handle</span><span className="legend-lime">Game handle</span><span className="legend-amber">Deposits</span></div>
              <div className="revenue-chart">
                {(data.series || []).map((item) => (
                  <div className="chart-col" key={item.day}>
                    <div className="chart-bars">
                      <span className="chart-bar cyan" title={`Sports ${vc(item.sportsStakes)}`} style={{ height: `${Math.max(3, (item.sportsStakes / handleMax) * 100)}%` }} />
                      <span className="chart-bar lime" title={`Games ${vc(item.gameStakes)}`} style={{ height: `${Math.max(3, (item.gameStakes / handleMax) * 100)}%` }} />
                      <span className="chart-bar deposit" title={`Deposits ${vc(item.deposits)}`} style={{ height: `${Math.max(3, (item.deposits / depositMax) * 34)}%` }} />
                    </div>
                    <span className="chart-label">{new Date(item.day).toLocaleDateString("en-GB", { weekday: "short" })}</span>
                    <span className="chart-date">{new Date(item.day).getDate()}</span>
                  </div>
                ))}
              </div>
              <div className="chart-footer">
                <span><strong>{vc(data.summary.sportsStakes + data.summary.gameStakes, { compact: true })}</strong> lifetime handle</span>
                <span><strong>{vc(data.summary.netGamingRevenue, { compact: true })}</strong> net after bonuses</span>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head"><span><ShieldAlert size={15} /> Control notes</span></div>
              <div className="admin-risk-notes">
                <div><strong>Outcomes are immutable</strong><span>RNG rounds and settled bets cannot be edited. Staff control catalogue availability, limits and settlement — not individual results.</span></div>
                <div><strong>Open liability is visible</strong><span>Open sports exposure is the potential return if every open bet wins. Cap it with sports stake and payout limits.</span></div>
                <div><strong>Bonus cost is separate</strong><span>Net gaming revenue subtracts ongoing promo, referral and deposit bonuses. Welcome allocations are shown separately.</span></div>
                <div><strong>Real money is locked</strong><span>Deposits are sandbox/manual-review only. Live collection requires the operator gate, KYC/AML and payment onboarding.</span></div>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panel-head"><span><Coins size={15} /> Product mix</span><span className="panel-note">{data.byGame.length} games with settled rounds</span></div>
            {!data.byGame.length ? <EmptyState title="No settled game rounds yet" body="Product-level GGR appears after the first settled rounds." /> : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead><tr><th>Game</th><th>Category</th><th>Rounds</th><th>Stakes</th><th>Payouts</th><th>GGR</th></tr></thead>
                  <tbody>
                    {data.byGame.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.name}</strong></td>
                        <td className="muted-cell">{row.category}</td>
                        <td>{number(row.rounds)}</td>
                        <td>{vc(row.stakes, { compact: true })}</td>
                        <td>{vc(row.payouts, { compact: true })}</td>
                        <td className={classNames("amount", row.ggr >= 0 ? "positive" : "negative")}>{vc(row.ggr, { compact: true })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="admin-fineprint"><ShieldAlert size={14} /> This view is read-only. Stake and payout limits are Master-only settings; every change is recorded in the hash-chained audit trail.</div>
        </>
      )}
    </div>
  );
}

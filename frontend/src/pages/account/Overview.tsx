import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Bell, Coins, HeartHandshake, ShieldCheck, Sparkles, Ticket,
  TrendingUp, Trophy, Users, WalletCards
} from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import { demoOverview } from "../../lib/demo";
import type { PlayerOverview } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { useData } from "../../state/DataContext";
import { Badge, EmptyState, ErrorState, Skeleton, Stat } from "../../components/UI";
import { classNames, relative, vc } from "../../lib/format";

export function AccountOverview() {
  const { user, offline, updateUser } = useAuth();
  const { notifications, unreadCount } = useData();
  const [data, setData] = useState<PlayerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const overview = await api.overview();
      setData(overview);
      if (overview.user) updateUser({ balance: overview.user.balance, xp: overview.user.xp, level: overview.user.level });
      setError(null);
    } catch (err) {
      if (isOfflineError(err) || offline) {
        setData({ ...demoOverview, user: user || demoOverview.user });
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Could not load your dashboard.");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <OverviewSkeleton />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <EmptyState title="Dashboard unavailable" body="Sign in again or reload the platform." />;

  const stats = data.stats;
  return (
    <div className="account-overview">
      <div className="account-welcome">
        <div>
          <span className="eyebrow">At a glance</span>
          <h2>Welcome back, {user?.displayName.split(" ")[0] || "player"}.</h2>
          <p>Your virtual-credit wallet, open tickets, and recent rounds in one place.</p>
        </div>
        <div className="account-welcome-actions">
          <Link to="/instant" className="btn btn-primary btn-sm"><Sparkles size={15} /> Play originals</Link>
          <Link to="/sports" className="btn btn-secondary btn-sm">Sportsbook</Link>
        </div>
      </div>

      <div className="stat-grid">
        <Stat label="Virtual balance" value={vc(user?.balance || 0)} hint="Non-redeemable credits" tone="lime" icon={<Coins size={16} />} />
        <Stat label="Open bets" value={stats.openBets} hint={`${stats.settledBets} settled`} tone="cyan" icon={<Ticket size={16} />} />
        <Stat label="Rounds played" value={stats.totalRounds} hint={`${vc(stats.totalWagered, { compact: true })} wagered`} icon={<Activity size={16} />} />
        <Stat label="Total returned" value={vc(stats.totalReturned, { compact: true })} hint={`${vc(stats.totalStaked, { compact: true })} staked`} tone="coral" icon={<TrendingUp size={16} />} />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head"><span><WalletCards size={15} /> Recent wallet activity</span><Link to="/account/wallet" className="text-btn">Full history <ArrowRight size={13} /></Link></div>
          <div className="txn-list">
            {!data.recentTransactions.length && <EmptyState title="No wallet activity yet" body="Your welcome allocation and game settlements will appear here." />}
            {data.recentTransactions.map((txn) => (
              <div className="txn-row" key={txn.id}>
                <span className={classNames("txn-icon", txn.amount > 0 ? "in" : "out")}>{txn.amount > 0 ? <TrendingUp size={15} /> : <Coins size={15} />}</span>
                <div className="txn-copy"><strong>{txn.description}</strong><span>{relative(txn.created_at)}</span></div>
                <div className="txn-amount"><strong className={txn.amount > 0 ? "lime-text" : ""}>{txn.amount > 0 ? "+" : ""}{vc(txn.amount)}</strong><span>{vc(txn.balance_after)}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><span><Sparkles size={15} /> Latest rounds</span><Link to="/account/activity" className="text-btn">All activity <ArrowRight size={13} /></Link></div>
          <div className="round-list">
            {!data.recentRounds.length && <EmptyState title="No rounds yet" body="Play a server-authoritative original to start your history." />}
            {data.recentRounds.map((round) => (
              <div className="round-row" key={round.id}>
                <span className={classNames("round-dot", round.payout > round.bet ? "win" : "")}>{round.payout > round.bet ? <Trophy size={14} /> : <Activity size={14} />}</span>
                <div><strong>{round.game_name}</strong><span>{String(round.outcome?.summary || "Settled round")}</span></div>
                <div><strong className={round.payout > 0 ? "lime-text" : ""}>{round.payout > 0 ? vc(round.payout) : "—"}</strong><span>{relative(round.created_at)}</span></div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><span><HeartHandshake size={15} /> Responsible play</span><Link to="/account/responsible" className="text-btn">Manage <ArrowRight size={13} /></Link></div>
          <div className="limits-summary">
            <div><span>Daily bet limit</span><strong>{data.limits?.daily_bet_limit ? vc(data.limits.daily_bet_limit) : "Not set"}</strong></div>
            <div><span>Reality check</span><strong>{data.limits?.reality_check_minutes ? `${data.limits.reality_check_minutes} min` : "Off"}</strong></div>
            <div><span>Session limit</span><strong>{data.limits?.session_limit_minutes ? `${data.limits.session_limit_minutes} min` : "Not set"}</strong></div>
          </div>
          <div className="limits-note"><ShieldCheck size={14} /> Limits apply to virtual-credit stakes only. No real-money play is enabled.</div>
        </section>

        <section className="panel">
          <div className="panel-head"><span><Bell size={15} /> Notifications</span><Link to="/account/notifications" className="text-btn">{unreadCount} unread <ArrowRight size={13} /></Link></div>
          <div className="notification-snippet">
            {notifications.slice(0, 3).map((item) => (
              <div key={item.id} className={classNames("snippet-row", !item.read_at && "unread")}>
                <span className={classNames("notification-icon", `type-${item.type}`)}><Bell size={13} /></span>
                <div><strong>{item.title}</strong><span>{relative(item.created_at)}</span></div>
              </div>
            ))}
            {!notifications.length && <EmptyState title="All clear" body="Platform messages and security alerts will appear here." />}
          </div>
        </section>
      </div>

      <div className="account-quick-grid">
        <Link to="/account/bets" className="quick-card"><Ticket size={19} /><div><strong>Open bets</strong><span>{stats.openBets} virtual-credit bets waiting to settle</span></div><ArrowRight size={16} /></Link>
        <Link to="/account/referrals" className="quick-card"><Users size={19} /><div><strong>Referrals</strong><span>{stats.referrals} invited · {stats.rewardedReferrals} rewarded</span></div><ArrowRight size={16} /></Link>
        <Link to="/support" className="quick-card"><Bell size={19} /><div><strong>Support tickets</strong><span>{stats.openTickets} open conversation{stats.openTickets === 1 ? "" : "s"}</span></div><ArrowRight size={16} /></Link>
      </div>
      <div className="account-fineprint"><Badge tone="outline">Virtual credits only</Badge> All values shown are non-redeemable virtual credits. No deposits, withdrawals, or cash prizes.</div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="account-overview">
      <Skeleton className="sk-title" />
      <div className="stat-grid">{Array.from({ length: 4 }).map((_, index) => <div className="stat" key={index}><Skeleton className="sk-line w45" /><Skeleton className="sk-line w70" /></div>)}</div>
      <div className="dashboard-grid">{Array.from({ length: 4 }).map((_, index) => <div className="panel" key={index}><Skeleton className="sk-line w45" /><Skeleton className="sk-line" /><Skeleton className="sk-line w70" /></div>)}</div>
    </div>
  );
}

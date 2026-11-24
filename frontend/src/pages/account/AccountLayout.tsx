import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Activity, ArrowDownToLine, Bell, ChevronRight, Coins, HeartHandshake, ShieldCheck, Ticket, UserRound,
  WalletCards, Users, ArrowRight, Sparkles
} from "lucide-react";
import { useAuth } from "../../state/AuthContext";
import { useData } from "../../state/DataContext";
import { Avatar, Badge, ProgressBar } from "../../components/UI";
import { classNames, vc } from "../../lib/format";

const LINKS = [
  { to: "/account", label: "Overview", icon: Activity, end: true },
  { to: "/account/profile", label: "Profile", icon: UserRound },
  { to: "/account/wallet", label: "Wallet & history", icon: WalletCards },
  { to: "/account/deposit", label: "Add coins", icon: ArrowDownToLine },
  { to: "/account/bets", label: "My bets", icon: Ticket },
  { to: "/account/activity", label: "Game activity", icon: Sparkles },
  { to: "/account/notifications", label: "Notifications", icon: Bell },
  { to: "/account/security", label: "Security", icon: ShieldCheck },
  { to: "/account/referrals", label: "Referrals", icon: Users },
  { to: "/account/responsible", label: "Responsible gaming", icon: HeartHandshake }
];

export function AccountLayout() {
  const { user } = useAuth();
  const { unreadCount } = useData();
  if (!user) return null;
  const progress = Math.min(100, Math.round(((user.xp % 2400) / 2400) * 100));

  return (
    <div className="account-page">
      <div className="account-hero">
        <div className="page-shell account-hero-inner">
          <div className="account-identity">
            <Avatar name={user.displayName} seed={user.avatarSeed} size={68} />
            <div>
              <span className="eyebrow">Player dashboard</span>
              <h1>{user.displayName}</h1>
              <div className="account-meta">
                <Badge tone="cyan">Level {user.level}</Badge>
                <span>@{user.username}</span>
                <span className="meta-dot" />
                <span>{user.country}</span>
              </div>
            </div>
          </div>
          <div className="account-balance-block">
            <span>Coin balance</span>
            <strong>{vc(user.balance)}</strong>
            <Link to="/account/wallet" className="text-btn">Wallet history <ArrowRight size={14} /></Link>
          </div>
          <div className="account-xp">
            <div><span>Level {user.level}</span><span>{user.xp.toLocaleString()} XP</span></div>
            <ProgressBar value={progress} tone="lime" />
            <small>{Math.max(0, 2400 - (user.xp % 2400)).toLocaleString()} XP to next level</small>
          </div>
        </div>
      </div>
      <div className="page-shell account-shell">
        <aside className="account-nav">
          <div className="account-nav-card">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => classNames("account-nav-link", isActive && "active")}>
                <link.icon size={16} />
                <span>{link.label}</span>
                {link.to === "/account/notifications" && unreadCount > 0 && <em>{unreadCount}</em>}
                <ChevronRight size={13} />
              </NavLink>
            ))}
          </div>
          <div className="account-nav-card support-card">
            <div className="support-card-icon"><Coins size={18} /></div>
            <strong>Need a hand?</strong>
            <span>Support is open for account, game, and responsible-play questions.</span>
            <Link to="/support" className="text-btn">Contact support <ArrowRight size={13} /></Link>
          </div>
          <div className="account-nav-note"><ShieldCheck size={15} /> Sandbox coin top-ups. Live cash-out is disabled.</div>
        </aside>
        <main className="account-main"><Outlet /></main>
      </div>
    </div>
  );
}

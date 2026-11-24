import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ArrowDownToLine, ArrowLeftRight, Bell, ChevronDown, CircleHelp, Coins, FileText, Gamepad2,
  HeartPulse, LayoutDashboard, LifeBuoy, LockKeyhole, LogOut, Menu, Network, ScrollText,
  Settings, ShieldAlert, ShieldCheck, Users, X, type LucideIcon
} from "lucide-react";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Avatar, Badge, Button } from "../../components/UI";
import { Logo } from "../../components/Layout";
import { classNames, vc } from "../../lib/format";

interface AdminNavLink { to: string; label: string; icon: LucideIcon; end?: boolean; master?: boolean; permission?: string }
const NAV_GROUPS: { label: string; links: AdminNavLink[] }[] = [
  { label: "Overview", links: [{ to: "/admin", label: "Command centre", icon: LayoutDashboard, end: true }] },
  {
    label: "Network",
    links: [
      { to: "/admin/network", label: "Hierarchy", icon: Network, permission: "reports.view.scope" },
      { to: "/admin/accounts", label: "Accounts", icon: Users, permission: "network.view.scope" },
      { to: "/admin/roles", label: "Roles & permissions", icon: ShieldCheck, master: true }
    ]
  },
  {
    label: "Operations",
    links: [
      { to: "/admin/games", label: "Game catalogue", icon: Gamepad2, permission: "games.view" },
      { to: "/admin/content", label: "Content & promos", icon: FileText, permission: "content.manage" },
      { to: "/admin/credits", label: "Credit activity", icon: Coins, permission: "credits.adjust" },
      { to: "/admin/deposits", label: "Deposit review", icon: ArrowDownToLine, master: true },
      { to: "/admin/support", label: "Support desk", icon: LifeBuoy, permission: "support.view" },
      { to: "/admin/transfers", label: "Transfers", icon: ArrowLeftRight, permission: "transfers.approve" }
    ]
  },
  {
    label: "Governance",
    links: [
      { to: "/admin/security", label: "Security centre", icon: LockKeyhole, permission: "security.view" },
      { to: "/admin/audit", label: "Audit trail", icon: ScrollText, permission: "audit.view.scope" },
      { to: "/admin/settings", label: "Configuration", icon: Settings, master: true },
      { to: "/admin/system", label: "System health", icon: HeartPulse, permission: "system.view" }
    ]
  }
];

export function AdminLayout() {
  const { user, isMaster, logout } = useAuth();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); setMenuOpen(false); }, [location.pathname]);

  if (!user) return null;

  const signOut = async () => {
    await logout();
    push("Signed out of the control room.", "info");
    navigate("/");
  };

  return (
    <div className="admin-app">
      <a className="skip-link" href="#admin-main">Skip to control-room content</a>
      <aside className={classNames("admin-sidebar", open && "open")}>
        <div className="admin-brand">
          <Logo />
          <span className="admin-brand-tag">CONTROL ROOM</span>
          <button className="icon-btn admin-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>
        <div className="admin-scope">
          <span className="scope-label">Authorized scope</span>
          <strong>{isMaster ? "Entire platform network" : `${user.displayName}'s branch`}</strong>
          <span className="scope-role"><Badge tone={isMaster ? "lime" : "cyan"}>{user.roleName}</Badge><em>{isMaster ? "Global" : "Scoped"}</em></span>
        </div>
        <nav className="admin-nav">
          {NAV_GROUPS.map((group) => {
            const visible = group.links.filter((link) => (!link.master || isMaster) && (!link.permission || isMaster || user.permissions.includes(link.permission)));
            if (!visible.length) return null;
            return (
              <div className="admin-nav-group" key={group.label}>
                <span className="admin-nav-label">{group.label}</span>
                {visible.map((link) => (
                  <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => classNames("admin-nav-link", isActive && "active")}>
                    <link.icon size={16} /><span>{link.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-virtual-note"><ShieldAlert size={15} /><span>Deposit review is sandbox-first. Live payments require the operator activation gate.</span></div>
          <Link to="/" className="admin-view-site">View player site <ChevronDown size={13} /></Link>
        </div>
      </aside>
      {open && <div className="admin-sidebar-backdrop" onClick={() => setOpen(false)} />}
      <div className="admin-content">
        <header className="admin-topbar">
          <button className="icon-btn admin-menu-btn" onClick={() => setOpen(true)} aria-label="Open control room navigation"><Menu size={20} /></button>
          <div className="admin-topbar-copy">
            <span className="admin-live"><span className="status-dot status-active" /> Platform operational</span>
            <span className="admin-env">DEMO ENVIRONMENT</span>
          </div>
          <div className="admin-topbar-actions">
            <Link to="/support" className="icon-btn" aria-label="Support"><CircleHelp size={18} /></Link>
            <Link to="/account/notifications" className="icon-btn" aria-label="Notifications"><Bell size={18} /></Link>
            <div className="admin-account">
              <button className="admin-account-trigger" onClick={() => setMenuOpen((value) => !value)}>
                <Avatar name={user.displayName} seed={user.avatarSeed} size={32} />
                <span><strong>{user.displayName}</strong><small>{user.email}</small></span>
                <ChevronDown size={13} />
              </button>
              {menuOpen && (
                <div className="popover admin-account-menu">
                  <div className="account-menu-balance"><span>Virtual balance</span><strong>{vc(user.balance)}</strong></div>
                  <Link to="/account" onClick={() => setMenuOpen(false)}><Activity size={15} /> Player dashboard</Link>
                  <Link to="/" onClick={() => setMenuOpen(false)}><Gamepad2 size={15} /> Public site</Link>
                  <button onClick={signOut}><LogOut size={15} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="admin-main" id="admin-main" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  );
}

export function AdminHeader({ kicker, title, body, actions }: { kicker: string; title: string; body?: string; actions?: ReactNode }) {
  return (
    <div className="admin-page-head">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h1>{title}</h1>
        {body && <p>{body}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  );
}

export function AdminScopePill({ label = "Scoped to your authorized network" }: { label?: string }) {
  return <span className="admin-scope-pill"><ShieldCheck size={13} /> {label}</span>;
}

export function AdminBreadcrumb({ items }: { items: string[] }) {
  return <div className="admin-breadcrumb">{items.map((item, index) => <span key={item}>{index > 0 && <em>/</em>}{item}</span>)}</div>;
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bell, Cherry, ChevronDown, Coins, Dices, Flame, Gamepad2, Gift, HelpCircle,
  LayoutDashboard, LayoutGrid, LogOut, Menu, Radio, ReceiptText, Search, ServerCog, ShieldCheck,
  Sparkles, Spade, Ticket, Timer, Trophy, WalletCards, X, Zap, ShieldAlert, Goal
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { useData } from "../state/DataContext";
import { useBetSlip } from "../state/BetSlipContext";
import { useToast } from "../state/ToastContext";
import { Avatar, Badge, Button } from "./UI";
import { BetSlipDrawer } from "./BetSlipDrawer";
import { SportIcon } from "./SportIcon";
import { useDialog } from "../lib/useDialog";
import { classNames, relative, vc } from "../lib/format";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={classNames("logo", compact && "logo-compact")} aria-label="19xbet365 home">
      <span className="logo-mark">19</span>
      {!compact && (
        <span className="logo-word">
          XBET<span>365</span>
        </span>
      )}
    </Link>
  );
}

type NavChild = { to: string; label: string; body: string; icon: LucideIcon };
type NavItem = {
  label: string;
  to?: string;
  base?: string;
  icon?: LucideIcon;
  sport?: string;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { label: "Top Events", to: "/", icon: Flame },
  { label: "Cricket", to: "/sports?sport=cricket", sport: "cricket" },
  {
    label: "Sports",
    base: "/sports",
    sport: "football",
    children: [
      { to: "/sports", label: "Sportsbook", body: "All fixtures and markets", icon: Goal },
      { to: "/live", label: "Live betting", body: "In-play virtual fixtures", icon: Radio },
      { to: "/esports", label: "Esports", body: "Competitive gaming lines", icon: Gamepad2 },
      { to: "/virtuals", label: "Virtual sports", body: "Fast simulated events", icon: Timer }
    ]
  },
  { label: "Live", to: "/live", icon: Radio },
  { label: "1xGames", to: "/instant", icon: Gamepad2 },
  { label: "Slots", to: "/slots", icon: Cherry },
  { label: "Live Casino", to: "/live-casino", icon: Spade },
  {
    label: "More",
    base: "/promotions",
    icon: LayoutGrid,
    children: [
      { to: "/promotions", label: "Promotions", body: "Virtual-credit campaigns", icon: Gift },
      { to: "/tournaments", label: "Tournaments", body: "Leaderboards and prize pools", icon: Trophy },
      { to: "/casino", label: "Casino lobby", body: "Full game catalogue", icon: Dices },
      { to: "/help", label: "Help centre", body: "Rules, account, responsible play", icon: HelpCircle }
    ]
  }
];

function NavMark({ item }: { item: NavItem }) {
  if (item.sport) return <SportIcon sport={item.sport} size={15} className="nav-icon" />;
  if (item.icon) {
    const Icon = item.icon;
    return <Icon size={15} className="nav-icon" />;
  }
  return null;
}

export function Header() {
  const { user, isStaff, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, markNotificationRead } = useData();
  const { selections, setOpen } = useBetSlip();
  const { push } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false); setAccountOpen(false); setBellOpen(false); setSearchOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen && !bellOpen && !searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (accountOpen && accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
      if (bellOpen && bellRef.current && !bellRef.current.contains(event.target as Node)) setBellOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAccountOpen(false);
      setBellOpen(false);
      setSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen, bellOpen, searchOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
  };

  const signOut = async () => {
    await logout();
    push("You have been signed out.", "info");
    navigate("/");
  };

  return (
    <>
      <header className="site-header">
        <div className="header-accent" />
        <div className="header-shell">
          <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <Logo />
          <nav className="desktop-nav" aria-label="Main navigation">
            {NAV.map((item) => item.children ? (
              <div className="nav-group" key={item.label}>
                <Link to={item.base!} className="nav-link"><NavMark item={item} />{item.label} <ChevronDown size={13} /></Link>
                <div className="nav-panel">
                  <div className="nav-panel-head">
                    <span className="eyebrow">Explore {item.label}</span>
                    <span className="nav-panel-note">Virtual credits only</span>
                  </div>
                  <div className="nav-panel-grid">
                    {item.children.map((child) => (
                      <Link to={child.to} key={child.to} className="nav-panel-item">
                        <span className="nav-panel-icon"><child.icon size={16} /></span>
                        <span className="nav-panel-copy">
                          <strong>{child.label}</strong>
                          <span>{child.body}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : item.to?.includes("?") ? (
              <Link key={item.to} to={item.to} className="nav-link"><NavMark item={item} />{item.label}</Link>
            ) : (
              <NavLink key={item.to} to={item.to!} className={({ isActive }) => classNames("nav-link", isActive && "active")}><NavMark item={item} />{item.label}</NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <span className="header-locale" title="English interface · virtual credits">EN · VC</span>
            <button className="icon-btn header-search-btn" onClick={() => setSearchOpen((open) => !open)} aria-label="Search games and fixtures" aria-expanded={searchOpen} aria-controls="header-search">
              <Search size={19} />
            </button>
            {user ? (
              <>
                <div className="header-balance" title="Virtual-credit balance">
                  <Coins size={15} />
                  <span>{vc(user.balance)}</span>
                </div>
                <div className="header-pop" ref={bellRef}>
                  <button
                    className={classNames("icon-btn bell-btn", bellOpen && "active")}
                    onClick={() => { setBellOpen((open) => !open); setAccountOpen(false); }}
                    aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
                    aria-expanded={bellOpen}
                    aria-haspopup="true"
                  >
                    <Bell size={19} />
                    {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
                  </button>
                  {bellOpen && (
                    <div className="popover notification-popover">
                      <div className="popover-head">
                        <strong>Notifications</strong>
                        {unreadCount > 0 && <button className="text-btn" onClick={markAllRead}>Mark all read</button>}
                      </div>
                      <div className="notification-list">
                        {notifications.slice(0, 5).map((item) => (
                          <button
                            key={item.id}
                            className={classNames("notification-item", !item.read_at && "unread")}
                            onClick={() => { markNotificationRead(item.id); if (item.link) navigate(item.link); setBellOpen(false); }}
                          >
                            <span className={`notification-icon type-${item.type}`}><Bell size={14} /></span>
                            <span>
                              <strong>{item.title}</strong>
                              <small>{item.body}</small>
                              <em>{relative(item.created_at)}</em>
                            </span>
                          </button>
                        ))}
                        {!notifications.length && <div className="popover-empty">No notifications yet.</div>}
                      </div>
                      <Link to="/account/notifications" className="popover-link" onClick={() => setBellOpen(false)}>Open notification centre</Link>
                    </div>
                  )}
                </div>
                <div className="header-pop account-pop" ref={accountRef}>
                  <button
                    className="account-trigger"
                    onClick={() => { setAccountOpen((open) => !open); setBellOpen(false); }}
                    aria-expanded={accountOpen}
                    aria-haspopup="true"
                  >
                    <span className="sr-only">Open account menu</span>
                    <Avatar name={user.displayName} seed={user.avatarSeed} size={34} />
                    <span className="account-trigger-copy">
                      <strong>{user.displayName.split(" ")[0]}</strong>
                      <small>{user.role === "player" ? `Level ${user.level}` : user.roleName}</small>
                    </span>
                    <ChevronDown size={13} />
                  </button>
                  {accountOpen && (
                    <div className="popover account-menu">
                      <div className="account-menu-head">
                        <Avatar name={user.displayName} seed={user.avatarSeed} size={42} />
                        <div><strong>{user.displayName}</strong><small>{user.email}</small></div>
                      </div>
                      <div className="account-menu-balance"><span>Virtual balance</span><strong>{vc(user.balance)}</strong></div>
                      <Link to="/account" onClick={() => setAccountOpen(false)}><LayoutDashboard size={15} /> Dashboard</Link>
                      <Link to="/account/wallet" onClick={() => setAccountOpen(false)}><WalletCards size={15} /> Wallet & history</Link>
                      <Link to="/account/bets" onClick={() => setAccountOpen(false)}><Ticket size={15} /> My bets</Link>
                      <Link to="/account/activity" onClick={() => setAccountOpen(false)}><ReceiptText size={15} /> Game activity</Link>
                      <Link to="/account/security" onClick={() => setAccountOpen(false)}><ShieldCheck size={15} /> Security</Link>
                      {isStaff && <Link to="/admin" className="admin-link" onClick={() => setAccountOpen(false)}><ShieldAlert size={15} /> Control room</Link>}
                      <button className="menu-signout" onClick={signOut}><LogOut size={15} /> Sign out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="header-login">Sign in</Link>
                <Link to="/register" className="btn btn-lime btn-sm header-join"><Sparkles size={14} /> Join 19X</Link>
              </>
            )}
            <button className={classNames("slip-trigger", selections.length > 0 && "has-items")} onClick={() => setOpen(true)} aria-label="Open bet slip">
              <Ticket size={18} />
              <span>Bet slip</span>
              {selections.length > 0 && <em>{selections.length}</em>}
            </button>
          </div>
        </div>
        {searchOpen && (
          <form className="header-search" id="header-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games, providers, teams or leagues…" aria-label="Search" />
            <kbd>Enter</kbd>
            <button type="button" className="icon-btn tiny" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={16} /></button>
          </form>
        )}
        <div className="header-ticker">
          <div className="ticker-track">
            <span><Zap size={12} /> Server-authoritative virtual credits</span>
            <span><Gift size={12} /> New player haul: 10,500 VC</span>
            <span><ShieldCheck size={12} /> No real-money wagering</span>
            <span><Trophy size={12} /> Altitude Week is live</span>
            <span><Gamepad2 size={12} /> 11 playable 19X Originals</span>
            <span><Zap size={12} /> Server-authoritative virtual credits</span>
          </div>
        </div>
      </header>
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <BetSlipDrawer />
    </>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const drawerRef = useRef<HTMLElement>(null);
  useDialog(open, onClose, drawerRef);
  return (
    <div className={classNames("mobile-drawer-backdrop", open && "open")} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile navigation" aria-hidden={!open} ref={drawerRef}>
        <div className="mobile-drawer-head">
          <Logo />
          <button className="icon-btn" onClick={onClose} aria-label="Close menu" data-autofocus><X size={20} /></button>
        </div>
        {user && (
          <div className="mobile-user">
            <Avatar name={user.displayName} seed={user.avatarSeed} size={44} />
            <div><strong>{user.displayName}</strong><span>{vc(user.balance)}</span></div>
            <Link to="/account" className="text-btn" onClick={onClose}>Dashboard</Link>
          </div>
        )}
        <div className="mobile-nav-section">
          <span className="eyebrow">Sports</span>
          <Link to="/sports" onClick={onClose}><Goal size={17} /> Sportsbook</Link>
          <Link to="/live" onClick={onClose}><Radio size={17} /> Live betting</Link>
          <Link to="/esports" onClick={onClose}><Gamepad2 size={17} /> Esports</Link>
          <Link to="/virtuals" onClick={onClose}><Timer size={17} /> Virtual sports</Link>
        </div>
        <div className="mobile-nav-section">
          <span className="eyebrow">Casino</span>
          <Link to="/casino" onClick={onClose}><Dices size={17} /> Casino lobby</Link>
          <Link to="/instant" onClick={onClose}><Sparkles size={17} /> Instant games</Link>
          <Link to="/slots" onClick={onClose}><Cherry size={17} /> Slots</Link>
          <Link to="/live-casino" onClick={onClose}><Spade size={17} /> Live casino</Link>
        </div>
        <div className="mobile-nav-section">
          <Link to="/promotions" onClick={onClose}><Gift size={17} /> Promotions</Link>
          <Link to="/tournaments" onClick={onClose}><Trophy size={17} /> Tournaments</Link>
          <Link to="/help" onClick={onClose}><HelpCircle size={17} /> Help centre</Link>
          <Link to="/search" onClick={onClose}><Search size={17} /> Search</Link>
          {user && <Link to="/support" onClick={onClose}><ReceiptText size={17} /> Support</Link>}
          {isStaff && <Link to="/admin" onClick={onClose}><ShieldAlert size={17} /> Control room</Link>}
        </div>
        <div className="mobile-auth">
          {user ? (
            <Button variant="secondary" onClick={async () => { await logout(); push("Signed out.", "info"); navigate("/"); onClose(); }}><LogOut size={16} /> Sign out</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => { navigate("/login"); onClose(); }}>Sign in</Button>
              <Button variant="lime" onClick={() => { navigate("/register"); onClose(); }}>Join 19X</Button>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export function Footer() {
  const { liveConnected } = useData();
  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div className="footer-brand">
          <Logo />
          <p>An independent, virtual-credit gaming platform. Built with server-authoritative play, transparent limits, and a clear line between what is live and what requires a licensed provider.</p>
          <div className="footer-trust">
            <span><ServerCog size={15} /> Server-authoritative</span>
            <span><Coins size={15} /> Non-redeemable virtual credits</span>
            <span><ShieldCheck size={15} /> 18+ responsible play</span>
          </div>
          <div className="footer-badges">
            <span className="age-badge">18+</span>
            <Badge tone="outline">Virtual credits only</Badge>
            <Badge tone="lime">No cash value</Badge>
          </div>
        </div>
        <div className="footer-col">
          <strong>Play</strong>
          <Link to="/sports">Sportsbook</Link>
          <Link to="/live">Live betting</Link>
          <Link to="/casino">Casino</Link>
          <Link to="/instant">Instant games</Link>
          <Link to="/virtuals">Virtual sports</Link>
        </div>
        <div className="footer-col">
          <strong>Account</strong>
          <Link to="/account">Dashboard</Link>
          <Link to="/account/wallet">Wallet</Link>
          <Link to="/account/bets">Bet history</Link>
          <Link to="/account/responsible">Responsible gaming</Link>
          <Link to="/support">Support</Link>
        </div>
        <div className="footer-col">
          <strong>Platform</strong>
          <Link to="/about">About 19X</Link>
          <Link to="/help">Help centre</Link>
          <Link to="/promotions">Promotions</Link>
          <Link to="/tournaments">Tournaments</Link>
          <Link to="/admin">Control room</Link>
        </div>
        <div className="footer-col">
          <strong>Legal</strong>
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/cookies">Cookies</Link>
          <Link to="/aml">AML & KYC</Link>
          <Link to="/bonus-terms">Bonus terms</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 19xbet365. Demonstration environment. All balances are non-redeemable virtual credits.</span>
        <span className="footer-status"><span className={`status-dot ${liveConnected ? "status-active" : "status-pending"}`} /> {liveConnected ? "Live channel connected" : "API + game engine online"}</span>
      </div>
    </footer>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Check, KeyRound, Laptop, LockKeyhole, LogOut, ShieldCheck, Smartphone, X } from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import type { SessionInfo } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, Field, Input, Skeleton } from "../../components/UI";
import { classNames, dateTime, relative } from "../../lib/format";

const DEMO_SESSIONS: SessionInfo[] = [
  { id: "s1", ip: "127.0.0.1", user_agent: "Chrome on Windows · current browser", created_at: new Date(Date.now() - 3600000).toISOString(), last_seen_at: new Date().toISOString(), expires_at: new Date(Date.now() + 604800000).toISOString(), current: true }
];

export function AccountSecurity() {
  const { user, updateUser, offline } = useAuth();
  const { push } = useToast();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await api.sessions();
      setSessions(data.sessions);
    } catch (err) {
      if (isOfflineError(err) || offline) setSessions(DEMO_SESSIONS);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSessions(); }, []);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (next !== confirm) { push("New passwords do not match.", "error"); return; }
    setBusy(true);
    try {
      if (offline) {
        push("Password change is unavailable in browser preview mode.", "info");
        return;
      }
      const data = await api.changePassword(current, next);
      push(data.message, "success", "Password updated");
      setCurrent(""); setNext(""); setConfirm(""); setShowForm(false);
      loadSessions();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not update the password.", "error");
    } finally { setBusy(false); }
  };

  const toggleTwoFactor = async () => {
    if (!user) return;
    setTwoFactorBusy(true);
    try {
      if (offline) {
        updateUser({ twoFactorEnabled: !user.twoFactorEnabled });
        push("Two-factor preference updated in browser preview mode.", "info");
        return;
      }
      const data = await api.setTwoFactor(!user.twoFactorEnabled);
      updateUser({ twoFactorEnabled: data.enabled });
      push(data.enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.", "success");
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not update two-factor authentication.", "error");
    } finally { setTwoFactorBusy(false); }
  };

  const revoke = async (id: string) => {
    try {
      if (!offline) await api.revokeSession(id);
      setSessions((current) => current.filter((session) => session.id !== id));
      push("Session signed out.", "success");
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not revoke that session.", "error");
    }
  };

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Protection</span>
        <h2>Security & sessions</h2>
        <p>Manage your password, two-factor preference, and every browser signed in to your account.</p>
      </div>
      <div className="security-grid">
        <section className="panel security-card">
          <div className="security-card-head"><span className="security-icon"><KeyRound size={19} /></span><div><h3>Password</h3><span>Last changed when you set your account password.</span></div><Badge tone="outline">Protected</Badge></div>
          {!showForm ? (
            <div className="security-card-body"><p>Use at least 8 characters with a letter and a number. Changing your password signs out other sessions.</p><Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>Change password</Button></div>
          ) : (
            <form className="security-form" onSubmit={changePassword}>
              <Field label="Current password" required><Input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required /></Field>
              <div className="form-two-col">
                <Field label="New password" required><Input type="password" value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" minLength={8} required /></Field>
                <Field label="Confirm new password" required><Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required /></Field>
              </div>
              <div className="form-actions"><Button variant="lime" size="sm" loading={busy} type="submit">Update password</Button><button type="button" className="text-btn" onClick={() => setShowForm(false)}>Cancel</button></div>
            </form>
          )}
        </section>
        <section className="panel security-card">
          <div className="security-card-head"><span className="security-icon"><ShieldCheck size={19} /></span><div><h3>Two-factor authentication</h3><span>Add a second check when signing in.</span></div><Badge tone={user?.twoFactorEnabled ? "lime" : "outline"}>{user?.twoFactorEnabled ? "Enabled" : "Off"}</Badge></div>
          <div className="security-card-body"><p>This foundation records your two-factor preference. A future production deployment would provision an authenticator or hardware key.</p><Button variant={user?.twoFactorEnabled ? "ghost" : "secondary"} size="sm" loading={twoFactorBusy} onClick={toggleTwoFactor}>{user?.twoFactorEnabled ? <><X size={14} /> Disable</> : <><Check size={14} /> Enable preference</>}</Button></div>
        </section>
      </div>
      <section className="panel sessions-panel">
        <div className="panel-head"><span><Laptop size={15} /> Active sessions</span><Badge tone="outline">Signed-in browsers</Badge></div>
        {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : !sessions.length ? (
          <EmptyState icon={<Laptop size={22} />} title="No active sessions" body="Sign in again to create a new session." />
        ) : (
          <div className="session-list">
            {sessions.map((session) => (
              <div className={classNames("session-row", session.current && "current")} key={session.id}>
                <span className="session-icon">{session.user_agent?.toLowerCase().includes("mobile") ? <Smartphone size={18} /> : <Laptop size={18} />}</span>
                <div className="session-copy">
                  <strong>{session.current ? "This browser" : session.user_agent || "Unknown browser"}</strong>
                  <span>{session.ip || "IP unavailable"} · last active {relative(session.last_seen_at)}</span>
                  <small>Signed in {dateTime(session.created_at)} · expires {dateTime(session.expires_at)}</small>
                </div>
                {session.current ? <Badge tone="lime">Current</Badge> : <Button variant="ghost" size="sm" onClick={() => revoke(session.id)} icon={<LogOut size={14} />}>Sign out</Button>}
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="security-note panel"><LockKeyhole size={18} /><div><strong>Session cookies are HttpOnly</strong><p>19X uses a server session cookie. Tokens are hashed in PostgreSQL and never stored as plaintext in the browser.</p></div></div>
    </div>
  );
}

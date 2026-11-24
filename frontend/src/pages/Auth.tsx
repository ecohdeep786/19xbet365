import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Check, Eye, EyeOff, Gift, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound
} from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useToast } from "../state/ToastContext";
import { Button, Field, Input } from "../components/UI";
import { Logo } from "../components/Layout";

function AuthShell({ children, title, kicker, body }: { children: ReactNode; title: string; kicker: string; body: string }) {
  return (
    <main className="auth-page bookmaker">
      <div className="auth-art">
        <div className="auth-orbit"><span className="auth-ring r1" /><span className="auth-ring r2" /><span className="auth-ring r3" /><span className="auth-core">19</span></div>
        <div className="auth-art-copy">
          <span className="eyebrow"><Sparkles size={13} /> 19xbet365</span>
          <h2>Your next board<br />starts here.</h2>
          <p>Sportsbook, originals, and a fully recorded coin wallet. No cash value. Sandbox balance. No real-money risk.</p>
          <div className="auth-perks">
            <span><ShieldCheck size={15} /> Server-authoritative play</span>
            <span><Gift size={15} /> 10,500 coin welcome allocation</span>
          </div>
        </div>
        <div className="auth-art-foot"><span className="age-badge">18+</span> Sandbox coin play · Play responsibly</div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <Logo />
          <div className="auth-heading">
            <span className="eyebrow">{kicker}</span>
            <h1>{title}</h1>
            <p>{body}</p>
          </div>
          {children}
          <div className="auth-legal">By continuing you confirm you are 18 or older and accept our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>. Coins have no cash value in this sandbox.</div>
        </div>
      </div>
    </main>
  );
}

export function Login() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const user = await login(email, password);
      push(`Welcome back, ${user.displayName.split(" ")[0]}.`, "success");
      const destination = user.role === "player" ? (location.state?.from || "/account") : "/admin";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally { setBusy(false); }
  };

  const fillDemo = (kind: "player" | "admin") => {
    setEmail(kind === "player" ? "player@19xbet365.test" : "admin@19xbet365.test");
    setPassword("19X#2026");
  };

  return (
    <AuthShell kicker="Welcome back" title="Sign in to 19XBET365." body="Your wallet, bets, saved games, and activity are waiting.">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email or username" required>
          <div className="input-with-icon"><Mail size={16} /><Input type="text" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
        </Field>
        <Field label="Password" required>
          <div className="input-with-icon"><LockKeyhole size={16} /><Input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required /><button type="button" className="input-action" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
        </Field>
        <div className="auth-form-row"><label className="checkline"><input type="checkbox" defaultChecked /> Remember this browser</label><Link to="/forgot-password" className="text-btn">Forgot password?</Link></div>
        {error && <div className="form-error">{error}</div>}
        <Button variant="primary" size="lg" loading={busy} type="submit" className="full-btn">Sign in <ArrowRight size={17} /></Button>
      </form>
      <div className="demo-login">
        <span>Demo access</span>
        <button onClick={() => fillDemo("player")}><UserRound size={15} /> Player</button>
        <button onClick={() => fillDemo("admin")}><ShieldCheck size={15} /> Master Admin</button>
      </div>
      <p className="auth-switch">New to 19X? <Link to="/register">Create an account <ArrowRight size={14} /></Link></p>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirm: "", referralCode: params.get("ref") || "", marketingOptIn: false });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [age, setAge] = useState(false);

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!age) { setError("Confirm that you are 18 or older."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const user = await register({ email: form.email, password: form.password, displayName: form.displayName, referralCode: form.referralCode || undefined, marketingOptIn: form.marketingOptIn });
      push(`Welcome to 19X, ${user.displayName.split(" ")[0]}. Your coin wallet is ready.`, "success", "Account created");
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally { setBusy(false); }
  };

  const strength = form.password.length >= 12 ? 3 : form.password.length >= 8 ? 2 : form.password.length ? 1 : 0;

  return (
    <AuthShell kicker="New player" title="Create your 19XBET365 account." body="Start with 10,000 coins — plus a 500-coin welcome boost.">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Display name" required>
          <div className="input-with-icon"><UserRound size={16} /><Input value={form.displayName} onChange={(event) => update("displayName", event.target.value)} placeholder="How should we call you?" required minLength={2} maxLength={60} /></div>
        </Field>
        <Field label="Email" required>
          <div className="input-with-icon"><Mail size={16} /><Input type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@example.com" required /></div>
        </Field>
        <div className="auth-form-grid">
          <Field label="Password" required hint="8+ characters with a letter and number.">
            <div className="input-with-icon"><LockKeyhole size={16} /><Input type={show ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="Create password" required minLength={8} /><button type="button" className="input-action" onClick={() => setShow((value) => !value)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
            <div className={`password-strength s${strength}`}><span /><span /><span /></div>
          </Field>
          <Field label="Confirm password" required>
            <div className="input-with-icon"><LockKeyhole size={16} /><Input type={show ? "text" : "password"} autoComplete="new-password" value={form.confirm} onChange={(event) => update("confirm", event.target.value)} placeholder="Repeat password" required /></div>
          </Field>
        </div>
        <Field label="Referral code" hint="Optional. Referrals never grant admin access.">
          <div className="input-with-icon"><Gift size={16} /><Input value={form.referralCode} onChange={(event) => update("referralCode", event.target.value.toUpperCase())} placeholder="19X-XXXXXX" /></div>
        </Field>
        <label className="checkline"><input type="checkbox" checked={form.marketingOptIn} onChange={(event) => update("marketingOptIn", event.target.checked)} /> Send me coin promotions and tournament news.</label>
        <label className="checkline"><input type="checkbox" checked={age} onChange={(event) => setAge(event.target.checked)} /> I am 18 or older and understand all balances are non-redeemable coins.</label>
        {error && <div className="form-error">{error}</div>}
        <Button variant="lime" size="lg" loading={busy} type="submit" className="full-btn">Create account <ArrowRight size={17} /></Button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in <ArrowRight size={14} /></Link></p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      await apiForgot(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally { setBusy(false); }
  };
  return (
    <AuthShell kicker="Account recovery" title="Reset your access." body="Enter the email on your account. In this demonstration, reset requests appear as an account notification.">
      {sent ? (
        <div className="success-panel">
          <span className="success-icon"><Check size={22} /></span>
          <h3>Request received</h3>
          <p>If that email is registered, a password-reset request has been added to the account notifications. Contact support if you need manual verification.</p>
          <Link to="/login" className="btn btn-secondary">Back to sign in</Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <Field label="Email" required>
            <div className="input-with-icon"><Mail size={16} /><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
          </Field>
          {error && <div className="form-error">{error}</div>}
          <Button variant="lime" size="lg" loading={busy} type="submit" className="full-btn">Request reset <ArrowRight size={17} /></Button>
        </form>
      )}
      <p className="auth-switch">Remembered it? <Link to="/login">Return to sign in</Link></p>
    </AuthShell>
  );
}

async function apiForgot(email: string) {
  const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

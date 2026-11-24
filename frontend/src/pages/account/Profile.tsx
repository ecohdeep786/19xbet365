import { useState, type FormEvent } from "react";
import { Check, Copy, Mail, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Avatar, Badge, Button, CopyButton, Field, Input, Select } from "../../components/UI";
import { dateShort } from "../../lib/format";

export function AccountProfile() {
  const { user, offline, updateUser } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    country: user?.country || "Global",
    phone: user?.phone || "",
    marketingOptIn: user?.marketingOptIn || false
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setSaved(false);
    try {
      if (offline) {
        updateUser(form);
        push("Profile updated in browser preview mode.", "success");
        setSaved(true);
        return;
      }
      const data = await api.updateProfile(form);
      updateUser(data.user);
      push("Profile saved.", "success");
      setSaved(true);
    } catch (error) {
      push(error instanceof Error ? error.message : "Could not save your profile.", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Account</span>
        <h2>Profile & identity</h2>
        <p>Keep your display details current. Email and username changes require support verification.</p>
      </div>
      <div className="profile-grid">
        <section className="panel profile-card">
          <div className="profile-avatar-row">
            <Avatar name={user.displayName} seed={user.avatarSeed} size={82} />
            <div>
              <h3>{user.displayName}</h3>
              <span>@{user.username}</span>
              <div className="profile-badges"><Badge tone="cyan">Level {user.level}</Badge><Badge tone="outline">{user.roleName}</Badge></div>
            </div>
          </div>
          <div className="profile-facts">
            <div><span>Email</span><strong>{user.email}</strong></div>
            <div><span>Username</span><strong>@{user.username}</strong></div>
            <div><span>Referral code</span><strong>{user.referralCode} <CopyButton value={user.referralCode} label="" /></strong></div>
            <div><span>Member since</span><strong>{dateShort(user.createdAt)}</strong></div>
            <div><span>Last sign-in</span><strong>{dateShort(user.lastLoginAt)}</strong></div>
            <div><span>Status</span><strong className="lime-text"><Check size={13} /> {user.status}</strong></div>
          </div>
        </section>
        <form className="panel profile-form" onSubmit={submit}>
          <div className="panel-head"><span><UserRound size={15} /> Editable details</span><span className="panel-note">Saved to your account</span></div>
          <Field label="Display name" required>
            <Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} minLength={2} maxLength={60} required />
          </Field>
          <div className="form-two-col">
            <Field label="Country">
              <Select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })}>
                {["United Kingdom", "Ireland", "Germany", "France", "Spain", "Italy", "Sweden", "Canada", "United States", "Brazil", "Nigeria", "India", "Japan", "Australia", "Global"].map((country) => <option key={country} value={country}>{country}</option>)}
              </Select>
            </Field>
            <Field label="Phone" hint="Optional">
              <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+44 …" />
            </Field>
          </div>
          <label className="checkline"><input type="checkbox" checked={form.marketingOptIn} onChange={(event) => setForm({ ...form, marketingOptIn: event.target.checked })} /> Send me virtual-credit promotions and tournament news.</label>
          <div className="form-actions">
            <Button variant="lime" loading={busy} type="submit">{saved ? <><Check size={16} /> Saved</> : "Save changes"}</Button>
            <span className="form-note">Email and username are protected. Contact support to change them.</span>
          </div>
        </form>
      </div>
      <section className="panel identity-panel">
        <div className="identity-icon"><ShieldCheck size={20} /></div>
        <div>
          <h3>Identity verification</h3>
          <p>Real-money operations are disabled in this foundation. No KYC documents are collected or stored. If real-money rails are enabled in a future licensed deployment, identity and source-of-funds checks would be mandatory.</p>
        </div>
        <Badge tone="outline">Not required</Badge>
      </section>
      <section className="panel identity-panel">
        <div className="identity-icon"><Mail size={20} /></div>
        <div>
          <h3>Contact preferences</h3>
          <p>Security alerts are always delivered to your notification centre. Marketing messages are optional and can be turned off at any time.</p>
        </div>
        <CopyButton value={user.email} label="Copy email" />
      </section>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Clock3, HeartHandshake, ShieldCheck, Timer, UserCheck } from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import type { Limits } from "../../types";
import { Badge, Button, Field, Input, Select, Skeleton } from "../../components/UI";
import { dateTime, vc } from "../../lib/format";

const DEMO_LIMITS: Limits = {
  daily_bet_limit: 5000,
  session_limit_minutes: 120,
  reality_check_minutes: 60,
  cool_off_until: null,
  self_exclusion_until: null
};

export function AccountResponsible() {
  const { user, offline } = useAuth();
  const { push } = useToast();
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ dailyBetLimit: 5000, sessionLimitMinutes: 120, realityCheckMinutes: 60, coolOffHours: 0, selfExcludeDays: 0 });
  const [confirmExclusion, setConfirmExclusion] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (offline) { setLimits(DEMO_LIMITS); return; }
        const data = await api.responsible();
        setLimits(data.limits || DEMO_LIMITS);
        if (data.limits) setForm({
          dailyBetLimit: Number(data.limits.daily_bet_limit || 0),
          sessionLimitMinutes: Number(data.limits.session_limit_minutes || 0),
          realityCheckMinutes: Number(data.limits.reality_check_minutes || 60),
          coolOffHours: 0,
          selfExcludeDays: 0
        });
      } catch (err) {
        if (isOfflineError(err)) setLimits(DEMO_LIMITS);
      } finally { setLoading(false); }
    })();
  }, [offline]);

  const activeExclusion = limits?.self_exclusion_until && new Date(limits.self_exclusion_until).getTime() > Date.now();
  const activeCoolOff = limits?.cool_off_until && new Date(limits.cool_off_until).getTime() > Date.now();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.selfExcludeDays > 0 && !confirmExclusion) {
      push("Confirm the self-exclusion period before applying it.", "error");
      return;
    }
    setBusy(true);
    try {
      if (offline) {
        setLimits({ ...DEMO_LIMITS, daily_bet_limit: form.dailyBetLimit, session_limit_minutes: form.sessionLimitMinutes, reality_check_minutes: form.realityCheckMinutes });
        push("Responsible-play settings saved in browser preview mode.", "success");
        return;
      }
      const data = await api.updateResponsible({
        dailyBetLimit: form.dailyBetLimit || null,
        sessionLimitMinutes: form.sessionLimitMinutes || null,
        realityCheckMinutes: form.realityCheckMinutes || 60,
        coolOffHours: form.coolOffHours,
        selfExcludeDays: form.selfExcludeDays
      });
      setLimits(data.limits);
      push(data.message, "success", "Settings saved");
      setForm((current) => ({ ...current, coolOffHours: 0, selfExcludeDays: 0 }));
      setConfirmExclusion(false);
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not save responsible-play settings.", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Wellbeing</span>
        <h2>Responsible gaming</h2>
        <p>19xbet365 is entertainment, not income. These tools apply to virtual-credit play and can be set at any time.</p>
      </div>
      {(activeExclusion || activeCoolOff) && (
        <div className="restriction-banner">
          <AlertTriangle size={20} />
          <div><strong>{activeExclusion ? "Self-exclusion is active" : "Cool-off is active"}</strong><span>{activeExclusion ? `Play is restricted until ${dateTime(limits?.self_exclusion_until || null)}.` : `Play is restricted until ${dateTime(limits?.cool_off_until || null)}.`} Contact support if you need help.</span></div>
        </div>
      )}
      <div className="responsible-grid">
        <form className="panel responsible-form" onSubmit={submit}>
          <div className="panel-head"><span><ShieldCheck size={15} /> Play limits</span><Badge tone="outline">Virtual credits only</Badge></div>
          {loading ? <Skeleton className="sk-line" /> : (
            <>
              <Field label="Daily virtual-credit bet limit" hint="The maximum total stake you can place in a day across games and sports.">
                <div className="input-suffix"><Input type="number" min={0} step={100} value={form.dailyBetLimit} onChange={(event) => setForm({ ...form, dailyBetLimit: Number(event.target.value) })} /><span>VC</span></div>
              </Field>
              <div className="form-two-col">
                <Field label="Session time limit" hint="A reminder and play restriction after this many minutes.">
                  <Select value={form.sessionLimitMinutes} onChange={(event) => setForm({ ...form, sessionLimitMinutes: Number(event.target.value) })}>
                    <option value={0}>No session limit</option><option value={30}>30 minutes</option><option value={60}>60 minutes</option><option value={120}>2 hours</option><option value={240}>4 hours</option>
                  </Select>
                </Field>
                <Field label="Reality check" hint="Receive a check-in reminder during play.">
                  <Select value={form.realityCheckMinutes} onChange={(event) => setForm({ ...form, realityCheckMinutes: Number(event.target.value) })}>
                    <option value={30}>Every 30 minutes</option><option value={60}>Every 60 minutes</option><option value={120}>Every 2 hours</option>
                  </Select>
                </Field>
              </div>
              <div className="form-two-col">
                <Field label="Cool-off" hint="Temporarily pause playable actions.">
                  <Select value={form.coolOffHours} onChange={(event) => setForm({ ...form, coolOffHours: Number(event.target.value) })}>
                    <option value={0}>No cool-off</option><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={168}>7 days</option>
                  </Select>
                </Field>
                <Field label="Self-exclusion" hint="Block play for a longer period. This cannot be shortened.">
                  <Select value={form.selfExcludeDays} onChange={(event) => { setForm({ ...form, selfExcludeDays: Number(event.target.value) }); setConfirmExclusion(false); }}>
                    <option value={0}>Not active</option><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option><option value={180}>180 days</option>
                  </Select>
                </Field>
              </div>
              {form.selfExcludeDays > 0 && (
                <label className="checkline danger-line"><input type="checkbox" checked={confirmExclusion} onChange={(event) => setConfirmExclusion(event.target.checked)} /> I understand self-exclusion restricts play and cannot be shortened once applied.</label>
              )}
              <div className="form-actions"><Button variant="lime" loading={busy} type="submit">Save my limits</Button><span className="form-note">These controls are for your virtual-credit account.</span></div>
              <div className="current-limits">
                <span>Current settings</span>
                <div><strong>{limits?.daily_bet_limit ? vc(limits.daily_bet_limit) : "No daily limit"}</strong><span>daily bet limit</span></div>
                <div><strong>{limits?.session_limit_minutes ? `${limits.session_limit_minutes} min` : "No limit"}</strong><span>session limit</span></div>
                <div><strong>{limits?.reality_check_minutes || 60} min</strong><span>reality check</span></div>
              </div>
            </>
          )}
        </form>
        <div className="responsible-side">
          <div className="panel responsible-tips">
            <span className="eyebrow"><HeartHandshake size={13} /> Keep it healthy</span>
            <h3>Five ways to stay in control</h3>
            <ul>
              <li><UserCheck size={15} /> Decide a virtual-credit budget before you play.</li>
              <li><Clock3 size={15} /> Take regular breaks and use reality checks.</li>
              <li><Timer size={15} /> Never chase a losing round.</li>
              <li><ShieldCheck size={15} /> Use self-exclusion when play stops feeling fun.</li>
              <li><HeartHandshake size={15} /> Talk to someone you trust, or seek independent support.</li>
            </ul>
            <p className="responsible-side-note">19xbet365 does not offer real-money wagering. If you are worried about gambling elsewhere, independent support services in your region can help.</p>
          </div>
          <div className="panel responsible-support">
            <ShieldCheck size={18} />
            <div><strong>Need to talk?</strong><span>Contact our support team for account help, or reach an independent gambling-support service in your country.</span></div>
            <a href="https://www.begambleaware.org/" target="_blank" rel="noreferrer" className="text-btn">Independent support</a>
          </div>
          <div className="panel responsible-facts">
            <div><span>Account status</span><strong>{user?.status || "active"}</strong></div>
            <div><span>Daily limit</span><strong>{limits?.daily_bet_limit ? vc(limits.daily_bet_limit) : "Not set"}</strong></div>
            <div><span>Self-exclusion</span><strong>{activeExclusion ? "Active" : "Not active"}</strong></div>
            <div><span>Cool-off</span><strong>{activeCoolOff ? "Active" : "Not active"}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

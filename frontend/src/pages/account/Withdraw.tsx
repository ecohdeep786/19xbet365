import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpFromLine, Banknote, Clock3, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { Verification, WithdrawalConfig, WithdrawalRequest } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Select, Skeleton } from "../../components/UI";
import { dateTime, vc } from "../../lib/format";

export function AccountWithdraw() {
  const { user, refresh } = useAuth();
  const { push } = useToast();
  const [config, setConfig] = useState<WithdrawalConfig | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [form, setForm] = useState({ amount: 500, method: "upi", destination: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [configData, verificationData, requestData] = await Promise.all([
        api.withdrawalConfig(), api.verification(), api.withdrawals()
      ]);
      setConfig(configData.config);
      setVerification(verificationData.verification);
      setRequests(requestData.requests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load withdrawals.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await api.requestWithdrawal(form);
      push(data.message, "success", "Withdrawal requested");
      setForm({ ...form, destination: "" });
      await Promise.all([load(), refresh()]);
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not request a withdrawal.", "error");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setBusy(true);
    try {
      const data = await api.cancelWithdrawal(id);
      push(data.message, "success", "Request cancelled");
      await Promise.all([load(), refresh()]);
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not cancel the request.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="panel account-panel"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-button" /></div>;
  if (error || !config) return <ErrorState message={error || "Withdrawals unavailable."} onRetry={load} />;

  const kycApproved = verification?.status === "approved" || !config.kycRequired;

  return (
    <div className="account-page-stack">
      <div className="account-page-head"><div><span className="eyebrow">Coin wallet</span><h2>Withdraw coins</h2><p>Submit a manual withdrawal request. A compliance reviewer verifies your KYC and payment details; live payouts remain disabled until the operator activates the real-money rail.</p></div><Badge tone={config.enabled ? "lime" : "coral"}>{config.enabled ? "Manual review" : "Disabled"}</Badge></div>

      {!kycApproved && (
        <div className="account-callout"><ShieldCheck size={18} /><div><strong>Identity verification required.</strong><span>Complete KYC before requesting a withdrawal. Your request will be rejected while verification is missing.</span><Link to="/account/verification" className="text-btn">Start verification</Link></div></div>
      )}

      <div className="wallet-summary-grid">
        <div className="panel account-panel"><span className="eyebrow">Available balance</span><strong className="wallet-balance-amount">{vc(user?.balance || 0)}</strong><span className="muted-small">Pending withdrawals are debited immediately and refunded if rejected or cancelled.</span></div>
        <div className="panel account-panel"><span className="eyebrow">Request window</span><strong>{vc(config.min)} – {vc(config.max)}</strong><span className="muted-small">KYC: {verification?.status.replace("_", " ") || "not started"} · {config.enabled ? "manual review enabled" : "disabled by operations"}</span></div>
      </div>

      {config.enabled && kycApproved ? (
        <form className="panel account-panel" onSubmit={submit}>
          <div className="panel-head"><span><ArrowUpFromLine size={15} /> New withdrawal request</span><Badge tone="outline">Sandbox review</Badge></div>
          <div className="form-grid">
            <Field label="Amount" required hint={`${vc(config.min)} minimum, ${vc(config.max)} maximum.`}><Input type="number" min={config.min} max={config.max} value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} required /></Field>
            <Field label="Method" required><Select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}><option value="upi">UPI</option><option value="bank">Bank transfer</option></Select></Field>
          </div>
          <Field label={form.method === "upi" ? "UPI ID" : "Bank account detail"} required hint="Use an account in your own name. The reviewer sees the full destination; the player ledger masks it.">
            <Input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} placeholder={form.method === "upi" ? "name@bank" : "Account number / IFSC"} required minLength={4} />
          </Field>
          <p className="form-note">Withdrawals are not paid automatically. A Master Admin must approve the request and mark it paid with a payment reference. Do not submit a request for funds you have not deposited.</p>
          <Button variant="lime" type="submit" loading={busy}><Banknote size={16} /> Request withdrawal</Button>
        </form>
      ) : (
        <div className="account-callout"><Clock3 size={18} /><div><strong>Withdrawals are not available yet.</strong><span>{!config.enabled ? "Operations have disabled withdrawal requests." : "Complete identity verification to continue."}</span></div></div>
      )}

      <section className="panel account-panel">
        <div className="panel-head"><span><Clock3 size={15} /> Withdrawal history</span><span className="panel-note">{requests.length} requests</span></div>
        {!requests.length ? <EmptyState icon={<ArrowUpFromLine size={22} />} title="No withdrawal requests" body="Submitted requests and their review status appear here." /> : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Requested</th><th>Amount</th><th>Method</th><th>Destination</th><th>Status</th><th /></tr></thead><tbody>
            {requests.map((request) => <tr key={request.id}><td>{dateTime(request.requestedAt)}</td><td>{vc(request.amount)}</td><td>{request.method.toUpperCase()}</td><td>{request.destination}</td><td><Badge tone={request.status === "paid" ? "lime" : request.status === "rejected" ? "coral" : "outline"}>{request.status}</Badge></td><td>{request.status === "pending" && <button className="text-btn" disabled={busy} onClick={() => cancel(request.id)}>Cancel</button>}</td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </div>
  );
}

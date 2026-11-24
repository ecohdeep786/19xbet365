import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownToLine, CheckCircle2, Clock3, Coins, Info, QrCode, RefreshCcw, ShieldCheck, XCircle
} from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import type { DepositConfig, DepositRequest } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Skeleton, Textarea } from "../../components/UI";
import { dateTime } from "../../lib/format";

function coins(value: number) {
  return `${Number(value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} coins`;
}

const STATUS_TONE: Record<string, "lime" | "amber" | "coral" | "outline"> = {
  approved: "lime",
  pending: "amber",
  rejected: "coral",
  cancelled: "outline"
};

export function AccountDeposit() {
  const { user, offline } = useAuth();
  const { push } = useToast();
  const [config, setConfig] = useState<DepositConfig | null>(null);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [amount, setAmount] = useState(500);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [configData, depositData] = await Promise.all([api.depositConfig(), api.deposits()]);
      setConfig(configData);
      setDeposits(depositData.deposits);
      setAmount((current) => Math.min(Math.max(current, configData.min), configData.max));
      setError(null);
    } catch (err) {
      if (isOfflineError(err)) {
        setError("Deposit verification requires the 19X API. Reconnect to continue.");
      } else {
        setError(err instanceof Error ? err.message : "Could not load deposit information.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!config) return;
    setBusy(true);
    try {
      const data = await api.createDeposit({ amount, reference: reference.trim(), note: note.trim() || undefined });
      setDeposits((current) => [data.deposit, ...current]);
      setReference("");
      setNote("");
      push(`${data.deposit.amount.toFixed(2)} coin deposit submitted for verification.`, "success", "Deposit requested");
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not submit the deposit request.", "error");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      const data = await api.cancelDeposit(id);
      setDeposits((current) => current.map((item) => item.id === id ? data.deposit : item));
      push(data.message, "info");
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not cancel the request.", "error");
    }
  };

  if (loading) {
    return (
      <div className="deposit-page">
        <Skeleton className="sk-title" />
        <Skeleton className="sk-line" />
        <div className="deposit-grid">
          <div className="panel"><Skeleton className="sk-match-block" /></div>
          <div className="panel"><Skeleton className="sk-match-block" /></div>
        </div>
      </div>
    );
  }
  if (error || !config) return <ErrorState message={error || "Deposit configuration unavailable."} onRetry={load} />;

  const disabled = config.mode === "disabled" || (config.mode === "manual_review" && !config.livePaymentsEnabled);
  const pending = deposits.filter((deposit) => deposit.status === "pending");
  const selectedTier = [...config.tiers].reverse().find((tier) => amount >= tier.min);
  const previewBonus = selectedTier ? (amount * selectedTier.percent) / 100 : 0;

  return (
    <div className="deposit-page">
      <div className="deposit-hero">
        <div>
          <span className="eyebrow"><ArrowDownToLine size={13} /> Coin deposit</span>
          <h2>Add coins to your account</h2>
          <p>Scan the payment QR, submit the transfer reference, and a reviewer will verify it before coins are credited. Current balance: <strong>{coins(user?.balance || 0)}</strong>.</p>
        </div>
        <div className="deposit-balance">
          <span>Available coins</span>
          <strong>{coins(user?.balance || 0)}</strong>
          <Badge tone={config.mode === "sandbox" ? "amber" : "outline"}>{config.mode === "sandbox" ? "Sandbox verification" : "Manual review"}</Badge>
        </div>
      </div>

      {config.mode === "sandbox" && (
        <div className="deposit-notice">
          <Info size={17} />
          <div><strong>Sandbox mode.</strong><span>This flow tests the deposit, review and bonus experience. No real payment is collected and no cash value is created until live payments are activated by the operator.</span></div>
        </div>
      )}
      {config.mode === "manual_review" && !config.livePaymentsEnabled && (
        <div className="deposit-notice warning">
          <ShieldCheck size={17} />
          <div><strong>Live collection is not activated.</strong><span>The server operator must complete payment, licensing and KYC activation before real transfers can be accepted.</span></div>
        </div>
      )}

      <div className="deposit-grid">
        <section className="panel deposit-payment">
          <div className="panel-head"><span><QrCode size={15} /> Payment QR</span><Badge tone="outline">Manual verification</Badge></div>
          <div className="qr-frame">
            {config.qrImageUrl ? (
              <img src={config.qrImageUrl} alt="Payment QR code" />
            ) : (
              <div className="qr-placeholder">
                <QrCode size={54} />
                <strong>Payment QR not configured</strong>
                <span>Operations can add the QR image URL in control-room settings.</span>
              </div>
            )}
          </div>
          <p className="deposit-instructions">{config.instructions}</p>
          <div className="deposit-tiers">
            <span className="eyebrow">Deposit bonus</span>
            {config.tiers.map((tier) => (
              <div key={tier.min} className={selectedTier?.min === tier.min ? "active" : ""}>
                <span>Deposit {coins(tier.min)} or more</span>
                <strong>{tier.percent}% bonus</strong>
              </div>
            ))}
          </div>
          <p className="deposit-fineprint"><ShieldCheck size={13} /> Deposit requests are reviewed by authorized staff and recorded in the audit trail.</p>
        </section>

        <section className="panel deposit-form-panel">
          <div className="panel-head"><span><Coins size={15} /> Request a deposit</span></div>
          <form className="deposit-form" onSubmit={create}>
            <Field label="Amount" required hint={`Minimum ${config.min}, maximum ${config.max} coins.`}>
              <div className="input-with-icon"><Coins size={16} /><Input type="number" min={config.min} max={config.max} step={10} value={amount} onChange={(event) => setAmount(Number(event.target.value))} required /></div>
            </Field>
            <div className="deposit-preview">
              <span>Estimated bonus</span>
              <strong>{coins(previewBonus)}</strong>
              <small>{selectedTier ? `${selectedTier.percent}% tier` : "No tier reached"}</small>
            </div>
            <Field label="Payment reference / UTR" required hint="The reference shown in your payment app after transfer.">
              <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. 4268 5512 9001" minLength={6} maxLength={120} required />
            </Field>
            <Field label="Note (optional)">
              <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything the reviewer should know." maxLength={300} />
            </Field>
            <Button variant="primary" size="lg" type="submit" loading={busy} disabled={disabled} className="full-btn"><ArrowDownToLine size={16} /> Submit deposit request</Button>
            <p className="form-note">Never send a password. Only submit a reference after you have completed the transfer.</p>
          </form>
        </section>
      </div>

      <section className="panel deposit-history">
        <div className="panel-head"><span><Clock3 size={15} /> Deposit requests</span><Badge tone="outline">{deposits.length}</Badge></div>
        {!deposits.length ? (
          <EmptyState icon={<ArrowDownToLine size={22} />} title="No deposit requests yet" body="Submit the form after completing your transfer. Pending requests appear here until a reviewer verifies them." />
        ) : (
          <div className="deposit-list">
            {deposits.map((deposit) => (
              <div className="deposit-row" key={deposit.id}>
                <div>
                  <strong>{coins(deposit.amount)}</strong>
                  <span>Ref {deposit.reference} · {dateTime(deposit.createdAt)}</span>
                </div>
                <div>
                  {deposit.bonusAmount > 0 && <span className="deposit-bonus">+{coins(deposit.bonusAmount)} bonus</span>}
                  <Badge tone={STATUS_TONE[deposit.status] || "outline"}>{deposit.status}</Badge>
                  {deposit.status === "pending" && <button className="text-btn" onClick={() => cancel(deposit.id)}>Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
        {pending.length > 0 && <p className="deposit-fineprint"><RefreshCcw size={13} /> Verification is manual. Refresh after the reviewer completes the request.</p>}
      </section>
    </div>
  );
}

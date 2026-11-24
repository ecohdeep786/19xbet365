import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Coins, RefreshCcw, ShieldAlert, XCircle } from "lucide-react";
import { api } from "../../lib/api";
import type { AdminDeposit } from "../../types";
import { useToast } from "../../state/ToastContext";
import { AdminHeader } from "./AdminLayout";
import { Badge, Button, EmptyState, ErrorState, Modal, Skeleton, Textarea } from "../../components/UI";
import { classNames, dateTime, vc } from "../../lib/format";

const FILTERS = [
  { value: "", label: "All requests" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

export function AdminDepositsPage() {
  const { push } = useToast();
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminDeposit | null>(null);
  const [reason, setReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.adminDeposits(filter || undefined);
      setDeposits(data.deposits);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load deposit requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const pending = useMemo(() => deposits.filter((deposit) => deposit.status === "pending"), [deposits]);
  const approvedTotal = useMemo(() => deposits.filter((deposit) => deposit.status === "approved").reduce((sum, deposit) => sum + deposit.amount + deposit.bonusAmount, 0), [deposits]);

  const approve = async (deposit: AdminDeposit) => {
    setBusyId(deposit.id);
    try {
      const data = await api.adminApproveDeposit(deposit.id);
      push(data.message, "success", "Deposit approved");
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not approve the deposit.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      const data = await api.adminRejectDeposit(rejecting.id, reason.trim());
      push(data.message, "success", "Deposit rejected");
      setRejecting(null);
      setReason("");
      await load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not reject the deposit.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-page">
      <AdminHeader
        kicker="Operations"
        title="Deposit review"
        body="Verify player transfer references before crediting coins and calculating the deposit bonus. Master Admin only."
        actions={<Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button>}
      />

      <div className="admin-stat-grid deposit-admin-stats">
        <div className="stat"><div className="stat-top"><span>Pending review</span><Clock3 size={16} /></div><strong>{pending.length}</strong><small>Awaiting verification</small></div>
        <div className="stat"><div className="stat-top"><span>Approved value</span><Coins size={16} /></div><strong>{vc(approvedTotal, { compact: true })}</strong><small>Deposits + bonuses</small></div>
        <div className="stat"><div className="stat-top"><span>Requests loaded</span><CheckCircle2 size={16} /></div><strong>{deposits.length}</strong><small>Current filter</small></div>
      </div>

      <div className="admin-callout"><ShieldAlert size={17} /><div><strong>Manual verification only.</strong><span>Approve only after the transfer reference is confirmed. Live collection is unavailable unless the server operator gate and compliance setup are complete.</span></div></div>

      <div className="panel deposit-admin-panel">
        <div className="panel-head">
          <span><Coins size={15} /> Deposit requests</span>
          <div className="segmented small">{FILTERS.map((item) => <button key={item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
        </div>
        {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={load} /> : !deposits.length ? (
          <EmptyState icon={<Coins size={22} />} title="No deposit requests" body="New player requests will appear here for verification." />
        ) : (
          <div className="deposit-admin-list">
            {deposits.map((deposit) => (
              <article className={classNames("deposit-admin-row", `status-${deposit.status}`)} key={deposit.id}>
                <div className="deposit-admin-main">
                  <div className="deposit-admin-amount">{vc(deposit.amount)}<span>+{vc(deposit.bonusAmount)} bonus</span></div>
                  <div><strong>{deposit.player}</strong><span>{deposit.email} · @{deposit.username}</span></div>
                  <div><span>Reference</span><strong>{deposit.reference}</strong></div>
                  <div><span>Submitted</span><strong>{dateTime(deposit.createdAt)}</strong></div>
                  <Badge tone={deposit.status === "pending" ? "amber" : deposit.status === "approved" ? "lime" : "coral"}>{deposit.status}</Badge>
                </div>
                {deposit.note && <p className="deposit-admin-note">“{deposit.note}”</p>}
                {deposit.reviewNote && <p className="deposit-admin-note">Review: {deposit.reviewNote}</p>}
                {deposit.status === "pending" && (
                  <div className="deposit-admin-actions">
                    <Button variant="primary" size="sm" loading={busyId === deposit.id} onClick={() => approve(deposit)} icon={<CheckCircle2 size={15} />}>Approve &amp; credit</Button>
                    <Button variant="secondary" size="sm" onClick={() => { setRejecting(deposit); setReason(""); }} icon={<XCircle size={15} />}>Reject</Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject deposit request" footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" loading={busyId === rejecting?.id} onClick={reject} disabled={reason.trim().length < 4}>Reject request</Button></>}>
        <p className="modal-copy">Explain why the transfer could not be verified. The player will receive a notification with this reason.</p>
        <Textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Reference not found in the payment statement." />
      </Modal>
    </div>
  );
}

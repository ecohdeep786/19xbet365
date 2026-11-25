import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Banknote, RefreshCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { AdminVerification, AdminWithdrawal } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Skeleton, Stat, Textarea } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, dateTime, vc } from "../../lib/format";

export function AdminCompliancePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<"withdrawals" | "kyc">("withdrawals");
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ type: "kyc" | "withdrawal"; id: string } | null>(null);
  const [reason, setReason] = useState("");
  const [paying, setPaying] = useState<AdminWithdrawal | null>(null);
  const [paymentReference, setPaymentReference] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [kyc, withdrawal] = await Promise.all([api.adminVerifications(), api.adminWithdrawals()]);
      setVerifications(kyc.verifications);
      setWithdrawals(withdrawal.requests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load compliance queues.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    pendingKyc: verifications.filter((item) => item.status === "pending").length,
    approvedKyc: verifications.filter((item) => item.status === "approved").length,
    pendingWithdrawals: withdrawals.filter((item) => item.status === "pending").length,
    pendingValue: withdrawals.filter((item) => ["pending", "approved"].includes(item.status)).reduce((sum, item) => sum + item.amount, 0)
  }), [verifications, withdrawals]);

  const approveKyc = async (item: AdminVerification) => {
    setBusyId(item.id);
    try {
      const data = await api.adminApproveVerification(item.id);
      push(data.message, "success", "KYC approved");
      await load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not approve.", "error"); }
    finally { setBusyId(null); }
  };

  const approveWithdrawal = async (item: AdminWithdrawal) => {
    setBusyId(item.id);
    try {
      const data = await api.adminApproveWithdrawal(item.id);
      push(data.message, "success", "Withdrawal approved");
      await load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not approve.", "error"); }
    finally { setBusyId(null); }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      if (rejecting.type === "kyc") await api.adminRejectVerification(rejecting.id, reason);
      else await api.adminRejectWithdrawal(rejecting.id, reason);
      push("Request rejected.", "success", "Review complete");
      setRejecting(null); setReason("");
      await load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not reject.", "error"); }
    finally { setBusyId(null); }
  };

  const markPaid = async () => {
    if (!paying) return;
    setBusyId(paying.id);
    try {
      const data = await api.adminMarkWithdrawalPaid(paying.id, paymentReference);
      push(data.message, "success", "Payment recorded");
      setPaying(null); setPaymentReference("");
      await load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not record payment.", "error"); }
    finally { setBusyId(null); }
  };

  return (
    <div className="admin-page">
      <AdminHeader kicker="Compliance" title="KYC & withdrawals" body="Manual identity review and withdrawal processing. Financial actions are Master-only and recorded in the audit trail." actions={<><AdminScopePill label="Master-only financial review" /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button></>} />
      <div className="admin-stat-grid">
        <Stat label="Pending KYC" value={stats.pendingKyc} hint={`${stats.approvedKyc} approved`} tone="amber" icon={<BadgeCheck size={16} />} />
        <Stat label="Pending withdrawals" value={stats.pendingWithdrawals} hint={vc(stats.pendingValue, { compact: true })} tone="coral" icon={<Banknote size={16} />} />
        <Stat label="KYC records" value={verifications.length} hint="Manual review queue" tone="cyan" icon={<ShieldCheck size={16} />} />
        <Stat label="Withdrawal requests" value={withdrawals.length} hint="Pending and historical" tone="default" icon={<ShieldAlert size={16} />} />
      </div>
      <div className="admin-toolbar panel">
        <div className="segmented small">
          <button className={tab === "withdrawals" ? "active" : ""} onClick={() => setTab("withdrawals")}>Withdrawals</button>
          <button className={tab === "kyc" ? "active" : ""} onClick={() => setTab("kyc")}>KYC review</button>
        </div>
      </div>
      {loading ? <div className="panel"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={load} /> : tab === "withdrawals" ? (
        <section className="panel">
          <div className="panel-head"><span><Banknote size={15} /> Withdrawal requests</span><span className="panel-note">{withdrawals.length}</span></div>
          {!withdrawals.length ? <EmptyState title="No withdrawal requests" body="Player requests appear here for manual verification." /> : (
            <div className="compliance-list">
              {withdrawals.map((item) => (
                <article className={classNames("compliance-row", `status-${item.status}`)} key={item.id}>
                  <div><strong>{item.player}</strong><span>{item.email}</span></div>
                  <div><span>Amount</span><strong>{vc(item.amount)}</strong></div>
                  <div><span>Destination</span><strong>{item.destinationMasked}</strong></div>
                  <div><span>Requested</span><strong>{dateTime(item.requestedAt)}</strong></div>
                  <Badge tone={item.status === "paid" ? "lime" : item.status === "rejected" ? "coral" : "amber"}>{item.status}</Badge>
                  <div className="compliance-actions">
                    {item.status === "pending" && <Button variant="lime" size="sm" loading={busyId === item.id} onClick={() => approveWithdrawal(item)}>Approve</Button>}
                    {item.status === "approved" && <Button variant="primary" size="sm" loading={busyId === item.id} onClick={() => { setPaying(item); setPaymentReference(""); }}>Mark paid</Button>}
                    {["pending", "approved"].includes(item.status) && <Button variant="danger" size="sm" onClick={() => setRejecting({ type: "withdrawal", id: item.id })}>Reject</Button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="panel">
          <div className="panel-head"><span><BadgeCheck size={15} /> KYC review</span><span className="panel-note">{verifications.length}</span></div>
          {!verifications.length ? <EmptyState title="No verification submissions" body="Player identity submissions appear here." /> : (
            <div className="compliance-list">
              {verifications.map((item) => (
                <article className={classNames("compliance-row", `status-${item.status}`)} key={item.id}>
                  <div><strong>{item.player}</strong><span>{item.email}</span></div>
                  <div><span>Legal name</span><strong>{item.legalName}</strong></div>
                  <div><span>Country</span><strong>{item.country}</strong></div>
                  <div><span>Document</span><strong>{item.documentType} · {item.documentReference}</strong></div>
                  <Badge tone={item.status === "approved" ? "lime" : item.status === "rejected" ? "coral" : "amber"}>{item.status}</Badge>
                  <div className="compliance-actions">
                    {item.status === "pending" && <Button variant="lime" size="sm" loading={busyId === item.id} onClick={() => approveKyc(item)}>Approve</Button>}
                    {item.status !== "approved" && <Button variant="danger" size="sm" onClick={() => setRejecting({ type: "kyc", id: item.id })}>Reject</Button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title={rejecting?.type === "kyc" ? "Reject verification" : "Reject withdrawal"} footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" disabled={reason.trim().length < 4} onClick={reject}>Reject</Button></>}>
        <Field label="Reason" required><Textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the decision. The player will receive this reason." /></Field>
      </Modal>
      <Modal open={!!paying} onClose={() => setPaying(null)} title="Mark withdrawal paid" footer={<><Button variant="secondary" onClick={() => setPaying(null)}>Cancel</Button><Button variant="lime" disabled={paymentReference.trim().length < 4} onClick={markPaid}>Record payment</Button></>}>
        <p className="modal-copy">Confirm that the payment was sent outside the platform. Record the bank/UPI reference for reconciliation.</p>
        <Field label="Payment reference" required><Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="UTR / bank reference" /></Field>
      </Modal>
    </div>
  );
}

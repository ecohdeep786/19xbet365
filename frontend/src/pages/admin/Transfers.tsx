import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeftRight, ArrowRight, Check, Clock3, RefreshCcw, ShieldCheck, UserRound, X } from "lucide-react";
import { api } from "../../lib/api";
import type { NetworkNode, Transfer } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Button, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, Stat, Textarea } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, dateTime, number } from "../../lib/format";

export function AdminTransfersPage() {
  const { push } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [roots, setRoots] = useState<NetworkNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ accountId: "", toParentId: "", reason: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [transferData, networkData] = await Promise.all([api.adminTransfers(), api.adminNetwork()]);
      setTransfers(transferData.transfers); setRoots(networkData.roots); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load transfers."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const flat = useMemo(() => {
    const list: NetworkNode[] = [];
    const walk = (node: NetworkNode) => { list.push(node); node.children.forEach(walk); };
    roots.forEach(walk);
    return list;
  }, [roots]);

  const players = flat.filter((node) => node.role === "player");
  const destinations = flat.filter((node) => ["master_admin", "admin", "sub_admin", "agent"].includes(node.role));
  const pending = transfers.filter((item) => item.status === "pending");

  const resolve = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const data = action === "approve" ? await api.adminApproveTransfer(id) : await api.adminRejectTransfer(id);
      push(data.message, "success", `Transfer ${action}d`);
      await load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not resolve the transfer.", "error"); }
    finally { setBusyId(null); }
  };

  const createTransfer = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      const data = await api.adminCreateTransfer(form);
      push(data.message, "success", "Transfer requested");
      setCreateOpen(false); setForm({ accountId: "", toParentId: "", reason: "" });
      await load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not create the transfer.", "error"); }
    finally { setCreating(false); }
  };

  return (
    <div className="admin-page">
      <AdminHeader kicker="Network operations" title="Account transfers" body="Move an account between branches through a request-and-approve workflow. Approved moves update the parent relationship and the audit trail." actions={<><AdminScopePill /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button><Button variant="lime" size="sm" icon={<ArrowLeftRight size={15} />} onClick={() => setCreateOpen(true)}>Request transfer</Button></>} />
      <div className="admin-stat-grid compact-stats">
        <Stat label="Pending" value={pending.length} hint="Awaiting approval" tone="amber" icon={<Clock3 size={16} />} />
        <Stat label="Approved" value={number(transfers.filter((item) => item.status === "approved").length)} hint="Hierarchy updated" tone="lime" icon={<Check size={16} />} />
        <Stat label="Rejected" value={number(transfers.filter((item) => item.status === "rejected").length)} hint="No changes made" tone="coral" icon={<X size={16} />} />
        <Stat label="Total requests" value={number(transfers.length)} hint="In your scope" icon={<ArrowLeftRight size={16} />} />
      </div>
      <div className="panel admin-table-panel">
        <div className="panel-head"><span><ArrowLeftRight size={15} /> Transfer queue</span><span className="panel-note">Approval is required before any hierarchy change</span></div>
        {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={load} /> : !transfers.length ? <EmptyState icon={<ArrowLeftRight size={22} />} title="No transfer requests" body="Request a move between branches to begin the approval workflow." /> : (
          <div className="transfer-list">
            {transfers.map((transfer) => (
              <article className={classNames("transfer-card", transfer.status)} key={transfer.id}>
                <div className="transfer-head">
                  <span className={classNames("transfer-status", transfer.status)}>{transfer.status}</span>
                  <div><strong>{transfer.account_name}</strong><span>{transfer.account_email}</span></div>
                  <span className="transfer-date">{dateTime(transfer.created_at)}</span>
                </div>
                <div className="transfer-path">
                  <div><span>From branch</span><strong>{transfer.from_name || "Unassigned"}</strong></div>
                  <ArrowRight size={17} />
                  <div><span>To branch</span><strong>{transfer.to_name}</strong></div>
                </div>
                <p className="transfer-reason">“{transfer.reason}”</p>
                <div className="transfer-foot">
                  <span>Requested by {transfer.requester_name} · Ref {transfer.id.slice(0, 8).toUpperCase()}</span>
                  {transfer.status === "pending" ? <div><Button variant="ghost" size="sm" loading={busyId === transfer.id} onClick={() => resolve(transfer.id, "reject")} icon={<X size={14} />}>Reject</Button><Button variant="lime" size="sm" loading={busyId === transfer.id} onClick={() => resolve(transfer.id, "approve")} icon={<Check size={14} />}>Approve move</Button></div> : <span className="transfer-resolved">Resolved {transfer.resolved_at ? dateTime(transfer.resolved_at) : ""}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="admin-fineprint"><ShieldCheck size={14} /> Transfers never grant administrative rights. An approved move changes the account's parent branch only.</div>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Request account transfer" footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="lime" type="submit" form="transfer-form" loading={creating}>Create request</Button></>}>
        <form id="transfer-form" className="invite-form" onSubmit={createTransfer}>
          <Field label="Account to move" required>
            <Select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} required>
              <option value="">Select a player</option>
              {players.map((node) => <option key={node.id} value={node.id}>{node.displayName} · {node.email}</option>)}
            </Select>
          </Field>
          <Field label="Destination branch" required>
            <Select value={form.toParentId} onChange={(event) => setForm({ ...form, toParentId: event.target.value })} required>
              <option value="">Select a destination</option>
              {destinations.map((node) => <option key={node.id} value={node.id}>{node.displayName} · {node.roleName}</option>)}
            </Select>
          </Field>
          <Field label="Reason" required hint="At least 8 characters. Recorded in the audit trail.">
            <Textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Why should this account move?" required minLength={8} />
          </Field>
          <div className="admin-fineprint"><ShieldCheck size={14} /> Both accounts must be inside your authorized network.</div>
        </form>
      </Modal>
    </div>
  );
}

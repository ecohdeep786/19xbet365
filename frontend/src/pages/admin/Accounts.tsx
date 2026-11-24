import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Ban, Check, Coins, KeyRound, Mail, RefreshCcw, RotateCcw,
  Search, ShieldCheck, UserPlus, Users, X
} from "lucide-react";
import { api } from "../../lib/api";
import type { AdminAccount } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Avatar, Badge, Button, CopyButton, EmptyState, ErrorState, Field, Input, Modal, Select, Skeleton, Textarea } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, dateShort, number, vc } from "../../lib/format";

const ROLES = ["all", "master_admin", "admin", "sub_admin", "agent", "player"];

export function AdminAccountsPage() {
  const { user, isMaster } = useAuth();
  const { push } = useToast();
  const [params] = useSearchParams();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState(params.get("query") || "");
  const [appliedQuery, setAppliedQuery] = useState(params.get("query") || "");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState(params.get("status") || "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminAccount | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", displayName: "", role: "player" });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [credit, setCredit] = useState({ amount: 1000, reason: "" });
  const [newRole, setNewRole] = useState("player");
  const [actionError, setActionError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<{ id: string; email: string; display_name: string; role_code: string; status: string; created_at: string; expires_at: string; parent_name: string; invited_by_name: string; role_name: string }[]>([]);

  const inviteRoles = useMemo(() => (
    user?.role === "master_admin" ? ["admin", "sub_admin", "agent", "player"] : []
  ), [user?.role]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (role !== "all") params.set("role", role);
      if (status !== "all") params.set("status", status);
      if (appliedQuery) params.set("query", appliedQuery);
      const data = await api.adminAccounts(params.toString());
      setAccounts(data.accounts);
      setTotal(data.total); setPages(data.pages); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load accounts."); }
    finally { setLoading(false); }
  };

  const loadInvitations = async () => {
    try { const data = await api.adminInvitations(); setInvitations(data.invitations); } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [page, role, status, appliedQuery]);
  useEffect(() => { loadInvitations(); }, []);

  const openManage = (account: AdminAccount) => {
    setSelected(account); setReason(""); setCredit({ amount: 1000, reason: "" }); setNewRole(account.role); setActionError(null);
  };

  const refreshSelected = async () => {
    setSelected(null);
    await load();
    if (isMaster) loadInvitations();
  };

  const doSuspend = async () => {
    if (!selected) return;
    setActionBusy(true); setActionError(null);
    try {
      const data = await api.adminSuspend(selected.id, reason);
      push(data.message, "success", "Account suspended");
      await refreshSelected();
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not suspend the account."); }
    finally { setActionBusy(false); }
  };

  const doRestore = async () => {
    if (!selected) return;
    setActionBusy(true); setActionError(null);
    try {
      const data = await api.adminRestore(selected.id);
      push(data.message, "success", "Account restored");
      await refreshSelected();
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not restore the account."); }
    finally { setActionBusy(false); }
  };

  const doCredit = async () => {
    if (!selected) return;
    setActionBusy(true); setActionError(null);
    try {
      const data = await api.adminCredits(selected.id, credit.amount, credit.reason);
      push(data.message, "success", "Adjustment recorded");
      await refreshSelected();
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not record the adjustment."); }
    finally { setActionBusy(false); }
  };

  const doRole = async () => {
    if (!selected) return;
    setActionBusy(true); setActionError(null);
    try {
      const data = await api.adminRole(selected.id, newRole);
      push(data.message, "success", "Role updated");
      await refreshSelected();
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not update the role."); }
    finally { setActionBusy(false); }
  };

  const doSessions = async () => {
    if (!selected) return;
    setActionBusy(true); setActionError(null);
    try {
      const data = await api.adminRevokeSessions(selected.id);
      push(data.message, "success", "Sessions revoked");
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not revoke sessions."); }
    finally { setActionBusy(false); }
  };

  const doInvite = async (event: FormEvent) => {
    event.preventDefault();
    setInviteBusy(true); setActionError(null);
    try {
      const data = await api.adminInvite(invite);
      setInviteResult(data.credentials);
      push(data.message, "success", "Invitation created");
      loadInvitations();
    } catch (err) { setActionError(err instanceof Error ? err.message : "Could not create the invitation."); }
    finally { setInviteBusy(false); }
  };

  const revokeInvitation = async (id: string) => {
    try { const data = await api.adminRevokeInvitation(id); push(data.message, "success"); loadInvitations(); }
    catch (err) { push(err instanceof Error ? err.message : "Could not revoke the invitation.", "error"); }
  };

  return (
    <div className="admin-page">
      <AdminHeader
        kicker="Account operations"
        title="Accounts & access"
        body="Search the scoped network, manage restrictions, and record every coin adjustment."
        actions={<><AdminScopePill />{isMaster && <Button variant="lime" size="sm" icon={<UserPlus size={15} />} onClick={() => { setInviteOpen(true); setInviteResult(null); setActionError(null); }}>Issue credentials</Button>}</>}
      />
      {!isMaster && <div className="admin-callout"><ShieldCheck size={17} /><div><strong>Staff credentials are issued by Master Admin.</strong><span>You can manage accounts and game operations within your authorized branch; creating new staff logins is restricted to the Master Admin.</span></div></div>}
      <div className="admin-toolbar panel">
        <form className="admin-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedQuery(query); }}>
          <Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, username or referral code" aria-label="Search accounts" />
          <Button variant="secondary" size="sm" type="submit">Search</Button>
        </form>
        <div className="admin-filters">
          <select className="input select" value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} aria-label="Filter role">
            {ROLES.map((item) => <option key={item} value={item}>{item === "all" ? "All roles" : item.replace("_", " ")}</option>)}
          </select>
          <select className="input select" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter status">
            {["all", "active", "suspended", "pending", "closed"].map((item) => <option key={item} value={item}>{item === "all" ? "All statuses" : item}</option>)}
          </select>
          <button className="icon-btn" onClick={load} aria-label="Refresh accounts"><RefreshCcw size={16} /></button>
        </div>
      </div>

      <div className="panel admin-table-panel">
        <div className="panel-head"><span><Users size={15} /> Scoped accounts</span><span className="panel-note">{number(total)} result{total === 1 ? "" : "s"}</span></div>
        {loading ? <div className="table-loading">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="sk-line" />)}</div> : error ? <ErrorState message={error} onRetry={load} /> : !accounts.length ? <EmptyState icon={<Users size={22} />} title="No accounts match" body="Adjust the filters or search a different name." /> : (
          <>
            <div className="data-table-wrap">
              <table className="data-table admin-accounts-table">
                <thead><tr><th>Account</th><th>Role</th><th>Parent</th><th className="num">Balance</th><th>Activity</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td><div className="account-cell"><Avatar name={account.displayName} seed={account.avatarSeed} size={34} /><div><strong>{account.displayName}</strong><span>{account.email}</span></div></div></td>
                      <td><Badge tone={account.role === "master_admin" ? "lime" : account.role === "player" ? "outline" : "cyan"}>{account.roleName}</Badge></td>
                      <td className="muted-cell">{account.parentName || "—"}</td>
                      <td className="num"><strong>{vc(account.balance)}</strong><span className="row-sub">{account.directCount} direct reports</span></td>
                      <td><span className="activity-cell">{account.betCount} bets · {account.roundCount} rounds</span></td>
                      <td><span className={classNames("status-pill", account.status)}>{account.status}</span></td>
                      <td><Button variant="ghost" size="sm" onClick={() => openManage(account)}>Manage <ArrowRight size={13} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination"><span>Page {page} of {pages}</span><div><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={14} /> Previous</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ArrowRight size={14} /></Button></div></div>
          </>
        )}
      </div>

      {isMaster && <section className="panel invitations-panel">
        <div className="panel-head"><span><Mail size={15} /> Pending invitations</span><Button variant="ghost" size="sm" onClick={() => { setInviteOpen(true); setInviteResult(null); setActionError(null); }} icon={<UserPlus size={14} />}>Issue credentials</Button></div>
        {!invitations.length ? <p className="muted-small">No invitations recorded in your scope.</p> : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Invitee</th><th>Role</th><th>Invited by</th><th>Expires</th><th>Status</th><th /></tr></thead><tbody>
            {invitations.map((item) => <tr key={item.id}><td><strong>{item.display_name}</strong><span className="row-sub">{item.email}</span></td><td><Badge tone="outline">{item.role_name}</Badge></td><td className="muted-cell">{item.invited_by_name}</td><td className="muted-cell">{dateShort(item.expires_at)}</td><td><span className={classNames("status-pill", item.status)}>{item.status}</span></td><td>{item.status === "pending" && <button className="text-btn" onClick={() => revokeInvitation(item.id)}>Revoke</button>}</td></tr>)}
          </tbody></table></div>
        )}
      </section>}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Manage ${selected.displayName}` : "Manage account"} wide footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}>
        {selected && (
          <div className="account-manage">
            <div className="manage-summary">
              <Avatar name={selected.displayName} seed={selected.avatarSeed} size={52} />
              <div><strong>{selected.displayName}</strong><span>{selected.email} · {selected.roleName}</span><small>Parent: {selected.parentName || "none"} · Balance {vc(selected.balance)}</small></div>
              <Badge tone={selected.status === "active" ? "lime" : "amber"}>{selected.status}</Badge>
            </div>
            {actionError && <div className="form-error">{actionError}</div>}
            <div className="manage-grid">
              <section className="manage-card">
                <div className="manage-card-head"><Ban size={16} /><div><strong>{selected.status === "suspended" ? "Restore access" : "Suspend account"}</strong><span>{selected.role === "master_admin" ? "Master Admin accounts are protected." : selected.id === user?.id ? "You cannot suspend your own account." : selected.status === "suspended" ? "Re-enable sign-in and play." : "Revoke sessions and block play."}</span></div></div>
                {selected.status === "suspended" ? <Button variant="lime" size="sm" loading={actionBusy} onClick={doRestore} icon={<RotateCcw size={14} />}>Restore account</Button> : <><Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (at least 8 characters) — recorded in the audit trail" maxLength={300} disabled={selected.role === "master_admin" || selected.id === user?.id} /><Button variant="danger" size="sm" loading={actionBusy} onClick={doSuspend} disabled={selected.role === "master_admin" || selected.id === user?.id} icon={<Ban size={14} />}>Suspend account</Button></>}
              </section>
              <section className="manage-card">
                <div className="manage-card-head"><Coins size={16} /><div><strong>Coin adjustment</strong><span>{selected.role === "player" ? "Player account. Every change is audited." : "Adjustments are limited to player accounts."}</span></div></div>
                <div className="inline-form"><Input type="number" step={50} value={credit.amount} onChange={(event) => setCredit({ ...credit, amount: Number(event.target.value) })} aria-label="Adjustment amount" disabled={selected.role !== "player"} /><span>coins</span></div>
                <Input value={credit.reason} onChange={(event) => setCredit({ ...credit, reason: event.target.value })} placeholder="Reason for adjustment" maxLength={300} disabled={selected.role !== "player"} />
                <Button variant="secondary" size="sm" loading={actionBusy} onClick={doCredit} disabled={selected.role !== "player"} icon={<Coins size={14} />}>Record adjustment</Button>
              </section>
              <section className="manage-card">
                <div className="manage-card-head"><ShieldCheck size={16} /><div><strong>Role & permissions</strong><span>{isMaster ? "Master-only role control." : "Only a Master Admin can change roles."}</span></div></div>
                <Select value={newRole} disabled={!isMaster || selected.role === "master_admin"} onChange={(event) => setNewRole(event.target.value)}>
                  {["admin", "sub_admin", "agent", "player"].map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
                </Select>
                <Button variant="secondary" size="sm" disabled={!isMaster || selected.role === "master_admin"} loading={actionBusy} onClick={doRole}>Update role</Button>
              </section>
              <section className="manage-card">
                <div className="manage-card-head"><KeyRound size={16} /><div><strong>Sessions</strong><span>Force sign-out on every browser.</span></div></div>
                <Button variant="ghost" size="sm" loading={actionBusy} onClick={doSessions}>Revoke all sessions</Button>
              </section>
            </div>
            <div className="manage-note"><ShieldCheck size={14} /> Action scope is enforced server-side. Suspensions revoke sessions immediately and create a notification.</div>
          </div>
        )}
      </Modal>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Issue staff credentials" footer={<Button variant="secondary" onClick={() => setInviteOpen(false)}>Close</Button>}>
        {inviteResult ? (
          <div className="invite-result">
            <span className="success-icon"><Check size={22} /></span>
            <h3>Account credentials</h3>
            <p>Give these credentials to the staff member through an approved secure channel. The temporary password is shown once.</p>
            <div className="credential-box"><span>{inviteResult.email}</span><strong>{inviteResult.temporaryPassword}</strong></div>
            <CopyButton value={`${inviteResult.email} / ${inviteResult.temporaryPassword}`} label="Copy credentials" />
            <Button variant="lime" size="sm" onClick={() => { setInviteResult(null); setInvite({ email: "", displayName: "", role: "player" }); }}>Issue another</Button>
          </div>
        ) : (
          <form className="invite-form" onSubmit={doInvite}>
            <div className="invite-scope-note"><ShieldCheck size={15} /><span>Only Master Admin can create staff logins. The account is created immediately and the member can sign in with the generated credentials.</span></div>
            <Field label="Display name" required><Input value={invite.displayName} onChange={(event) => setInvite({ ...invite, displayName: event.target.value })} placeholder="Full name" minLength={2} required /></Field>
            <Field label="Email / login ID" required><Input type="email" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="person@example.com" required /></Field>
            <Field label="Role" required><Select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}>{inviteRoles.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</Select></Field>
            {actionError && <div className="form-error">{actionError}</div>}
            <Button variant="lime" loading={inviteBusy} type="submit" icon={<UserPlus size={15} />}>Generate credentials</Button>
            <p className="form-note">The temporary password must be changed after the first sign-in. Role escalation is blocked by the server.</p>
          </form>
        )}
      </Modal>
    </div>
  );
}

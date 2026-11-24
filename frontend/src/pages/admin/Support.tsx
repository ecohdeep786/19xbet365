import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, LifeBuoy, MessageSquare, RefreshCcw, Send, ShieldCheck, UserCheck, Users } from "lucide-react";
import { api } from "../../lib/api";
import type { AdminTicket, SupportMessage } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Input, Segmented, Skeleton, Textarea } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, dateTime, relative, vc } from "../../lib/format";

export function AdminSupportPage() {
  const { push } = useToast();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selected, setSelected] = useState<(AdminTicket & { balance?: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.adminTickets();
      setTickets(data.tickets);
      if (!selectedId && data.tickets[0]) setSelectedId(data.tickets[0].id);
      setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load the support desk."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedId) return;
    setThreadLoading(true);
    (async () => {
      try {
        const data = await api.adminTicket(selectedId);
        setSelected(data.ticket); setMessages(data.messages);
      } catch (err) { push(err instanceof Error ? err.message : "Could not load the ticket.", "error"); }
      finally { setThreadLoading(false); }
    })();
  }, [selectedId]);

  const filtered = useMemo(() => tickets.filter((ticket) => {
    if (filter === "open" && !["open", "pending"].includes(ticket.status)) return false;
    if (filter === "urgent" && !["high", "urgent"].includes(ticket.priority)) return false;
    if (query.trim() && ![ticket.subject, ticket.account_name, ticket.account_email, ticket.category].some((value) => value.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [tickets, filter, query]);

  const updateTicket = async (payload: { status?: string; priority?: string; assign?: boolean | string }) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await api.adminUpdateTicket(selectedId, payload);
      push("Ticket updated.", "success");
      await load();
      const data = await api.adminTicket(selectedId);
      setSelected(data.ticket); setMessages(data.messages);
    } catch (err) { push(err instanceof Error ? err.message : "Could not update the ticket.", "error"); }
    finally { setBusy(false); }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    try {
      await api.adminReplyTicket(selectedId, reply, internal);
      setReply("");
      const data = await api.adminTicket(selectedId);
      setSelected(data.ticket); setMessages(data.messages);
      push(internal ? "Internal note added." : "Reply sent to the player.", "success");
      load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not send the message.", "error"); }
    finally { setBusy(false); }
  };

  const openCount = tickets.filter((ticket) => ["open", "pending"].includes(ticket.status)).length;
  const urgentCount = tickets.filter((ticket) => ["high", "urgent"].includes(ticket.priority) && ticket.status !== "closed").length;

  return (
    <div className="admin-page">
      <AdminHeader kicker="Player care" title="Support desk" body="Respond in scope, assign tickets, and keep internal notes separate from the player conversation." actions={<><AdminScopePill /><Badge tone={urgentCount ? "amber" : "lime"}>{urgentCount} urgent</Badge><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button></>} />
      <div className="admin-stat-grid compact-stats">
        <div className="stat"><div className="stat-top"><span>Open conversations</span><LifeBuoy size={15} /></div><strong>{openCount}</strong><small>Across your scope</small></div>
        <div className="stat stat-coral"><div className="stat-top"><span>High priority</span><ShieldCheck size={15} /></div><strong>{urgentCount}</strong><small>Needs review</small></div>
        <div className="stat stat-lime"><div className="stat-top"><span>Resolved</span><CheckCircle2 size={15} /></div><strong>{tickets.filter((ticket) => ticket.status === "resolved").length}</strong><small>Closed loop</small></div>
        <div className="stat stat-cyan"><div className="stat-top"><span>Total tickets</span><Users size={15} /></div><strong>{tickets.length}</strong><small>Lifetime in scope</small></div>
      </div>
      <div className="admin-support-layout">
        <aside className="panel admin-ticket-list">
          <div className="panel-head"><span><MessageSquare size={15} /> Conversations</span><Badge tone="outline">{filtered.length}</Badge></div>
          <div className="ticket-filters"><Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "urgent", label: "Priority" }]} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tickets" aria-label="Search tickets" /></div>
          {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={load} /> : !filtered.length ? <EmptyState title="No tickets in this view" /> : (
            <div className="admin-ticket-items">
              {filtered.map((ticket) => (
                <button key={ticket.id} className={classNames("admin-ticket-item", selectedId === ticket.id && "active")} onClick={() => setSelectedId(ticket.id)}>
                  <div className="admin-ticket-top"><strong>{ticket.subject}</strong><Badge tone={ticket.priority === "urgent" || ticket.priority === "high" ? "coral" : "outline"}>{ticket.priority}</Badge></div>
                  <span>{ticket.account_name} · {ticket.category}</span>
                  <div className="admin-ticket-meta"><span className={classNames("status-pill", ticket.status)}>{ticket.status}</span><span>{ticket.message_count} messages</span><span>{relative(ticket.updated_at)}</span></div>
                </button>
              ))}
            </div>
          )}
        </aside>
        <section className="panel admin-thread">
          {!selectedId || !selected ? <EmptyState icon={<LifeBuoy size={22} />} title="Select a ticket" body="Choose a conversation from the list to review the player's issue and respond." /> : (
            <>
              <div className="admin-thread-head">
                <div><span className="eyebrow">{selected.category} · {selected.account_email}</span><h2>{selected.subject}</h2><span><Clock3 size={13} /> Opened {dateTime(selected.created_at)} · Player balance {vc(selected.balance || 0)}</span></div>
                <div className="thread-controls">
                  <select className="input select compact" value={selected.status} onChange={(event) => updateTicket({ status: event.target.value })} disabled={busy} aria-label="Ticket status"><option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
                  <select className="input select compact" value={selected.priority} onChange={(event) => updateTicket({ priority: event.target.value })} disabled={busy} aria-label="Ticket priority"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select>
                  <Button variant="secondary" size="sm" icon={<UserCheck size={14} />} loading={busy} onClick={() => updateTicket({ assign: "me" })}>{selected.assigned_name ? "Reassign to me" : "Assign to me"}</Button>
                </div>
              </div>
              {selected.assigned_name && <div className="assigned-line"><UserCheck size={14} /> Assigned to {selected.assigned_name}</div>}
              <div className="admin-thread-messages">
                {threadLoading ? <Skeleton className="sk-line" /> : messages.map((message) => (
                  <div className={classNames("thread-message", message.sender_role === "player" ? "theirs" : "mine", message.is_internal && "internal")} key={message.id}>
                    <div className="thread-message-meta"><strong>{message.sender_name || "System"}</strong><span>{message.sender_role || "staff"} · {dateTime(message.created_at)}</span>{message.is_internal && <Badge tone="amber">Internal</Badge>}</div>
                    <p>{message.body}</p>
                  </div>
                ))}
              </div>
              <form className="admin-thread-reply" onSubmit={sendReply}>
                <Textarea rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={internal ? "Write an internal note (not visible to the player)…" : "Write a reply to the player…"} />
                <div className="reply-controls"><label className="checkline"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} /> Internal note</label><Button variant="lime" size="sm" type="submit" loading={busy} disabled={!reply.trim()} icon={<Send size={14} />}>{internal ? "Add note" : "Send reply"}</Button></div>
              </form>
              <div className="admin-fineprint"><ShieldCheck size={14} /> Support updates are audit-logged. Internal notes are never shown to players. Never ask for a password.</div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

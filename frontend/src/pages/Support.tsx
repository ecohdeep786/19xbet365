import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, CheckCircle2, Clock3, MessageSquare, Plus, Send, ShieldCheck, Ticket
} from "lucide-react";
import { api, isOfflineError } from "../lib/api";
import { demoMessages, demoTickets } from "../lib/demo";
import type { SupportMessage, SupportTicket } from "../types";
import { useAuth } from "../state/AuthContext";
import { useToast } from "../state/ToastContext";
import { Badge, Button, EmptyState, Field, Input, Segmented, Select, Skeleton, Textarea } from "../components/UI";
import { classNames, dateTime, relative } from "../lib/format";

const CATEGORIES = [
  { value: "general", label: "General question" },
  { value: "account", label: "Account & profile" },
  { value: "games", label: "Games & rounds" },
  { value: "sports", label: "Sportsbook" },
  { value: "responsible", label: "Responsible gaming" },
  { value: "security", label: "Security" }
];

export function SupportPage() {
  const { user, offline } = useAuth();
  const { push } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState({ subject: "", category: "general", body: "" });
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"tickets" | "new">("tickets");

  const loadTickets = async () => {
    setLoading(true);
    try {
      if (offline) { setTickets(demoTickets); setLoading(false); return; }
      const data = await api.supportTickets();
      setTickets(data.tickets);
      if (!selectedId && data.tickets[0]) setSelectedId(data.tickets[0].id);
    } catch (err) {
      if (isOfflineError(err)) setTickets(demoTickets);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadTickets(); }, [offline]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    (async () => {
      setMessagesLoading(true);
      try {
        if (offline) { setMessages(demoMessages); return; }
        const data = await api.supportTicket(selectedId);
        setMessages(data.messages);
      } catch (err) {
        if (isOfflineError(err)) setMessages(demoMessages);
      } finally { setMessagesLoading(false); }
    })();
  }, [selectedId, offline]);

  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (offline) {
        const ticket: SupportTicket = { id: `demo-${Date.now()}`, account_id: user?.id || "demo", subject: composer.subject, category: composer.category, priority: "normal", status: "open", assigned_to: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message_count: 1 };
        setTickets((current) => [ticket, ...current]);
        setSelectedId(ticket.id);
        setMessages([{ id: `m-${Date.now()}`, body: composer.body, is_internal: false, created_at: new Date().toISOString(), sender_id: user?.id || null, sender_name: user?.displayName || "You" }]);
        setComposer({ subject: "", category: "general", body: "" });
        setTab("tickets");
        push("Browser preview: ticket created.", "success");
        return;
      }
      const data = await api.createTicket(composer);
      push(data.message, "success", "Ticket opened");
      setComposer({ subject: "", category: "general", body: "" });
      setTab("tickets");
      await loadTickets();
      setSelectedId(data.ticket.id);
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not open a ticket.", "error");
    } finally { setBusy(false); }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    try {
      if (offline) {
        setMessages((current) => [...current, { id: `m-${Date.now()}`, body: reply, is_internal: false, created_at: new Date().toISOString(), sender_id: user?.id || null, sender_name: user?.displayName || "You" }]);
        setReply("");
        push("Browser preview: reply added.", "success");
        return;
      }
      await api.replyTicket(selectedId, reply);
      setReply("");
      const data = await api.supportTicket(selectedId);
      setMessages(data.messages);
      push("Reply sent.", "success");
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not send the reply.", "error");
    } finally { setBusy(false); }
  };

  const selected = tickets.find((ticket) => ticket.id === selectedId);

  return (
    <div className="support-page">
      <div className="page-hero compact-hero support-hero">
        <div className="page-shell page-hero-inner">
          <div>
            <span className="eyebrow">19X support</span>
            <h1>Real help, from real people.</h1>
            <p>Account questions, game records, responsible-play controls, and platform issues. Open a ticket and follow the conversation here.</p>
            <div className="support-hero-links">
              <Link to="/help" className="btn btn-secondary btn-sm"><BookOpen size={15} /> Browse help centre</Link>
              <span><ShieldCheck size={15} /> Staff actions are audited</span>
            </div>
          </div>
          <div className="support-response"><strong>Under 2h</strong><span>typical first response</span><small>During platform operations hours</small></div>
        </div>
      </div>
      <div className="page-shell support-shell">
        <div className="support-layout">
          <aside className="support-list panel">
            <div className="panel-head"><span><Ticket size={15} /> My tickets</span><Badge tone="outline">{tickets.length}</Badge></div>
            <Segmented size="sm" value={tab} onChange={setTab} options={[{ value: "tickets", label: "Conversations" }, { value: "new", label: "New ticket" }]} />
            {tab === "tickets" ? (
              loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : !tickets.length ? <EmptyState icon={<MessageSquare size={22} />} title="No tickets yet" body="Open a ticket and our team will reply in this centre." /> : (
                <div className="ticket-list">
                  {tickets.map((ticket) => (
                    <button key={ticket.id} className={classNames("ticket-item", selectedId === ticket.id && "active")} onClick={() => setSelectedId(ticket.id)}>
                      <div><strong>{ticket.subject}</strong><span>{ticket.category} · {relative(ticket.updated_at)}</span></div>
                      <Badge tone={ticket.status === "open" ? "lime" : ticket.status === "pending" ? "amber" : "outline"}>{ticket.status}</Badge>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <form className="ticket-form" onSubmit={createTicket}>
                <Field label="Subject" required><Input value={composer.subject} onChange={(event) => setComposer({ ...composer, subject: event.target.value })} placeholder="Short summary" minLength={4} required /></Field>
                <Field label="Category"><Select value={composer.category} onChange={(event) => setComposer({ ...composer, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</Select></Field>
                <Field label="Message" required><Textarea rows={6} value={composer.body} onChange={(event) => setComposer({ ...composer, body: event.target.value })} placeholder="Tell us what happened and include any round or bet reference." minLength={10} required /></Field>
                <Button variant="lime" loading={busy} type="submit"><Plus size={15} /> Open ticket</Button>
                <p className="form-note">Never share your password. Support will never ask for it.</p>
              </form>
            )}
          </aside>
          <section className="support-thread panel">
            {!selectedId ? (
              <EmptyState icon={<MessageSquare size={22} />} title="Choose a conversation" body="Select a ticket to read the conversation, or open a new ticket with the button above." />
            ) : (
              <>
                <div className="thread-head">
                  <div><span className="eyebrow">{selected?.category || "support"}</span><h2>{selected?.subject || "Support ticket"}</h2><span><Clock3 size={13} /> Opened {dateTime(selected?.created_at)}</span></div>
                  <Badge tone={selected?.status === "open" ? "lime" : "outline"}>{selected?.status || "open"}</Badge>
                </div>
                <div className="thread-messages">
                  {messagesLoading ? <Skeleton className="sk-line" /> : messages.length === 0 ? <EmptyState title="No messages yet" body="Write the first message below." /> : messages.map((message) => (
                    <div className={classNames("thread-message", message.sender_id === user?.id ? "mine" : "theirs")} key={message.id}>
                      <div className="thread-message-meta"><strong>{message.sender_name || "Support"}</strong><span>{dateTime(message.created_at)}</span></div>
                      <p>{message.body}</p>
                      {message.is_internal && <Badge tone="amber">Internal note</Badge>}
                    </div>
                  ))}
                </div>
                <form className="thread-reply" onSubmit={sendReply}>
                  <Textarea rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply to the support team…" />
                  <div><span><ShieldCheck size={13} /> Do not include passwords or full payment details.</span><Button variant="lime" size="sm" loading={busy} type="submit" disabled={!reply.trim()}><Send size={15} /> Send reply</Button></div>
                </form>
              </>
            )}
          </section>
        </div>
        <div className="support-help-strip">
          <div className="panel support-help-card"><BookOpen size={20} /><div><strong>Self-service answers</strong><span>Getting started, coins, providers, responsible play, and account security.</span></div><Link to="/help" className="text-btn">Help centre <ArrowRight size={13} /></Link></div>
          <div className="panel support-help-card"><CheckCircle2 size={20} /><div><strong>Game record checks</strong><span>Every settled round has a reference. Include it in your ticket for a faster review.</span></div><Link to="/account/activity" className="text-btn">My activity <ArrowRight size={13} /></Link></div>
        </div>
      </div>
    </div>
  );
}

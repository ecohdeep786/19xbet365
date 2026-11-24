import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Filter, LockKeyhole, RefreshCcw, ScrollText, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { AuditEvent } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Input, Select, Skeleton } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, dateTime, number, relative } from "../../lib/format";

export function AdminAuditPage() {
  const { push } = useToast();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [chain, setChain] = useState<{ checked: number; broken: number; intact: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [appliedAction, setAppliedAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.adminAudit(page, 25, appliedAction);
      setEvents(data.events); setChain(data.chain); setPages(data.pages); setTotal(data.total); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load the audit trail."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, appliedAction]);

  const exportCsv = () => {
    const header = ["id", "created_at", "actor", "role", "action", "entity_type", "entity_id", "summary", "event_hash"];
    const rows = events.map((event) => [event.id, event.created_at, event.actor_name || "", event.actor_role || "", event.action, event.entity_type, event.entity_id || "", event.summary, event.event_hash]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "astra-audit-events.csv"; link.click(); URL.revokeObjectURL(url);
    push("Audit page exported as CSV.", "success");
  };

  return (
    <div className="admin-page">
      <AdminHeader kicker="Governance" title="Audit trail" body="An append-only, hash-chained record of privileged actions. Records cannot be edited or deleted through the API or the database." actions={<><AdminScopePill /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button><Button variant="lime" size="sm" icon={<Download size={15} />} onClick={exportCsv} disabled={!events.length}>Export page</Button></>} />
      <div className="audit-integrity-banner">
        <span className={classNames("integrity-orb", chain?.intact ? "ok" : "bad")}><ShieldCheck size={22} /></span>
        <div><strong>{chain?.intact ? "Chain intact" : "Chain check failed"}</strong><span>{chain ? `${chain.checked} recent records verified · ${chain.broken} broken links` : "Verifying…"} · Append-only at the storage layer</span></div>
        <Badge tone={chain?.intact ? "lime" : "coral"}>{chain?.intact ? "VERIFIED" : "INVESTIGATE"}</Badge>
      </div>
      <div className="panel audit-panel">
        <div className="audit-toolbar">
          <div className="panel-head"><span><ScrollText size={15} /> Events</span><span className="panel-note">{number(total)} in scope</span></div>
          <form className="audit-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedAction(action); }}>
            <div className="admin-search"><Filter size={14} /><Input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter by action (e.g. account.suspended)" aria-label="Filter audit action" /></div>
            <Button variant="secondary" size="sm" type="submit">Apply</Button>
            {appliedAction && <button type="button" className="text-btn" onClick={() => { setAction(""); setAppliedAction(""); setPage(1); }}>Clear</button>}
          </form>
        </div>
        {loading ? <div className="table-loading">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="sk-line" />)}</div> : error ? <ErrorState message={error} onRetry={load} /> : !events.length ? <EmptyState icon={<ScrollText size={22} />} title="No audit events match" body="Clear the filter or broaden your scope." /> : (
          <>
            <div className="data-table-wrap">
              <table className="data-table audit-table">
                <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th><th>Hash</th><th /></tr></thead>
                <tbody>
                  {events.map((event) => (
                    <FragmentRow key={event.id} event={event} expanded={expanded === event.id} onToggle={() => setExpanded(expanded === event.id ? null : event.id)} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination"><span>Page {page} of {pages}</span><div><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={14} /> Previous</Button><Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next <ArrowRight size={14} /></Button></div></div>
          </>
        )}
      </div>
      <div className="admin-fineprint"><LockKeyhole size={14} /> Audit records are protected by a database trigger that rejects UPDATE and DELETE. Do not attempt to modify or remove entries.</div>
    </div>
  );
}

function FragmentRow({ event, expanded, onToggle }: { event: AuditEvent; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={expanded ? "expanded" : ""}>
        <td className="muted-cell"><strong>{dateTime(event.created_at)}</strong><span className="row-sub">{relative(event.created_at)}</span></td>
        <td><strong>{event.actor_name || "System"}</strong><span className="row-sub">{event.actor_role || "system"}</span></td>
        <td><span className="audit-action">{event.action}</span></td>
        <td><span className="row-sub">{event.entity_type}</span><code className="entity-id">{event.entity_id ? String(event.entity_id).slice(0, 8) : "—"}</code></td>
        <td><span className="audit-summary">{event.summary}</span></td>
        <td><code className="hash-chip">{event.event_hash.slice(0, 10)}</code></td>
        <td><button className="text-btn" onClick={onToggle}>{expanded ? "Hide" : "View"}</button></td>
      </tr>
      {expanded && (
        <tr className="audit-detail-row"><td colSpan={7}>
          <div className="audit-detail">
            <div><span>Event hash</span><code>{event.event_hash}</code></div>
            <div><span>Previous hash</span><code>{event.prev_hash || "GENESIS"}</code></div>
            <div><span>IP</span><code>{event.ip || "not recorded"}</code></div>
            <div><span>Before</span><pre>{JSON.stringify(event.before, null, 2) || "null"}</pre></div>
            <div><span>After</span><pre>{JSON.stringify(event.after, null, 2) || "null"}</pre></div>
          </div>
        </td></tr>
      )}
    </>
  );
}

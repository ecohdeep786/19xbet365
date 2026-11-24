import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Database, HardDrive, HeartPulse, RefreshCcw, Server, ShieldCheck, Wifi, XCircle, Zap } from "lucide-react";
import { api } from "../../lib/api";
import type { SystemHealth } from "../../types";
import { Badge, Button, ErrorState, Skeleton, Stat } from "../../components/UI";
import { AdminHeader } from "./AdminLayout";
import { classNames, number } from "../../lib/format";

export function AdminSystemPage() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try { setData(await api.adminSystem()); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load system health."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="admin-page"><Skeleton className="sk-title" /><div className="admin-stat-grid">{Array.from({ length: 4 }).map((_, index) => <div className="stat" key={index}><Skeleton className="sk-line" /></div>)}</div></div>;
  if (error || !data) return <ErrorState message={error || "No health data."} onRetry={load} />;

  const uptime = `${Math.floor(data.uptimeSeconds / 3600)}h ${Math.floor((data.uptimeSeconds % 3600) / 60)}m`;
  const memoryPercent = Math.round((data.memory.heapUsed / data.memory.heapTotal) * 100);

  return (
    <div className="admin-page">
      <AdminHeader kicker="Reliability" title="System health" body="Live checks from the API process, PostgreSQL, the game engine, and the realtime channel." actions={<><Badge tone="lime"><CheckCircle2 size={12} /> {data.status}</Badge><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Run checks</Button></>} />
      <div className="health-hero">
        <div className="health-orb"><HeartPulse size={32} /></div>
        <div><span className="eyebrow">Platform status</span><h2>All core systems operational.</h2><p>Version {data.version} · {data.environment} · uptime {uptime} · PostgreSQL query {data.db.queryLatencyMs} ms</p></div>
        <div className="health-meta"><Badge tone="lime">Audit chain intact</Badge><span>Real-money rails: disabled</span></div>
      </div>
      <div className="admin-stat-grid compact-stats">
        <Stat label="Database" value={data.db.db} hint={`${data.db.latencyMs} ms latency · ${data.db.size}`} tone="cyan" icon={<Database size={16} />} />
        <Stat label="API uptime" value={uptime} hint={`${data.environment} environment`} tone="lime" icon={<Server size={16} />} />
        <Stat label="Heap used" value={`${memoryPercent}%`} hint={`${(data.memory.heapUsed / 1024 / 1024).toFixed(1)} MB of ${(data.memory.heapTotal / 1024 / 1024).toFixed(1)} MB`} icon={<HardDrive size={16} />} />
        <Stat label="Audit records" value={`${number(data.auditChain.checked)} checked`} hint={data.auditChain.intact ? "No broken links" : "Investigation required"} tone={data.auditChain.intact ? "lime" : "coral"} icon={<ShieldCheck size={16} />} />
      </div>
      <div className="system-grid">
        <section className="panel">
          <div className="panel-head"><span><Activity size={15} /> Services</span><Badge tone="outline">Live</Badge></div>
          <div className="service-list">{data.services.map((service) => <div className="service-row" key={service.name}><span className={classNames("service-status", service.status)}>{service.status === "operational" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}</span><div><strong>{service.name}</strong><span>{service.detail}</span></div><Badge tone={service.status === "operational" ? "lime" : service.status === "disabled" ? "coral" : "amber"}>{service.status.replace("_", " ")}</Badge></div>)}</div>
        </section>
        <section className="panel">
          <div className="panel-head"><span><Database size={15} /> Data counts</span><Badge tone="outline">PostgreSQL</Badge></div>
          <div className="count-grid">{Object.entries(data.counts).map(([key, value]) => <div key={key}><span>{key.replace(/_/g, " ")}</span><strong>{number(value)}</strong></div>)}</div>
          <div className="integration-row"><span><Wifi size={15} /> Provider integrations</span>{data.integrations.map((item) => <Badge key={item.status} tone={item.status === "playable_demo" ? "lime" : "outline"}>{item.status.replace("_", " ")}: {item.count}</Badge>)}</div>
        </section>
        <section className="panel">
          <div className="panel-head"><span><ShieldCheck size={15} /> Compliance posture</span><Badge tone="coral">Real money disabled</Badge></div>
          <div className="compliance-list">
            <div><span>Real-money deposits</span><strong className="coral-text">Disabled</strong></div>
            <div><span>Withdrawals</span><strong className="coral-text">Disabled</strong></div>
            <div><span>Cash redemption</span><strong className="coral-text">Disabled</strong></div>
            <div><span>Provider sessions</span><strong className="amber-text">Not configured</strong></div>
            <div><span>Coins</span><strong className="lime-text">Enabled</strong></div>
            <div><span>Audit immutability</span><strong className="lime-text">Trigger active</strong></div>
          </div>
          <div className="compliance-note"><Zap size={14} /> Enabling financial rails requires licensing, payment partners, KYC/AML controls, and independent review.</div>
        </section>
      </div>
      <div className="admin-fineprint"><ShieldCheck size={14} /> Health checks are read-only. No configuration can enable real-money wagering in this foundation.</div>
    </div>
  );
}

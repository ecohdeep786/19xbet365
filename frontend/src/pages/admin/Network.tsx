import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ChevronDown, ChevronRight, Coins, Network, RefreshCcw, Search,
  ShieldCheck, UserRound, Users
} from "lucide-react";
import { api } from "../../lib/api";
import type { NetworkNode } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { Avatar, Badge, Button, EmptyState, ErrorState, Input, Skeleton, Stat } from "../../components/UI";
import { AdminHeader, AdminScopePill } from "./AdminLayout";
import { classNames, number, vc } from "../../lib/format";

export function AdminNetworkPage() {
  const { isMaster } = useAuth();
  const [roots, setRoots] = useState<NetworkNode[]>([]);
  const [summary, setSummary] = useState<{ total: number; balance: number; suspended: number; roles: Record<string, number> } | null>(null);
  const [scope, setScope] = useState<{ global: boolean; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.adminNetwork();
      setRoots(data.roots); setSummary(data.summary); setScope(data.scope); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load the network."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filteredRoots = useMemo(() => {
    if (!query.trim()) return roots;
    const q = query.toLowerCase();
    const filterNode = (node: NetworkNode): NetworkNode | null => {
      const children = node.children.map(filterNode).filter(Boolean) as NetworkNode[];
      const self = [node.displayName, node.email, node.username, node.role, node.referralCode].some((value) => value.toLowerCase().includes(q));
      return self || children.length ? { ...node, children } : null;
    };
    return roots.map(filterNode).filter(Boolean) as NetworkNode[];
  }, [roots, query]);

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="admin-page">
      <AdminHeader kicker="Network" title="Hierarchy & delegation" body="Authoritative parent-child relationships from PostgreSQL. Scope is enforced server-side on every request." actions={<><AdminScopePill label={scope?.label || "Loading scope"} /><Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button></>} />
      <div className="admin-stat-grid compact-stats">
        <Stat label="Accounts in scope" value={number(summary?.total || 0)} hint={`${summary?.roles.player || 0} players`} tone="cyan" icon={<Users size={16} />} />
        <Stat label="Virtual balance" value={vc(summary?.balance || 0, { compact: true })} hint="Held across scoped wallets" tone="lime" icon={<Coins size={16} />} />
        <Stat label="Suspended" value={number(summary?.suspended || 0)} hint="Requires review" tone="coral" icon={<UserRound size={16} />} />
        <Stat label="Max depth" value="5 levels" hint="Master → Admin → Sub-admin → Agent → Player" icon={<Network size={16} />} />
      </div>

      <div className="network-layout">
        <section className="panel network-panel">
          <div className="network-toolbar">
            <div className="sports-search"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, role or referral code" aria-label="Search network" /></div>
            <div className="network-legend"><span><i className="legend-dot master" /> Master</span><span><i className="legend-dot admin" /> Admin</span><span><i className="legend-dot sub" /> Sub-admin</span><span><i className="legend-dot agent" /> Agent</span><span><i className="legend-dot player" /> Player</span></div>
          </div>
          {loading ? <div className="tree-loading">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="sk-tree-row" />)}</div> : error ? <ErrorState message={error} onRetry={load} /> : !filteredRoots.length ? <EmptyState icon={<Network size={22} />} title="No matching accounts" body="Try a different search. Your scope is determined by the parent_id chain, not by client input." /> : (
            <div className="network-tree">
              {filteredRoots.map((root) => <TreeNode key={root.id} node={root} depth={0} collapsed={collapsed} onToggle={toggle} />)}
            </div>
          )}
        </section>
        <aside className="network-rail">
          <div className="panel network-rule-card">
            <span className="eyebrow"><ShieldCheck size={13} /> Scope rules</span>
            <h3>Delegation, not escalation.</h3>
            <ul>
              <li>Master Admin sees the entire network.</li>
              <li>Admins see their own branch only.</li>
              <li>Sub-admins and agents inherit a narrower descendant scope.</li>
              <li>Players never see the control room.</li>
              <li>Referrals create player links only — never staff rights.</li>
            </ul>
          </div>
          <div className="panel network-rule-card">
            <span className="eyebrow">Branch controls</span>
            <h3>Move accounts with approval</h3>
            <p>Transfers are request-and-approve. An approved transfer updates the parent relationship and writes an audit event.</p>
            <Link to="/admin/transfers" className="btn btn-secondary btn-sm">Review transfers <ArrowRight size={14} /></Link>
          </div>
          {isMaster && <div className="panel network-rule-card master-protection"><ShieldCheck size={20} /><div><strong>Master Admin is protected</strong><p>This account cannot be suspended, demoted, or removed through the API.</p></div></div>}
        </aside>
      </div>
    </div>
  );
}

function TreeNode({ node, depth, collapsed, onToggle }: { node: NetworkNode; depth: number; collapsed: Set<string>; onToggle: (id: string) => void }) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  return (
    <div className={classNames("tree-node", `depth-${Math.min(depth, 4)}`)}>
      <div className="tree-row">
        <button className={classNames("tree-toggle", !hasChildren && "empty")} onClick={() => hasChildren && onToggle(node.id)} aria-label={isCollapsed ? "Expand children" : "Collapse children"}>
          {hasChildren ? (isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />) : <span className="tree-leaf" />}
        </button>
        <div className={classNames("tree-card", `role-${node.role}`)}>
          <Avatar name={node.displayName} seed={node.avatarSeed} size={34} />
          <div className="tree-copy">
            <strong>{node.displayName} {node.role === "master_admin" && <Badge tone="lime">MASTER</Badge>}</strong>
            <span>{node.email}</span>
          </div>
          <div className="tree-meta"><Badge tone={node.role === "player" ? "outline" : "cyan"}>{node.roleName}</Badge><span>{number(node.children.length)} direct</span><strong>{vc(node.balance, { compact: true })}</strong><span className={classNames("status-pill", node.status)}>{node.status}</span></div>
          <Link to={`/admin/accounts?query=${encodeURIComponent(node.email)}`} className="tree-open" aria-label={`Open ${node.displayName}`}><ArrowRight size={14} /></Link>
        </div>
      </div>
      {hasChildren && !isCollapsed && <div className="tree-children">{node.children.map((child) => <TreeNode key={child.id} node={child} depth={depth + 1} collapsed={collapsed} onToggle={onToggle} />)}</div>}
    </div>
  );
}

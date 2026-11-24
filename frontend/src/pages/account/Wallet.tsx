import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Coins, Download, Info, ShieldCheck, WalletCards } from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import { demoTransactions } from "../../lib/demo";
import type { Transaction } from "../../types";
import { useAuth } from "../../state/AuthContext";
import { Badge, Button, EmptyState, ErrorState, Segmented, Skeleton } from "../../components/UI";
import { classNames, dateTime, vc } from "../../lib/format";

const TYPE_LABELS: Record<string, string> = {
  welcome_bonus: "Welcome allocation",
  promo_credit: "Promotion credit",
  game_stake: "Game stake",
  game_win: "Game win",
  bet_stake: "Bet stake",
  bet_win: "Bet return",
  bet_refund: "Bet refund",
  admin_credit: "Adjustment credit",
  admin_debit: "Adjustment debit",
  referral_reward: "Referral reward",
  bonus_expiry: "Bonus expiry"
};

const FILTERS = [
  { value: "all", label: "All activity" },
  { value: "game", label: "Game rounds" },
  { value: "sports", label: "Sports bets" },
  { value: "bonus", label: "Bonuses" },
  { value: "adjustment", label: "Adjustments" }
];

export function AccountWallet() {
  const { user, offline } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextPage = 0, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      if (offline) {
        const filtered = filter === "all" ? demoTransactions : demoTransactions.filter((txn) => {
          if (filter === "game") return txn.type.startsWith("game_");
          if (filter === "sports") return txn.type.startsWith("bet_");
          if (filter === "bonus") return ["welcome_bonus", "promo_credit", "referral_reward"].includes(txn.type);
          return txn.type.startsWith("admin_");
        });
        setTransactions(append ? [...transactions, ...filtered] : filtered);
        setTotal(filtered.length);
        setError(null);
        return;
      }
      const data = await api.transactions(25, nextPage * 25);
      setTransactions(append ? [...transactions, ...data.transactions] : data.transactions);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      if (isOfflineError(err)) {
        setTransactions(demoTransactions);
        setTotal(demoTransactions.length);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Could not load wallet activity.");
      }
    } finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { setPage(0); load(0); }, [filter]);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    return transactions.filter((txn) => {
      if (filter === "game") return txn.type.startsWith("game_");
      if (filter === "sports") return txn.type.startsWith("bet_");
      if (filter === "bonus") return ["welcome_bonus", "promo_credit", "referral_reward"].includes(txn.type);
      if (filter === "adjustment") return txn.type.startsWith("admin_");
      return true;
    });
  }, [transactions, filter]);

  const credited = filtered.filter((txn) => txn.amount > 0).reduce((sum, txn) => sum + txn.amount, 0);
  const debited = filtered.filter((txn) => txn.amount < 0).reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Wallet</span>
        <h2>Virtual-credit wallet</h2>
        <p>A complete ledger of allocations, stakes, wins, and platform adjustments. All values are non-redeemable virtual credits.</p>
      </div>

      <div className="wallet-hero panel">
        <div className="wallet-balance">
          <span>Available balance</span>
          <strong>{vc(user?.balance || 0)}</strong>
          <small><ShieldCheck size={13} /> No cash value · no withdrawals</small>
        </div>
        <div className="wallet-actions">
          <Button variant="secondary" disabled icon={<Download size={16} />}>Deposit</Button>
          <Button variant="secondary" disabled icon={<ArrowUpRight size={16} />}>Withdraw</Button>
          <div className="wallet-disabled-note"><Info size={14} /><span>Real-money rails are disabled pending licensing. Virtual credits are allocated by the platform and cannot be purchased.</span></div>
        </div>
      </div>

      <div className="wallet-summary">
        <div><span><ArrowDownLeft size={15} /> Credits in</span><strong className="lime-text">{vc(credited)}</strong></div>
        <div><span><ArrowUpRight size={15} /> Credits out</span><strong>{vc(debited)}</strong></div>
        <div><span><WalletCards size={15} /> Entries loaded</span><strong>{filtered.length} / {total}</strong></div>
      </div>

      <div className="panel wallet-panel">
        <div className="wallet-toolbar">
          <div className="panel-head"><span><Coins size={15} /> Transaction ledger</span><Badge tone="outline">Server recorded</Badge></div>
          <Segmented size="sm" value={filter} onChange={setFilter} options={FILTERS} />
        </div>
        {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={() => load(0)} /> : filtered.length === 0 ? (
          <EmptyState icon={<WalletCards size={22} />} title="No transactions in this view" body="Try another filter. Your welcome allocation and game settlements will appear here." />
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Type</th><th className="num">Amount</th><th className="num">Balance after</th></tr></thead>
                <tbody>
                  {filtered.map((txn) => (
                    <tr key={txn.id}>
                      <td className="muted-cell">{dateTime(txn.created_at)}</td>
                      <td><strong>{txn.description}</strong><span className="row-sub">{txn.reference_type || "wallet"}</span></td>
                      <td><span className={classNames("type-chip", txn.type)}>{TYPE_LABELS[txn.type] || txn.type}</span></td>
                      <td className={classNames("num amount", txn.amount > 0 ? "positive" : "negative")}>{txn.amount > 0 ? "+" : ""}{vc(txn.amount)}</td>
                      <td className="num">{vc(txn.balance_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length < total && filter === "all" && (
              <div className="table-more"><Button variant="secondary" size="sm" loading={loadingMore} onClick={() => { const next = page + 1; setPage(next); load(next, true); }}>Load more</Button></div>
            )}
          </>
        )}
      </div>
      <div className="account-fineprint"><ShieldCheck size={14} /> Ledger entries are append-only. Settled game rounds cannot be edited or deleted by staff.</div>
    </div>
  );
}

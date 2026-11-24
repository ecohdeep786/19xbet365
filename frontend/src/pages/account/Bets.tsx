import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, ReceiptText, Ticket, Trophy, XCircle } from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import { demoBets } from "../../lib/demo";
import type { Bet } from "../../types";
import { Badge, EmptyState, ErrorState, Segmented, Skeleton } from "../../components/UI";
import { classNames, dateTime, vc } from "../../lib/format";

const TABS = [
  { value: "all", label: "All bets" },
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" }
];

export function AccountBets() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.bets();
      setBets(data.bets);
      setError(null);
    } catch (err) {
      if (isOfflineError(err)) { setBets(demoBets); setError(null); }
      else setError(err instanceof Error ? err.message : "Could not load your bets.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => tab === "all" ? bets : bets.filter((bet) => bet.status === tab), [bets, tab]);
  const open = bets.filter((bet) => bet.status === "open");
  const won = bets.filter((bet) => bet.status === "won");
  const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalReturn = bets.reduce((sum, bet) => sum + bet.payout, 0);

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Sportsbook</span>
        <h2>My bets</h2>
        <p>Every virtual-credit sports bet you place is recorded here with its selections, odds, and settlement state.</p>
      </div>
      <div className="bet-summary-grid">
        <div className="panel summary-tile"><span><Ticket size={15} /> Open bets</span><strong>{open.length}</strong><small>Awaiting fixture settlement</small></div>
        <div className="panel summary-tile"><span><Trophy size={15} /> Won bets</span><strong>{won.length}</strong><small>{vc(totalReturn, { compact: true })} returned</small></div>
        <div className="panel summary-tile"><span><ReceiptText size={15} /> Total staked</span><strong>{vc(totalStake, { compact: true })}</strong><small>{bets.length} lifetime bets</small></div>
      </div>
      <div className="panel bets-panel">
        <div className="bets-toolbar">
          <div className="panel-head"><span><Ticket size={15} /> Bet history</span><Badge tone="outline">Virtual credits</Badge></div>
          <Segmented size="sm" value={tab} onChange={setTab} options={TABS} />
        </div>
        {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={load} /> : filtered.length === 0 ? (
          <EmptyState icon={<Ticket size={22} />} title="No bets in this view" body="Build a slip from the sportsbook and place a virtual-credit bet. Singles and accumulators are supported." action={<Link to="/sports" className="btn btn-secondary btn-sm">Open sportsbook <ArrowRight size={15} /></Link>} />
        ) : (
          <div className="bet-list">
            {filtered.map((bet) => (
              <article className="bet-card" key={bet.id}>
                <div className="bet-card-head">
                  <div>
                    <span className={classNames("bet-status", bet.status)}>{bet.status === "open" ? <><Clock3 size={12} /> OPEN</> : bet.status === "won" ? <><Trophy size={12} /> WON</> : <><XCircle size={12} /> {bet.status.toUpperCase()}</>}</span>
                    <strong>{bet.type === "acca" ? `${bet.selections.length}-fold accumulator` : "Single bet"}</strong>
                    <span>{dateTime(bet.placed_at)}</span>
                  </div>
                  <div className="bet-head-numbers">
                    <span>Stake <strong>{vc(bet.stake)}</strong></span>
                    <span>Total odds <strong>{Number(bet.total_odds).toFixed(2)}</strong></span>
                    <span>{bet.status === "won" ? "Return" : "Potential return"} <strong className={bet.status === "won" ? "lime-text" : ""}>{vc(bet.status === "won" ? bet.payout : bet.potential_return)}</strong></span>
                  </div>
                </div>
                <div className="bet-selections">
                  {bet.selections.map((selection) => (
                    <div className="bet-selection" key={selection.id || `${selection.matchId}-${selection.selection}`}>
                      <div>
                        <span className="selection-league">{selection.league || selection.sport || "Demo fixture"}</span>
                        <strong>{selection.selectionLabel || `${selection.homeTeam} vs ${selection.awayTeam}`}</strong>
                        <span className="selection-match">{selection.homeTeam && selection.awayTeam ? `${selection.homeTeam} vs ${selection.awayTeam}` : selection.matchId}</span>
                      </div>
                      <div className="selection-side">
                        <span className={classNames("slip-pick", selection.selection)}>{selection.selection === "home" ? "1" : selection.selection === "draw" ? "X" : "2"}</span>
                        <strong>{Number(selection.odds).toFixed(2)}</strong>
                        {selection.result && <em className={`selection-result ${selection.result}`}>{selection.result}</em>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bet-card-foot">
                  <span>{bet.status === "open" ? "Settlement will be applied when the demo fixture is resolved. No real-money settlement is involved." : bet.status === "won" ? `Paid ${vc(bet.payout)} to your virtual wallet.` : "This virtual bet returned no credits."}</span>
                  <span className="bet-id">Ref {bet.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="account-fineprint">All fixtures and prices are illustrative demo data. No real-money wagering is offered.</div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { ArrowRight, Coins, Gift, Share2, ShieldCheck, Users } from "lucide-react";
import { api, isOfflineError } from "../../lib/api";
import { useAuth } from "../../state/AuthContext";
import { useToast } from "../../state/ToastContext";
import { Badge, CopyButton, EmptyState, Skeleton } from "../../components/UI";
import { dateShort } from "../../lib/format";

interface Referral { id: string; status: string; created_at: string; display_name: string; joined_at: string }

export function AccountReferrals() {
  const { user, offline } = useAuth();
  const { push } = useToast();
  const [code, setCode] = useState(user?.referralCode || "19X-DEMO");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (offline) {
          setReferrals([{ id: "r1", status: "rewarded", created_at: new Date(Date.now() - 86400000).toISOString(), display_name: "Theo M.", joined_at: new Date(Date.now() - 86400000).toISOString() }]);
          return;
        }
        const data = await api.referrals();
        setCode(data.code);
        setReferrals(data.referrals);
      } catch (err) {
        if (isOfflineError(err)) setReferrals([{ id: "r1", status: "rewarded", created_at: new Date().toISOString(), display_name: "Theo M.", joined_at: new Date().toISOString() }]);
      } finally { setLoading(false); }
    })();
  }, [offline]);

  const shareLink = `${window.location.origin}${window.location.pathname}#/register?ref=${code}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Join 19xbet365", text: "Try 19xbet365 with virtual credits.", url: shareLink });
      else { await navigator.clipboard.writeText(shareLink); push("Referral link copied.", "success"); }
    } catch { /* dismissed */ }
  };

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Community</span>
        <h2>Referrals</h2>
        <p>Invite friends into the 19X lobby. Referral rewards are virtual credits and never grant administrative access.</p>
      </div>
      <div className="referral-hero panel">
        <div className="referral-copy">
          <span className="eyebrow"><Gift size={13} /> Invite & earn virtual credits</span>
          <h3>Your referral code</h3>
          <div className="referral-code"><strong>{code}</strong><CopyButton value={code} label="Copy code" /></div>
          <p>Both players receive a virtual-credit boost after the referred player completes their first round. No cash value or commission is paid.</p>
          <div className="referral-actions"><button className="btn btn-lime btn-sm" onClick={share}><Share2 size={15} /> Share invite</button><CopyButton value={shareLink} label="Copy link" /></div>
        </div>
        <div className="referral-orbit"><Users size={42} /><span>{referrals.length}</span><small>invited</small></div>
      </div>
      <div className="stat-grid referral-stats">
        <div className="stat"><div className="stat-top"><span>Total invited</span><Users size={15} /></div><strong>{referrals.length}</strong><small>Players who joined with your code</small></div>
        <div className="stat stat-lime"><div className="stat-top"><span>Rewarded</span><Coins size={15} /></div><strong>{referrals.filter((item) => item.status === "rewarded").length}</strong><small>Completed first round</small></div>
        <div className="stat stat-cyan"><div className="stat-top"><span>Pending</span><Gift size={15} /></div><strong>{referrals.filter((item) => item.status === "pending").length}</strong><small>Awaiting qualifying play</small></div>
      </div>
      <div className="panel referrals-panel">
        <div className="panel-head"><span><Users size={15} /> Referred players</span><Badge tone="outline">No admin rights</Badge></div>
        {loading ? <div className="table-loading"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : referrals.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="No referrals yet" body="Share your code or link. When a friend joins and completes a round, the virtual-credit reward appears here." />
        ) : (
          <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Player</th><th>Joined</th><th>Status</th><th>Reward</th></tr></thead><tbody>
            {referrals.map((referral) => <tr key={referral.id}><td><strong>{referral.display_name}</strong></td><td className="muted-cell">{dateShort(referral.joined_at || referral.created_at)}</td><td><Badge tone={referral.status === "rewarded" ? "lime" : "outline"}>{referral.status}</Badge></td><td>{referral.status === "rewarded" ? "1,000 VC" : "Pending"}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
      <div className="referral-rules panel">
        <ShieldCheck size={19} />
        <div><strong>Referrals are not a route to admin access.</strong><p>A referral only creates a normal player relationship. It does not grant network visibility, credit controls, staff permissions, or any ability to alter outcomes. Suspicious invitation activity is reviewed in the audit trail.</p></div>
        <ArrowRight size={18} />
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Gift, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { useData } from "../../state/DataContext";
import { Badge, Button, EmptyState, Segmented } from "../../components/UI";
import { classNames, dateTime } from "../../lib/format";

const ICONS = { promo: Gift, security: ShieldCheck, game: Sparkles, system: Bell, info: Bell };

export function AccountNotifications() {
  const { notifications, unreadCount, markNotificationRead, markAllRead, refreshNotifications } = useData();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((item) => !item.read_at);
    if (filter === "security") return notifications.filter((item) => item.type === "security");
    return notifications;
  }, [notifications, filter]);

  return (
    <div className="account-subpage">
      <div className="subpage-head">
        <span className="eyebrow">Inbox</span>
        <h2>Notifications</h2>
        <p>Security alerts, platform updates, and coin offers. Security messages are always delivered.</p>
      </div>
      <div className="panel notifications-panel">
        <div className="wallet-toolbar">
          <div className="panel-head"><span><Bell size={15} /> Notification centre</span><Badge tone={unreadCount ? "lime" : "outline"}>{unreadCount} unread</Badge></div>
          <div className="notification-actions">
            <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }, { value: "security", label: "Security" }]} />
            <Button variant="ghost" size="sm" icon={<CheckCheck size={15} />} disabled={!unreadCount} onClick={markAllRead}>Mark all read</Button>
            <button className="icon-btn" onClick={refreshNotifications} aria-label="Refresh notifications"><Trophy size={15} /></button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Bell size={22} />} title={filter === "unread" ? "You are all caught up" : "No notifications yet"} body="Platform announcements and security alerts will appear here." />
        ) : (
          <div className="notification-centre-list">
            {filtered.map((item) => {
              const Icon = ICONS[item.type] || Bell;
              return (
                <button
                  key={item.id}
                  className={classNames("notification-centre-row", !item.read_at && "unread")}
                  onClick={() => { markNotificationRead(item.id); if (item.link) navigate(item.link); }}
                >
                  <span className={classNames("notification-icon", `type-${item.type}`)}><Icon size={18} /></span>
                  <div className="notification-centre-copy">
                    <div><strong>{item.title}</strong>{!item.read_at && <span className="unread-dot" />}</div>
                    <p>{item.body}</p>
                    <small>{dateTime(item.created_at)} · {item.type}</small>
                  </div>
                  {item.link && <span className="notification-open">Open</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="account-fineprint"><ShieldCheck size={14} /> Security alerts cannot be disabled. Marketing preferences are managed in your profile.</div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { FileText, Gift, Pencil, RefreshCcw, Save, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import type { Promotion } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Segmented, Select, Skeleton, Textarea } from "../../components/UI";
import { AdminHeader } from "./AdminLayout";
import { dateShort } from "../../lib/format";

interface PageRecord { slug: string; title: string; category: string; body: string; status: string; updated_at: string }

export function AdminContentPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<"pages" | "promotions">("pages");
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<PageRecord | null>(null);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const data = await api.adminContent(); setPages(data.pages); setPromotions(data.promotions); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load content."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const savePage = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingPage) return;
    setBusy(true);
    try {
      const data = await api.adminUpdatePage(editingPage.slug, { title: editingPage.title, body: editingPage.body, status: editingPage.status });
      push(data.message, "success", "Content page saved");
      setEditingPage(null); load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not save the page.", "error"); }
    finally { setBusy(false); }
  };

  const savePromo = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingPromo) return;
    setBusy(true);
    try {
      const data = await api.adminUpdatePromotion(editingPromo.id, { title: editingPromo.title, description: editingPromo.description, badge: editingPromo.badge, active: editingPromo.active ?? true, cta: editingPromo.cta, terms: editingPromo.terms });
      push(data.message, "success", "Promotion saved");
      setEditingPromo(null); load();
    } catch (err) { push(err instanceof Error ? err.message : "Could not save the promotion.", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-page">
      <AdminHeader kicker="Content operations" title="Content & promotions" body="Edit public content pages and virtual-credit promotions. Every change records before/after state in the audit trail." actions={<Button variant="secondary" size="sm" icon={<RefreshCcw size={15} />} onClick={load}>Refresh</Button>} />
      <div className="content-tabs"><Segmented value={tab} onChange={setTab} options={[{ value: "pages", label: `Content pages (${pages.length})` }, { value: "promotions", label: `Promotions (${promotions.length})` }]} /></div>
      {loading ? <div className="panel"><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : error ? <ErrorState message={error} onRetry={load} /> : tab === "pages" ? (
        <div className="content-page-grid">
          {!pages.length && <EmptyState title="No content pages" />}
          {pages.map((page) => (
            <article className="panel content-page-card" key={page.slug}>
              <div className="content-page-head"><span className="content-icon"><FileText size={17} /></span><div><Badge tone="outline">{page.category}</Badge><h3>{page.title}</h3><span>/{page.slug} · updated {dateShort(page.updated_at)}</span></div><Badge tone={page.status === "published" ? "lime" : "amber"}>{page.status}</Badge></div>
              <p>{page.body.slice(0, 180)}…</p>
              <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setEditingPage(page)}>Edit page</Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="content-page-grid">
          {!promotions.length && <EmptyState title="No promotions" />}
          {promotions.map((promo) => (
            <article className={`panel content-page-card promo-admin-card promo-${promo.theme}`} key={promo.id}>
              <div className="content-page-head"><span className="content-icon"><Gift size={17} /></span><div><Badge tone="outline">{promo.kicker}</Badge><h3>{promo.title}</h3><span>{promo.prize || "Virtual-credit reward"}</span></div><Badge tone={promo.active === false ? "amber" : "lime"}>{promo.active === false ? "inactive" : "active"}</Badge></div>
              <p>{promo.description}</p>
              <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setEditingPromo(promo)}>Edit promotion</Button>
            </article>
          ))}
        </div>
      )}

      <Modal open={!!editingPage} onClose={() => setEditingPage(null)} title={editingPage ? `Edit ${editingPage.title}` : "Edit page"} wide footer={<><Button variant="secondary" onClick={() => setEditingPage(null)}>Cancel</Button><Button variant="lime" type="submit" form="page-edit-form" loading={busy} icon={<Save size={15} />}>Save page</Button></>}>
        {editingPage && (
          <form className="content-edit-form" id="page-edit-form" onSubmit={savePage}>
            <div className="form-two-col">
              <Field label="Title"><Input value={editingPage.title} onChange={(event) => setEditingPage({ ...editingPage, title: event.target.value })} /></Field>
              <Field label="Status"><Select value={editingPage.status} onChange={(event) => setEditingPage({ ...editingPage, status: event.target.value })}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></Select></Field>
            </div>
            <Field label="Body" hint="Separate paragraphs with a blank line."><Textarea rows={16} value={editingPage.body} onChange={(event) => setEditingPage({ ...editingPage, body: event.target.value })} /></Field>
            <div className="admin-fineprint"><ShieldCheck size={14} /> Edits are audited. Published pages appear immediately in the public help and legal routes.</div>
          </form>
        )}
      </Modal>

      <Modal open={!!editingPromo} onClose={() => setEditingPromo(null)} title={editingPromo ? `Edit ${editingPromo.title}` : "Edit promotion"} wide footer={<><Button variant="secondary" onClick={() => setEditingPromo(null)}>Cancel</Button><Button variant="lime" type="submit" form="promo-edit-form" loading={busy} icon={<Save size={15} />}>Save promotion</Button></>}>
        {editingPromo && (
          <form className="content-edit-form" id="promo-edit-form" onSubmit={savePromo}>
            <div className="form-two-col">
              <Field label="Title"><Input value={editingPromo.title} onChange={(event) => setEditingPromo({ ...editingPromo, title: event.target.value })} /></Field>
              <Field label="Badge"><Input value={editingPromo.badge || ""} onChange={(event) => setEditingPromo({ ...editingPromo, badge: event.target.value })} /></Field>
            </div>
            <Field label="Description"><Textarea rows={4} value={editingPromo.description} onChange={(event) => setEditingPromo({ ...editingPromo, description: event.target.value })} /></Field>
            <div className="form-two-col">
              <Field label="Call to action"><Input value={editingPromo.cta} onChange={(event) => setEditingPromo({ ...editingPromo, cta: event.target.value })} /></Field>
              <Field label="Active"><Select value={editingPromo.active === false ? "false" : "true"} onChange={(event) => setEditingPromo({ ...editingPromo, active: event.target.value === "true" })}><option value="true">Active</option><option value="false">Inactive</option></Select></Field>
            </div>
            <Field label="Terms"><Textarea rows={4} value={editingPromo.terms} onChange={(event) => setEditingPromo({ ...editingPromo, terms: event.target.value })} /></Field>
            <div className="admin-fineprint"><Sparkles size={14} /> Promotions award virtual credits only. No cash value or wagering requirement can be configured here.</div>
          </form>
        )}
      </Modal>
    </div>
  );
}

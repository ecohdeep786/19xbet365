import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, HeartHandshake, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { api, isOfflineError } from "../lib/api";
import { CONTENT, getStaticContent, type ContentPage } from "../lib/content";
import { Badge, Skeleton } from "../components/UI";
import { classNames, dateShort } from "../lib/format";

const NAV = [
  { slug: "about", label: "About 19X" },
  { slug: "terms", label: "Terms & conditions" },
  { slug: "privacy", label: "Privacy policy" },
  { slug: "cookies", label: "Cookie policy" },
  { slug: "bonus-terms", label: "Bonus terms" },
  { slug: "aml", label: "AML & KYC" },
  { slug: "affiliates", label: "Affiliate programme" },
  { slug: "responsible-gaming", label: "Responsible gaming" }
];

const KICKERS: Record<string, string> = {
  about: "The platform",
  terms: "Legal",
  privacy: "Legal",
  cookies: "Legal",
  "bonus-terms": "Legal",
  aml: "Compliance",
  affiliates: "Partners",
  "responsible-gaming": "Safety"
};

export function StaticPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<ContentPage | null>(getStaticContent(slug));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setPage(getStaticContent(slug));
    setLoading(true);
    api.contentPage(slug)
      .then((data) => { if (active) setPage({ ...data.page, updated_at: data.page.updated_at }); })
      .catch((err) => { if (active && isOfflineError(err)) setPage(getStaticContent(slug)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  if (!page && !loading) {
    return <div className="page-shell"><div className="empty-state" style={{ marginTop: 80 }}><h3>Page not found</h3><p>That content page does not exist.</p><Link to="/help" className="btn btn-secondary btn-sm">Open help centre</Link></div></div>;
  }

  return (
    <div className={classNames("static-page", slug === "responsible-gaming" && "safety-page")}>
      <div className="page-hero compact-hero static-hero">
        <div className="page-shell">
          <span className="eyebrow">{KICKERS[slug] || "19xbet365"}{page?.category && page.category.toLowerCase() !== (KICKERS[slug] || "").toLowerCase() ? ` · ${page.category}` : ""}</span>
          <h1>{page?.title || "19xbet365"}</h1>
          <p>{slug === "responsible-gaming" ? "Tools, limits, and support for keeping play in its place." : "Clear, plain-language information about how 19xbet365 works and what is enabled."}</p>
          <div className="static-hero-meta"><Badge tone="outline">Demonstration environment</Badge><span><ShieldCheck size={14} /> Virtual credits only</span>{page?.updated_at && <span>Updated {dateShort(page.updated_at)}</span>}</div>
        </div>
      </div>
      <div className="page-shell static-shell">
        <aside className="static-nav panel">
          <span className="eyebrow">Platform information</span>
          {NAV.map((item) => <Link key={item.slug} to={`/${item.slug}`} className={classNames(item.slug === slug && "active")}>{item.label}<ArrowRight size={13} /></Link>)}
          <div className="static-nav-note"><BookOpen size={15} /><span>Admin edits to this page are recorded in the audit trail.</span></div>
        </aside>
        <main className="static-main">
          {loading && !page ? <div className="panel"><Skeleton className="sk-title" /><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : page && (
            <article className="panel static-article">
              <div className="static-article-head"><span className="static-doc-icon">{slug === "responsible-gaming" ? <HeartHandshake size={22} /> : <Scale size={22} />}</span><div><span className="eyebrow">{page.category}</span><h2>{page.title}</h2></div></div>
              <div className="static-prose">
                {page.body.split("\n\n").map((paragraph, index) => <p key={index} className={index === 0 ? "lead" : ""}>{paragraph}</p>)}
              </div>
              {slug === "about" && (
                <div className="about-values">
                  <div><span><ShieldCheck size={18} /></span><strong>Virtual by design</strong><p>No real-money wagering, deposits, or withdrawals. Credits cannot be redeemed.</p></div>
                  <div><span><Check size={18} /></span><strong>Server-recorded</strong><p>Every playable round is generated and stored by the game engine, with immutable settlement.</p></div>
                  <div><span><Sparkles size={18} /></span><strong>Honest catalogue</strong><p>Provider-required titles are labelled and never presented as live certified products.</p></div>
                </div>
              )}
              {slug === "responsible-gaming" && (
                <div className="safety-callout">
                  <span className="safety-callout-icon"><HeartHandshake size={24} /></span>
                  <div><h3>If play stops feeling like entertainment</h3><p>Take a break, use self-exclusion, or contact our support team. Independent gambling-support services can provide confidential help in your region.</p><div className="safety-callout-actions"><Link to="/account/responsible" className="btn btn-lime btn-sm">Open my controls</Link><a href="https://www.begambleaware.org/" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Independent support <ArrowRight size={14} /></a></div></div>
                </div>
              )}
              <div className="static-legal-note"><ShieldCheck size={16} /><span>This document is part of a demonstration foundation and does not constitute legal advice. A licensed production deployment would require jurisdiction-specific review.</span></div>
            </article>
          )}
          <div className="static-footer-links">
            {NAV.filter((item) => item.slug !== slug).slice(0, 4).map((item) => <Link key={item.slug} to={`/${item.slug}`}>{item.label} <ArrowRight size={13} /></Link>)}
          </div>
        </main>
      </div>
    </div>
  );
}

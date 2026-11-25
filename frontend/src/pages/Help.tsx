import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, ChevronRight, HelpCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useData } from "../state/DataContext";
import { Badge, EmptyState, Input, Skeleton } from "../components/UI";
import { classNames } from "../lib/format";

export function HelpPage() {
  const { slug } = useParams();
  const { bootstrap, loading } = useData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const articles = bootstrap?.helpArticles || [];
  const categories = ["All", ...new Set(articles.map((article) => article.category))];
  const filtered = useMemo(() => articles.filter((article) => {
    if (category !== "All" && article.category !== category) return false;
    if (query.trim() && ![article.title, article.body, article.category].some((value) => value.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }), [articles, category, query]);
  const active = articles.find((article) => article.slug === slug);

  return (
    <div className="help-page">
      <div className="page-hero compact-hero help-hero">
        <div className="page-shell page-hero-inner">
          <div><span className="eyebrow"><HelpCircle size={13} /> Help centre</span><h1>Answers, without the runaround.</h1><p>Clear guidance on coins, the 44 playable 19X Originals, game integrity, account security, and responsible play.</p></div>
          <div className="help-hero-card"><BookOpen size={24} /><strong>{articles.length} articles</strong><span>Updated for the current foundation build</span><div><span className="status-dot status-active" /> API online</div></div>
        </div>
      </div>
      <div className="page-shell help-shell">
        <div className="help-layout">
          <aside className="help-sidebar panel">
            <div className="sports-search"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help articles" aria-label="Search help" /></div>
            <div className="help-categories">
              {categories.map((item) => <button key={item} className={classNames(category === item && "active")} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <div className="help-list">
              {loading ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="sk-line" />) : filtered.map((article) => (
                <Link key={article.slug} to={`/help/${article.slug}`} className={classNames("help-list-item", slug === article.slug && "active")}>
                  <span>{article.category}</span><strong>{article.title}</strong><ChevronRight size={13} />
                </Link>
              ))}
              {!loading && !filtered.length && <p className="muted-small">No articles match that search.</p>}
            </div>
          </aside>
          <main className="help-main">
            {loading ? <div className="panel"><Skeleton className="sk-title" /><Skeleton className="sk-line" /><Skeleton className="sk-line" /></div> : active ? (
              <article className="panel help-article">
                <div className="help-article-meta"><Badge tone="cyan">{active.category}</Badge><span>Updated today · 3 min read</span></div>
                <h2>{active.title}</h2>
                {active.body.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                <div className="help-article-note"><ShieldCheck size={17} /><div><strong>Still need help?</strong><span>Open a support ticket and include any game or bet reference. Staff replies are recorded.</span></div><Link to="/support" className="text-btn">Contact support <ArrowRight size={13} /></Link></div>
                <div className="help-related">
                  <h3>Related articles</h3>
                  {articles.filter((article) => article.slug !== active.slug).slice(0, 3).map((article) => <Link key={article.slug} to={`/help/${article.slug}`}>{article.title} <ArrowRight size={13} /></Link>)}
                </div>
              </article>
            ) : (
              <div className="panel">
                <div className="help-welcome">
                  <span className="help-welcome-icon"><Sparkles size={28} /></span>
                  <h2>What can we help with?</h2>
                  <p>Search the knowledge base or choose a category. If you cannot find an answer, our support team can review your account, a game round, or a sports bet.</p>
                  <div className="help-quick-grid">
                    {articles.slice(0, 4).map((article) => <Link key={article.slug} to={`/help/${article.slug}`}><span>{article.category}</span><strong>{article.title}</strong><ArrowRight size={14} /></Link>)}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

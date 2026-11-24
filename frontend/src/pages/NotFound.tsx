import { Link } from "react-router-dom";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";

export function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-orbit"><span /><span /><span /><Compass size={38} /></div>
      <span className="eyebrow">404 · off the board</span>
      <h1>This page drifted out of orbit.</h1>
      <p>The link may be outdated, or the page may have moved. Head back to the lobby and pick a new board.</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-lime"><ArrowLeft size={16} /> Back to home</Link>
        <Link to="/casino" className="btn btn-secondary"><Sparkles size={16} /> Open casino</Link>
      </div>
    </div>
  );
}

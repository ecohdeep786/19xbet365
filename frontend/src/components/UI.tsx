import { useRef, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AlertTriangle, ArrowRight, Copy, Loader2, X } from "lucide-react";
import { classNames, initials } from "../lib/format";
import { useDialog } from "../lib/useDialog";

export function Button({
  children, variant = "primary", size = "md", loading, icon, className, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "lime" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button className={classNames("btn", `btn-${variant}`, `btn-${size}`, className)} disabled={loading || props.disabled} {...props}>
      {loading ? <Loader2 size={16} className="spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "lime" | "cyan" | "coral" | "violet" | "amber" | "outline"; className?: string }) {
  return <span className={classNames("badge", `badge-${tone}`, className)}>{children}</span>;
}

export function Avatar({ name, seed, size = 40 }: { name: string; seed?: string; size?: number }) {
  const hue = seed ? parseInt(seed.slice(0, 4), 16) % 360 : name.length * 37 % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, background: `linear-gradient(145deg, hsl(${hue} 70% 42%), hsl(${(hue + 55) % 360} 75% 26%))` }} aria-hidden="true">
      {initials(name || "19X")}
    </span>
  );
}

export function Field({ label, hint, error, children, required }: { label?: string; hint?: string; error?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}{required && <span className="req">*</span>}</span>}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames("input", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={classNames("input select", className)} {...props}>{children}</select>;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={classNames("input textarea", className)} {...props} />;
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={classNames("skeleton", className)} style={style} />;
}

export function CardSkeleton() {
  return <div className="card skeleton-card"><Skeleton className="sk-art" /><Skeleton className="sk-line w70" /><Skeleton className="sk-line w45" /></div>;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <ArrowRight size={22} />}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="empty-state error-state">
      <div className="empty-icon"><AlertTriangle size={22} /></div>
      <h3>Something went off course</h3>
      <p>{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(open, onClose, panelRef);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className={classNames("modal", wide && "modal-wide")} role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function SectionHeading({ kicker, title, body, action }: { kicker?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {kicker && <span className="eyebrow">{kicker}</span>}
        <h2>{title}</h2>
        {body && <p>{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone = "default", icon }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "lime" | "cyan" | "coral" | "amber"; icon?: ReactNode }) {
  return (
    <div className={classNames("stat", `stat-${tone}`)}>
      <div className="stat-top"><span>{label}</span>{icon}</div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function ProgressBar({ value, tone = "cyan" }: { value: number; tone?: "cyan" | "lime" | "coral" }) {
  return <div className="progress"><span className={`progress-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  return (
    <button
      className="copy-btn"
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(value); } catch { /* ignore */ } }}
    >
      <Copy size={13} /> {label}
    </button>
  );
}

export function StatusDot({ status }: { status: string }) {
  return <span className={classNames("status-dot", `status-${status}`)} aria-label={status} />;
}

export function Segmented<T extends string>({ options, value, onChange, size = "md" }: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; size?: "sm" | "md" }) {
  return (
    <div className={classNames("segmented", `segmented-${size}`)} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

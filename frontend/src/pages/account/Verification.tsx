import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock3, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api";
import type { Verification } from "../../types";
import { useToast } from "../../state/ToastContext";
import { Badge, Button, ErrorState, Field, Input, Select, Skeleton, Textarea } from "../../components/UI";
import { dateTime } from "../../lib/format";

const EMPTY: Verification = {
  status: "not_started", legalName: "", dateOfBirth: "", country: "", address: "",
  documentType: "passport", documentReference: "", reviewNote: "", submittedAt: null, reviewedAt: null
};

export function AccountVerification() {
  const { push } = useToast();
  const [verification, setVerification] = useState<Verification>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ legalName: "", dateOfBirth: "", country: "", address: "", documentType: "passport", documentReference: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.verification();
      setVerification(data.verification);
      setForm({
        legalName: data.verification.legalName || "",
        dateOfBirth: data.verification.dateOfBirth || "",
        country: data.verification.country || "",
        address: data.verification.address || "",
        documentType: data.verification.documentType || "passport",
        documentReference: data.verification.documentReference || ""
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load verification.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await api.submitVerification(form);
      push(data.message, "success", "Verification submitted");
      setVerification(data.verification);
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not submit verification.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="panel account-panel"><Skeleton className="sk-line" /><Skeleton className="sk-line" /><Skeleton className="sk-button" /></div>;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="account-page-stack">
      <div className="account-page-head"><div><span className="eyebrow">Account security</span><h2>Identity verification</h2><p>Verify your identity before requesting a withdrawal. Review is manual and handled by the compliance team.</p></div><Badge tone={verification.status === "approved" ? "lime" : verification.status === "pending" ? "amber" : verification.status === "rejected" ? "coral" : "outline"}>{verification.status.replace("_", " ")}</Badge></div>

      {verification.status === "pending" && (
        <div className="account-callout"><Clock3 size={18} /><div><strong>Verification is under review.</strong><span>Submitted {verification.submittedAt ? dateTime(verification.submittedAt) : "recently"}. You will receive a notification when the review is complete.</span></div></div>
      )}
      {verification.status === "approved" && (
        <div className="account-callout success"><BadgeCheck size={18} /><div><strong>Identity verified.</strong><span>You can now request withdrawals from your wallet. KYC approval does not enable real-money play by itself.</span><Link to="/account/withdraw" className="text-btn">Request a withdrawal</Link></div></div>
      )}
      {verification.status === "rejected" && (
        <div className="account-callout danger"><ShieldCheck size={18} /><div><strong>Verification needs attention.</strong><span>{verification.reviewNote || "Please resubmit your details."}</span></div></div>
      )}

      {verification.status !== "approved" && verification.status !== "pending" ? (
        <form className="panel account-panel" onSubmit={submit}>
          <div className="panel-head"><span><ShieldCheck size={15} /> Identity details</span><Badge tone="outline">Manual review</Badge></div>
          <div className="form-grid">
            <Field label="Full legal name" required><Input value={form.legalName} onChange={(event) => setForm({ ...form, legalName: event.target.value })} required minLength={2} /></Field>
            <Field label="Date of birth" required><Input type="date" value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} required /></Field>
            <Field label="Country" required><Input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} required /></Field>
            <Field label="Document type" required><Select value={form.documentType} onChange={(event) => setForm({ ...form, documentType: event.target.value })}><option value="passport">Passport</option><option value="driving_licence">Driving licence</option><option value="national_id">National ID</option></Select></Field>
          </div>
          <Field label="Residential address" required><Textarea rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required /></Field>
          <Field label="Document reference" hint="Enter the document number or reference. Do not upload or paste a full identity document here." required><Input value={form.documentReference} onChange={(event) => setForm({ ...form, documentReference: event.target.value })} required minLength={4} /></Field>
          <p className="form-note">This is a sandbox review record. Production KYC must use an approved identity provider with encrypted document handling, sanctions screening and retention controls.</p>
          <Button variant="lime" type="submit" loading={busy}>Submit verification</Button>
        </form>
      ) : null}
    </div>
  );
}

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useToast } from "../state/ToastContext";
import { Button } from "./UI";

export function EmailVerificationBanner() {
  const { user, sendVerificationEmail, refreshEmailVerification } = useAuth();
  const { push } = useToast();
  const [busy, setBusy] = useState<"send" | "check" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified !== false) return null;

  const resend = async () => {
    setBusy("send");
    setError(null);
    setNote(null);
    try {
      await sendVerificationEmail();
      setNote("Verification email sent. Open the link, then check your status here.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the verification email.");
    } finally {
      setBusy(null);
    }
  };

  const check = async () => {
    setBusy("check");
    setError(null);
    setNote(null);
    try {
      await refreshEmailVerification();
      push("Email verified. Deposits and withdrawals are now unlocked.", "success", "Account verified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification is not complete yet.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="verify-banner panel" role="status">
      <span className="verify-banner-icon"><MailWarning size={20} /></span>
      <div className="verify-banner-copy">
        <strong>Verify your email to unlock money flows</strong>
        <span>You can keep playing with coins. Email verification is required before adding coins or requesting a withdrawal.</span>
        {note && <em>{note}</em>}
        {error && <em className="verify-error">{error}</em>}
      </div>
      <div className="verify-banner-actions">
        <Button variant="secondary" size="sm" loading={busy === "send"} onClick={resend}>Resend email</Button>
        <Button variant="primary" size="sm" loading={busy === "check"} onClick={check}>I have verified</Button>
      </div>
    </div>
  );
}

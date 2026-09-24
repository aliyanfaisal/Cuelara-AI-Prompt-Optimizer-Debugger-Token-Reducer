"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { changePassword, updateProfile } from "../actions";

const FIELD = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

function Feedback({ state }: { state: { ok?: string; error?: string } }) {
  if (state.error) return <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{state.error}</p>;
  if (state.ok) return <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> {state.ok}</p>;
  return null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [emailValue, setEmailValue] = useState(email);
  const [feedback, setFeedback] = useState<{ ok?: string; error?: string }>({});
  const emailChanged = emailValue.trim().toLowerCase() !== email.toLowerCase();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setFeedback({});
    startTransition(async () => {
      const result = await updateProfile({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        currentPassword: String(data.get("currentPassword") ?? ""),
      });
      setFeedback("error" in result ? { error: result.error } : { ok: result.message });
      if ("success" in result) router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold text-foreground">Your details</h2>
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-foreground">Name</label>
        <input id="name" name="name" defaultValue={name} required maxLength={100} autoComplete="name" className={FIELD} />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
        <input id="email" name="email" type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} required maxLength={200} autoComplete="email" className={FIELD} />
      </div>
      {emailChanged && (
        <div>
          <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-semibold text-foreground">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={FIELD} />
          <p className="mt-1.5 text-xs text-muted-foreground">Needed to change the email address you sign in with.</p>
        </div>
      )}
      <Feedback state={feedback} />
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: string; error?: string }>({});

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirmPassword")) return setFeedback({ error: "The new passwords don't match." });
    setFeedback({});
    startTransition(async () => {
      const result = await changePassword({ currentPassword: String(data.get("currentPassword") ?? ""), newPassword: String(data.get("newPassword") ?? "") });
      if ("error" in result) return setFeedback({ error: result.error });
      form.reset();
      setFeedback({ ok: result.message });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-bold text-foreground">Change password</h2>
      <div>
        <label htmlFor="cp-current" className="mb-1.5 block text-sm font-semibold text-foreground">Current password</label>
        <input id="cp-current" name="currentPassword" type="password" required autoComplete="current-password" className={FIELD} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="cp-new" className="mb-1.5 block text-sm font-semibold text-foreground">New password</label>
          <input id="cp-new" name="newPassword" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className={FIELD} />
        </div>
        <div>
          <label htmlFor="cp-confirm" className="mb-1.5 block text-sm font-semibold text-foreground">Confirm new password</label>
          <input id="cp-confirm" name="confirmPassword" type="password" required minLength={8} maxLength={200} autoComplete="new-password" className={FIELD} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      <Feedback state={feedback} />
      <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Update password
      </button>
    </form>
  );
}

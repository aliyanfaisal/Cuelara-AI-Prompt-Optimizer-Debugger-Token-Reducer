"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Trash2, UserMinus, Users } from "lucide-react";
import {
  changeTeamMemberRole, createTeam, deleteTeam, inviteMember, leaveTeamWorkspace, removeTeamMember, renameTeam, revokeInvite,
} from "./actions";

export interface TeamData {
  id: string;
  name: string;
  myRole: "OWNER" | "ADMIN" | "MEMBER";
  myId: string;
  seats: { used: number; pending: number; max: number };
  members: { userId: string; name: string | null; email: string; role: string; joinedAt: string }[];
  invites: { id: string; email: string; role: string; expiresAt: string; expired: boolean }[];
}

type ActionResult = { success: true; message?: string } | { error: string };

const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" };

/** Runs a server action, surfaces its result, and refreshes the server-rendered lists. */
function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok?: string; error?: string }>({});

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setFeedback({});
    startTransition(async () => {
      const result = await action();
      if ("error" in result) return setFeedback({ error: result.error });
      setFeedback(result.message ? { ok: result.message } : {});
      after?.();
      router.refresh();
    });
  }
  return { run, pending, feedback };
}

export function CreateTeamForm({ seats, planName }: { seats: number; planName: string }) {
  const [name, setName] = useState("");
  const { run, pending, feedback } = useAction();
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <h3 className="text-lg font-bold text-foreground">Create your team</h3>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Your {planName} plan includes a team workspace with {seats} seat{seats === 1 ? "" : "s"} (you plus {Math.max(0, seats - 1)} more).
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createTeam(name));
        }}
        className="flex flex-wrap gap-3"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name, e.g. Acme Marketing" maxLength={60} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <button disabled={pending || !name.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create team
        </button>
      </form>
      {feedback.error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{feedback.error}</p>}
    </section>
  );
}

export function TeamManager({ team }: { team: TeamData }) {
  const router = useRouter();
  const { run, pending, feedback } = useAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [name, setName] = useState(team.name);
  const isOwner = team.myRole === "OWNER";
  const canManage = isOwner || team.myRole === "ADMIN";
  const free = Math.max(0, team.seats.max - team.seats.used - team.seats.pending);

  const canRemove = (target: string) => target !== "OWNER" && (isOwner || (team.myRole === "ADMIN" && target === "MEMBER"));

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary"><Users className="h-3.5 w-3.5" /> Team · you are {ROLE_LABEL[team.myRole].toLowerCase()}</p>
          {isOwner ? (
            <form onSubmit={(e) => { e.preventDefault(); run(() => renameTeam(team.id, name)); }} className="flex items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Team name" className="min-w-0 rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-2xl font-black tracking-tight text-foreground hover:border-border focus:border-border focus:outline-none" />
              {name.trim() !== team.name && <button disabled={pending || !name.trim()} className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-60">Save</button>}
            </form>
          ) : (
            <h3 className="text-2xl font-black tracking-tight text-foreground">{team.name}</h3>
          )}
        </div>
        <div className="text-right text-sm">
          <p className="font-bold tabular-nums text-foreground">{team.seats.used} / {team.seats.max} seats used</p>
          {team.seats.pending > 0 && <p className="text-xs text-muted-foreground">{team.seats.pending} invitation{team.seats.pending === 1 ? "" : "s"} pending</p>}
        </div>
      </div>

      {canManage && (
        <div className="rounded-xl border border-border bg-background p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground"><Mail className="h-4 w-4 text-primary" /> Invite someone</h4>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => inviteMember(team.id, email, role), () => setEmail(""));
            }}
            className="flex flex-wrap gap-3"
          >
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" required className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            {isOwner && (
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            )}
            <button disabled={pending || !email.trim() || free === 0} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />} Send invitation
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{free === 0 ? "All seats are in use. Remove someone or revoke an invitation to free one." : `${free} seat${free === 1 ? "" : "s"} free. Admins can invite and remove members; only you can manage admins.`}</p>
        </div>
      )}

      {feedback.error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{feedback.error}</p>}
      {feedback.ok && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{feedback.ok}</p>}

      <div>
        <h4 className="mb-2 text-sm font-bold text-foreground">Members</h4>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {team.members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{m.name || m.email}{m.userId === team.myId && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}</p>
                {m.name && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
              </div>
              {isOwner && m.role !== "OWNER" ? (
                <select value={m.role} disabled={pending} onChange={(e) => run(() => changeTeamMemberRole(team.id, m.userId, e.target.value))} aria-label={`Role for ${m.email}`} className="rounded-lg border border-border bg-background px-2 py-1 text-xs">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{ROLE_LABEL[m.role] ?? m.role}</span>
              )}
              {canRemove(m.role) && m.userId !== team.myId && (
                <button onClick={() => confirm(`Remove ${m.name || m.email} from the team?`) && run(() => removeTeamMember(team.id, m.userId))} disabled={pending} title="Remove from team" className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50">
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {canManage && team.invites.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-bold text-foreground">Pending invitations</h4>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {team.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{i.email}</p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABEL[i.role] ?? i.role} · {i.expired ? "expired" : `expires ${new Date(i.expiresAt).toLocaleDateString()}`}</p>
                </div>
                <button onClick={() => run(() => inviteMember(team.id, i.email, i.role))} disabled={pending} className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50">Resend</button>
                <button onClick={() => run(() => revokeInvite(i.id))} disabled={pending} title="Revoke invitation" className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
        <a href={`/dashboard/workspace?w=${team.id}`} className="font-semibold text-primary hover:underline">Open the team&rsquo;s prompt library →</a>
        {isOwner ? (
          <button onClick={() => confirm("Delete this team? Its shared prompt library is deleted for everyone and members lose the team plan. This can't be undone.") && run(() => deleteTeam(team.id), () => router.refresh())} disabled={pending} className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 disabled:opacity-50">
            Delete team
          </button>
        ) : (
          <button onClick={() => confirm("Leave this team? You'll lose access to its prompt library.") && run(() => leaveTeamWorkspace(team.id))} disabled={pending} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50">
            Leave team
          </button>
        )}
      </div>
    </section>
  );
}

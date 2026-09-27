import type { ReactionType } from "@/generated/client/client";

// Shared between server (src/lib/engagement.ts) and client (ReactionBar) code, so this
// file must stay free of "server-only" imports.

export const REACTION_TYPES: ReactionType[] = ["like", "love", "haha", "wow", "sad", "angry"];

export const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  haha: { emoji: "😆", label: "Haha" },
  wow: { emoji: "😮", label: "Wow" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😡", label: "Angry" },
};

export type ReactionCounts = Record<ReactionType, number>;

export interface ReactionSummary {
  counts: ReactionCounts;
  total: number;
  mine: ReactionType | null;
}

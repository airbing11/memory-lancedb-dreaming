import type { LanceMemoryEntry } from "./memory-db.js";
import type { DreamingStateEntry } from "./state.js";

export type PromotionComponents = {
  frequency: number;
  relevance: number;
  diversity: number;
  recency: number;
  consolidation: number;
  conceptual: number;
};

export type PromotionCandidate = {
  memoryId: string;
  text: string;
  category: string;
  importance: number;
  recallCount: number;
  uniqueQueries: number;
  recallDays: string[];
  ageDays: number;
  score: number;
  components: PromotionComponents;
  state: DreamingStateEntry;
};

export type DreamingMemoryRow = LanceMemoryEntry & {
  state?: DreamingStateEntry;
};

export type DreamingPhaseResult = {
  phase: "light" | "rem" | "deep";
  bodyLines: string[];
  memoryIds: string[];
  snippets?: string[];
  promotions?: PromotionCandidate[];
};

export type SubagentRuntime = {
  run: (params: {
    sessionKey: string;
    message: string;
    extraSystemPrompt?: string;
    deliver?: boolean;
    idempotencyKey?: string;
    model?: string;
  }) => Promise<{ runId: string }>;
  waitForRun: (params: { runId: string; timeoutMs?: number }) => Promise<{ status: string; error?: string }>;
  getSessionMessages: (params: {
    sessionKey: string;
    limit?: number;
  }) => Promise<{ messages: unknown[] }>;
  deleteSession: (params: { sessionKey: string; deleteTranscript?: boolean }) => Promise<void>;
};

export type LlmCompleteFn = (params: {
  model?: string;
  systemPrompt?: string;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  purpose?: string;
}) => Promise<{ text: string } | { text?: string; content?: string }>;

export type DreamingLlmRuntime = {
  subagent?: SubagentRuntime;
  llmComplete?: LlmCompleteFn;
};

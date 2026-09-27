import { z } from "zod";
import { getRequestSubject, subjectForUser, hasReachedDailyLimit, consumeDailyLimit, type RequestSubject } from "@/lib/rate-limit";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";
import { COMPRESSION_LEVELS, PRESERVE_OPTIONS, isCompressionLevel, isPreserveOption } from "@/lib/token-optimizer/constants";
import { compressPrompt } from "@/lib/token-optimizer/compress";
import { getPromptOptimizerLimit } from "@/lib/prompt-optimizer/limits";
import { MODES, LEVELS, isOptimizerMode, isOptimizerLevel } from "@/lib/prompt-optimizer/constants";
import { optimizePrompt } from "@/lib/prompt-optimizer/optimize";
import { getPromptBuilderLimit } from "@/lib/prompt-builder/limits";
import { BUILDER_TARGETS, BUILDER_USE_CASES, BUILDER_DETAIL_LEVELS, MAX_IDEA_CHARS, isBuilderTarget, isBuilderUseCase, isBuilderDetail } from "@/lib/prompt-builder/constants";
import { buildPrompt } from "@/lib/prompt-builder/build";
import { resolveUserIdFromToken } from "@/lib/personal-access-tokens";
import { getPlanContext } from "@/lib/plans";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { AllProvidersExhaustedError } from "@/lib/llm-generate";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";

// A remote MCP server (https://modelcontextprotocol.io) exposing Cuelara's tools so any
// MCP-compatible AI client (Claude Desktop/Code, Cursor, etc.) can call them directly — no browser
// needed. Stateless: every request is self-contained, no session id or SSE stream required.

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "cuelara", version: "1.1.0" };

type ToolResult = { content: { type: "text"; text: string }[]; isError: boolean };
type ToolDefinition = { name: string; description: string; inputSchema: Record<string, unknown> };

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { headers: { "Cache-Control": "no-store" } });
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { headers: { "Cache-Control": "no-store" } });
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

/** Resolves the caller behind a request: a Cuelara personal access token (see /dashboard/mcp)
 * identifies a specific user, so their own plan's limits apply instead of the anonymous IP-based
 * default — and paid users skip the "by Cuelara.com" attribution appended to free/anonymous output. */
async function resolveCaller(req: Request): Promise<{ subject: RequestSubject; isFreeCaller: boolean } | { error: string }> {
  const token = bearerToken(req);
  if (!token) {
    return { subject: await getRequestSubject(req), isFreeCaller: true };
  }
  const userId = await resolveUserIdFromToken(token);
  if (!userId) {
    return { error: "That Cuelara API token is invalid or has been revoked. Generate a new one at cuelara.com/dashboard/mcp." };
  }
  const subject = await subjectForUser(userId);
  const { plan } = await getPlanContext(userId);
  return { subject, isFreeCaller: !plan || plan.priceMonthlyCents === 0 };
}

function providerErrorResult(error: unknown, fallbackMessage: string): ToolResult {
  void reportError(error, { source: "api", route: "/api/mcp" });
  if (error instanceof NoApiKeysConfiguredError) {
    return { content: [{ type: "text", text: "AI service is not configured. Please contact support." }], isError: true };
  }
  if (isGenAITimeout(error)) {
    return { content: [{ type: "text", text: "The AI is taking too long to respond. Please try again." }], isError: true };
  }
  if (isRetryableProviderError(error) || isRequestTooLargeForProvider(error) || error instanceof AllProvidersExhaustedError) {
    return { content: [{ type: "text", text: HIGH_DEMAND_MESSAGE }], isError: true };
  }
  return { content: [{ type: "text", text: fallbackMessage }], isError: true };
}

// --- cuelara_compress_prompt (Token Optimizer) -----------------------------------------------

const COMPRESS_TOOL_NAME = "cuelara_compress_prompt";

const compressArgsSchema = z.object({
  text: z.string().min(1, "text must not be empty"),
  level: z.enum(COMPRESSION_LEVELS).optional(),
  preserveFormatting: z.enum(PRESERVE_OPTIONS).optional(),
});

const COMPRESS_TOOL_DEFINITION = {
  name: COMPRESS_TOOL_NAME,
  description:
    "Compresses a verbose AI prompt to use fewer tokens while preserving all instructions, constraints, and meaning. Verified against a real tokenizer, not an estimate.",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The prompt to compress." },
      level: {
        type: "string",
        enum: COMPRESSION_LEVELS,
        description: `How aggressively to compress. Defaults to "${COMPRESSION_LEVELS[1]}".`,
      },
      preserveFormatting: {
        type: "string",
        enum: PRESERVE_OPTIONS,
        description: 'Keep the original structure (headers, lists, code blocks) intact. Defaults to "Yes".',
      },
    },
    required: ["text"],
  },
};

async function callCompressTool(req: Request, rawArgs: unknown): Promise<ToolResult> {
  const parsed = compressArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { content: [{ type: "text", text: `Invalid arguments: ${parsed.error.issues[0]?.message ?? "invalid input"}` }], isError: true };
  }
  const { text, level, preserveFormatting } = parsed.data;
  const resolvedLevel = isCompressionLevel(level) ? level : COMPRESSION_LEVELS[1];
  const resolvedPreserve = isPreserveOption(preserveFormatting) ? preserveFormatting : "Yes";

  const caller = await resolveCaller(req);
  if ("error" in caller) return { content: [{ type: "text", text: caller.error }], isError: true };
  const { subject, isFreeCaller } = caller;

  const limit = await getTokenOptimizerLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "token-optimizer", limit)) {
    return {
      content: [{ type: "text", text: `Daily compression limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` }],
      isError: true,
    };
  }

  try {
    const { compressed, originalTokens, compressedTokens } = await compressPrompt(text, resolvedLevel, resolvedPreserve);
    await consumeDailyLimit(subject.subjectKey, "token-optimizer");
    const savedPct = originalTokens > 0 ? Math.max(0, Math.round((1 - compressedTokens / originalTokens) * 100)) : 0;
    const stats = `(${originalTokens} → ${compressedTokens} tokens, ${savedPct}% fewer)`;
    const attribution = isFreeCaller ? "\n\n— Compressed by Cuelara.com" : "";
    return { content: [{ type: "text", text: `${compressed}\n\n${stats}${attribution}` }], isError: false };
  } catch (error) {
    return providerErrorResult(error, "Something went wrong while compressing the prompt.");
  }
}

// --- cuelara_optimize_prompt (Prompt Optimizer) ----------------------------------------------

const OPTIMIZE_TOOL_NAME = "cuelara_optimize_prompt";

const optimizeArgsSchema = z.object({
  text: z.string().min(1, "text must not be empty"),
  mode: z.enum(MODES).optional(),
  level: z.enum(LEVELS).optional(),
});

const OPTIMIZE_TOOL_DEFINITION = {
  name: OPTIMIZE_TOOL_NAME,
  description:
    "Turns a rough, messy request into a complete, structured, ready-to-paste prompt for any frontier AI model — adds role anchoring, explicit steps, negative constraints, and an output format.",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The rough idea or request to turn into a full prompt." },
      mode: {
        type: "string",
        enum: MODES,
        description: `The domain to tailor the structure for. Defaults to "${MODES[0]}".`,
      },
      level: {
        type: "string",
        enum: LEVELS,
        description: `How thorough the resulting prompt should be. Defaults to "${LEVELS[1]}".`,
      },
    },
    required: ["text"],
  },
};

async function callOptimizeTool(req: Request, rawArgs: unknown): Promise<ToolResult> {
  const parsed = optimizeArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { content: [{ type: "text", text: `Invalid arguments: ${parsed.error.issues[0]?.message ?? "invalid input"}` }], isError: true };
  }
  const { text, mode, level } = parsed.data;
  const resolvedMode = isOptimizerMode(mode) ? mode : MODES[0];
  const resolvedLevel = isOptimizerLevel(level) ? level : LEVELS[1];

  const caller = await resolveCaller(req);
  if ("error" in caller) return { content: [{ type: "text", text: caller.error }], isError: true };
  const { subject, isFreeCaller } = caller;

  const limit = await getPromptOptimizerLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "prompt-optimizer", limit)) {
    return {
      content: [{ type: "text", text: `Daily optimization limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` }],
      isError: true,
    };
  }

  try {
    const optimized = await optimizePrompt(text, resolvedMode, resolvedLevel);
    if (!optimized) {
      return { content: [{ type: "text", text: "The AI did not return a result. Please try again." }], isError: true };
    }
    await consumeDailyLimit(subject.subjectKey, "prompt-optimizer");
    const attribution = isFreeCaller ? "\n\n— Optimized by Cuelara.com" : "";
    return { content: [{ type: "text", text: `${optimized}${attribution}` }], isError: false };
  } catch (error) {
    return providerErrorResult(error, "Something went wrong while optimizing the prompt.");
  }
}

// --- cuelara_build_prompt (Prompt Builder) -----------------------------------------------------

const BUILD_TOOL_NAME = "cuelara_build_prompt";

const buildArgsSchema = z.object({
  idea: z.string().min(1, "idea must not be empty").max(MAX_IDEA_CHARS, `idea must be at most ${MAX_IDEA_CHARS} characters`),
  target: z.enum(BUILDER_TARGETS).optional(),
  useCase: z.enum(BUILDER_USE_CASES).optional(),
  detail: z.enum(BUILDER_DETAIL_LEVELS).optional(),
});

const BUILD_TOOL_DEFINITION = {
  name: BUILD_TOOL_NAME,
  description:
    "Turns a rough idea into a complete, ready-to-paste prompt for a specific target AI model — clear, lean, and grounded only in what the idea actually says, with bracketed placeholders for anything genuinely missing.",
  inputSchema: {
    type: "object",
    properties: {
      idea: { type: "string", description: `The rough idea to turn into a prompt (max ${MAX_IDEA_CHARS} characters).` },
      target: {
        type: "string",
        enum: BUILDER_TARGETS,
        description: `Which AI model or tool the prompt is written for. Defaults to "${BUILDER_TARGETS[0]}".`,
      },
      useCase: {
        type: "string",
        enum: BUILDER_USE_CASES,
        description: `The domain to tailor the prompt's sections for. Defaults to "${BUILDER_USE_CASES[0]}".`,
      },
      detail: {
        type: "string",
        enum: BUILDER_DETAIL_LEVELS,
        description: `How thorough the resulting prompt should be. Defaults to "${BUILDER_DETAIL_LEVELS[1]}".`,
      },
    },
    required: ["idea"],
  },
};

async function callBuildTool(req: Request, rawArgs: unknown): Promise<ToolResult> {
  const parsed = buildArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { content: [{ type: "text", text: `Invalid arguments: ${parsed.error.issues[0]?.message ?? "invalid input"}` }], isError: true };
  }
  const { idea, target, useCase, detail } = parsed.data;
  const resolvedTarget = isBuilderTarget(target) ? target : BUILDER_TARGETS[0];
  const resolvedUseCase = isBuilderUseCase(useCase) ? useCase : BUILDER_USE_CASES[0];
  const resolvedDetail = isBuilderDetail(detail) ? detail : BUILDER_DETAIL_LEVELS[1];

  const caller = await resolveCaller(req);
  if ("error" in caller) return { content: [{ type: "text", text: caller.error }], isError: true };
  const { subject, isFreeCaller } = caller;

  const limit = await getPromptBuilderLimit(subject);
  if (await hasReachedDailyLimit(subject.subjectKey, "prompt-builder", limit)) {
    return {
      content: [{ type: "text", text: `Daily build limit reached (${limit}/day for this caller). Try again tomorrow, or sign in at cuelara.com for a higher limit.` }],
      isError: true,
    };
  }

  try {
    const built = await buildPrompt(idea, resolvedTarget, resolvedUseCase, resolvedDetail);
    if (!built) {
      return { content: [{ type: "text", text: "The AI did not return a usable result. Please try again." }], isError: true };
    }
    await consumeDailyLimit(subject.subjectKey, "prompt-builder");
    const attribution = isFreeCaller ? "\n\n— Built by Cuelara.com" : "";
    return { content: [{ type: "text", text: `${built}${attribution}` }], isError: false };
  } catch (error) {
    return providerErrorResult(error, "Something went wrong while building the prompt.");
  }
}

// --- Server -------------------------------------------------------------------------------

const TOOLS: Record<string, { definition: ToolDefinition; call: (req: Request, args: unknown) => Promise<ToolResult> }> = {
  [COMPRESS_TOOL_NAME]: { definition: COMPRESS_TOOL_DEFINITION, call: callCompressTool },
  [OPTIMIZE_TOOL_NAME]: { definition: OPTIMIZE_TOOL_DEFINITION, call: callOptimizeTool },
  [BUILD_TOOL_NAME]: { definition: BUILD_TOOL_DEFINITION, call: callBuildTool },
};

export async function POST(req: Request) {
  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error: request body must be valid JSON.");
  }

  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return rpcError(body?.id ?? null, -32600, "Invalid Request: expected a JSON-RPC 2.0 request.");
  }

  const { id, method, params } = body;
  const isNotification = id === undefined;

  switch (method) {
    case "initialize":
      return rpcResult(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });

    case "notifications/initialized":
    case "notifications/cancelled":
      // Notifications carry no id and expect no response body.
      return new Response(null, { status: 202 });

    case "tools/list":
      return rpcResult(id, { tools: Object.values(TOOLS).map((t) => t.definition) });

    case "tools/call": {
      const { name, arguments: args } = (params as { name?: string; arguments?: unknown }) ?? {};
      const tool = name ? TOOLS[name] : undefined;
      if (!tool) {
        return rpcError(id, -32602, `Unknown tool "${name}". Available tools: ${Object.keys(TOOLS).join(", ")}.`);
      }
      const result = await tool.call(req, args);
      return rpcResult(id, result);
    }

    default:
      if (isNotification) return new Response(null, { status: 202 });
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

/** The Streamable HTTP transport allows an optional server-push stream via GET; this server has
 * nothing to push, so it declines (spec-compliant) rather than pretending to support SSE. */
export async function GET(req: Request) {
  if (req.headers.get("accept")?.includes("text/event-stream")) {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  return Response.json({
    name: SERVER_INFO.name,
    protocolVersion: PROTOCOL_VERSION,
    description: "MCP server for Cuelara's tools. POST JSON-RPC 2.0 requests here (initialize, tools/list, tools/call).",
    docs: "https://cuelara.com/docs/mcp",
  });
}

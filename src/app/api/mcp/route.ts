import { z } from "zod";
import { getRequestSubject, subjectForUser, hasReachedDailyLimit, consumeDailyLimit } from "@/lib/rate-limit";
import { getTokenOptimizerLimit } from "@/lib/token-optimizer/limits";
import { COMPRESSION_LEVELS, PRESERVE_OPTIONS, isCompressionLevel, isPreserveOption } from "@/lib/token-optimizer/constants";
import { compressPrompt } from "@/lib/token-optimizer/compress";
import { resolveUserIdFromToken } from "@/lib/personal-access-tokens";
import { getPlanContext } from "@/lib/plans";
import { isGenAITimeout } from "@/lib/genai-timeout";
import { NoApiKeysConfiguredError, isRetryableProviderError, isRequestTooLargeForProvider } from "@/lib/api-keys";
import { AllProvidersExhaustedError } from "@/lib/llm-generate";
import { HIGH_DEMAND_MESSAGE } from "@/lib/error-messages";
import { reportError } from "@/lib/error-report";

export const runtime = "nodejs";

// A remote MCP server (https://modelcontextprotocol.io) exposing Token Optimizer as a tool any
// MCP-compatible AI client (Claude Desktop/Code, Cursor, etc.) can call directly — no browser
// needed. Stateless: every request is self-contained, no session id or SSE stream required.

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "cuelara-token-optimizer", version: "1.0.0" };

const TOOL_NAME = "cuelara_compress_prompt";

const callArgsSchema = z.object({
  text: z.string().min(1, "text must not be empty"),
  level: z.enum(COMPRESSION_LEVELS).optional(),
  preserveFormatting: z.enum(PRESERVE_OPTIONS).optional(),
});

const TOOL_DEFINITION = {
  name: TOOL_NAME,
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

/** Runs the compression tool and maps every failure mode to a { isError: true } tool result — MCP
 * clients surface tool errors to the model as text, not as a transport-level failure. */
async function callCompressTool(req: Request, rawArgs: unknown) {
  const parsed = callArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { content: [{ type: "text", text: `Invalid arguments: ${parsed.error.issues[0]?.message ?? "invalid input"}` }], isError: true };
  }
  const { text, level, preserveFormatting } = parsed.data;
  const resolvedLevel = isCompressionLevel(level) ? level : COMPRESSION_LEVELS[1];
  const resolvedPreserve = isPreserveOption(preserveFormatting) ? preserveFormatting : "Yes";

  // A Cuelara personal access token (see /dashboard/mcp) identifies the caller as a specific user,
  // so their own plan's limits apply instead of the anonymous IP-based default — and paid users
  // skip the "Compressed by Cuelara.com" attribution added to free/anonymous output below.
  const token = bearerToken(req);
  let subject;
  let isFreeCaller: boolean;
  if (token) {
    const userId = await resolveUserIdFromToken(token);
    if (!userId) {
      return {
        content: [{ type: "text", text: "That Cuelara API token is invalid or has been revoked. Generate a new one at cuelara.com/dashboard/mcp." }],
        isError: true,
      };
    }
    subject = await subjectForUser(userId);
    const { plan } = await getPlanContext(userId);
    isFreeCaller = !plan || plan.priceMonthlyCents === 0;
  } else {
    subject = await getRequestSubject(req);
    isFreeCaller = true;
  }

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
    return {
      content: [{ type: "text", text: `${compressed}\n\n${stats}${attribution}` }],
      isError: false,
    };
  } catch (error) {
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
    return { content: [{ type: "text", text: "Something went wrong while compressing the prompt." }], isError: true };
  }
}

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
      return rpcResult(id, { tools: [TOOL_DEFINITION] });

    case "tools/call": {
      const { name, arguments: args } = (params as { name?: string; arguments?: unknown }) ?? {};
      if (name !== TOOL_NAME) {
        return rpcError(id, -32602, `Unknown tool "${name}". Available tools: ${TOOL_NAME}.`);
      }
      const result = await callCompressTool(req, args);
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
    description: "MCP server for Cuelara's Token Optimizer. POST JSON-RPC 2.0 requests here (initialize, tools/list, tools/call).",
    docs: "https://cuelara.com/docs#mcp",
  });
}

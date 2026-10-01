import { NextResponse } from "next/server";
import { bearerToken } from "@/lib/api-caller";
import { revokePersonalAccessTokenByValue } from "@/lib/personal-access-tokens";

export const runtime = "nodejs";

/** The extension's "Disconnect": revokes the token it is presenting, so this browser can no longer act as the user. */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "No token." }, { status: 401 });
  await revokePersonalAccessTokenByValue(token);
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}

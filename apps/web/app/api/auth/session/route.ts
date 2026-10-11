import { NextResponse } from "next/server";
import { clearSession, createSession } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store, private" };

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Expected a JSON request" }, { status: 415, headers: NO_STORE });
  }

  const body = await request.json().catch(() => null) as { accessToken?: unknown } | null;
  if (typeof body?.accessToken !== "string" || body.accessToken.length === 0 || body.accessToken.length > 8192) {
    return NextResponse.json({ error: "A valid sign-in token is required" }, { status: 400, headers: NO_STORE });
  }

  try {
    const identity = await createSession(body.accessToken);
    return NextResponse.json(identity, { headers: NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in could not be verified";
    const status = message.includes("must be configured") || message.includes("SESSION_SECRET") ? 503 : 401;
    return NextResponse.json({ error: message }, { status, headers: NO_STORE });
  }
}

export async function DELETE() {
  await clearSession();
  return new Response(null, { status: 204, headers: NO_STORE });
}

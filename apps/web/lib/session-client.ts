export type SessionIdentity = {
  providerUserId: string;
  email: string;
  walletAddress: `0x${string}`;
};

async function readResponse(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not start your Allocard session. Please try again.");
  }
  return payload;
}

export async function createSession(accessToken: string): Promise<SessionIdentity> {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ accessToken }),
  });
  return await readResponse(response) as SessionIdentity;
}

export async function clearSession() {
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  });
  await readResponse(response);
}

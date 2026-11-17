// Session cookie helpers for sign-in (#60). HttpOnly + SameSite=Lax; Secure only in
// production so local http://localhost still receives the cookie (ADR-3).

export const SESSION_COOKIE = "cea_session";

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return null;
}

export function sessionCookieHeader(sessionId: string, maxAgeSeconds: number): string {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookieHeader(): string {
  return sessionCookieHeader("", 0);
}

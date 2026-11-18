// HTTP handlers for GET/POST /api/reservations (#55, #36). Extracted so integration
// tests can exercise requester=me and session-tagged creates without the router.
import type { PublicUser } from "@/domain/auth";
import { errorResponse, json, readNewReservation } from "./api.server";
import { getAuthApi, UnauthorizedError } from "./auth.server";
import { readCookie, SESSION_COOKIE } from "./cookies.server";
import { getReservationsApi } from "./reservations.server";

/** Valid session user, or null when signed out / cookie missing or expired. */
export async function readOptionalUser(request: Request): Promise<PublicUser | null> {
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;
  try {
    const { user } = await getAuthApi().requireSession(sessionId);
    return user;
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

export async function handleListReservations(request: Request): Promise<Response> {
  try {
    const params = new URL(request.url).searchParams;
    const requester = params.get("requester");
    const from = params.get("from") ?? undefined;
    const to = params.get("to") ?? undefined;
    if (requester === "me") {
      const { user } = await getAuthApi().requireSession(readCookie(request, SESSION_COOKIE));
      return json(
        await getReservationsApi().listReservations({
          requesterId: user.id,
          from,
          to,
        }),
      );
    }
    if (requester !== null) {
      throw new TypeError('Query parameter "requester" must be "me" when set.');
    }
    return json(await getReservationsApi().listReservations({ from, to }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleCreateReservation(request: Request): Promise<Response> {
  try {
    const input = await readNewReservation(request);
    const user = await readOptionalUser(request);
    const created = await getReservationsApi().createReservation(
      input,
      user ? { id: user.id, name: user.name } : null,
    );
    return json(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

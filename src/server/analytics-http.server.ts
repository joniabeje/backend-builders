// HTTP handler for GET /api/analytics/rooms (#51). Admin-only like other analytics.
import { errorResponse, json } from "./api.server";
import { getAuthApi } from "./auth.server";
import { readCookie, SESSION_COOKIE } from "./cookies.server";
import { getReservationsApi } from "./reservations.server";

export async function handleRoomUsage(request: Request): Promise<Response> {
  try {
    await getAuthApi().requireAdmin(readCookie(request, SESSION_COOKIE));
    const params = new URL(request.url).searchParams;
    const from = params.get("from");
    const to = params.get("to");
    if (!from || !to) {
      throw new TypeError('Query parameters "from" and "to" are required (YYYY-MM-DD).');
    }
    return json(await getReservationsApi().roomUsage(from, to));
  } catch (error) {
    return errorResponse(error);
  }
}

// HTTP handler for PATCH /api/reservations/:id (#62). Extracted so the security smoke
// test (#63) can call the same path the route uses.
import { errorResponse, json, readReviewInput } from "./api.server";
import { getAuthApi } from "./auth.server";
import { readCookie, SESSION_COOKIE } from "./cookies.server";
import { getDb } from "./firestore.server";
import { ReservationsApi } from "./reservations.server";

export async function handleReviewPatch(request: Request, id: string): Promise<Response> {
  try {
    const { user } = await getAuthApi().requireAdmin(readCookie(request, SESSION_COOKIE));
    const input = await readReviewInput(request);
    const updated = await new ReservationsApi(getDb(), {
      reviewer: user.name,
    }).reviewReservation(id, input);
    return json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

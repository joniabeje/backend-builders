// Admin review rules for the Approve / Request changes / Reject workflow (issue #7).
//
// Framework-free so the repository can enforce the same feedback rule the dialog
// shows; once the reservation API exists (#13) the server can reject a bad PATCH
// with a 400 using this module unchanged.
import type { EventRequest, StatusChange } from "./reservation";

export const REVIEW_DECISIONS = ["approved", "needs-changes", "rejected"] as const;

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  approved: "Approve",
  "needs-changes": "Request changes",
  rejected: "Reject",
};

/** Trimmed length the requester must be given when a request is sent back or rejected. */
export const MIN_REVIEW_FEEDBACK_LENGTH = 10;

export type ReviewInput = {
  decision: ReviewDecision;
  feedback: string;
};

export class ReviewFeedbackError extends Error {
  constructor(decision: ReviewDecision) {
    super(
      `${REVIEW_DECISION_LABELS[decision]} needs at least ${MIN_REVIEW_FEEDBACK_LENGTH} characters of feedback.`,
    );
    this.name = "ReviewFeedbackError";
  }
}

export function isReviewDecision(value: unknown): value is ReviewDecision {
  return typeof value === "string" && (REVIEW_DECISIONS as readonly string[]).includes(value);
}

export function isFeedbackRequired(decision: ReviewDecision): boolean {
  return decision !== "approved";
}

export function isDecisionFeedbackValid(decision: ReviewDecision, feedback: string): boolean {
  return !isFeedbackRequired(decision) || feedback.trim().length >= MIN_REVIEW_FEEDBACK_LENGTH;
}

/**
 * Returns a copy of `request` with the new status and one history entry appended.
 * Throws ReviewFeedbackError when the decision needs feedback and none was given.
 */
export function applyReviewDecision(
  request: EventRequest,
  { decision, feedback }: ReviewInput,
  actor: string,
  at: string,
): EventRequest {
  if (!isDecisionFeedbackValid(decision, feedback)) throw new ReviewFeedbackError(decision);

  const trimmed = feedback.trim();
  const entry: StatusChange = {
    from: request.status,
    to: decision,
    actor,
    at,
    ...(trimmed ? { feedback: trimmed } : {}),
  };
  return { ...request, status: decision, history: [...request.history, entry] };
}

/** The most recent history entry that carries feedback, if any. */
export function latestFeedback(history: readonly StatusChange[]): StatusChange | undefined {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].feedback) return history[i];
  }
  return undefined;
}

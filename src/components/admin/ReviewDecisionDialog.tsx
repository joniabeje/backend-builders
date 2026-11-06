import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isDecisionFeedbackValid,
  isFeedbackRequired,
  MIN_REVIEW_FEEDBACK_LENGTH,
  REVIEW_DECISION_LABELS,
  type ReviewDecision,
} from "@/domain/review-decision";

export type ReviewDecisionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: { id: string; title: string };
  decision: ReviewDecision;
  onConfirm: (feedback: string) => void;
  pending?: boolean;
};

const DIALOG_TITLES: Record<ReviewDecision, string> = {
  approved: "Approve request",
  "needs-changes": "Request changes",
  rejected: "Reject request",
};

export function ReviewDecisionDialog({
  open,
  onOpenChange,
  request,
  decision,
  onConfirm,
  pending = false,
}: ReviewDecisionDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [touched, setTouched] = useState(false);
  const feedbackId = useId();
  const errorId = `${feedbackId}-error`;
  const required = isFeedbackRequired(decision);
  const valid = isDecisionFeedbackValid(decision, feedback);
  const showError = required && touched && !valid;
  const label = REVIEW_DECISION_LABELS[decision];

  useEffect(() => {
    setFeedback("");
    setTouched(false);
  }, [open, request.id, decision]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent
        className="max-w-[calc(100%-2rem)] rounded-lg sm:max-w-lg"
        aria-busy={pending}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{DIALOG_TITLES[decision]}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            <span className="font-semibold text-foreground">{request.title}</span>
            <br />
            {request.id}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (valid && !pending) onConfirm(feedback.trim());
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor={feedbackId}>
              Feedback to requester {required ? "(required)" : "(optional)"}
            </Label>
            <Textarea
              id={feedbackId}
              value={feedback}
              rows={4}
              disabled={pending}
              required={required}
              aria-invalid={showError}
              aria-describedby={required ? errorId : undefined}
              onBlur={() => setTouched(true)}
              onChange={(event) => {
                setFeedback(event.target.value);
                setTouched(true);
              }}
            />
            {required && (
              <p
                id={errorId}
                role={showError ? "alert" : undefined}
                className={`text-xs ${showError ? "text-destructive" : "text-muted-foreground"}`}
              >
                {showError
                  ? `Feedback must be at least ${MIN_REVIEW_FEEDBACK_LENGTH} characters.`
                  : `At least ${MIN_REVIEW_FEEDBACK_LENGTH} characters required.`}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={decision === "rejected" ? "destructive" : "default"}
              disabled={!valid || pending}
            >
              {pending && <Loader2 className="animate-spin" />}{" "}
              {pending ? "Saving…" : `Confirm ${label.toLowerCase()}`}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

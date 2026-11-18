// How a stored notification is handed to the outside world (#41). Default is console
// logging with no credentials; an email adapter can plug in later behind an env flag.
import type { ServiceNotification } from "@/domain/notifications";

export type NotificationDelivery = {
  deliver(notification: ServiceNotification): void | Promise<void>;
};

/**
 * Dev adapter: prints one structured line per new notification. Used locally and in
 * CI so notify() works with zero external setup.
 */
export class ConsoleNotificationAdapter implements NotificationDelivery {
  private readonly write: typeof console.info;

  constructor(write: typeof console.info = console.info.bind(console)) {
    this.write = write;
  }

  deliver(notification: ServiceNotification): void {
    this.write(
      `[cea:notify:${notification.service}] ${notification.reservationId} — ${notification.title}`,
      notification.details,
    );
  }
}

/** Default delivery for local/dev. Swap for email when credentials exist. */
export function createNotificationDelivery(
  env: { NOTIFICATION_DELIVERY?: string } = process.env,
): NotificationDelivery {
  const mode = (env.NOTIFICATION_DELIVERY ?? "console").toLowerCase();
  if (mode === "console") return new ConsoleNotificationAdapter();
  // Email (and others) land later; fall back to console so notify never hard-fails.
  return new ConsoleNotificationAdapter();
}

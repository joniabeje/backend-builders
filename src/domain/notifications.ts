// Notification services for IT / custodial / security coordination (#40 / F12).
// Framework-free so the server module and tests share one vocabulary.

export const NOTIFICATION_SERVICES = ["it", "custodial", "security"] as const;

export type NotificationService = (typeof NOTIFICATION_SERVICES)[number];

export function isNotificationService(value: unknown): value is NotificationService {
  return typeof value === "string" && (NOTIFICATION_SERVICES as readonly string[]).includes(value);
}

/**
 * Stable Firestore document id: one row per reservation per service (#40).
 * Optional `variant` (e.g. custodial `setup` / `cleanup`) keeps multiple rows
 * for the same service without colliding (#45).
 */
export function notificationId(
  reservationId: string,
  service: NotificationService,
  variant?: string,
): string {
  return variant ? `${reservationId}_${service}_${variant}` : `${reservationId}_${service}`;
}

/**
 * Extra fields shown to the service desk (date, time, room, equipment, …).
 * Values are plain strings so adapters can log or email them without guessing types.
 */
export type NotificationDetails = Readonly<Record<string, string>>;

export type ServiceNotification = {
  id: string;
  service: NotificationService;
  reservationId: string;
  /** Event title copied at notify time for readable listings. */
  title: string;
  details: NotificationDetails;
  /** ISO-8601 timestamp when the row was first written. */
  createdAt: string;
};

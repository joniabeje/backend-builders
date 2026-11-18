// Notifications module (#40): notify(service, reservation, details) stores at most one
// row per reservation per service. Listing by service supports the service-desk views.
import type { Firestore } from "firebase-admin/firestore";
import {
  isNotificationService,
  notificationId,
  type NotificationDetails,
  type NotificationService,
  type ServiceNotification,
} from "@/domain/notifications";
import type { EventRequest } from "@/domain/reservation";
import { getDb } from "./firestore.server";
import { COLLECTIONS, type NotificationDoc } from "./schema.server";

export type NotificationsApiOptions = {
  now?: () => Date;
};

export class NotificationsApi {
  private readonly db: Firestore;
  private readonly now: () => Date;

  constructor(db: Firestore = getDb(), { now = () => new Date() }: NotificationsApiOptions = {}) {
    this.db = db;
    this.now = now;
  }

  /**
   * Stores a notification for `service`. If that reservation already notified the
   * service, returns the existing row and writes nothing (idempotent for #42/#43).
   */
  async notify(
    service: NotificationService,
    reservation: Pick<EventRequest, "id" | "title">,
    details: NotificationDetails,
  ): Promise<ServiceNotification> {
    if (!isNotificationService(service)) {
      throw new TypeError(`Unknown notification service: ${String(service)}`);
    }
    const id = notificationId(reservation.id, service);
    const ref = this.db.collection(COLLECTIONS.notifications).doc(id);
    const existing = await ref.get();
    if (existing.exists) {
      return fromNotificationDoc(id, existing.data() as NotificationDoc);
    }

    const doc: NotificationDoc = {
      service,
      reservationId: reservation.id,
      title: reservation.title,
      details: { ...details },
      createdAt: this.now().toISOString(),
    };
    await ref.create(doc);
    return fromNotificationDoc(id, doc);
  }

  /** All notifications for one service, newest first. */
  async listByService(service: NotificationService): Promise<ServiceNotification[]> {
    if (!isNotificationService(service)) {
      throw new TypeError(`Unknown notification service: ${String(service)}`);
    }
    const snapshot = await this.db
      .collection(COLLECTIONS.notifications)
      .where("service", "==", service)
      .get();
    return snapshot.docs
      .map((doc) => fromNotificationDoc(doc.id, doc.data() as NotificationDoc))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function getNotificationsApi(): NotificationsApi {
  return new NotificationsApi();
}

function fromNotificationDoc(id: string, doc: NotificationDoc): ServiceNotification {
  return {
    id,
    service: doc.service,
    reservationId: doc.reservationId,
    title: doc.title,
    details: { ...doc.details },
    createdAt: doc.createdAt,
  };
}

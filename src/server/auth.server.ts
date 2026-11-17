// Email/password sign-in and sessions (#60). Admin checks for mutations (#62).
import { randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { isRole, type PublicUser, type Role } from "@/domain/auth";
import { getDb } from "./firestore.server";
import { hashPassword, verifyPassword } from "./password.server";
import { COLLECTIONS, type SessionDoc, type UserDoc } from "./schema.server";
import { SEED_ACCOUNTS, type SeedAccount } from "./seed-accounts";

/** Seven days. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Sign in required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Signed in, but the role cannot perform this action. Maps to HTTP 403 (#62). */
export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type AuthSession = {
  id: string;
  userId: string;
  role: Role;
  expiresAt: string;
};

export type AuthApiOptions = {
  now?: () => Date;
  sessionTtlMs?: number;
};

export class AuthApi {
  private readonly db: Firestore;
  private readonly now: () => Date;
  private readonly sessionTtlMs: number;

  constructor(
    db: Firestore = getDb(),
    { now = () => new Date(), sessionTtlMs = SESSION_TTL_MS }: AuthApiOptions = {},
  ) {
    this.db = db;
    this.now = now;
    this.sessionTtlMs = sessionTtlMs;
  }

  /** Idempotent: fixed user ids, re-hashing the documented demo passwords. */
  async seedAccounts(accounts: readonly SeedAccount[] = SEED_ACCOUNTS): Promise<number> {
    const batch = this.db.batch();
    for (const account of accounts) {
      const { passwordHash, passwordSalt } = await hashPassword(account.password);
      const doc: UserDoc = {
        email: account.email.toLowerCase(),
        name: account.name,
        role: account.role,
        passwordHash,
        passwordSalt,
      };
      batch.set(this.db.collection(COLLECTIONS.users).doc(account.id), doc);
    }
    await batch.commit();
    return accounts.length;
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<{ session: AuthSession; user: PublicUser }> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || password === "") throw new InvalidCredentialsError();

    const snapshot = await this.db
      .collection(COLLECTIONS.users)
      .where("email", "==", normalized)
      .limit(1)
      .get();
    if (snapshot.empty) throw new InvalidCredentialsError();

    const userDoc = snapshot.docs[0];
    const data = userDoc.data() as UserDoc;
    if (!isRole(data.role)) throw new InvalidCredentialsError();

    const ok = await verifyPassword(password, {
      passwordHash: data.passwordHash,
      passwordSalt: data.passwordSalt,
    });
    if (!ok) throw new InvalidCredentialsError();

    const sessionId = randomUUID();
    const expiresAt = new Date(this.now().getTime() + this.sessionTtlMs).toISOString();
    const sessionDoc: SessionDoc = {
      userId: userDoc.id,
      role: data.role,
      expiresAt,
    };
    await this.db.collection(COLLECTIONS.sessions).doc(sessionId).set(sessionDoc);

    return {
      session: { id: sessionId, ...sessionDoc },
      user: toPublicUser(userDoc.id, data),
    };
  }

  async signOut(sessionId: string | null): Promise<void> {
    if (!sessionId) return;
    await this.db.collection(COLLECTIONS.sessions).doc(sessionId).delete();
  }

  /**
   * Loads a valid session and its user. Expired sessions are deleted and treated as
   * signed out. Used by /api/auth/me and protected mutations (#62).
   */
  async requireSession(
    sessionId: string | null,
  ): Promise<{ session: AuthSession; user: PublicUser }> {
    if (!sessionId) throw new UnauthorizedError();

    const sessionRef = this.db.collection(COLLECTIONS.sessions).doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) throw new UnauthorizedError();

    const sessionData = sessionSnap.data() as SessionDoc;
    if (!isRole(sessionData.role)) {
      await sessionRef.delete();
      throw new UnauthorizedError();
    }
    if (Date.parse(sessionData.expiresAt) <= this.now().getTime()) {
      await sessionRef.delete();
      throw new UnauthorizedError("Session expired. Sign in again.");
    }

    const userSnap = await this.db.collection(COLLECTIONS.users).doc(sessionData.userId).get();
    if (!userSnap.exists) {
      await sessionRef.delete();
      throw new UnauthorizedError();
    }
    const userData = userSnap.data() as UserDoc;
    if (!isRole(userData.role)) throw new UnauthorizedError();

    return {
      session: {
        id: sessionId,
        userId: sessionData.userId,
        role: sessionData.role,
        expiresAt: sessionData.expiresAt,
      },
      user: toPublicUser(userSnap.id, userData),
    };
  }

  /** Like requireSession, but only the admin role may continue (#62). */
  async requireAdmin(
    sessionId: string | null,
  ): Promise<{ session: AuthSession; user: PublicUser }> {
    const current = await this.requireSession(sessionId);
    if (current.user.role !== "admin") {
      throw new ForbiddenError("Admin role required to review reservations.");
    }
    return current;
  }
}

export function getAuthApi(): AuthApi {
  return new AuthApi();
}

function toPublicUser(id: string, doc: UserDoc): PublicUser {
  return { id, email: doc.email, name: doc.name, role: doc.role };
}

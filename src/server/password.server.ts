// scrypt password hashing for our own email/password sign-in (docs/ARCHITECTURE.md ADR-3).
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export type PasswordRecord = {
  passwordHash: string;
  passwordSalt: string;
};

export async function hashPassword(password: string): Promise<PasswordRecord> {
  const passwordSalt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, passwordSalt, KEY_LENGTH)) as Buffer;
  return { passwordHash: derived.toString("hex"), passwordSalt };
}

export async function verifyPassword(
  password: string,
  { passwordHash, passwordSalt }: PasswordRecord,
): Promise<boolean> {
  const derived = (await scryptAsync(password, passwordSalt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(passwordHash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

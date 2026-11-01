// Verschlüsselung von Plattform-Zugangsdaten: AES-256-GCM, Schlüssel nur in TOKEN_ENCRYPTION_KEY (32 Byte, Base64).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type Sealed = { ciphertext: Buffer; iv: Buffer; authTag: Buffer };

export function encryptionKey(raw = process.env.TOKEN_ENCRYPTION_KEY): Buffer {
  const key = Buffer.from(raw ?? "", "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY fehlt oder ist kein 32-Byte-Schlüssel (Base64)");
  return key;
}

export function seal(plain: string, key = encryptionKey()): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

/** Wirft, wenn Daten verändert wurden oder der Schlüssel nicht passt. */
export function open(sealed: Sealed, key = encryptionKey()): string {
  const decipher = createDecipheriv("aes-256-gcm", key, sealed.iv);
  decipher.setAuthTag(sealed.authTag);
  return Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]).toString("utf8");
}

/** Kompakte Textform (z. B. für ein kurzlebiges Cookie): iv.tag.daten in base64url */
export function sealToString(plain: string, key = encryptionKey()): string {
  const s = seal(plain, key);
  return [s.iv, s.authTag, s.ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function openFromString(value: string, key = encryptionKey()): string | null {
  const [iv, authTag, ciphertext] = value.split(".");
  if (!iv || !authTag || !ciphertext) return null;
  try {
    return open({ iv: Buffer.from(iv, "base64url"), authTag: Buffer.from(authTag, "base64url"), ciphertext: Buffer.from(ciphertext, "base64url") }, key);
  } catch {
    return null;
  }
}

// Postgres bytea über PostgREST: Hex-Schreibweise \x…
export const toBytea = (b: Buffer) => `\\x${b.toString("hex")}`;
export const fromBytea = (s: string) => Buffer.from(s.replace(/^\\x/, ""), "hex");

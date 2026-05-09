/**
 * Cookie signing/verification using Web Crypto API (HMAC-SHA256).
 * No external dependencies — compatible with Next.js Edge runtime.
 */

const ALGORITHM = { name: "HMAC", hash: "SHA-256" };
const SEPARATOR = ".";

async function importKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode(secret), ALGORITHM, false, [
    "sign",
    "verify",
  ]);
}

/** Returns a base64url string. */
function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Decodes a base64url string to Uint8Array backed by a plain ArrayBuffer. */
function fromBase64url(str: string): Uint8Array<ArrayBuffer> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

/**
 * Signs `payload` with `secret` and returns a token string.
 * Format: base64url(payload_json) + "." + base64url(signature)
 */
export async function sign(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await importKey(secret);
  const payloadB64 = toBase64url(enc.encode(JSON.stringify(payload)).buffer as ArrayBuffer);
  const sig = await crypto.subtle.sign(ALGORITHM.name, key, enc.encode(payloadB64));
  return `${payloadB64}${SEPARATOR}${toBase64url(sig)}`;
}

/**
 * Verifies `token` with `secret`.
 * Returns the parsed payload if valid, or `null` if the signature is invalid.
 */
export async function verify(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  const enc = new TextEncoder();
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    ALGORITHM.name,
    key,
    fromBase64url(sigB64),
    enc.encode(payloadB64)
  );

  if (!valid) return null;

  try {
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(fromBase64url(payloadB64)));
  } catch {
    return null;
  }
}

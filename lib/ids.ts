// Makes a new unique id for an entry or pouch.
//
// crypto.randomUUID() only exists on "secure" pages (https:// or localhost).
// Opening the app from a phone at http://192.168.x.x:3000 is not secure, so
// we fall back to 16 random bytes written as 32 hex characters.

type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues: <T extends Uint8Array>(array: T) => T;
};

export function newId(cryptoSource: CryptoLike = globalThis.crypto): string {
  if (typeof cryptoSource.randomUUID === "function") {
    return cryptoSource.randomUUID();
  }
  const bytes = cryptoSource.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

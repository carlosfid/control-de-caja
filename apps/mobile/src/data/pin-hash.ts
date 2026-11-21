const encoder = new TextEncoder();

async function subtle(): Promise<SubtleCrypto> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto API no está disponible');
  return globalThis.crypto.subtle;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function createPinSalt(): Promise<string> {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const bytes = await (await subtle()).digest('SHA-256', encoder.encode(`${salt}:${pin}`));
  return toHex(bytes);
}

export async function verifyPinHash(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  const actual = await hashPin(pin, salt);
  if (actual.length !== expectedHash.length) return false;
  let different = 0;
  for (let index = 0; index < actual.length; index += 1) {
    different |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  }
  return different === 0;
}

/**
 * Verify WASM module integrity at runtime using SHA-384.
 * Prevents supply-chain attacks where a compromised CDN serves malicious WASM.
 */
export async function verifyWasmIntegrity(
  bytes: ArrayBuffer,
  expectedHash: string,
): Promise<boolean> {
  const hashBuffer = await crypto.subtle.digest("SHA-384", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex === expectedHash;
}
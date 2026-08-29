function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function sha256WithMozilla(bytes: Uint8Array) {
  const runtime = globalThis as any;
  const hasher = runtime.Components?.classes?.[
    "@mozilla.org/security/hash;1"
  ]?.createInstance?.(runtime.Components?.interfaces?.nsICryptoHash);
  if (!hasher) {
    return "";
  }
  hasher.init(hasher.SHA256);
  hasher.update(bytes, bytes.length);
  const binary = String(hasher.finish(false) || "");
  return Array.from(binary, (character) =>
    character.charCodeAt(0).toString(16).padStart(2, "0"),
  ).join("");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const runtime = globalThis as {
    crypto?: {
      subtle?: {
        digest?: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
      };
    };
  };
  if (typeof runtime.crypto?.subtle?.digest === "function") {
    const digest = await runtime.crypto.subtle.digest("SHA-256", bytes);
    return bytesToHex(new Uint8Array(digest));
  }
  const mozillaDigest = sha256WithMozilla(bytes);
  if (mozillaDigest) {
    return mozillaDigest;
  }
  throw new Error("No SHA-256 runtime service is available");
}

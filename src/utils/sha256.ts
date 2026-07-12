type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type MozillaCryptoHash = {
  init: (algorithm: unknown) => void;
  update: (bytes: number[], length: number) => void;
  finish: (ascii: boolean) => string;
};

type MozillaCryptoHashFactory = {
  createInstance: (contract: unknown) => MozillaCryptoHash;
};

type MozillaCryptoHashInterface = {
  SHA256: unknown;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function sha256Hex(bytes: Uint8Array) {
  const runtime = globalThis as {
    crypto?: {
      subtle?: {
        digest?: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
      };
    };
    Components?: {
      classes?: Record<string, MozillaCryptoHashFactory | undefined>;
      interfaces?: { nsICryptoHash?: MozillaCryptoHashInterface };
    };
    Cc?: Record<string, MozillaCryptoHashFactory | undefined>;
    Ci?: { nsICryptoHash?: MozillaCryptoHashInterface };
    process?: unknown;
  };
  const subtle = runtime.crypto?.subtle;
  if (typeof subtle?.digest === "function") {
    return bytesToHex(new Uint8Array(await subtle.digest("SHA-256", bytes)));
  }

  const hashFactory =
    runtime.Components?.classes?.["@mozilla.org/security/hash;1"] ||
    runtime.Cc?.["@mozilla.org/security/hash;1"];
  const nsICryptoHash =
    runtime.Components?.interfaces?.nsICryptoHash || runtime.Ci?.nsICryptoHash;
  if (hashFactory && nsICryptoHash) {
    const hash = hashFactory.createInstance(nsICryptoHash);
    hash.init(nsICryptoHash.SHA256);
    hash.update(Array.from(bytes), bytes.length);
    return bytesToHex(
      Uint8Array.from(String(hash.finish(false)), (char) => char.charCodeAt(0)),
    );
  }

  if (!runtime.process) {
    return undefined;
  }
  try {
    const crypto = await dynamicImport("crypto");
    if (typeof crypto?.createHash !== "function") {
      return undefined;
    }
    return crypto.createHash("sha256").update(bytes).digest("hex") as string;
  } catch {
    return undefined;
  }
}

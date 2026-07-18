export type SynthesisCanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | SynthesisCanonicalJsonValue[]
  | { [key: string]: SynthesisCanonicalJsonValue };

export type SynthesisCanonicalJsonErrorCode =
  | "canonical_cycle"
  | "canonical_unpaired_surrogate";

export type SynthesisCanonicalJsonArtifact = {
  text: string;
  bytes: Uint8Array;
  byteLength: number;
  sha256: string;
};

export class SynthesisCanonicalJsonError extends Error {
  readonly code: SynthesisCanonicalJsonErrorCode;
  readonly location: string;

  constructor(code: SynthesisCanonicalJsonErrorCode, location: string) {
    super(`Synthesis canonical JSON is invalid at ${location}: ${code}`);
    this.name = "SynthesisCanonicalJsonError";
    this.code = code;
    this.location = location;
  }
}

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

export function hasUnpairedSynthesisSurrogate(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function assertValidString(value: string, location: string) {
  if (hasUnpairedSynthesisSurrogate(value)) {
    throw new SynthesisCanonicalJsonError(
      "canonical_unpaired_surrogate",
      location,
    );
  }
}

function utf8BytesUnchecked(input: string) {
  const bytes: number[] = [];
  for (const character of input) {
    const codePoint = character.codePointAt(0)!;
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

export function encodeSynthesisContractText(input: string) {
  assertValidString(input, "$text");
  return utf8BytesUnchecked(input);
}

export function byteLengthSynthesisContractText(input: unknown) {
  return encodeSynthesisContractText(String(input ?? "")).byteLength;
}

function rightRotate(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256Hex(bytes: Uint8Array) {
  const bitLength = bytes.length * 8;
  const withOne = bytes.length + 1;
  const paddedLength = Math.ceil((withOne + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Uint32Array(64);

  for (let chunk = 0; chunk < paddedLength; chunk += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(chunk + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 =
        rightRotate(words[index - 15], 7) ^
        rightRotate(words[index - 15], 18) ^
        (words[index - 15] >>> 3);
      const s1 =
        rightRotate(words[index - 2], 17) ^
        rightRotate(words[index - 2], 19) ^
        (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((value) => value.toString(16).padStart(8, "0"))
    .join("");
}

function compareUtf16CodeUnits(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function formatLocation(path: readonly (string | number)[]) {
  return path.reduce<string>(
    (location, segment) =>
      typeof segment === "number"
        ? `${location}[${segment}]`
        : `${location}.${segment}`,
    "$",
  );
}

function normalizeJson(
  value: unknown,
  path: (string | number)[],
  seen: Set<object>,
): SynthesisCanonicalJsonValue {
  if (value === undefined) return null;
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    assertValidString(value, formatLocation(path));
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) {
    throw new SynthesisCanonicalJsonError(
      "canonical_cycle",
      formatLocation(path),
    );
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const output: SynthesisCanonicalJsonValue[] = [];
      for (const [index, entry] of value.entries()) {
        path.push(index);
        output.push(normalizeJson(entry, path, seen));
        path.pop();
      }
      return output;
    }
    const output: Record<string, SynthesisCanonicalJsonValue> = {};
    for (const key of Object.keys(value).sort(compareUtf16CodeUnits)) {
      path.push("$key");
      assertValidString(key, formatLocation(path));
      path.pop();
      if ((value as Record<string, unknown>)[key] === undefined) continue;
      path.push(key);
      output[key] = normalizeJson(
        (value as Record<string, unknown>)[key],
        path,
        seen,
      );
      path.pop();
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

export function sha256SynthesisContractText(input: unknown) {
  return sha256SynthesisContractBytes(
    encodeSynthesisContractText(String(input ?? "")),
  );
}

export function sha256SynthesisContractBytes(input: Uint8Array) {
  return `sha256:${sha256Hex(input)}`;
}

export function canonicalizeSynthesisContractJson(value: unknown) {
  return JSON.stringify(normalizeJson(value, [], new Set<object>()));
}

export function canonicalizeSynthesisContractJsonArtifact(
  value: unknown,
): SynthesisCanonicalJsonArtifact {
  const text = canonicalizeSynthesisContractJson(value);
  const bytes = utf8BytesUnchecked(text);
  return {
    text,
    bytes,
    byteLength: bytes.byteLength,
    sha256: sha256SynthesisContractBytes(bytes),
  };
}

export function countSynthesisContractJsonNodes(value: unknown) {
  let count = 0;
  const visit = (entry: unknown) => {
    count += 1;
    if (Array.isArray(entry)) {
      entry.forEach(visit);
    } else if (entry && typeof entry === "object") {
      for (const [key, child] of Object.entries(entry)) {
        visit(key);
        visit(child);
      }
    }
  };
  visit(value);
  return count;
}

export function hashSynthesisContractCanonicalJson(value: unknown) {
  return canonicalizeSynthesisContractJsonArtifact(value).sha256;
}

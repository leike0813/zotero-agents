const dynamicImport = new Function("specifier", "return import(specifier)");
function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
export async function createSha256Accumulator() {
    const runtime = globalThis;
    const hashFactory = runtime.Components?.classes?.["@mozilla.org/security/hash;1"] ||
        runtime.Cc?.["@mozilla.org/security/hash;1"];
    const nsICryptoHash = runtime.Components?.interfaces?.nsICryptoHash || runtime.Ci?.nsICryptoHash;
    if (hashFactory && nsICryptoHash) {
        const hash = hashFactory.createInstance(nsICryptoHash);
        hash.init(nsICryptoHash.SHA256);
        return {
            update(bytes) {
                hash.update(Array.from(bytes), bytes.byteLength);
            },
            digestHex() {
                return bytesToHex(Uint8Array.from(String(hash.finish(false)), (char) => char.charCodeAt(0)));
            },
        };
    }
    if (!runtime.process) {
        return undefined;
    }
    try {
        const crypto = await dynamicImport("crypto");
        if (typeof crypto?.createHash !== "function") {
            return undefined;
        }
        const hash = crypto.createHash("sha256");
        return {
            update(bytes) {
                hash.update(bytes);
            },
            digestHex() {
                return hash.digest("hex");
            },
        };
    }
    catch {
        return undefined;
    }
}
export async function sha256Hex(bytes) {
    const runtime = globalThis;
    const subtle = runtime.crypto?.subtle;
    if (typeof subtle?.digest === "function") {
        return bytesToHex(new Uint8Array(await subtle.digest("SHA-256", bytes)));
    }
    const accumulator = await createSha256Accumulator();
    accumulator?.update(bytes);
    return accumulator?.digestHex();
}
export async function sha256PrefixedHex(bytes) {
    const digest = await sha256Hex(bytes);
    return digest ? `sha256:${digest}` : undefined;
}

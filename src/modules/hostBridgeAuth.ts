import { getPref, setPref } from "../utils/prefs";

const TOKEN_BYTES = 24;
const MASK_PREFIX = 6;
const MASK_SUFFIX = 4;

function nowIso() {
  return new Date().toISOString();
}

export function generateHostBridgeToken() {
  const cryptoLike = (globalThis as { crypto?: Crypto }).crypto;
  if (!cryptoLike?.getRandomValues) {
    throw new Error(
      "Secure random source is unavailable for Host Bridge token generation",
    );
  }
  const bytes = new Uint8Array(TOKEN_BYTES);
  cryptoLike.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function redactHostBridgeToken(token: string) {
  const normalized = String(token || "").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= MASK_PREFIX + MASK_SUFFIX) {
    return "****";
  }
  return `${normalized.slice(0, MASK_PREFIX)}...${normalized.slice(-MASK_SUFFIX)}`;
}

export function getHostBridgeToken() {
  const existing = String(getPref("hostBridgeToken") || "").trim();
  if (existing) {
    return existing;
  }
  const token = generateHostBridgeToken();
  const createdAt = nowIso();
  setPref("hostBridgeToken", token);
  setPref("hostBridgeTokenCreatedAt", createdAt);
  setPref("hostBridgeTokenRotatedAt", "");
  return token;
}

export function rotateHostBridgeToken() {
  const token = generateHostBridgeToken();
  const now = nowIso();
  if (!String(getPref("hostBridgeTokenCreatedAt") || "").trim()) {
    setPref("hostBridgeTokenCreatedAt", now);
  }
  setPref("hostBridgeToken", token);
  setPref("hostBridgeTokenRotatedAt", now);
  return {
    token,
    tokenMasked: redactHostBridgeToken(token),
    rotatedAt: now,
  };
}

export function isHostBridgeAuthorizationValid(
  headers: Record<string, string>,
  expectedToken = getHostBridgeToken(),
) {
  const authorization = String(headers.authorization || "").trim();
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) {
    return false;
  }
  const token = authorization.slice(prefix.length).trim();
  return token.length > 0 && token === expectedToken;
}

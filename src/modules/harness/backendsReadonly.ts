import { normalizeBackendDisplayName } from "../../backends/identity";
import type { BackendInstance, LoadedBackends } from "../../backends/types";
import {
  ACP_BACKEND_TYPE,
  BACKEND_TYPES,
  type BackendType,
} from "../../config/defaults";
import { listBuiltinAcpBackends } from "../acpBackendPresets";
import { getPref } from "../../utils/prefs";

const BACKENDS_CONFIG_PREF_KEY = "backendsConfigJson";
const LEGACY_REMOVED_BACKEND_IDS = new Set(["skillrunner-local"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : ([] as string[]);
}

function stringMap(value: unknown) {
  if (!isObject(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [cleanString(key), cleanString(entry)] as const)
      .filter(([key, entry]) => key && entry),
  );
}

function normalizeBackendType(value: unknown): BackendType | null {
  const normalized = cleanString(value);
  return BACKEND_TYPES.includes(normalized as BackendType)
    ? (normalized as BackendType)
    : null;
}

function normalizeBackendEntry(
  entry: unknown,
  index: number,
): { backend?: BackendInstance; error?: string } {
  if (!isObject(entry)) {
    return { error: `entry[${index}] must be an object` };
  }
  const id = cleanString(entry.id);
  const typeRaw = cleanString(entry.type);
  const type = normalizeBackendType(typeRaw);
  if (!id) return { error: `entry[${index}] missing id` };
  if (!type) {
    return {
      error: `entry[${index}] (${id}) type must be one of ${BACKEND_TYPES.join(", ")}`,
    };
  }
  if (LEGACY_REMOVED_BACKEND_IDS.has(id)) {
    return { error: `entry[${index}] (${id}) is a removed legacy backend` };
  }
  const backend: BackendInstance = {
    id,
    type,
    displayName: normalizeBackendDisplayName(entry.displayName, id),
    baseUrl:
      cleanString(entry.baseUrl) ||
      (type === ACP_BACKEND_TYPE ? `local://${id}` : ""),
    command: cleanString(entry.command) || undefined,
    args: stringArray(entry.args),
    env: stringMap(entry.env),
    auth: isObject(entry.auth)
      ? {
          kind: cleanString(entry.auth.kind) === "bearer" ? "bearer" : "none",
          token: cleanString(entry.auth.token) || undefined,
        }
      : undefined,
    defaults: isObject(entry.defaults)
      ? {
          headers: stringMap(entry.defaults.headers),
          timeout_ms: Number.isFinite(Number(entry.defaults.timeout_ms))
            ? Number(entry.defaults.timeout_ms)
            : undefined,
        }
      : undefined,
    management_auth: isObject(entry.management_auth)
      ? {
          kind:
            cleanString(entry.management_auth.kind) === "basic"
              ? "basic"
              : "none",
          username: cleanString(entry.management_auth.username) || undefined,
          password: cleanString(entry.management_auth.password) || undefined,
        }
      : undefined,
    acp: isObject(entry.acp)
      ? {
          agentFamily: cleanString(entry.acp.agentFamily) as NonNullable<
            BackendInstance["acp"]
          >["agentFamily"],
          skillRoots: stringArray(entry.acp.skillRoots),
          connectionTest: isObject(entry.acp.connectionTest)
            ? { ...(entry.acp.connectionTest as any) }
            : undefined,
          runtimeOptionsCache: isObject(entry.acp.runtimeOptionsCache)
            ? { ...(entry.acp.runtimeOptionsCache as any) }
            : undefined,
        }
      : undefined,
  };
  return { backend };
}

function parseBackendsDocument(raw: string) {
  const parsed = raw ? JSON.parse(raw) : { backends: [] };
  if (Array.isArray(parsed)) return parsed;
  if (isObject(parsed) && Array.isArray(parsed.backends)) {
    return parsed.backends;
  }
  throw new Error("Backends config must be an array or object with backends[]");
}

function mergeBuiltinBackends(backends: BackendInstance[]) {
  const next = [...backends];
  const seenIds = new Set(next.map((backend) => backend.id));
  for (const builtin of listBuiltinAcpBackends()) {
    if (!seenIds.has(builtin.id)) {
      next.push(builtin);
      seenIds.add(builtin.id);
    }
  }
  return next;
}

export async function loadBackendsRegistryReadonly(): Promise<LoadedBackends> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const invalidBackends: Record<string, string> = {};
  const raw = cleanString(getPref(BACKENDS_CONFIG_PREF_KEY));
  let entries: unknown[] = [];
  try {
    entries = parseBackendsDocument(raw);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  const backends: BackendInstance[] = [];
  const seenIds = new Set<string>();
  entries.forEach((entry, index) => {
    const normalized = normalizeBackendEntry(entry, index);
    if (!normalized.backend) {
      const reason = normalized.error || `entry[${index}] invalid`;
      errors.push(reason);
      return;
    }
    if (seenIds.has(normalized.backend.id)) {
      const reason = `duplicated backend id "${normalized.backend.id}"`;
      errors.push(reason);
      invalidBackends[normalized.backend.id] = reason;
      return;
    }
    seenIds.add(normalized.backend.id);
    backends.push(normalized.backend);
  });
  for (const reason of errors) {
    const idMatch = reason.match(/(?:\(|id ")([^)"\s]+)(?:\)|")?/);
    if (idMatch?.[1]) {
      invalidBackends[idMatch[1]] = reason;
    }
  }
  if (!raw) {
    warnings.push("Readonly harness did not find backendsConfigJson.");
  }
  return {
    sourcePath: "zotero-prefs:backendsConfigJson",
    backends: mergeBuiltinBackends(backends),
    warnings,
    errors,
    invalidBackends,
  };
}

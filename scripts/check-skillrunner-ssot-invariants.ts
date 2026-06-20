import { readFileSync } from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import { SKILLRUNNER_SSOT_FACTS } from "../src/modules/skillRunnerSsoFacts";

type InvariantItem = {
  id: string;
  domain: string;
  type: string;
  current_value: unknown;
  code_refs: string[];
  doc_refs: string[];
  spec_refs: string[];
  must: string;
};

type InvariantFile = {
  invariants: InvariantItem[];
};

const ROOT = process.cwd();
const REQUIRED_FIELDS: (keyof InvariantItem)[] = [
  "id",
  "domain",
  "type",
  "current_value",
  "code_refs",
  "doc_refs",
  "spec_refs",
  "must",
];

const FILES: {
  path: string;
  requiredIds: string[];
}[] = [
  {
    path: "doc/components/skillrunner-provider-state-machine-ssot.invariants.yaml",
    requiredIds: [
      "INV-PROV-STATE-SETS",
      "INV-PROV-WRITE-NONTERMINAL-EVENTS",
      "INV-PROV-WRITE-TERMINAL-JOBS",
      "INV-PROV-BACKEND-HEALTH-BACKOFF",
      "INV-PROV-BACKEND-REACHABILITY-POLICY",
      "INV-PROV-STREAM-EVENT-RUNNING-ONLY",
      "INV-PROV-STARTUP-RUNNING-ONLY-RECONNECT",
      "INV-PROV-UI-GATING-BACKEND-FLAG",
      "INV-PROV-NO-LEGACY-ID",
      "INV-PROV-MANAGED-LOCAL-REGISTER-ONLY-AFTER-DEPLOY",
      "INV-PROV-APPLY-OWNER-AUTO",
      "INV-PROV-APPLY-OWNER-INTERACTIVE",
      "INV-PROV-FOREGROUND-APPLY-SINGLE",
      "INV-PROV-RECONCILER-ONE-SHOT-MISSING-CONTEXT",
    ],
  },
  {
    path: "doc/components/skillrunner-provider-global-run-workspace-tabs-ssot.invariants.yaml",
    requiredIds: [
      "INV-WS-RUN-DIALOG-SINGLETON",
      "INV-WS-CHAT-SSE-SINGLE-OWNER",
      "INV-WS-STATE-RENDER-FROM-LEDGER",
      "INV-WS-BACKEND-FLAGGED-GROUP-DISABLED",
      "INV-WS-FIRST-FRAME-NO-FORCED-RUNNING",
      "INV-WS-PENDING-EDGE-RULES",
    ],
  },
];

const FACT_ROOT: Record<string, unknown> = {
  SKILLRUNNER_SSOT_FACTS,
};

function readText(relPath: string) {
  const absPath = path.join(ROOT, relPath);
  return readFileSync(absPath, "utf8");
}

function parseInvariantFile(relPath: string): InvariantFile {
  const raw = readText(relPath);
  try {
    const parsed = parseYaml(raw) as InvariantFile;
    return parsed;
  } catch (error) {
    throw new Error(
      `[ssot-invariants] invalid YAML at ${relPath}: ${String(error)}`,
    );
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        return false;
      }
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function resolveRef(ref: string): unknown {
  const segments = ref.split(".").filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }
  let cursor: unknown = FACT_ROOT;
  for (const segment of segments) {
    if (!isObject(cursor) && !Array.isArray(cursor)) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
}

function lastRefSegment(ref: string) {
  const parts = ref.split(".").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "";
}

function assertInvariantShape(
  filePath: string,
  entry: InvariantItem,
  errors: string[],
) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in entry)) {
      errors.push(
        `[shape] file=${filePath} invariant=${String(
          entry?.id || "<missing>",
        )} missing field: ${String(field)}`,
      );
    }
  }
  if (!entry.id || typeof entry.id !== "string") {
    errors.push(`[shape] file=${filePath} invariant has invalid id`);
  }
  for (const listField of ["code_refs", "doc_refs", "spec_refs"] as const) {
    const value = entry[listField];
    if (!Array.isArray(value) || value.length === 0) {
      errors.push(
        `[shape] file=${filePath} invariant=${entry.id} field=${listField} must be non-empty array`,
      );
    }
  }
}

function assertRefContainsId(
  refType: "doc_refs" | "spec_refs",
  refPath: string,
  invariantId: string,
  errors: string[],
) {
  try {
    const content = readText(refPath);
    if (!content.includes(invariantId)) {
      errors.push(
        `[ref-missing-id] invariant=${invariantId} ${refType}=${refPath} does not contain id`,
      );
    }
  } catch {
    errors.push(
      `[ref-missing-file] invariant=${invariantId} ${refType}=${refPath} not found`,
    );
  }
}

function assertCurrentMatchesFacts(entry: InvariantItem, errors: string[]) {
  const resolved = entry.code_refs.map((ref) => ({
    ref,
    value: resolveRef(ref),
  }));
  for (const item of resolved) {
    if (typeof item.value === "undefined") {
      errors.push(
        `[code-ref] invariant=${entry.id} unresolved code_ref=${item.ref}`,
      );
    }
  }
  if (resolved.some((item) => typeof item.value === "undefined")) {
    return;
  }

  if (resolved.length === 1) {
    const only = resolved[0];
    const key = lastRefSegment(only.ref);
    if (
      isObject(entry.current_value) &&
      key &&
      Object.prototype.hasOwnProperty.call(entry.current_value, key)
    ) {
      const currentValueByKey = (
        entry.current_value as Record<string, unknown>
      )[key];
      if (!deepEqual(currentValueByKey, only.value)) {
        errors.push(
          `[fact-mismatch] invariant=${entry.id} key=${key} expected=${JSON.stringify(
            only.value,
          )} actual=${JSON.stringify(currentValueByKey)}`,
        );
      }
      return;
    }
    if (!deepEqual(entry.current_value, only.value)) {
      errors.push(
        `[fact-mismatch] invariant=${entry.id} expected=${JSON.stringify(
          only.value,
        )} actual=${JSON.stringify(entry.current_value)}`,
      );
    }
    return;
  }

  if (!isObject(entry.current_value)) {
    errors.push(
      `[fact-mismatch] invariant=${entry.id} current_value must be object when multiple code_refs are declared`,
    );
    return;
  }
  for (const item of resolved) {
    const key = lastRefSegment(item.ref);
    if (
      !key ||
      !Object.prototype.hasOwnProperty.call(entry.current_value, key)
    ) {
      errors.push(
        `[fact-mismatch] invariant=${entry.id} current_value missing key for code_ref=${item.ref}`,
      );
      continue;
    }
    const actual = (entry.current_value as Record<string, unknown>)[key];
    if (!deepEqual(actual, item.value)) {
      errors.push(
        `[fact-mismatch] invariant=${entry.id} key=${key} expected=${JSON.stringify(
          item.value,
        )} actual=${JSON.stringify(actual)}`,
      );
    }
  }
}

function main() {
  const errors: string[] = [];
  const allIds = new Set<string>();

  for (const fileDef of FILES) {
    const parsed = parseInvariantFile(fileDef.path);
    if (!Array.isArray(parsed.invariants) || parsed.invariants.length === 0) {
      errors.push(
        `[shape] file=${fileDef.path} invariants must be non-empty array`,
      );
      continue;
    }
    const localIds = new Set<string>();
    for (const entry of parsed.invariants) {
      assertInvariantShape(fileDef.path, entry, errors);
      if (localIds.has(entry.id)) {
        errors.push(
          `[duplicate-id] file=${fileDef.path} duplicate id=${entry.id}`,
        );
      }
      localIds.add(entry.id);
      if (allIds.has(entry.id)) {
        errors.push(`[duplicate-id] global duplicate id=${entry.id}`);
      }
      allIds.add(entry.id);

      for (const docRef of entry.doc_refs || []) {
        assertRefContainsId("doc_refs", docRef, entry.id, errors);
      }
      for (const specRef of entry.spec_refs || []) {
        assertRefContainsId("spec_refs", specRef, entry.id, errors);
      }
      assertCurrentMatchesFacts(entry, errors);
    }
    for (const requiredId of fileDef.requiredIds) {
      if (!localIds.has(requiredId)) {
        errors.push(`[required-id] file=${fileDef.path} missing ${requiredId}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("[skillrunner-ssot-invariants] failed");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
    return;
  }
  console.log("[skillrunner-ssot-invariants] passed");
}

main();

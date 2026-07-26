import {
  discardBufferedWriteKey,
  discardBufferedWriteKeyAndWait,
  enqueueBufferedWrite,
  flushBufferedWriteKey,
} from "./bufferedWriteCoordinator";
import type { AcpDiagnosticEvidenceRecord } from "./acpDiagnostics";
import { isDebugModeEnabled } from "./debugMode";
import { appendRuntimeLog } from "./runtimeLogManager";
import { appendRuntimeTextFile } from "./runtimePersistence";

const ACP_CHAT_DIAGNOSTIC_AUDIT_SCHEMA = "zotero-skills.acp-chat.diagnostic.v1";
const AUDIT_MAX_PENDING_ENTRIES = 2048;
const AUDIT_MAX_PENDING_BYTES = 2 * 1024 * 1024;
const auditKeys = new Map<string, string>();
const discardedOwners = new Set<string>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

export function acpChatDiagnosticAuditOwnerKey(
  backendIdRaw: unknown,
  conversationIdRaw: unknown,
) {
  const backendId = normalizeString(backendIdRaw);
  const conversationId = normalizeString(conversationIdRaw);
  return backendId && conversationId ? `${backendId}\n${conversationId}` : "";
}

export function activateAcpChatDiagnosticAuditOwner(ownerKey: string) {
  const normalizedOwner = normalizeString(ownerKey);
  if (normalizedOwner) {
    discardedOwners.delete(normalizedOwner);
  }
}

function coordinatorOwner(ownerKey: string) {
  return `acp-chat-diagnostic\n${ownerKey}`;
}

function auditKey(ownerKey: string, path: string) {
  return `${coordinatorOwner(ownerKey)}\n${path}`;
}

function recordAuditWarning(args: {
  ownerKey: string;
  requestId?: string;
  stage: string;
  message: string;
  details?: unknown;
  error?: unknown;
}) {
  try {
    appendRuntimeLog({
      level: "warn",
      scope: "provider",
      providerId: "acp",
      requestId: args.requestId,
      component: "acp-chat-diagnostic-audit",
      operation: "write",
      stage: args.stage,
      message: args.message,
      details: {
        ownerKey: args.ownerKey,
        ...(args.details && typeof args.details === "object"
          ? (args.details as Record<string, unknown>)
          : {}),
      },
      error: args.error,
    });
  } catch {
    // Diagnostic evidence cannot fail the owning chat session.
  }
}

export function appendAcpChatDiagnosticAudit(args: {
  ownerKey: string;
  path?: string;
  requestId?: string;
  backendId?: string;
  conversationId?: string;
  entry: AcpDiagnosticEvidenceRecord;
}) {
  const ownerKey = normalizeString(args.ownerKey);
  const path = normalizeString(args.path);
  if (
    !isDebugModeEnabled() ||
    !ownerKey ||
    !path ||
    discardedOwners.has(ownerKey)
  ) {
    return;
  }
  const key = auditKey(ownerKey, path);
  auditKeys.set(key, ownerKey);
  const line = `${JSON.stringify({
    schema: ACP_CHAT_DIAGNOSTIC_AUDIT_SCHEMA,
    source: "acp-chat-diagnostic",
    backendId: normalizeString(args.backendId) || undefined,
    conversationId: normalizeString(args.conversationId) || undefined,
    ...args.entry,
  })}\n`;
  enqueueBufferedWrite({
    key,
    owner: coordinatorOwner(ownerKey),
    entry: line,
    bytes: new TextEncoder().encode(line).length,
    performanceProfileRequestId: args.requestId,
    performanceChannel: "audit",
    hardPendingLimit: {
      maxEntries: AUDIT_MAX_PENDING_ENTRIES,
      maxBytes: AUDIT_MAX_PENDING_BYTES,
      overflow: "drop-oldest",
      onOverflow: (event) => {
        recordAuditWarning({
          ownerKey,
          requestId: args.requestId,
          stage: "audit-buffer-overflow",
          message: "ACP Chat diagnostic audit buffer dropped pending evidence.",
          details: event,
        });
      },
    },
    sink: async (lines) => {
      try {
        await appendRuntimeTextFile(path, lines.join(""));
      } catch (error) {
        recordAuditWarning({
          ownerKey,
          requestId: args.requestId,
          stage: "audit-batch-append-failed",
          message: "ACP Chat diagnostic audit append failed.",
          error,
        });
        throw error;
      }
    },
  });
}

function keysForOwner(ownerKey?: string) {
  const normalizedOwner = normalizeString(ownerKey);
  if (typeof ownerKey !== "undefined" && !normalizedOwner) {
    return [];
  }
  return Array.from(auditKeys.entries())
    .filter(
      ([, entryOwner]) =>
        typeof ownerKey === "undefined" || entryOwner === normalizedOwner,
    )
    .map(([key]) => key);
}

export async function flushAcpChatDiagnosticAudit(ownerKey?: string) {
  await Promise.all(
    keysForOwner(ownerKey).map((key) => flushBufferedWriteKey(key)),
  );
}

export async function releaseAcpChatDiagnosticAudit(ownerKey?: string) {
  const keys = keysForOwner(ownerKey);
  await Promise.allSettled(keys.map((key) => flushBufferedWriteKey(key)));
  for (const key of keys) {
    discardBufferedWriteKey(key);
    auditKeys.delete(key);
  }
}

export async function discardAcpChatDiagnosticAudit(ownerKey: string) {
  const normalizedOwner = normalizeString(ownerKey);
  if (!normalizedOwner) {
    return;
  }
  discardedOwners.add(normalizedOwner);
  const keys = keysForOwner(normalizedOwner);
  await Promise.allSettled(
    keys.map((key) => discardBufferedWriteKeyAndWait(key)),
  );
  for (const key of keys) {
    auditKeys.delete(key);
  }
}

export async function resetAcpChatDiagnosticAuditForTests() {
  await releaseAcpChatDiagnosticAudit();
  discardedOwners.clear();
}

export function discardAllAcpChatDiagnosticAuditsForTests() {
  for (const key of auditKeys.keys()) {
    discardBufferedWriteKey(key);
  }
  auditKeys.clear();
  discardedOwners.clear();
}

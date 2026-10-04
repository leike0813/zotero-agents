import { getPref, setPref } from "../utils/prefs";
import {
  PiOutboundNetworkError,
  classifyPiOutboundUrl,
} from "./piOutboundNetworkPolicy";
import { commitPiCredentialChanges } from "./piCredentialStore";
import { getPiCredentialRevision } from "./piCredentialStore";
import type {
  PiMcpImportPreview,
  PiMcpSource,
  PiMcpSourceAuthentication,
  PiMcpSourceChangePlan,
  PiMcpSourceChangeSet,
  PiMcpSourceInput,
} from "../shared/piMcpSourceContract";
export type {
  PiMcpImportPreview,
  PiMcpSource,
  PiMcpSourceAuthentication,
  PiMcpSourceChangePlan,
  PiMcpSourceChangeSet,
  PiMcpSourceInput,
} from "../shared/piMcpSourceContract";

export type PiMcpSourceRegistry = {
  version: 1;
  sources: PiMcpSource[];
  /** Content identity of the saved registry, used for optimistic adoption. */
  revision: string;
};

const PREF = "piMcpSourceRegistryJson";
const MAX_SOURCES = 64;
const MAX_BINDINGS = 32;
// A field is the exact header name for HTTP and the exact environment name for
// stdio. Header names are case-insensitive, so field identity is compared
// folded; environment names keep their existing platform rules.
const HEADER_FIELD = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]{1,128}$/;
const ENVIRONMENT_FIELD = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;
const RESERVED_ENVIRONMENT =
  /^(path|home|userprofile|temp|tmp|systemroot|windir|pathext|lang)$/i;
const CREDENTIAL_REF = /^[A-Za-z0-9._-]{1,128}$/;
let commitQueue: Promise<unknown> = Promise.resolve();

function plainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function identifier(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(value) ||
    ["__proto__", "constructor", "prototype"].includes(value)
  )
    throw new Error("mcp_source_invalid_id");
  return value;
}

/** Stable non-cryptographic token for the exact saved registry document. */
function revisionOf(serialized: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function credentialRef(sourceId: string, field: string): string {
  const slug = field.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const prefix = `mcp-${sourceId}-`;
  const ref = prefix + slug;
  if (!CREDENTIAL_REF.test(ref) || !slug)
    throw new Error("mcp_source_invalid_credential_slot");
  return ref;
}

/**
 * MCP-source projection of the shared outbound-network URL classification.
 * The policy module owns the facts; this wrapper keeps the MCP source error
 * code stable for registry validation and import previews.
 */
export function classifyPiMcpHttpUrl(raw: string): {
  url: string;
  origin: string;
  location: "public" | "private" | "loopback";
} {
  try {
    const facts = classifyPiOutboundUrl(raw);
    return {
      url: facts.url,
      origin: facts.origin,
      location: facts.location,
    };
  } catch (error) {
    if (error instanceof PiOutboundNetworkError) {
      if (error.code === "pi_network_url_too_long")
        throw new Error("mcp_source_url_too_long");
      if (error.code === "pi_network_userinfo_denied")
        throw new Error("mcp_source_invalid_url");
    }
    throw new Error("mcp_source_invalid_url");
  }
}

function validateSavedSource(source: PiMcpSource): PiMcpSource {
  identifier(source?.id);
  if (
    typeof source.label !== "string" ||
    !source.label.trim() ||
    source.label.length > 128 ||
    typeof source.enabled !== "boolean" ||
    !plainRecord(source.credentialSlots) ||
    Object.keys(source.credentialSlots).length > MAX_BINDINGS
  )
    throw new Error("mcp_source_invalid_config");
  const authentication = source.authentication;
  if (
    !plainRecord(authentication) ||
    !["none", "bearer", "apiKey"].includes(String(authentication.kind))
  )
    throw new Error("mcp_source_invalid_authentication");
  const fields = new Set<string>();
  for (const [field, ref] of Object.entries(source.credentialSlots)) {
    const valid =
      source.transport === "http"
        ? HEADER_FIELD.test(field)
        : ENVIRONMENT_FIELD.test(field) && !RESERVED_ENVIRONMENT.test(field);
    if (!valid)
      throw new Error(
        source.transport === "http"
          ? "mcp_source_invalid_field"
          : "mcp_source_reserved_environment",
      );
    const identity = field.toLowerCase();
    if (fields.has(identity)) throw new Error("mcp_source_duplicate_field");
    fields.add(identity);
    if (typeof ref !== "string" || !CREDENTIAL_REF.test(ref))
      throw new Error("mcp_source_invalid_credential_slot");
  }
  if (source.transport === "stdio" && authentication.kind !== "none")
    throw new Error("mcp_source_invalid_authentication");
  if (
    authentication.kind !== "none" &&
    (typeof authentication.field !== "string" ||
      !HEADER_FIELD.test(authentication.field))
  )
    throw new Error("mcp_source_invalid_authentication");
  if (
    authentication.kind !== "none" &&
    !fields.has(authentication.field.toLowerCase())
  )
    throw new Error("mcp_source_field_secret_required");
  if (source.transport === "http") {
    if (
      typeof source.url !== "string" ||
      source.executable ||
      source.argv ||
      source.cwd
    )
      throw new Error("mcp_source_invalid_config");
    const endpoint = classifyPiMcpHttpUrl(source.url);
    if (endpoint.location === "public" && !endpoint.url.startsWith("https:"))
      throw new Error("mcp_source_https_required");
    if (
      source.localNetworkApproval &&
      source.localNetworkApproval !== endpoint.origin
    )
      throw new Error("mcp_source_local_network_approval_required");
    if (endpoint.location === "private" && endpoint.url.startsWith("http:")) {
      if (Object.keys(source.credentialSlots).length)
        throw new Error("mcp_source_cleartext_credential_denied");
    }
    return {
      ...source,
      url: endpoint.url,
      authentication: { ...authentication } as PiMcpSourceAuthentication,
      credentialSlots: { ...source.credentialSlots },
      ...(source.cleartextApproval === endpoint.origin
        ? { cleartextApproval: endpoint.origin }
        : {}),
      ...(source.localNetworkApproval === endpoint.origin
        ? { localNetworkApproval: endpoint.origin }
        : {}),
    };
  }
  if (source.transport === "stdio") {
    if (
      !source.executable ||
      source.url ||
      source.cleartextApproval ||
      source.localNetworkApproval ||
      !Array.isArray(source.argv) ||
      source.argv.some(
        (arg) => typeof arg !== "string" || arg.includes("\0"),
      ) ||
      source.executable.includes("\0") ||
      !/^(\/|[A-Za-z]:[\\/])/.test(source.executable) ||
      (source.cwd && !/^(\/|[A-Za-z]:[\\/])/.test(source.cwd))
    )
      throw new Error("mcp_source_invalid_config");
    return {
      ...source,
      argv: [...source.argv],
      authentication: { kind: "none" },
      credentialSlots: { ...source.credentialSlots },
      ...(source.cwd ? { cwd: source.cwd } : {}),
    };
  }
  throw new Error("mcp_source_invalid_transport");
}

function readRegistryDocument(): { sources: PiMcpSource[]; revision: string } {
  const raw = String(getPref(PREF) || "");
  if (!raw) return { sources: [], revision: revisionOf("") };
  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new Error("mcp_source_registry_corrupt");
  }
  if (
    !plainRecord(document) ||
    document.version !== 1 ||
    !Array.isArray(document.sources) ||
    document.sources.length > MAX_SOURCES
  )
    throw new Error("mcp_source_registry_corrupt");
  const sources = document.sources.map((item) =>
    validateSavedSource(item as PiMcpSource),
  );
  if (new Set(sources.map((item) => item.id)).size !== sources.length)
    throw new Error("mcp_source_registry_corrupt");
  return { sources, revision: revisionOf(raw) };
}

export function loadPiMcpSourceRegistry(): PiMcpSourceRegistry {
  const { sources, revision } = readRegistryDocument();
  return { version: 1, sources, revision };
}

/**
 * Identity of one saved source as the runtime bound it. Everything that can
 * change what a request sends or where it goes is part of it — transport,
 * target, working directory, the authentication field identity, the opaque
 * bindings and the current revision of each bound secret. A label or an
 * enablement change deliberately keeps the identity, so test evidence for the
 * same target and authentication survives.
 */
export function piMcpSourceBindingIdentity(source: PiMcpSource): string {
  return JSON.stringify([
    source.transport,
    source.url,
    source.executable,
    source.argv,
    source.cwd,
    source.authentication,
    source.credentialSlots,
    Object.values(source.credentialSlots).map((ref) => [
      ref,
      getPiCredentialRevision(ref, "mcp-source"),
    ]),
    source.localNetworkApproval,
    source.cleartextApproval,
  ]);
}

function fieldName(input: PiMcpSourceInput, field: unknown): string {
  const name = typeof field === "string" ? field.trim() : "";
  if (!name) throw new Error("mcp_source_invalid_field");
  if (input.transport === "http") {
    if (!HEADER_FIELD.test(name)) throw new Error("mcp_source_invalid_field");
  } else if (!ENVIRONMENT_FIELD.test(name) || RESERVED_ENVIRONMENT.test(name))
    throw new Error("mcp_source_reserved_environment");
  return name;
}

/**
 * Normalize one guided form input against the currently saved source. An empty
 * secret keeps the existing same-field binding. A row with neither a secret
 * nor a saved binding carries nothing and is dropped, which is what an
 * exported rebinding slot means on a receiving profile. The authentication
 * field is the one exception: it must resolve to a binding, so a changed field
 * can never borrow another field's value.
 */
function normalizeInput(
  input: PiMcpSourceInput,
  saved: PiMcpSource | undefined,
): { source: PiMcpSource; writes: PiMcpSourceChangePlan["secretWrites"] } {
  identifier(input?.id);
  if (
    typeof input.label !== "string" ||
    !input.label.trim() ||
    input.label.length > 128 ||
    typeof input.enabled !== "boolean" ||
    (input.transport !== "http" && input.transport !== "stdio")
  )
    throw new Error("mcp_source_invalid_config");
  if (
    !plainRecord(input.authentication) ||
    !["none", "bearer", "apiKey"].includes(String(input.authentication.kind))
  )
    throw new Error("mcp_source_invalid_authentication");
  if (!Array.isArray(input.bindings) || input.bindings.length > MAX_BINDINGS)
    throw new Error("mcp_source_invalid_config");

  const authentication: PiMcpSourceAuthentication =
    input.authentication.kind === "none"
      ? { kind: "none" }
      : {
          kind: input.authentication.kind,
          field: fieldName(input, input.authentication.field),
        };
  if (input.transport === "stdio" && authentication.kind !== "none")
    throw new Error("mcp_source_invalid_authentication");

  const slots: Record<string, string> = {};
  const writes: PiMcpSourceChangePlan["secretWrites"] = [];
  const identities = new Set<string>();
  for (const binding of input.bindings) {
    const field = fieldName(input, binding?.field);
    const identity = field.toLowerCase();
    if (identities.has(identity)) throw new Error("mcp_source_duplicate_field");
    identities.add(identity);
    const secret = typeof binding.secret === "string" ? binding.secret : "";
    if (secret) {
      const ref = credentialRef(input.id, field);
      slots[field] = ref;
      writes.push({ ref, label: `${input.id}: ${field}`, secret });
      continue;
    }
    const kept = Object.entries(saved?.credentialSlots || {}).find(
      ([name]) => name.toLowerCase() === identity,
    );
    if (kept) slots[field] = kept[1];
  }
  if (
    authentication.kind !== "none" &&
    !identities.has(authentication.field.toLowerCase())
  )
    throw new Error("mcp_source_field_secret_required");

  const source: PiMcpSource = validateSavedSource({
    id: input.id,
    label: input.label.trim(),
    transport: input.transport,
    enabled: input.enabled,
    ...(input.transport === "http"
      ? { url: String(input.url || "") }
      : {
          executable: String(input.executable || ""),
          argv: Array.isArray(input.argv) ? [...input.argv] : [],
        }),
    ...(typeof input.cwd === "string" && input.cwd.trim()
      ? { cwd: input.cwd.trim() }
      : {}),
    authentication,
    credentialSlots: slots,
  });
  if (source.transport !== "http") return { source, writes };
  // Approval is bound to this exact target origin, so a later edit to another
  // target carries no approval with it.
  const endpoint = classifyPiMcpHttpUrl(source.url!);
  if (
    endpoint.location !== "public" &&
    (input.approveLocalNetwork || input.approveCleartext)
  )
    return {
      source: validateSavedSource({
        ...source,
        ...(input.approveLocalNetwork
          ? { localNetworkApproval: endpoint.origin }
          : {}),
        ...(input.approveCleartext
          ? { cleartextApproval: endpoint.origin }
          : {}),
      }),
      writes,
    };
  return { source, writes };
}

/**
 * Validate one proposed change into the exact writes it needs. Nothing is
 * persisted here, so a rejected change leaves both the saved registry and its
 * credential bindings authoritative.
 */
export function preparePiMcpChange(
  change: PiMcpSourceChangeSet,
): PiMcpSourceChangePlan {
  if (!plainRecord(change) || !Array.isArray(change.sources))
    throw new Error("mcp_source_invalid_change");
  const current = loadPiMcpSourceRegistry();
  if (
    change.expectedRevision !== undefined &&
    change.expectedRevision !== current.revision
  )
    throw new Error("mcp_source_revision_conflict");

  const next = new Map(current.sources.map((item) => [item.id, item]));
  const removals = new Set((change.removals || []).map(identifier));
  const conflictsKept: string[] = [];
  const secretWrites = new Map<
    string,
    PiMcpSourceChangePlan["secretWrites"][number]
  >();
  const approvalsRequired: PiMcpSourceChangePlan["approvalsRequired"] = [];
  const seen = new Set<string>();

  for (const input of change.sources) {
    const id = identifier(input?.id);
    if (seen.has(id)) throw new Error("mcp_source_duplicate_field");
    seen.add(id);
    const saved = current.sources.find((item) => item.id === id);
    if (
      saved &&
      (change.mode || "authoritative") === "merge" &&
      (change.conflicts?.[id] || "keep") === "keep"
    ) {
      conflictsKept.push(id);
      continue;
    }
    const { source, writes } = normalizeInput(input, saved);
    for (const write of writes) {
      if (secretWrites.has(write.ref))
        throw new Error("mcp_source_duplicate_field");
      secretWrites.set(write.ref, write);
    }
    if (source.transport === "http") {
      const endpoint = classifyPiMcpHttpUrl(source.url!);
      if (endpoint.location !== "public") {
        if (!input.approveLocalNetwork)
          approvalsRequired.push({
            sourceId: id,
            origin: endpoint.origin,
            cleartext: false,
          });
        if (
          endpoint.location === "private" &&
          endpoint.url.startsWith("http:") &&
          !input.approveCleartext
        )
          approvalsRequired.push({
            sourceId: id,
            origin: endpoint.origin,
            cleartext: true,
          });
      }
    }
    next.set(id, source);
    removals.delete(id);
  }

  const ordered = current.sources
    .map((item) => item.id)
    .filter((id) => next.has(id) && !removals.has(id));
  for (const id of next.keys())
    if (!removals.has(id) && !ordered.includes(id)) ordered.push(id);
  const surviving = ordered.map((id) => next.get(id)!);
  if (surviving.length > MAX_SOURCES)
    throw new Error("mcp_source_limit_exceeded");

  const referenced = new Set<string>();
  for (const source of surviving)
    for (const ref of Object.values(source.credentialSlots))
      referenced.add(ref);
  const orphaned = new Set<string>();
  for (const source of current.sources) {
    for (const ref of Object.values(source.credentialSlots))
      if (!referenced.has(ref) && !secretWrites.has(ref)) orphaned.add(ref);
  }

  return {
    revision: current.revision,
    next: surviving,
    secretWrites: [...secretWrites.values()],
    secretRemovals: [...orphaned],
    conflictsKept,
    removals: [...removals],
    approvalsRequired,
  };
}

/**
 * Commit one prepared change inside the credential owner's write boundary. The
 * registry document and every binding commit together; a failed registry write
 * restores the previous credential document, so no partial state is published
 * and the caller's draft stays editable.
 */
export function commitPiMcpChange(
  plan: PiMcpSourceChangePlan,
): Promise<PiMcpSource[]> {
  if (plan.approvalsRequired.length)
    throw new Error("mcp_source_approval_required");
  // One registry change commits at a time. A second save that was prepared
  // against the same revision therefore fails its revision check instead of
  // interleaving with the first commit.
  const commit = () =>
    commitPiCredentialChanges({
      credentials: plan.secretWrites.map((write) => ({
        id: write.ref,
        label: write.label,
        namespace: "mcp-source" as const,
        material: { kind: "mcp-secret" as const, secret: write.secret },
      })),
      releases: plan.secretRemovals.map((id) => ({
        id,
        namespace: "mcp-source" as const,
      })),
      apply: () => {
        if (loadPiMcpSourceRegistry().revision !== plan.revision)
          throw new Error("mcp_source_revision_conflict");
        setPref(PREF, JSON.stringify({ version: 1, sources: plan.next }));
      },
    }).then(() => plan.next);
  const pending = commitQueue.then(commit, commit);
  commitQueue = pending.catch(() => undefined);
  return pending;
}

export async function applyPiMcpSourceChange(
  change: PiMcpSourceChangeSet,
): Promise<PiMcpSource[]> {
  return commitPiMcpChange(preparePiMcpChange(change));
}

function importedSource(
  name: string,
  candidate: Record<string, unknown>,
): PiMcpSourceInput {
  const transport =
    candidate.type === "http" || candidate.url ? "http" : "stdio";
  const slots = transport === "http" ? candidate.headers : candidate.env;
  if (slots !== undefined && !plainRecord(slots))
    throw new Error("mcp_import_invalid");
  const bindings: PiMcpSourceInput["bindings"] = [];
  let authentication: PiMcpSourceAuthentication = { kind: "none" };
  const declared = candidate.authentication;
  if (declared !== undefined) {
    if (
      !plainRecord(declared) ||
      (declared.kind !== "none" &&
        declared.kind !== "bearer" &&
        declared.kind !== "apiKey")
    )
      throw new Error("mcp_import_invalid");
    authentication =
      declared.kind === "none"
        ? { kind: "none" }
        : { kind: declared.kind, field: String(declared.field || "") };
  }
  for (const [field, value] of Object.entries(
    (slots || {}) as Record<string, unknown>,
  )) {
    if (typeof value !== "string") throw new Error("mcp_import_invalid");
    const literal = value;
    if (literal && /\$|!command/.test(literal))
      throw new Error("mcp_import_unsafe_secret");
    if (
      authentication.kind === "none" &&
      transport === "http" &&
      field.toLowerCase() === "authorization"
    ) {
      const bearer = /^Bearer\s+(.+)$/i.exec(literal);
      authentication = bearer
        ? { kind: "bearer", field }
        : { kind: "apiKey", field };
      bindings.push({ field, secret: bearer ? bearer[1] : literal });
      continue;
    }
    if (
      authentication.kind === "bearer" &&
      field.toLowerCase() === authentication.field.toLowerCase() &&
      literal
    ) {
      // The transport forms the single prefix, so a document keeps the bare
      // token even when the value was written out already prefixed.
      bindings.push({
        field,
        secret: literal.replace(/^Bearer\s+/i, ""),
      });
      continue;
    }
    bindings.push({ field, ...(literal ? { secret: literal } : {}) });
  }
  return {
    id: name,
    label: name,
    transport,
    enabled: true,
    ...(transport === "http"
      ? { url: String(candidate.url || "") }
      : {
          executable: String(candidate.command || ""),
          argv: Array.isArray(candidate.args) ? [...candidate.args] : [],
          ...(typeof candidate.cwd === "string" && candidate.cwd
            ? { cwd: candidate.cwd }
            : {}),
        }),
    authentication,
    bindings,
  };
}

/**
 * Read a whole `mcpServers` document into the one change set. `replace`
 * additionally reports the saved sources the document omits, so a
 * full-document save can show its impact before anything is removed.
 */
export function previewPiMcpJson(
  raw: string,
  options: { mode?: "merge" | "replace" } = {},
): PiMcpImportPreview {
  if (raw.length > 1024 * 1024) throw new Error("mcp_import_too_large");
  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new Error("mcp_import_invalid");
  }
  if (!plainRecord(document) || !plainRecord(document.mcpServers))
    throw new Error("mcp_import_invalid");
  const sources: PiMcpSourceInput[] = [];
  for (const [name, candidate] of Object.entries(document.mcpServers)) {
    identifier(name);
    if (!plainRecord(candidate)) throw new Error("mcp_import_invalid");
    sources.push(importedSource(name, candidate));
  }
  const existing = loadPiMcpSourceRegistry().sources;
  const included = new Set(sources.map((source) => source.id));
  const removals =
    options.mode === "replace"
      ? existing
          .filter((source) => !included.has(source.id))
          .map((source) => source.id)
      : [];
  return {
    change: {
      mode: options.mode === "replace" ? "replace" : "merge",
      sources,
      ...(removals.length ? { removals } : {}),
    },
    secrets: sources.flatMap((source) =>
      source.bindings
        .filter((binding) => binding.secret)
        .map((binding) => ({
          sourceId: source.id,
          field: binding.field,
          value: String(binding.secret),
        })),
    ),
    impact: {
      removals,
      conflicts: sources
        .filter((source) => existing.some((item) => item.id === source.id))
        .map((source) => source.id)
        .sort(),
    },
  };
}

export function exportPiMcpJson(): string {
  const mcpServers: Record<string, unknown> = {};
  for (const source of loadPiMcpSourceRegistry().sources) {
    const bindings = Object.fromEntries(
      Object.keys(source.credentialSlots).map((field) => [field, ""]),
    );
    mcpServers[source.id] =
      source.transport === "http"
        ? {
            type: "http",
            url: source.url,
            // The authentication field identity travels with the document, so a
            // receiving profile re-enters only the secret and never has to
            // re-guess whether the field expects a prefixed bearer value.
            authentication: source.authentication,
            headers: bindings,
          }
        : {
            command: source.executable,
            args: source.argv,
            ...(source.cwd ? { cwd: source.cwd } : {}),
            env: bindings,
          };
  }
  return JSON.stringify({ mcpServers }, null, 2);
}

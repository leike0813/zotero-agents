import { getPref, setPref } from "../utils/prefs";
import {
  PiOutboundNetworkError,
  classifyPiOutboundUrl,
} from "./piOutboundNetworkPolicy";
import {
  deletePiCredential,
  listPiCredentials,
  putPiCredential,
} from "./piCredentialStore";
import type { PiGatewayEffect } from "./piToolGateway";
import type { PiMcpSource } from "../shared/piMcpSourceContract";
export type { PiMcpSource } from "../shared/piMcpSourceContract";

export type PiMcpSourceRegistry = { version: 1; sources: PiMcpSource[] };
export type PiMcpImportPreview = {
  sources: PiMcpSource[];
  secrets: Array<{ sourceId: string; slot: string; value: string }>;
};

const PREF = "piMcpSourceRegistryJson";
const EFFECTS = new Set<PiGatewayEffect>([
  "bounded-read",
  "workspace-mutation",
  "code-execution",
  "external-egress",
  "external-mutation",
  "local-network",
  "zotero-mutation",
  "host-control",
  "forbidden",
]);

function identifier(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(value) ||
    ["__proto__", "constructor", "prototype"].includes(value)
  )
    throw new Error("mcp_source_invalid_id");
  return value;
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
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

export function validatePiMcpSource(source: PiMcpSource): PiMcpSource {
  identifier(source?.id);
  if (
    typeof source.label !== "string" ||
    !source.label.trim() ||
    source.label.length > 128 ||
    typeof source.enabled !== "boolean" ||
    !plainRecord(source.credentialSlots) ||
    !plainRecord(source.selectedTools) ||
    Object.keys(source.credentialSlots).length > 32 ||
    Object.keys(source.selectedTools).length > 512
  )
    throw new Error("mcp_source_invalid_config");
  for (const [slot, ref] of Object.entries(source.credentialSlots)) {
    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(slot) ||
      ["__proto__", "constructor", "prototype"].includes(slot) ||
      typeof ref !== "string" ||
      !ref
    )
      throw new Error("mcp_source_invalid_credential_slot");
    if (
      source.transport === "stdio" &&
      /^(path|home|userprofile|temp|tmp|systemroot|windir|pathext)$/i.test(slot)
    )
      throw new Error("mcp_source_invalid_credential_slot");
  }
  for (const [name, review] of Object.entries(source.selectedTools)) {
    if (
      !name ||
      name.length > 128 ||
      ["__proto__", "constructor", "prototype"].includes(name) ||
      !plainRecord(review) ||
      typeof review.digest !== "string" ||
      !/^sha256:[a-f0-9]{64}$/i.test(review.digest) ||
      typeof review.promoted !== "boolean" ||
      (review.effects !== undefined &&
        (!Array.isArray(review.effects) ||
          !review.effects.length ||
          review.effects.some((effect) => !EFFECTS.has(effect))))
    )
      throw new Error("mcp_source_invalid_review");
  }
  if (source.transport === "http") {
    if (
      typeof source.url !== "string" ||
      source.executable ||
      source.argv ||
      source.cwd
    )
      throw new Error("mcp_source_invalid_config");
    const endpoint = classifyPiMcpHttpUrl(source.url);
    if (
      endpoint.location !== "public" &&
      source.localNetworkApproval !== endpoint.origin
    )
      throw new Error("mcp_source_local_network_approval_required");
    if (endpoint.location === "public" && !source.url.startsWith("https:"))
      throw new Error("mcp_source_https_required");
    if (source.url.startsWith("http:") && endpoint.location === "private") {
      if (source.cleartextApproval !== endpoint.origin)
        throw new Error("mcp_source_cleartext_approval_required");
      if (Object.keys(source.credentialSlots).length)
        throw new Error("mcp_source_cleartext_credential_denied");
    }
    return {
      ...source,
      url: endpoint.url,
      credentialSlots: { ...source.credentialSlots },
      selectedTools: { ...source.selectedTools },
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
      credentialSlots: { ...source.credentialSlots },
      selectedTools: { ...source.selectedTools },
    };
  }
  throw new Error("mcp_source_invalid_transport");
}

export function loadPiMcpSourceRegistry(): PiMcpSourceRegistry {
  const raw = String(getPref(PREF) || "");
  if (!raw) return { version: 1, sources: [] };
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
    document.sources.length > 64
  )
    throw new Error("mcp_source_registry_corrupt");
  const sources = document.sources.map((item) =>
    validatePiMcpSource(item as PiMcpSource),
  );
  if (new Set(sources.map((item) => item.id)).size !== sources.length)
    throw new Error("mcp_source_registry_corrupt");
  return { version: 1, sources };
}

export function upsertPiMcpSource(source: PiMcpSource): PiMcpSource {
  const next = validatePiMcpSource(source);
  const current = loadPiMcpSourceRegistry();
  const old = current.sources.find((item) => item.id === next.id);
  if (
    old &&
    JSON.stringify({
      transport: old.transport,
      url: old.url,
      executable: old.executable,
      argv: old.argv,
    }) !==
      JSON.stringify({
        transport: next.transport,
        url: next.url,
        executable: next.executable,
        argv: next.argv,
      })
  ) {
    next.selectedTools = {};
  }
  const sources = current.sources.filter((item) => item.id !== next.id);
  sources.push(next);
  if (sources.length > 64) throw new Error("mcp_source_limit_exceeded");
  setPref(
    PREF,
    JSON.stringify({ version: 1, sources } satisfies PiMcpSourceRegistry),
  );
  return next;
}

export function deletePiMcpSource(id: string): void {
  identifier(id);
  const current = loadPiMcpSourceRegistry();
  setPref(
    PREF,
    JSON.stringify({
      version: 1,
      sources: current.sources.filter((item) => item.id !== id),
    }),
  );
}

export function resetPiMcpSourceRegistry(): void {
  setPref(PREF, "");
}

export function reviewPiMcpTool(
  sourceId: string,
  name: string,
  digest: string,
  options: { promoted: boolean; effects?: PiGatewayEffect[] },
): PiMcpSource {
  const source = loadPiMcpSourceRegistry().sources.find(
    (item) => item.id === sourceId,
  );
  if (
    !source ||
    !name ||
    name.length > 128 ||
    !/^sha256:[a-f0-9]{64}$/i.test(digest)
  )
    throw new Error("mcp_source_invalid_review");
  return upsertPiMcpSource({
    ...source,
    selectedTools: {
      ...source.selectedTools,
      [name]: {
        digest,
        promoted: options.promoted,
        ...(options.effects ? { effects: options.effects } : {}),
      },
    },
  });
}

export function unreviewPiMcpTool(sourceId: string, name: string): PiMcpSource {
  const source = loadPiMcpSourceRegistry().sources.find(
    (item) => item.id === sourceId,
  );
  if (!source || !name || !Object.hasOwn(source.selectedTools, name))
    throw new Error("mcp_source_invalid_review");
  const selectedTools = { ...source.selectedTools };
  delete selectedTools[name];
  return upsertPiMcpSource({ ...source, selectedTools });
}

export function previewPiMcpJson(raw: string): PiMcpImportPreview {
  if (raw.length > 1024 * 1024) throw new Error("mcp_import_too_large");
  let document: unknown;
  try {
    document = JSON.parse(raw);
  } catch {
    throw new Error("mcp_import_invalid");
  }
  if (!plainRecord(document) || !plainRecord(document.mcpServers))
    throw new Error("mcp_import_invalid");
  const sources: PiMcpSource[] = [];
  const secrets: PiMcpImportPreview["secrets"] = [];
  for (const [name, candidate] of Object.entries(document.mcpServers)) {
    identifier(name);
    if (!plainRecord(candidate)) throw new Error("mcp_import_invalid");
    const transport =
      candidate.type === "http" || candidate.url ? "http" : "stdio";
    const slots = transport === "http" ? candidate.headers : candidate.env;
    if (slots !== undefined && !plainRecord(slots))
      throw new Error("mcp_import_invalid");
    const credentialSlots: Record<string, string> = {};
    for (const [slot, value] of Object.entries(
      (slots || {}) as Record<string, unknown>,
    )) {
      if (typeof value !== "string" || !value || /\$|!command/.test(value))
        throw new Error("mcp_import_unsafe_secret");
      credentialSlots[slot] =
        `mcp-${name}-${slot.replace(/[^A-Za-z0-9-]/g, "-")}`;
      if (credentialSlots[slot].length > 128)
        throw new Error("mcp_import_invalid");
      secrets.push({ sourceId: name, slot, value });
    }
    const source: PiMcpSource = {
      id: name,
      label: name,
      transport,
      enabled: true,
      credentialSlots,
      selectedTools: {},
      ...(transport === "http"
        ? (() => {
            const endpoint = classifyPiMcpHttpUrl(candidate.url as string);
            return {
              url: endpoint.url,
              ...(endpoint.location !== "public"
                ? { localNetworkApproval: endpoint.origin }
                : {}),
              ...(endpoint.location === "private" &&
              endpoint.url.startsWith("http:")
                ? { cleartextApproval: endpoint.origin }
                : {}),
            };
          })()
        : {
            executable: candidate.command as string,
            argv: (candidate.args as string[]) || [],
          }),
    };
    sources.push(validatePiMcpSource(source));
  }
  if (
    new Set(
      secrets.map(
        ({ sourceId, slot }) =>
          sources.find((source) => source.id === sourceId)?.credentialSlots[
            slot
          ],
      ),
    ).size !== secrets.length
  )
    throw new Error("mcp_import_invalid");
  return { sources, secrets };
}

export async function acceptPiMcpImport(
  preview: PiMcpImportPreview,
  approvals: Array<{
    sourceId: string;
    origin: string;
    cleartext: boolean;
  }> = [],
): Promise<PiMcpSource[]> {
  const sources = preview.sources.map(validatePiMcpSource);
  for (const source of sources) {
    if (!source.localNetworkApproval) continue;
    if (
      !approvals.some(
        (item) =>
          item.sourceId === source.id &&
          item.origin === source.localNetworkApproval &&
          item.cleartext === !!source.cleartextApproval,
      )
    )
      throw new Error("mcp_import_approval_required");
  }
  const created: string[] = [];
  const previous = String(getPref(PREF) || "");
  const current = loadPiMcpSourceRegistry();
  if (current.sources.length + sources.length > 64)
    throw new Error("mcp_source_limit_exceeded");
  if (
    sources.some((item) =>
      current.sources.some((existing) => existing.id === item.id),
    ) ||
    new Set(sources.map((item) => item.id)).size !== sources.length
  )
    throw new Error("mcp_import_source_conflict");
  const refs = preview.secrets.map(
    (secret) =>
      sources.find((source) => source.id === secret.sourceId)?.credentialSlots[
        secret.slot
      ],
  );
  if (refs.some((ref) => !ref) || new Set(refs).size !== refs.length)
    throw new Error("mcp_import_invalid");
  if (
    refs.some((ref) =>
      listPiCredentials("mcp-source").some((entry) => entry.id === ref),
    )
  )
    throw new Error("mcp_import_credential_conflict");
  let registryWritten = false;
  try {
    for (const secret of preview.secrets) {
      const ref = sources.find((source) => source.id === secret.sourceId)
        ?.credentialSlots[secret.slot];
      await putPiCredential({
        id: ref!,
        label: `${secret.sourceId}: ${secret.slot}`,
        namespace: "mcp-source",
        material: { kind: "mcp-secret", secret: secret.value },
      });
      created.push(ref!);
    }
    setPref(
      PREF,
      JSON.stringify({ version: 1, sources: [...current.sources, ...sources] }),
    );
    registryWritten = true;
    return sources;
  } catch (error) {
    if (registryWritten) setPref(PREF, previous);
    for (const ref of created) await deletePiCredential(ref, "mcp-source");
    throw error;
  }
}

export function exportPiMcpJson(): string {
  const mcpServers: Record<string, unknown> = {};
  for (const source of loadPiMcpSourceRegistry().sources) {
    mcpServers[source.id] =
      source.transport === "http"
        ? {
            type: "http",
            url: source.url,
            headers: Object.fromEntries(
              Object.keys(source.credentialSlots).map((slot) => [slot, ""]),
            ),
          }
        : {
            command: source.executable,
            args: source.argv,
            env: Object.fromEntries(
              Object.keys(source.credentialSlots).map((slot) => [slot, ""]),
            ),
          };
  }
  return JSON.stringify({ mcpServers }, null, 2);
}

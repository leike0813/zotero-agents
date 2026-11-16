import { getPref, setPref } from "../../utils/prefs";
import {
  SynthesisClientError,
  hashSynthesisContractCanonicalJson,
  rebuildSynthesisRetrievalConnection,
  rebuildSynthesisRetrievalScope,
  type SynthesisEmbeddingDescribeResult,
  type SynthesisEmbeddingEncodeRequest,
  type SynthesisEmbeddingEncodeResult,
  type SynthesisEncodingIdentity,
  type SynthesisRetrievalConnection,
  type SynthesisRetrievalScope,
} from "../../../packages/synthesis-contracts/src";
import {
  createSynthesisEmbeddingProvider,
  SYNTHESIS_EMBEDDING_PRESETS,
  discoverSynthesisEmbeddingModels,
  inspectSynthesisEmbeddingModel,
  getSynthesisEmbeddingEncodingOptionsKey,
  type SynthesisEmbeddingHttpClient,
  type SynthesisEmbeddingPreset,
  type SynthesisEmbeddingProvider,
  type SynthesisEmbeddingService,
} from "./synthesisEmbeddingProvider";
import {
  getSynthesisEmbeddingCredentialUpdatedAt,
  getSynthesisEmbeddingCredentialRevision,
  hasSynthesisEmbeddingCredential,
  readSynthesisEmbeddingCredential,
  storeSynthesisEmbeddingCredential,
} from "./synthesisEmbeddingCredentialPrefs";
import {
  validateSynthesisEmbeddingConnection,
  type EmbeddingConnectionDraft,
} from "./synthesisEmbeddingProtocol";
import {
  createCancellationController,
  type CancellationController,
} from "../../utils/wait";

export type SynthesisEmbeddingDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisEmbeddingConnectionTestResult = {
  ok: boolean;
  tested_at: string;
  connection_id: string | null;
  identity_key?: string;
  configuration_key?: string;
  model_id?: string;
  dimensions?: number;
  latency_ms?: number;
  diagnostics: SynthesisEmbeddingDiagnostic[];
};

export type SynthesisEmbeddingConnectionStatus =
  SynthesisRetrievalConnection & {
    credentialConfigured: boolean;
    credentialUpdatedAt?: string;
  };

export type SynthesisEmbeddingPrefsStatus = {
  enabled: boolean;
  connections: SynthesisEmbeddingConnectionStatus[];
  primaryConnectionId: string | null;
  fallbackConnectionIds: string[];
  pendingScope: SynthesisRetrievalScope | null;
  connectionTest?: SynthesisEmbeddingConnectionTestResult;
  connectionTests: Record<string, SynthesisEmbeddingConnectionTestResult>;
  presets: SynthesisEmbeddingPreset[];
};

export type SynthesisEmbeddingPrefsSaveInput = {
  enabled?: boolean;
  connections?: SynthesisRetrievalConnection[];
  primaryConnectionId?: string | null;
  fallbackConnectionIds?: string[];
  pendingScope?: SynthesisRetrievalScope | null;
};

export type SynthesisHostEmbeddingPort = {
  describe(): Promise<SynthesisEmbeddingDescribeResult>;
  encode(
    request: SynthesisEmbeddingEncodeRequest,
  ): Promise<SynthesisEmbeddingEncodeResult>;
};

const CONNECTIONS_PREF = "synthesisEmbeddingConnectionsJson";
const SELECTION_PREF = "synthesisEmbeddingSelectionJson";
const PENDING_SCOPE_PREF = "synthesisEmbeddingPendingScopeJson";
const CONNECTION_TESTS_PREF = "synthesisEmbeddingConnectionTestJson";
const connectionTestOwners = new Map<string, object>();

function nowIso() {
  return new Date().toISOString();
}

/** Binds a successful test to the exact encoding config it verified. */
function encodingKey(connection: SynthesisRetrievalConnection) {
  return JSON.stringify({
    modelId: connection.modelId,
    queryPrefix: connection.queryPrefix,
    documentPrefix: connection.documentPrefix,
    ...(getSynthesisEmbeddingEncodingOptionsKey(connection)
      ? {
          encodingOptionsKey:
            getSynthesisEmbeddingEncodingOptionsKey(connection),
        }
      : {}),
  });
}

function configurationKey(connection: SynthesisRetrievalConnection) {
  const {
    id: _id,
    name: _name,
    discovery: _discovery,
    ...requestConfig
  } = connection;
  return hashSynthesisContractCanonicalJson({
    connection: requestConfig,
    credentialRevision:
      getSynthesisEmbeddingCredentialRevision(connection.id) ?? null,
  });
}

export type SynthesisEmbeddingSettingsSubmission = Omit<
  SynthesisEmbeddingPrefsSaveInput,
  "connections"
> & {
  connection?: SynthesisRetrievalConnection;
  removeConnectionId?: string;
  credential?: string;
  test?: boolean;
};

/** Both preference and workbench callers submit through the same validated owner. */
let embeddingSubmissionTail: Promise<unknown> = Promise.resolve();
export function submitSynthesisEmbeddingSettings(
  input: SynthesisEmbeddingSettingsSubmission,
  options?: { client?: SynthesisEmbeddingHttpClient },
) {
  const result = embeddingSubmissionTail.then(() =>
    persistSynthesisEmbeddingSettings(input),
  );
  embeddingSubmissionTail = result.catch(() => undefined);
  return result.then(async (saved) => {
    const test =
      saved.ok && input.test && input.connection
        ? await testSynthesisEmbeddingConnection({
            connectionId: input.connection.id,
            client: options?.client,
          })
        : undefined;
    return { ...saved, status: getSynthesisEmbeddingPrefsStatus(), test };
  });
}

async function persistSynthesisEmbeddingSettings(
  input: SynthesisEmbeddingSettingsSubmission,
) {
  const current = getSynthesisEmbeddingPrefsConfig();
  const connections = current.connections
    .filter((entry) => entry.id !== input.removeConnectionId)
    .map((entry) =>
      entry.id === input.connection?.id ? input.connection : entry,
    );
  if (
    input.connection &&
    !connections.some((entry) => entry.id === input.connection!.id)
  )
    connections.push(input.connection);
  const primaryConnectionId =
    input.primaryConnectionId !== undefined
      ? input.primaryConnectionId
      : current.primaryConnectionId === input.removeConnectionId
        ? null
        : current.primaryConnectionId;
  const fallbackConnectionIds = (
    input.fallbackConnectionIds ?? current.fallbackConnectionIds
  ).filter((id) => id !== input.removeConnectionId);
  // Validate before storing a replacement secret or mutating any preference.
  try {
    for (const connection of connections) {
      rebuildSynthesisRetrievalConnection(connection);
      validateSynthesisEmbeddingConnection(connection);
    }
  } catch {
    return {
      ...selectionFailure([
        diagnostic(
          "embedding_connection_invalid",
          "error",
          "Embedding connection configuration is invalid.",
        ),
      ]),
      test: undefined,
    };
  }
  if (
    (primaryConnectionId !== null &&
      !connections.some((entry) => entry.id === primaryConnectionId)) ||
    new Set(fallbackConnectionIds).size !== fallbackConnectionIds.length ||
    fallbackConnectionIds.some(
      (id) =>
        id === primaryConnectionId ||
        !connections.some((entry) => entry.id === id),
    )
  ) {
    return {
      ...selectionFailure([
        diagnostic(
          "embedding_selection_invalid",
          "error",
          "Embedding selection is invalid.",
        ),
      ]),
      test: undefined,
    };
  }
  if (input.pendingScope) {
    try {
      rebuildSynthesisRetrievalScope(input.pendingScope);
    } catch {
      return {
        ...selectionFailure([
          diagnostic(
            "embedding_scope_invalid",
            "error",
            "Embedding scope is invalid.",
          ),
        ]),
        test: undefined,
      };
    }
  }
  const keys = [
    CONNECTIONS_PREF,
    SELECTION_PREF,
    PENDING_SCOPE_PREF,
    CONNECTION_TESTS_PREF,
    "synthesisEmbeddingEnabled",
    "synthesisEmbeddingCredentialsJson",
  ] as const;
  const previous = keys.map((key) => [key, getPref(key)] as const);
  let saved: ReturnType<typeof saveSynthesisEmbeddingPrefs>;
  try {
    if (input.connection && input.credential)
      await saveSynthesisEmbeddingConnectionCredential(
        input.connection.id,
        input.credential,
      );
    saved = saveSynthesisEmbeddingPrefs({
      connections,
      primaryConnectionId,
      fallbackConnectionIds,
      ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      ...(input.pendingScope === undefined
        ? {}
        : { pendingScope: input.pendingScope }),
    });
    if (!saved.ok) throw new Error("embedding_save_failed");
    if (input.removeConnectionId)
      await clearSynthesisEmbeddingConnectionCredential(
        input.removeConnectionId,
      );
  } catch {
    for (const [key, value] of previous) setPref(key, value as never);
    return {
      ...selectionFailure([
        diagnostic(
          "embedding_save_failed",
          "error",
          "Embedding configuration could not be saved.",
        ),
      ]),
      test: undefined,
    };
  }
  return {
    ...saved,
    status: getSynthesisEmbeddingPrefsStatus(),
    test: undefined,
  };
}

const discoveryRequests = new Map<object, CancellationController>();
export function cancelSynthesisEmbeddingDiscovery(owner: object) {
  discoveryRequests.get(owner)?.abort();
  discoveryRequests.delete(owner);
}
export async function discoverSynthesisEmbeddingSettingsModels(
  input: {
    connection: EmbeddingConnectionDraft;
    connectionId?: string;
    credential?: string;
  },
  owner: object,
) {
  cancelSynthesisEmbeddingDiscovery(owner);
  const controller = createCancellationController();
  discoveryRequests.set(owner, controller);
  try {
    const stored = input.connectionId
      ? await readSynthesisEmbeddingCredential(input.connectionId)
      : undefined;
    return await discoverSynthesisEmbeddingModels({
      connection: input.connection,
      credential:
        input.credential || (stored?.ok ? stored.credential : undefined),
      signal: controller.signal,
    });
  } finally {
    if (discoveryRequests.get(owner) === controller)
      discoveryRequests.delete(owner);
  }
}

export async function inspectSynthesisEmbeddingSettingsModel(
  input: {
    connection: EmbeddingConnectionDraft;
    connectionId?: string;
    credential?: string;
  },
  owner: object,
) {
  cancelSynthesisEmbeddingDiscovery(owner);
  const controller = createCancellationController();
  discoveryRequests.set(owner, controller);
  try {
    const stored = input.connectionId
      ? await readSynthesisEmbeddingCredential(input.connectionId)
      : undefined;
    return await inspectSynthesisEmbeddingModel({
      connection: input.connection,
      credential:
        input.credential || (stored?.ok ? stored.credential : undefined),
      signal: controller.signal,
    });
  } finally {
    if (discoveryRequests.get(owner) === controller)
      discoveryRequests.delete(owner);
  }
}

function parseJson(value: unknown): unknown {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function diagnostic(
  code: string,
  severity: SynthesisEmbeddingDiagnostic["severity"],
  message: string,
): SynthesisEmbeddingDiagnostic {
  return { code, severity, message };
}

function readConnections(): SynthesisRetrievalConnection[] {
  const parsed = parseJson(getPref(CONNECTIONS_PREF));
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry) => {
    try {
      return [rebuildSynthesisRetrievalConnection(entry)];
    } catch {
      return [];
    }
  });
}

function readSelection(): {
  primaryConnectionId: string | null;
  fallbackConnectionIds: string[];
} {
  const parsed = parseJson(getPref(SELECTION_PREF)) as
    | { primaryConnectionId?: unknown; fallbackConnectionIds?: unknown }
    | undefined;
  return {
    primaryConnectionId:
      typeof parsed?.primaryConnectionId === "string"
        ? parsed.primaryConnectionId
        : null,
    fallbackConnectionIds: Array.isArray(parsed?.fallbackConnectionIds)
      ? parsed.fallbackConnectionIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
  };
}

function readPendingScope(): SynthesisRetrievalScope | null {
  const parsed = parseJson(getPref(PENDING_SCOPE_PREF));
  if (parsed === undefined) return null;
  try {
    return rebuildSynthesisRetrievalScope(parsed);
  } catch {
    return null;
  }
}

function readConnectionTests(): Record<
  string,
  SynthesisEmbeddingConnectionTestResult
> {
  const parsed = parseJson(getPref(CONNECTION_TESTS_PREF));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, SynthesisEmbeddingConnectionTestResult>)
    : {};
}

export function getSynthesisEmbeddingPrefsConfig() {
  const selection = readSelection();
  return {
    enabled: getPref("synthesisEmbeddingEnabled") === true,
    connections: readConnections(),
    primaryConnectionId: selection.primaryConnectionId,
    fallbackConnectionIds: selection.fallbackConnectionIds,
    pendingScope: readPendingScope(),
  };
}

export function getSynthesisEmbeddingPrefsStatus(): SynthesisEmbeddingPrefsStatus {
  const config = getSynthesisEmbeddingPrefsConfig();
  const connectionTests = Object.fromEntries(
    Object.entries(readConnectionTests()).filter(([id, test]) => {
      const connection = config.connections.find((entry) => entry.id === id);
      return (
        connection && test.configuration_key === configurationKey(connection)
      );
    }),
  );
  const latest = Object.values(connectionTests).sort((left, right) =>
    left.tested_at < right.tested_at ? 1 : -1,
  )[0];
  return {
    enabled: config.enabled,
    connections: config.connections.map((connection) => ({
      ...connection,
      credentialConfigured: hasSynthesisEmbeddingCredential(connection.id),
      credentialUpdatedAt: getSynthesisEmbeddingCredentialUpdatedAt(
        connection.id,
      ),
    })),
    primaryConnectionId: config.primaryConnectionId,
    fallbackConnectionIds: config.fallbackConnectionIds,
    pendingScope: config.pendingScope,
    ...(latest ? { connectionTest: latest } : {}),
    connectionTests,
    presets: SYNTHESIS_EMBEDDING_PRESETS,
  };
}

function selectionFailure(diagnostics: SynthesisEmbeddingDiagnostic[]): {
  ok: false;
  status: SynthesisEmbeddingPrefsStatus;
  diagnostics: SynthesisEmbeddingDiagnostic[];
} {
  return {
    ok: false as const,
    status: getSynthesisEmbeddingPrefsStatus(),
    diagnostics,
  };
}

export function saveSynthesisEmbeddingPrefs(
  input: SynthesisEmbeddingPrefsSaveInput,
) {
  const diagnostics: SynthesisEmbeddingDiagnostic[] = [];
  let connections: SynthesisRetrievalConnection[] | undefined;
  if (input.connections !== undefined) {
    try {
      connections = input.connections.map((connection) => {
        const rebuilt = rebuildSynthesisRetrievalConnection(connection);
        validateSynthesisEmbeddingConnection(rebuilt);
        return rebuilt;
      });
    } catch {
      return selectionFailure([
        diagnostic(
          "embedding_connection_invalid",
          "error",
          "Embedding connection configuration is invalid.",
        ),
      ]);
    }
    if (
      new Set(connections.map((entry) => entry.id)).size !== connections.length
    ) {
      return selectionFailure([
        diagnostic(
          "embedding_connection_duplicate",
          "error",
          "Embedding connection identities must be unique.",
        ),
      ]);
    }
  }
  let pendingScope: SynthesisRetrievalScope | null | undefined;
  if (input.pendingScope !== undefined) {
    if (input.pendingScope === null) {
      pendingScope = null;
    } else {
      try {
        pendingScope = rebuildSynthesisRetrievalScope(input.pendingScope);
      } catch {
        return selectionFailure([
          diagnostic(
            "embedding_scope_invalid",
            "error",
            "Embedding retrieval scope is invalid.",
          ),
        ]);
      }
    }
  }
  const nextConnections = connections ?? readConnections();
  const currentSelection = readSelection();
  const primaryConnectionId =
    input.primaryConnectionId === undefined
      ? currentSelection.primaryConnectionId
      : input.primaryConnectionId;
  const fallbackConnectionIds =
    input.fallbackConnectionIds === undefined
      ? currentSelection.fallbackConnectionIds
      : input.fallbackConnectionIds;
  const ids = new Set(nextConnections.map((entry) => entry.id));
  if (primaryConnectionId !== null && !ids.has(primaryConnectionId)) {
    return selectionFailure([
      diagnostic(
        "embedding_primary_unknown",
        "error",
        "The selected primary embedding connection does not exist.",
      ),
    ]);
  }
  if (
    new Set(fallbackConnectionIds).size !== fallbackConnectionIds.length ||
    fallbackConnectionIds.some(
      (id) => !ids.has(id) || id === primaryConnectionId,
    )
  ) {
    return selectionFailure([
      diagnostic(
        "embedding_fallback_invalid",
        "error",
        "Embedding fallback connections must be distinct and exist.",
      ),
    ]);
  }
  if (input.enabled !== undefined) {
    setPref("synthesisEmbeddingEnabled", input.enabled === true);
  }
  if (connections !== undefined) {
    setPref(
      CONNECTIONS_PREF,
      connections.length ? JSON.stringify(connections) : "",
    );
    const previousTests = readConnectionTests();
    const retained = Object.fromEntries(
      Object.entries(previousTests).filter(([id, test]) => {
        const connection = nextConnections.find((entry) => entry.id === id);
        return (
          connection && test.configuration_key === configurationKey(connection)
        );
      }),
    );
    setPref(
      CONNECTION_TESTS_PREF,
      Object.keys(retained).length ? JSON.stringify(retained) : "",
    );
  }
  if (
    input.primaryConnectionId !== undefined ||
    input.fallbackConnectionIds !== undefined
  ) {
    setPref(
      SELECTION_PREF,
      JSON.stringify({ primaryConnectionId, fallbackConnectionIds }),
    );
  }
  if (pendingScope !== undefined) {
    setPref(
      PENDING_SCOPE_PREF,
      pendingScope === null ? "" : JSON.stringify(pendingScope),
    );
  }
  if (primaryConnectionId === null && connections !== undefined) {
    diagnostics.push(
      diagnostic(
        "embedding_primary_unselected",
        "warning",
        "No primary embedding connection is selected; configuration alone starts no work.",
      ),
    );
  }
  return {
    ok: true as const,
    status: getSynthesisEmbeddingPrefsStatus(),
    diagnostics,
  };
}

export async function saveSynthesisEmbeddingConnectionCredential(
  connectionId: string,
  credential: string,
) {
  const result = await storeSynthesisEmbeddingCredential(
    connectionId,
    credential,
  );
  const tests = readConnectionTests();
  delete tests[connectionId];
  setPref(CONNECTION_TESTS_PREF, JSON.stringify(tests));
  return {
    ok: true as const,
    stored: result.stored,
    status: getSynthesisEmbeddingPrefsStatus(),
  };
}

export async function clearSynthesisEmbeddingConnectionCredential(
  connectionId: string,
) {
  const result = await saveSynthesisEmbeddingConnectionCredential(
    connectionId,
    "",
  );
  return {
    ok: true as const,
    stored: result.stored,
    status: getSynthesisEmbeddingPrefsStatus(),
  };
}

export async function testSynthesisEmbeddingConnection(
  args: {
    connectionId?: string;
    client?: SynthesisEmbeddingHttpClient;
    provider?: SynthesisEmbeddingProvider;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    deadlineAtMs?: number;
  } = {},
): Promise<SynthesisEmbeddingConnectionTestResult> {
  const config = getSynthesisEmbeddingPrefsConfig();
  const connection = args.connectionId
    ? config.connections.find((entry) => entry.id === args.connectionId)
    : config.connections.find(
        (entry) => entry.id === config.primaryConnectionId,
      );
  if (!connection) {
    return {
      ok: false,
      tested_at: nowIso(),
      connection_id: args.connectionId ?? config.primaryConnectionId ?? null,
      diagnostics: [
        diagnostic(
          "embedding_connection_unselected",
          "error",
          "No embedding connection is available to test.",
        ),
      ],
    };
  }
  const owner = {};
  connectionTestOwners.set(connection.id, owner);
  const testedConfigurationKey = configurationKey(connection);
  const credentialRead = await readSynthesisEmbeddingCredential(connection.id);
  const credential = credentialRead.ok ? credentialRead.credential : undefined;
  const provider =
    args.provider ??
    createSynthesisEmbeddingProvider({
      client: args.client,
      now: args.now,
      sleep: args.sleep,
    });
  let result: SynthesisEmbeddingConnectionTestResult;
  try {
    const probe = await provider.probe({
      connection,
      credential,
      deadlineAtMs: args.deadlineAtMs,
    });
    result = {
      ok: true,
      tested_at: nowIso(),
      connection_id: connection.id,
      identity_key: encodingKey(connection),
      configuration_key: testedConfigurationKey,
      model_id: connection.modelId,
      dimensions: probe.dimensions,
      latency_ms: probe.latencyMs,
      diagnostics:
        credentialRead.ok ||
        credentialRead.code === "embedding_credential_missing"
          ? []
          : [
              diagnostic(
                credentialRead.code,
                "warning",
                credentialRead.message,
              ),
            ],
    };
  } catch (error) {
    const message =
      error instanceof SynthesisClientError
        ? String(error.details?.reason ?? error.code)
        : "embedding_connection_test_failed";
    result = {
      ok: false,
      tested_at: nowIso(),
      connection_id: connection.id,
      model_id: connection.modelId,
      diagnostics: [
        diagnostic("embedding_connection_test_failed", "error", message),
      ],
    };
  }
  const tests = readConnectionTests();
  const current = readConnections().find((entry) => entry.id === connection.id);
  if (
    current &&
    configurationKey(current) === testedConfigurationKey &&
    connectionTestOwners.get(connection.id) === owner
  ) {
    tests[connection.id] = result;
    setPref(CONNECTION_TESTS_PREF, JSON.stringify(tests));
  } else
    result = {
      ...result,
      ok: false,
      diagnostics: [
        diagnostic(
          "embedding_connection_changed",
          "warning",
          "Connection changed while testing.",
        ),
      ],
    };
  if (connectionTestOwners.get(connection.id) === owner)
    connectionTestOwners.delete(connection.id);
  return result;
}

export function getSynthesisEmbeddingConnectionIdentity(
  connectionId: string,
): SynthesisEncodingIdentity | null {
  const config = getSynthesisEmbeddingPrefsConfig();
  const connection = config.connections.find(
    (entry) => entry.id === connectionId,
  );
  if (!connection) return null;
  const tested = readConnectionTests()[connectionId];
  if (
    !tested?.ok ||
    tested.identity_key !== encodingKey(connection) ||
    tested.configuration_key !== configurationKey(connection)
  ) {
    return null;
  }
  const dimensions = connection.dimensions ?? tested.dimensions;
  if (
    !dimensions ||
    (connection.dimensions !== undefined &&
      tested.dimensions !== undefined &&
      connection.dimensions !== tested.dimensions)
  ) {
    return null;
  }
  return {
    modelId: connection.modelId,
    dimensions,
    queryPrefix: connection.queryPrefix,
    documentPrefix: connection.documentPrefix,
    ...(getSynthesisEmbeddingEncodingOptionsKey(connection)
      ? {
          encodingOptionsKey:
            getSynthesisEmbeddingEncodingOptionsKey(connection),
        }
      : {}),
  };
}

function resolveServices(identity: SynthesisEncodingIdentity) {
  const config = getSynthesisEmbeddingPrefsConfig();
  const ordered = [
    ...(config.primaryConnectionId ? [config.primaryConnectionId] : []),
    ...config.fallbackConnectionIds,
  ];
  const services: SynthesisEmbeddingService[] = [];
  const seen = new Set<string>();
  for (const id of ordered) {
    if (seen.has(id)) continue;
    seen.add(id);
    const connection = config.connections.find((entry) => entry.id === id);
    if (!connection || connection.modelId !== identity.modelId) continue;
    services.push({ connection });
  }
  return services;
}

export function createSynthesisEmbeddingHostPort(options?: {
  provider?: SynthesisEmbeddingProvider;
  readCredential?: (connectionId: string) => Promise<string | undefined>;
}): SynthesisHostEmbeddingPort {
  const provider = options?.provider ?? createSynthesisEmbeddingProvider();
  const readCredential =
    options?.readCredential ??
    (async (connectionId: string) => {
      const read = await readSynthesisEmbeddingCredential(connectionId);
      return read.ok ? read.credential : undefined;
    });
  return {
    async describe() {
      const config = getSynthesisEmbeddingPrefsConfig();
      const identity = config.primaryConnectionId
        ? getSynthesisEmbeddingConnectionIdentity(config.primaryConnectionId)
        : null;
      return { enabled: config.enabled, identity };
    },
    async encode(request) {
      // Read the Host configuration at call time: disabling retrieval stops new
      // encoding immediately and must not issue any HTTP request. Compatibility
      // stays a property of the encoding identity, never of enabled state.
      if (!getSynthesisEmbeddingPrefsConfig().enabled) {
        throw new SynthesisClientError(
          "unavailable",
          "Embedding retrieval is disabled",
          { reason: "embedding_disabled" },
        );
      }
      const services = resolveServices(request.identity);
      const compatibleServices = await Promise.all(
        services.map(async (service) => ({
          connection: service.connection,
          credential: await readCredential(service.connection.id),
        })),
      );
      return provider.encode({
        identity: request.identity,
        purpose: request.purpose,
        inputs: request.inputs,
        deadlineAtMs: request.deadlineAtMs,
        services: compatibleServices,
      });
    },
  };
}

export function createSynthesisEmbeddingSettingsPort() {
  return {
    get: getSynthesisEmbeddingPrefsStatus,
    save: saveSynthesisEmbeddingPrefs,
    saveCredential: saveSynthesisEmbeddingConnectionCredential,
    clearCredential: clearSynthesisEmbeddingConnectionCredential,
    test: testSynthesisEmbeddingConnection,
  };
}

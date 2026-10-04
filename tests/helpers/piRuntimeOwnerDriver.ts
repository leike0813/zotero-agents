/**
 * Minimal driver for the C20 PI full-behavior suites: it configures the local
 * deterministic endpoint through the plugin's own production settings, then
 * runs the production Conversation owner (the plugin singleton, wired by the
 * Assistant Workspace surface) with no injected provider stream.
 *
 * It runs inside Zotero and imports only project runtime modules.
 *
 * Scope limit: `getPiConversationCoordinator()` here resolves the test bundle's
 * module graph, which is a *different instance* from an installed XPI's plugin
 * runtime. This helper therefore never represents the installed-plugin chain;
 * packaged XPI behavior must be driven through the real shell/public plugin
 * bridge instead of a test import.
 *
 * The Skill Run owner is deliberately not driven here. Its production entry is
 * the Workflow admission action bridge, and the aggregate coordinator owns that
 * wiring; adding a second factory-based path here would diverge from it.
 */
import {
  getPiConversationCoordinator,
  type PiConversationChange,
} from "../../src/modules/piConversation";
import {
  putPiCredential,
  listPiCredentials,
} from "../../src/modules/piCredentialStore";
import {
  loadPiModelCatalog,
  refreshPiModelCatalog,
} from "../../src/modules/piModelCatalog";
import {
  resolvePiModelSelection,
  setPiProviderDefaults,
} from "../../src/modules/piProviderConfiguration";
import { savePiModelFixture } from "./piModelConfigurationFixture";
import {
  ensureRuntimeDirectoryStrict,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { inspectPiOwner } from "../../src/modules/piOwnerPersistence";
import type { PiModelSelectionSnapshot } from "../../src/shared/piProviderContract";

export type PiLocalProviderFixture = {
  /** OpenAI-compatible base URL including the `/v1` suffix. */
  baseUrl: string;
  modelId: string;
  credentialRef: string;
};

const LOCAL_PROVIDER = "system-e2e";
const CONFIGURATION_ID = "system-e2e-local";

function parentDir(filePath: string) {
  return filePath.replace(/[\\/][^\\/]+$/, "");
}

/**
 * Writes the local endpoint through the production settings owners: the user
 * `models.yml` overlay, the Pi provider configuration, the default selections
 * and the encrypted credential. Afterwards the plugin's normal model resolution
 * selects the local model, so no provider wiring is injected.
 */
export async function configurePiLocalProviderProfile(args: {
  /**
   * Run-owned overlay file. The caller must place it inside its own run root;
   * the helper never writes the user's home `models.yml`.
   */
  overlayPath: string;
  endpoint: string;
  modelId?: string;
  credentialRef?: string;
  secret?: string;
}): Promise<PiModelSelectionSnapshot> {
  const modelId = args.modelId || "system-e2e-local";
  const credentialRef = args.credentialRef || "system-e2e-credential";
  const overlayPath = args.overlayPath;
  if (!overlayPath) throw new Error("pi_local_overlay_path_required");
  await ensureRuntimeDirectoryStrict(parentDir(overlayPath));
  await writeRuntimeTextFile(
    overlayPath,
    [
      "providers:",
      `  ${LOCAL_PROVIDER}:`,
      "    api: openai-completions",
      `    baseUrl: ${args.endpoint}`,
      "    models:",
      `      - id: ${modelId}`,
      "        contextWindow: 32000",
      "        maxTokens: 2048",
      "        input: [text]",
      "        supportsTools: true",
      "",
    ].join("\n"),
  );
  await putPiCredential({
    id: credentialRef,
    label: "System E2E Local Provider",
    material: {
      kind: "api-key",
      secret: args.secret || "system-e2e-local-key",
    },
  });
  savePiModelFixture({
    id: CONFIGURATION_ID,
    label: "System E2E Local Provider",
    provider: LOCAL_PROVIDER,
    modelId,
    authVariant: "api-key",
    credentialRef,
    enabled: true,
    baseUrl: args.endpoint,
    api: "openai-completions",
    reasoning: "off",
  });
  // The overlay is run-owned; refreshing the normal catalog cache is what lets
  // the plugin's production model resolution see it without touching home.
  await refreshPiModelCatalog({ overlayPath });
  const catalog = await loadPiModelCatalog();
  setPiProviderDefaults(
    {
      conversation: { configurationId: CONFIGURATION_ID },
      skillRun: { configurationId: CONFIGURATION_ID },
      global: { configurationId: CONFIGURATION_ID },
    },
    listPiCredentials(),
    catalog,
  );
  return resolvePiModelSelection({
    kind: "conversation",
    catalog,
    credentials: listPiCredentials(),
  });
}

export type PiConversationTurnOutcome = {
  conversationId: string;
  status: string;
  transcriptKinds: string[];
};

/**
 * Runs one production Conversation turn through the plugin singleton. The
 * plugin's normal model resolution supplies the local provider and the
 * production Local Network authorizer decides whether the endpoint is allowed.
 */
export async function runPiConversationTurnViaPlugin(args: {
  prompt: string;
  authorizeLocalNetwork?: (endpoint: string) => Promise<boolean>;
  onChange?: (change: PiConversationChange) => void;
  /** Upper bound on lease wait, observed before the local network request. */
  onAdmission?: (waitMs: number) => void;
}): Promise<PiConversationTurnOutcome> {
  const coordinator = getPiConversationCoordinator();
  const unsubscribe = args.onChange
    ? coordinator.subscribe(args.onChange)
    : undefined;
  try {
    const created = await coordinator.create();
    const conversationId =
      "conversationId" in created && created.conversationId
        ? created.conversationId
        : coordinator.selectedId;
    if (!conversationId) throw new Error("pi_conversation_create_failed");
    coordinator.select(conversationId);
    const sendStartedAt = Date.now();
    const started = await coordinator.send(
      conversationId,
      args.prompt,
      async (endpoint) => {
        args.onAdmission?.(Date.now() - sendStartedAt);
        return args.authorizeLocalNetwork
          ? args.authorizeLocalNetwork(endpoint)
          : true;
      },
    );
    const settled = await started.result;
    // Production runtime root: the singleton already wrote there, so the
    // evidence is read from the same owner store, not an invented directory.
    const owner = await inspectPiOwner({
      kind: "conversation",
      ownerId: conversationId,
    });
    return {
      conversationId,
      status: String(settled.status),
      transcriptKinds: owner.entries.map((entry) => String(entry.kind)),
    };
  } finally {
    unsubscribe?.();
  }
}

/** Reads a durable owner's observed status and canonical entry kinds. */
export async function readPiOwnerEvidence(args: {
  owner: { kind: "conversation" | "skill_run"; ownerId: string };
}): Promise<{ status: string; kinds: string[] }> {
  const owner = await inspectPiOwner(args.owner);
  return {
    status: owner.status,
    kinds: owner.entries.map((entry) => String(entry.kind)),
  };
}

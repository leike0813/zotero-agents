import { assert } from "chai";
import {
  deletePiCredential,
  listPiCredentials,
  putPiCredential,
} from "../../../../src/modules/piCredentialStore";
import {
  loadPiModelCatalog,
  refreshPiCodexModelCatalog,
  refreshPiModelCatalog,
  type PiCatalog,
} from "../../../../src/modules/piModelCatalog";
import {
  deletePiProviderConfiguration,
  loadPiProviderConfigurationState,
  resolvePiModelSelection,
  setPiProviderDefaults,
  upsertPiProviderConfiguration,
} from "../../../../src/modules/piProviderConfiguration";
import {
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
  writeRuntimeTextFile,
} from "../../../../src/modules/runtimePersistence";
import { getPiConversationCoordinator } from "../../../../src/modules/piConversation";
import { inspectPiOwner } from "../../../../src/modules/piOwnerPersistence";
import { joinPath } from "../../../../src/utils/path";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { emitZoteroTestDebug } from "../../diagnosticBridge";
import { readDiagnosticsEnv } from "../../testDiagnosticsOutput";

// Shared live turn check. Streaming must be observed on the production
// publication stream and the assistant message must be durable; every live
// provider smoke reuses it so the observation semantics stay identical.
async function assertDurableStreamingTurn(id: string, prompt: string) {
  const coordinator = getPiConversationCoordinator();
  let streaming = false;
  const unsubscribe = coordinator.subscribe((change) => {
    if (change.conversationId !== id) return;
    streaming ||=
      change.transcriptEvents?.some(
        ({ mutation }) =>
          mutation.op === "append_text" ||
          (mutation.op === "upsert_item" &&
            mutation.item.itemKind === "message" &&
            mutation.item.role === "assistant" &&
            mutation.item.status === "streaming"),
      ) === true;
  });
  try {
    const turn = await coordinator.send(id, prompt, async () => false);
    const result = await turn.result;
    assert.equal(result.status, "completed", "live turn must complete");
    const durable = await inspectPiOwner({
      kind: "conversation",
      ownerId: id,
    });
    assert.isTrue(streaming, "live streaming publication required");
    assert.isTrue(
      durable.entries.some(
        (entry) =>
          entry.kind === "message" &&
          (entry.payload as { role?: string }).role === "assistant",
      ),
      "durable assistant message required",
    );
  } finally {
    unsubscribe();
  }
}

// Official China-region Text API surface for the MiniMax token plan: the
// current endpoint is api.minimax.cn (api.minimaxi.com redirects), and the
// preview model keeps reasoning always on. Capabilities are the documented
// values; the recommended output budget avoids reserving the 512K hard max.
const MINIMAX_CN_PROVIDER = "minimax-cn";
const MINIMAX_CN_MODEL_ID = "MiniMax-M3.1-Flash-Preview";
const MINIMAX_CN_BASE_URL = "https://api.minimax.cn/v1";
const MINIMAX_CN_CONFIGURATION_ID = "pi-live-minimax-cn";
const MINIMAX_CN_CREDENTIAL_ID = "pi-live-minimax-cn-key";
const MINIMAX_CN_OVERLAY_YML = [
  "providers:",
  `  ${MINIMAX_CN_PROVIDER}:`,
  "    api: openai-completions",
  `    baseUrl: ${MINIMAX_CN_BASE_URL}`,
  "    models:",
  `      - id: ${MINIMAX_CN_MODEL_ID}`,
  `        name: ${MINIMAX_CN_MODEL_ID}`,
  "        reasoning: [low, medium, high, xhigh, max]",
  "        contextWindow: 1000000",
  "        maxTokens: 131072",
  "        input: [text]",
  "        supportsTools: true",
  "",
].join("\n");

/** Reads the key from the host environment; the value is never logged. */
function readHostEnv(name: string) {
  const services = (
    globalThis as {
      Services?: { env?: { get?: (key: string) => string } };
    }
  ).Services;
  const value = services?.env?.get?.(name);
  return typeof value === "string" ? value.trim() : "";
}

// Queries the embedded registry first; only when the preview model is absent
// does it add a controlled overlay over the production refresh path.
async function loadMinimaxCatalog(): Promise<PiCatalog> {
  const registered = (await loadPiModelCatalog()).models.some(
    (model) =>
      model.provider === MINIMAX_CN_PROVIDER &&
      model.id === MINIMAX_CN_MODEL_ID &&
      model.reasoning.includes("low"),
  );
  if (registered) return loadPiModelCatalog();
  const { tmpDir } = getRuntimePersistencePaths();
  await ensureRuntimeDirectoryStrict(tmpDir);
  const overlayPath = joinPath(tmpDir, `pi-minimax-cn-${Date.now()}.yml`);
  await writeRuntimeTextFile(overlayPath, MINIMAX_CN_OVERLAY_YML);
  return refreshPiModelCatalog({ overlayPath });
}

describe("Pi live Codex smoke", function () {
  this.timeout(180_000);

  it("reuses the copied Codex authorization for a durable streaming turn", async function () {
    if (readDiagnosticsEnv("ZOTERO_PI_LIVE_SMOKE") !== "codex") this.skip();
    assert.equal(Number(String(Zotero.version).split(".")[0]), 10);
    const state = loadPiProviderConfigurationState();
    const credentials = listPiCredentials();
    const configuration = state.configurations.find(
      (entry) => entry.enabled && entry.authVariant === "openai-codex",
    );
    assert.isOk(configuration, "copied Codex configuration required");
    assert.isOk(configuration!.credentialRef);
    upsertPiProviderConfiguration({
      ...configuration!,
      modelId: "gpt-6-luna",
      reasoning: "low",
    });
    const catalog = await refreshPiCodexModelCatalog(
      await loadPiModelCatalog(),
      {
        credentialId: configuration!.credentialRef!,
        signal: new AbortController().signal,
      },
    );
    setPiProviderDefaults(
      { conversation: { configurationId: configuration!.id } },
      credentials,
      catalog,
    );
    const model = resolvePiModelSelection({
      kind: "conversation",
      catalog,
      credentials,
    });
    assert.equal(model.modelId, "gpt-6-luna");
    assert.equal(model.reasoning, "low");
    const coordinator = getPiConversationCoordinator();
    const owner = await coordinator.create();
    assert.equal(
      owner.status,
      "created",
      "copied default selection must be executable",
    );
    if (owner.status !== "created")
      throw new Error("pi_live_selection_unavailable");
    const id = owner.conversationId;
    let failure: unknown;
    try {
      await assertDurableStreamingTurn(
        id,
        "Reply with a short greeting. Do not call tools.",
      );
      await emitZoteroTestDebug({
        kind: "pi-live-smoke-observation",
        source: "openai-codex",
        modelId: "gpt-6-luna",
        reasoning: "low",
        zoteroMajor: 10,
        observed: ["refresh-or-reuse", "streaming"],
        status: "passed",
        finalAcceptance: false,
      });
    } catch (error) {
      failure = error;
    } finally {
      try {
        await coordinator.archive(id);
        await coordinator.delete(id);
      } catch (error) {
        failure ??= error;
      }
    }
    if (failure) throw failure;
  });
});

describe("Pi live MiniMax smoke", function () {
  this.timeout(180_000);

  it("reuses a China-region token-plan key for a durable streaming turn", async function () {
    if (readDiagnosticsEnv("ZOTERO_PI_LIVE_SMOKE") !== "minimax-cn")
      this.skip();
    assert.equal(Number(String(Zotero.version).split(".")[0]), 10);
    // Isolation: restore the prior defaults/configuration and remove the key
    // credential even when setup fails, so the copied profile keeps no key.
    const previousState = loadPiProviderConfigurationState();
    const previousDefaults = structuredClone(previousState.defaults);
    const previousConfiguration = previousState.configurations.find(
      (entry) => entry.id === MINIMAX_CN_CONFIGURATION_ID,
    );
    const previousDocument = getPref("piProviderConfigurationJson");
    const coordinator = getPiConversationCoordinator();
    let catalog: PiCatalog | undefined;
    let id = "";
    let failure: unknown;
    try {
      const apiKey = readHostEnv("MINIMAX_CN_API_KEY");
      assert.isNotEmpty(apiKey, "MINIMAX_CN_API_KEY is required");
      // Persist the key as an encrypted credential copy; never log or fixture.
      await putPiCredential({
        id: MINIMAX_CN_CREDENTIAL_ID,
        label: "MiniMax CN smoke",
        material: { kind: "api-key", secret: apiKey },
      });
      upsertPiProviderConfiguration({
        id: MINIMAX_CN_CONFIGURATION_ID,
        label: "MiniMax CN",
        provider: MINIMAX_CN_PROVIDER,
        modelId: MINIMAX_CN_MODEL_ID,
        authVariant: "api-key",
        credentialRef: MINIMAX_CN_CREDENTIAL_ID,
        enabled: true,
        api: "openai-completions",
        baseUrl: MINIMAX_CN_BASE_URL,
        reasoning: "low",
      });
      const credentials = listPiCredentials();
      catalog = await loadMinimaxCatalog();
      setPiProviderDefaults(
        {
          conversation: { configurationId: MINIMAX_CN_CONFIGURATION_ID },
        },
        credentials,
        catalog,
      );
      const model = resolvePiModelSelection({
        kind: "conversation",
        catalog,
        credentials,
      });
      assert.equal(model.modelId, MINIMAX_CN_MODEL_ID);
      assert.equal(model.reasoning, "low");
      assert.equal(model.api, "openai-completions");
      assert.equal(model.baseUrl, MINIMAX_CN_BASE_URL);
      // Canonical selection only: effort forwarding is owned by the provider
      // runtime, so this smoke does not assert the request wire.
      const owner = await coordinator.create();
      assert.equal(
        owner.status,
        "created",
        "minimax selection must be executable",
      );
      if (owner.status !== "created")
        throw new Error("pi_live_selection_unavailable");
      id = owner.conversationId;
      await assertDurableStreamingTurn(
        id,
        "Reply with a short greeting. Do not call tools.",
      );
      await emitZoteroTestDebug({
        kind: "pi-live-smoke-observation",
        source: MINIMAX_CN_PROVIDER,
        modelId: MINIMAX_CN_MODEL_ID,
        reasoning: "low",
        zoteroMajor: 10,
        observed: ["streaming"],
        status: "passed",
        finalAcceptance: false,
      });
    } catch (error) {
      failure = error;
    } finally {
      if (id) {
        try {
          await coordinator.archive(id);
          await coordinator.delete(id);
        } catch (error) {
          failure ??= error;
        }
      }
      try {
        try {
          deletePiProviderConfiguration(MINIMAX_CN_CONFIGURATION_ID);
          if (previousConfiguration)
            upsertPiProviderConfiguration(previousConfiguration);
          if (catalog)
            setPiProviderDefaults(
              previousDefaults,
              listPiCredentials(),
              catalog,
            );
          else setPref("piProviderConfigurationJson", previousDocument);
        } catch {
          // Previous defaults can reference a configuration whose catalog
          // entry only exists after runtime discovery (for example Codex);
          // restore the exact persisted document when the setter cannot
          // validate them.
          setPref("piProviderConfigurationJson", previousDocument);
        }
        await deletePiCredential(MINIMAX_CN_CREDENTIAL_ID);
      } catch (error) {
        failure ??= error;
      }
    }
    if (failure) throw failure;
  });
});

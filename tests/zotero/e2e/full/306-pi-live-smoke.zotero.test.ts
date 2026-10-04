import { assert } from "chai";
import {
  deletePiCredential,
  listPiCredentials,
  putPiCredential,
} from "../../../../src/modules/piCredentialStore";
import {
  loadPiModelCatalog,
  refreshPiChatGPTModelCatalog,
  refreshPiModelCatalog,
  type PiCatalog,
} from "../../../../src/modules/piModelCatalog";
import { assertPiChatGPTInferenceAllowed } from "../../../../src/modules/piChatGPTAuth";
import {
  loadPiProviderConfigurationState,
  resolvePiModelSelection,
  setPiProviderDefaults,
  upsertPiModelConfiguration,
} from "../../../../src/modules/piProviderConfiguration";
import { savePiModelFixture } from "../../../helpers/piModelConfigurationFixture";
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
import {
  readDiagnosticsEnv,
  resolveDefaultTestDiagnosticsOutputPath,
  writeDiagnosticsText,
} from "../../testDiagnosticsOutput";
import { normalizeContext, Type } from "@earendil-works/pi-ai";
import { createPiProviderSource } from "../../../../src/modules/piProviderExecution";
import {
  createPiBrokeredWebTools,
  type PiWebAttempt,
} from "../../../../src/modules/piBrokeredWebTools";
import type { PiModelSelectionSnapshot } from "../../../../src/shared/piProviderContract";
import {
  requestPiBrokeredWebOperation,
  PiOutboundNetworkError,
} from "../../../../src/modules/piBrokeredWebHttp";

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

describe("Pi live ChatGPT smoke", function () {
  this.timeout(180_000);
  let selection: PiModelSelectionSnapshot;
  let previousDocument: unknown;
  let previousSources: unknown;
  const observations: Array<Record<string, unknown>> = [];
  async function observe(value: Record<string, unknown>) {
    const observation = {
      ...value,
      recordedAt: new Date().toISOString(),
      hostVersion: String(Zotero.version),
    };
    observations.push(observation);
    await emitZoteroTestDebug(observation);
  }

  before(async function () {
    if (readDiagnosticsEnv("ZOTERO_PI_LIVE_SMOKE") !== "chatgpt") this.skip();
    assert.equal(Number(String(Zotero.version).split(".")[0]), 10);
    previousDocument = getPref("piProviderConfigurationJson");
    previousSources = getPref("piWebSourcesJson");
    const requestedModel = readDiagnosticsEnv("ZOTERO_PI_LIVE_MODEL");
    assert.isNotEmpty(requestedModel, "explicit live model required");
    const state = loadPiProviderConfigurationState();
    const card = state.configurations.find(
      (entry) =>
        entry.enabled &&
        entry.modelId === requestedModel &&
        state.connections.some(
          (connection) =>
            connection.id === entry.connectionId &&
            connection.enabled &&
            connection.authVariant === "chatgpt",
        ),
    );
    assert.isOk(card, "saved ChatGPT model card required");
    const connection = state.connections.find(
      (entry) => entry.id === card!.connectionId,
    )!;
    assert.isOk(connection.credentialRef, "selected registration required");
    const signal = new AbortController().signal;
    await assertPiChatGPTInferenceAllowed(connection.credentialRef!, signal);
    let catalog = await refreshPiChatGPTModelCatalog(
      await loadPiModelCatalog(),
      {
        credentialId: connection.credentialRef!,
        signal,
      },
    );
    const discovered = catalog.models.find(
      (entry) =>
        entry.id === requestedModel &&
        entry.source === "discovered" &&
        entry.credentialRef === connection.credentialRef &&
        entry.authVariants?.includes("chatgpt"),
    );
    assert.isOk(discovered, "selected model must be officially discovered");
    // SIWC documents namespaced functions independently of /models. Keep
    // capacity from account discovery; this explicit target declaration adds
    // only the supported function protocol to the disposable test catalog.
    // https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
    if (discovered!.knowledge?.tools === "unknown") {
      const { tmpDir } = getRuntimePersistencePaths();
      await ensureRuntimeDirectoryStrict(tmpDir);
      const overlayPath = joinPath(tmpDir, "pi-live-chatgpt-functions.yml");
      await writeRuntimeTextFile(
        overlayPath,
        JSON.stringify({
          providers: {
            openai: {
              models: [
                {
                  id: requestedModel,
                  api: "openai-responses",
                  baseUrl: "https://api.openai.com/v1",
                  authVariants: ["chatgpt"],
                  supportsTools: true,
                },
              ],
            },
          },
        }),
      );
      catalog = await refreshPiModelCatalog({ overlayPath });
    }
    const acceptanceCardId = "siwc-live-acceptance-model";
    upsertPiModelConfiguration(
      {
        id: acceptanceCardId,
        connectionId: connection.id,
        modelId: requestedModel,
        enabled: true,
        reasoning: card!.reasoning,
      },
      catalog,
    );
    selection = resolvePiModelSelection({
      kind: "conversation",
      catalog,
      credentials: listPiCredentials(),
      explicit: { configurationId: acceptanceCardId },
    });
    assert.equal(selection.modelId, requestedModel);
    assert.isAbove(selection.policy.contextWindow, 0);
    assert.isTrue(selection.policy.supportsTools);
    setPiProviderDefaults(
      {
        conversation: { configurationId: acceptanceCardId },
        auxiliary: { configurationId: acceptanceCardId },
      },
      listPiCredentials(),
      catalog,
    );
    setPref("piWebSourcesJson", "[]");
    await observe({
      kind: "pi-live-smoke-observation",
      source: "chatgpt",
      modelId: selection.modelId,
      reasoning: selection.reasoning,
      zoteroMajor: 10,
      observed: ["discovery", "refresh-or-reuse"],
      status: "passed",
      finalAcceptance: false,
    });
  });

  after(async function () {
    if (previousDocument !== undefined)
      setPref("piProviderConfigurationJson", previousDocument as string);
    if (previousSources !== undefined)
      setPref("piWebSourcesJson", previousSources as string);
    if (observations.length)
      await writeDiagnosticsText(
        resolveDefaultTestDiagnosticsOutputPath({
          envName: "ZOTERO_PI_LIVE_OBSERVATION_PATH",
          prefix: "pi-chatgpt-live-observation",
        }),
        JSON.stringify(
          { modelId: selection?.modelId, finalAcceptance: false, observations },
          null,
          2,
        ),
      );
  });

  it("reuses the selected ChatGPT authorization for a durable streaming turn", async function () {
    const coordinator = getPiConversationCoordinator();
    const owner = await coordinator.create();
    assert.equal(owner.status, "created", "selected model must be executable");
    if (owner.status !== "created")
      throw new Error("pi_live_selection_unavailable");
    try {
      await assertDurableStreamingTurn(
        owner.conversationId,
        "Reply with a short greeting. Do not call tools.",
      );
      await observe({
        kind: "pi-live-smoke-observation",
        source: "chatgpt",
        modelId: selection.modelId,
        reasoning: selection.reasoning,
        zoteroMajor: 10,
        observed: ["streaming"],
        status: "passed",
        finalAcceptance: false,
      });
    } finally {
      await coordinator.archive(owner.conversationId);
      await coordinator.delete(owner.conversationId);
    }
  });

  it("completes a real namespaced function call and its full-context result continuation", async function () {
    const Controller = new AbortController();
    const timer = setTimeout(() => Controller.abort(), 120_000);
    const tool = {
      name: "acceptance/read",
      description:
        "Return the acceptance fixture value. Call exactly once before answering.",
      parameters: Type.Object({ value: Type.Literal("siwc-acceptance") }),
    };
    const wires: Array<{
      status: number;
      modelMatches: boolean;
      stream: boolean;
      store: boolean;
      namespace: boolean;
      fullContext: boolean;
    }> = [];
    const terminals: string[] = [];
    const completions: Array<{
      namespace: boolean;
      argumentsValid: boolean;
      usageKnown: boolean;
    }> = [];
    const prepared = createPiProviderSource(selection, {
      disableChatGPTRetries: true,
      fetch: async (input, init) => {
        const request = new Request(input, init);
        const payload = await request.clone().json();
        const inputItems = Array.isArray(payload.input) ? payload.input : [];
        const historicalCall = inputItems.find(
          (entry: Record<string, unknown>) => entry.type === "function_call",
        );
        const historicalResult = inputItems.find(
          (entry: Record<string, unknown>) =>
            entry.type === "function_call_output",
        );
        const response = await globalThis.fetch(request);
        wires.push({
          status: response.status,
          modelMatches: payload.model === selection.modelId,
          stream: payload.stream === true,
          store: payload.store === false,
          namespace:
            payload.tools?.some(
              (entry: Record<string, unknown>) =>
                entry.type === "namespace" && entry.name === "zotero_agents",
            ) === true,
          fullContext:
            !payload.previous_response_id &&
            !!historicalCall &&
            historicalCall.namespace === "zotero_agents" &&
            historicalCall.call_id === historicalResult?.call_id,
        });
        return response;
      },
      onChatGPTCompletedResponse: (response) => {
        const call = response.output.find(
          (entry) => entry.type === "function_call",
        );
        completions.push({
          namespace: call?.namespace === "zotero_agents",
          argumentsValid:
            call?.arguments === JSON.stringify({ value: "siwc-acceptance" }) ||
            (typeof call?.arguments === "string" &&
              JSON.parse(call.arguments).value === "siwc-acceptance"),
          usageKnown:
            typeof response.usage?.inputTokens === "number" &&
            typeof response.usage?.outputTokens === "number" &&
            typeof response.usage?.totalTokens === "number",
        });
      },
    });
    const user = {
      role: "user" as const,
      content:
        "Call acceptance/read exactly once with value siwc-acceptance. After its result, briefly repeat the returned value. Do not answer before calling the tool.",
      timestamp: 0,
    };
    const dispatch = async (
      context: Parameters<typeof normalizeContext>[0],
      invocation: number,
    ) => {
      const stream = await prepared.source({
        sessionId: "siwc-live-function",
        turnId: "siwc-live-function",
        invocationId: "siwc-live-function:" + invocation,
        model: prepared.model,
        signal: Controller.signal,
        context: normalizeContext(context),
        onProviderTerminal: (terminal) => terminals.push(terminal.status),
      });
      return stream.result();
    };
    try {
      const first = await dispatch({ messages: [user], tools: [tool] }, 0);
      assert.equal(
        first.stopReason,
        "toolUse",
        first.errorMessage || "function call required",
      );
      const calls = first.content.filter((entry) => entry.type === "toolCall");
      assert.lengthOf(calls, 1);
      const call = calls[0];
      assert.equal(call.name, tool.name);
      assert.deepEqual(call.arguments, { value: "siwc-acceptance" });
      const second = await dispatch(
        {
          tools: [tool],
          messages: [
            user,
            first,
            {
              role: "toolResult",
              toolCallId: call.id,
              toolName: tool.name,
              content: [{ type: "text", text: "siwc-acceptance" }],
              isError: false,
              timestamp: Date.now(),
            },
          ],
        },
        1,
      );
      assert.equal(
        second.stopReason,
        "stop",
        second.errorMessage || "continuation must complete",
      );
      assert.isTrue(
        second.content.some((entry) => entry.type === "text" && !!entry.text),
      );
      assert.deepEqual(terminals, ["completed", "completed"]);
      assert.lengthOf(wires, 2);
      assert.isTrue(
        wires.every(
          (entry) =>
            entry.status === 200 &&
            entry.modelMatches &&
            entry.stream &&
            entry.store &&
            entry.namespace,
        ),
      );
      assert.isTrue(wires[1].fullContext);
      assert.isTrue(completions[0].namespace && completions[0].argumentsValid);
      assert.isTrue(completions.every((entry) => entry.usageKnown));
      assert.equal(prepared.usageCompleteness(second), "complete");
      await observe({
        kind: "pi-live-smoke-observation",
        source: "chatgpt",
        modelId: selection.modelId,
        reasoning: selection.reasoning,
        zoteroMajor: 10,
        observed: ["function-continuation", "actual-completed", "actual-usage"],
        status: "passed",
        dispatches: wires.length,
        wires,
        completions,
        finalAcceptance: false,
      });
    } finally {
      clearTimeout(timer);
    }
  });

  it("returns real native search grounding and supplied citations through the sealed network boundary", async function () {
    const transport: Array<Record<string, unknown>> = [];
    const service = createPiBrokeredWebTools({
      request: async (input) => {
        const response = await requestPiBrokeredWebOperation(input).catch(
          (error) => {
            transport.push({
              status: "failed",
              code:
                error instanceof PiOutboundNetworkError
                  ? error.code
                  : "pi_live_transport_unknown",
            });
            throw error;
          },
        );
        if (input.kind === "openai") {
          const events = new TextDecoder()
            .decode(response.body)
            .split("\n")
            .flatMap((line) => {
              if (!line.startsWith("data: ") || line === "data: [DONE]")
                return [];
              try {
                const event = JSON.parse(line.slice(6));
                return [event];
              } catch {
                return [];
              }
            });
          const doneItems = events.filter(
            (event) => event.type === "response.output_item.done",
          );
          const completedOutput = events.find(
            (event) => event.type === "response.completed",
          )?.response?.output;
          transport.push({
            status: response.status,
            actualCompleted: events.some(
              (event) => event.type === "response.completed",
            ),
            actualFailed: events.some(
              (event) => event.type === "response.failed",
            ),
            actualIncomplete: events.some(
              (event) => event.type === "response.incomplete",
            ),
            completedOutputCount: Array.isArray(completedOutput)
              ? completedOutput.length
              : undefined,
            completedItems: doneItems.map(({ output_index, item }) => ({
              index: Number.isSafeInteger(output_index)
                ? output_index
                : undefined,
              isMessage: item?.type === "message",
              isWebSearch: item?.type === "web_search_call",
              isReasoning: item?.type === "reasoning",
              completed: item?.status === "completed",
              hasId: typeof item?.id === "string" && !!item.id,
              searchAction: item?.action?.type === "search",
              openPageAction: item?.action?.type === "open_page",
              findAction: item?.action?.type === "find_in_page",
              hasCitations:
                Array.isArray(item?.content) &&
                item.content.some(
                  (part: { annotations?: Array<{ type?: string }> }) =>
                    Array.isArray(part.annotations) &&
                    part.annotations.some(
                      (entry) => entry.type === "url_citation",
                    ),
                ) === true,
            })),
          });
        }
        return response;
      },
    });
    const attempts: PiWebAttempt[] = [];
    service.saveSources([
      {
        id: "siwc-acceptance-search",
        kind: "openai-native",
        label: "SIWC acceptance",
        enabled: true,
        modelConfigurationId: selection.configurationId,
      },
    ]);
    const turn = await service.freezeForTurn(selection);
    assert.lengthOf(turn.sources, 1);
    assert.equal(turn.sources[0].chatGPTSelection?.modelId, selection.modelId);
    const result = await service
      .search(
        turn,
        {
          query:
            "Search the official Zotero documentation for the Zotero Connector. Cite the official page in a short answer.",
          maxResults: 3,
        },
        new AbortController().signal,
        async (attempt) => {
          attempts.push(attempt);
        },
      )
      .catch(async (error) => {
        await observe({
          kind: "pi-live-smoke-observation",
          source: "openai-web-chatgpt",
          modelId: selection.modelId,
          status: "failed",
          transport,
          attempts: attempts.map(({ phase, status, code }) => ({
            phase,
            status,
            code,
          })),
          finalAcceptance: false,
        });
        throw error;
      });
    assert.equal(result.resultKind, "grounded_answer");
    if (result.resultKind !== "grounded_answer")
      throw new Error("pi_live_search_not_grounded");
    assert.equal(result.sourceEvidence, "provided");
    assert.isAbove(result.citations.length, 0);
    assert.isTrue(
      result.citations.every((citation) => {
        const url = new URL(citation.url);
        return url.protocol === "https:" && !url.username && !url.password;
      }),
    );
    assert.equal(result.contentTrust, "external_untrusted");
    assert.deepEqual(
      attempts.map((attempt) => attempt.phase),
      ["started", "terminal"],
    );
    assert.equal(attempts[1].status, "completed");
    assert.equal(attempts[1].modelId, selection.modelId);
    await observe({
      kind: "pi-live-smoke-observation",
      source: "openai-web-chatgpt",
      modelId: selection.modelId,
      reasoning: selection.reasoning,
      zoteroMajor: 10,
      observed: ["search-results", "actual-completed", "citations"],
      status: "passed",
      citationCount: result.citations.length,
      attemptCount: 1,
      sourceEvidence: result.sourceEvidence,
      transport,
      finalAcceptance: false,
    });
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
      savePiModelFixture({
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
          setPref("piProviderConfigurationJson", previousDocument);
        } catch {
          // Previous defaults can reference a configuration whose catalog
          // entry only exists after runtime discovery (for example ChatGPT);
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

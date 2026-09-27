import { Agent } from "@earendil-works/pi-agent-core";
import type { Message } from "@earendil-works/pi-ai";
import { createMockModel } from "@oh-my-pi/pi-ai/providers/mock";
import {
  getBundledModels,
  getBundledProviders,
} from "@oh-my-pi/pi-catalog/models";
import { parse } from "yaml";
import { createOmpPiAiStreamFn } from "./ompPiAiStreamAdapter";

const overlayFixture = `
providers:
  accepted-gateway:
    baseUrl: https://gateway.example.test/v1
    api: openai-responses
    models:
      - id: accepted-model
        name: Accepted Model
        contextWindow: 128000
        maxTokens: 8192
  rejected-secret:
    baseUrl: https://secret.example.test/v1
    api: openai-completions
    apiKey: SECRET_FROM_ENV_OR_LITERAL
    models:
      - id: rejected-secret-model
  rejected-headers:
    baseUrl: https://headers.example.test/v1
    api: openai-completions
    headers:
      Authorization: Bearer secret
    models:
      - id: rejected-header-model
`;

function textOf(message: { content: readonly unknown[] }): string {
  return message.content
    .filter(
      (block): block is { type: "text"; text: string } =>
        Boolean(
          block &&
            typeof block === "object" &&
            (block as { type?: unknown }).type === "text" &&
            typeof (block as { text?: unknown }).text === "string",
        ),
    )
    .map((block) => block.text)
    .join("");
}

const nativeModel = {
  id: "omp-mock-model",
  name: "OMP mock through native core",
  api: "mock",
  provider: "mock",
  baseUrl: "mock://",
  reasoning: false,
  input: ["text" as const],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 200_000,
  maxTokens: 32_768,
};

async function runNativeAgentWithOmpAi() {
  const model = createMockModel({
    responses: [
      {
        content: [
          "calling echo",
          {
            type: "toolCall",
            id: "tool-probe",
            name: "echo",
            arguments: { text: "probe" },
          },
        ],
      },
      { content: ["echo complete"] },
    ],
  });
  const toolExecutions: string[] = [];
  const transformOrder: string[] = [];
  const eventTypes: string[] = [];
  const agent = new Agent({
    initialState: {
      systemPrompt: "Use echo once, then finish.",
      model: nativeModel,
      tools: [
        {
          name: "echo",
          label: "Echo",
          description: "Echo text",
          parameters: {
            type: "object",
            properties: { text: { type: "string" } },
            required: ["text"],
            additionalProperties: false,
          },
          async execute(_toolCallId, params: { text: string }) {
            const result = `echo:${String(params.text)}`;
            toolExecutions.push(result);
            return {
              content: [{ type: "text", text: result }],
              details: {},
            };
          },
        },
      ],
    },
    streamFn: createOmpPiAiStreamFn(model, model.stream),
    getApiKey: () => "prototype-key",
    transformContext: async (messages) => {
      transformOrder.push("transformContext");
      return messages;
    },
    convertToLlm: (messages) => {
      transformOrder.push("convertToLlm");
      return messages.filter(
        (message) =>
          message.role === "user" ||
          message.role === "assistant" ||
          message.role === "toolResult",
      ) as Message[];
    },
  });
  agent.subscribe((event) => {
    eventTypes.push(event.type);
  });
  await agent.prompt("probe");
  const final = [...agent.state.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  return {
    eventTypes,
    explicitApiKeyForwarded: model.calls.every(
      (call) => call.options?.apiKey === "prototype-key",
    ),
    finalText: final?.role === "assistant" ? textOf(final) : "",
    finalStopReason: final?.role === "assistant" ? final.stopReason : undefined,
    ompCalls: model.calls.length,
    toolExecutions,
    transformOrder,
  };
}

async function runAbort() {
  const model = createMockModel({
    responses: [{ content: ["too late"], delayMs: 100 }],
  });
  const controller = new AbortController();
  const stream = await createOmpPiAiStreamFn(model, model.stream)(
    nativeModel,
    { messages: [{ role: "user", content: "abort", timestamp: 0 }] },
    { apiKey: "prototype-key", signal: controller.signal },
  );
  setTimeout(() => controller.abort("prototype abort"), 0);
  for await (const _event of stream) {
    // Drain to the terminal event; the result carries the structured reason.
  }
  const result = await stream.result();
  return { stopReason: result.stopReason };
}

function inspectCatalog() {
  const providers = getBundledProviders();
  let bundledModels = 0;
  for (const provider of providers) {
    bundledModels += getBundledModels(provider).length;
  }
  return { bundledModels, bundledProviders: providers.length };
}

function sanitizeOverlay() {
  const document = parse(overlayFixture) as {
    providers?: Record<string, Record<string, unknown>>;
  };
  const accepted: Array<{ provider: string; model: string }> = [];
  let rejected = 0;
  for (const [provider, config] of Object.entries(document.providers ?? {})) {
    const forbidden = [
      "apiKey",
      "headers",
      "authHeader",
      "command",
      "discovery",
      "env",
    ];
    if (forbidden.some((field) => field in config)) {
      rejected += 1;
      continue;
    }
    if (
      typeof config.baseUrl !== "string" ||
      !["openai-responses", "openai-completions"].includes(
        String(config.api),
      ) ||
      !Array.isArray(config.models)
    ) {
      rejected += 1;
      continue;
    }
    for (const model of config.models) {
      if (
        model &&
        typeof model === "object" &&
        typeof (model as { id?: unknown }).id === "string"
      ) {
        accepted.push({
          provider,
          model: (model as { id: string }).id,
        });
      }
    }
  }
  return { accepted, rejected };
}

export async function runOmpCompatibilityProbe() {
  const runtimeGlobal = globalThis as typeof globalThis & {
    Bun?: unknown;
    process?: { versions?: { node?: unknown } };
    require?: (specifier: string) => unknown;
  };
  let nodeBuiltinLoadable = false;
  try {
    nodeBuiltinLoadable = Boolean(runtimeGlobal.require?.("node:fs"));
  } catch {
    nodeBuiltinLoadable = false;
  }
  const [agent, cancellation] = await Promise.all([
    runNativeAgentWithOmpAi(),
    runAbort(),
  ]);
  const catalog = inspectCatalog();
  const overlay = sanitizeOverlay();
  return {
    schema: "omp-zotero-compatibility.v1",
    runtime: {
      bunGlobalAbsent: runtimeGlobal.Bun === undefined,
      nodeRuntimeAbsent:
        runtimeGlobal.process?.versions?.node === undefined &&
        !nodeBuiltinLoadable,
    },
    agent: {
      nativeCoreUsed: true,
      ompCoreLoaded: false,
      eventTypes: agent.eventTypes,
      finalText: agent.finalText,
      finalStopReason: agent.finalStopReason,
      ompCalls: agent.ompCalls,
      toolExecutions: agent.toolExecutions,
      transformOrder: agent.transformOrder,
    },
    cancellation,
    catalog: {
      ...catalog,
      overlayAccepted: overlay.accepted.length,
      overlayRejected: overlay.rejected,
    },
    auth: {
      explicitApiKeyForwarded: agent.explicitApiKeyForwarded,
      ompStateTouched: false,
    },
  };
}

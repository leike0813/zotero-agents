import {
  Agent,
  type AgentEvent,
  type AgentTool,
} from "@earendil-works/pi-agent-core";
import {
  Type,
  createModels,
  fauxAssistantMessage,
  fauxProvider,
  fauxText,
  fauxToolCall,
  type AssistantMessage,
  type Message,
} from "@earendil-works/pi-ai";

declare const __include_openai__: boolean;

export interface PiCompatibilityProbeOptions {
  includeOpenAiFetch?: boolean;
}

export interface PiCompatibilityReport {
  schema: "pi-zotero-compatibility-probe.v1";
  runtime: {
    bufferType: string;
    nodeBuiltinLoadable: boolean;
    nodeGlobalsAbsent: boolean;
    nodeRuntimeAbsent: boolean;
    processType: string;
    requireType: string;
  };
  core: {
    eventTypes: string[];
    finalText: string;
    idleAfterRun: boolean;
    toolArguments: { text: string } | null;
    toolResult: string | null;
  };
  cancellation: {
    idleAfterAbort: boolean;
    partialText: string;
    stopReason: string;
  };
  cleanup: {
    listenerDetached: boolean;
    messagesAfterReset: number;
  };
  openaiFetch?: {
    called: boolean;
    finalText: string;
    requestMethod: string;
    requestUrl: string;
    signalForwarded: boolean;
    stopReason: string;
    textDeltaCount: number;
  };
}

function lastAssistant(messages: Message[]): AssistantMessage | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === "assistant") return message;
  }
  return undefined;
}

function assistantText(message: AssistantMessage | undefined): string {
  if (!message) return "";
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function runCoreScenario() {
  const faux = fauxProvider({ tokensPerSecond: 0 });
  faux.setResponses([
    fauxAssistantMessage(
      [
        fauxText("calling echo"),
        fauxToolCall("echo", { text: "probe" }, { id: "tool-probe" }),
      ],
      { stopReason: "toolUse" },
    ),
    fauxAssistantMessage("tool complete"),
    fauxAssistantMessage("cleanup turn"),
  ]);
  const models = createModels();
  models.setProvider(faux.provider);

  let toolArguments: { text: string } | null = null;
  let toolResult: string | null = null;
  const echoParameters = Type.Object({ text: Type.String() });
  const echoTool: AgentTool<typeof echoParameters, { echoed: string }> = {
    name: "echo",
    label: "Echo",
    description: "Return the supplied text.",
    parameters: echoParameters,
    async execute(_toolCallId, parameters) {
      toolArguments = { text: parameters.text };
      toolResult = `echo:${parameters.text}`;
      return {
        content: [{ type: "text", text: toolResult }],
        details: { echoed: parameters.text },
      };
    },
  };
  const agent = new Agent({
    initialState: {
      model: faux.getModel(),
      systemPrompt: "Compatibility probe",
      tools: [echoTool],
    },
    streamFn: models.streamSimple.bind(models),
  });
  const events: AgentEvent[] = [];
  const unsubscribe = agent.subscribe((event) => {
    events.push(event);
  });

  await agent.prompt("run the echo tool");
  await agent.waitForIdle();
  const finalText = assistantText(
    lastAssistant(agent.state.messages as Message[]),
  );
  const idleAfterRun = !agent.state.isStreaming;
  const eventCountAtDetach = events.length;

  unsubscribe();
  await agent.prompt("cleanup check");
  await agent.waitForIdle();
  const listenerDetached = events.length === eventCountAtDetach;
  agent.reset();
  const messagesAfterReset = agent.state.messages.length;
  models.clearProviders();

  return {
    cleanup: { listenerDetached, messagesAfterReset },
    core: {
      eventTypes: events.map((event) => event.type),
      finalText,
      idleAfterRun,
      toolArguments,
      toolResult,
    },
  };
}

async function runCancellationScenario() {
  const faux = fauxProvider({
    tokenSize: { min: 1, max: 1 },
    tokensPerSecond: 100,
  });
  faux.setResponses([
    fauxAssistantMessage(
      "this streamed response must be interrupted before completion",
    ),
  ]);
  const models = createModels();
  models.setProvider(faux.provider);
  const agent = new Agent({
    initialState: {
      model: faux.getModel(),
      systemPrompt: "Cancellation probe",
      tools: [],
    },
    streamFn: models.streamSimple.bind(models),
  });
  let abortRequested = false;
  const unsubscribe = agent.subscribe((event) => {
    if (
      !abortRequested &&
      event.type === "message_update" &&
      event.assistantMessageEvent.type === "text_delta"
    ) {
      abortRequested = true;
      agent.abort();
    }
  });

  await agent.prompt("start streaming");
  await agent.waitForIdle();
  const finalMessage = lastAssistant(agent.state.messages as Message[]);
  const result = {
    idleAfterAbort: !agent.state.isStreaming,
    partialText: assistantText(finalMessage),
    stopReason: finalMessage?.stopReason ?? "missing",
  };
  unsubscribe();
  agent.reset();
  models.clearProviders();
  return result;
}

function openAiFixtureEvents(modelId: string): string {
  const item = {
    id: "message-fixture",
    type: "message",
    status: "completed",
    role: "assistant",
    content: [
      {
        type: "output_text",
        text: "provider fixture",
        annotations: [],
        logprobs: [],
      },
    ],
  };
  const response = {
    id: "response-fixture",
    object: "response",
    created_at: 0,
    status: "completed",
    error: null,
    incomplete_details: null,
    instructions: null,
    max_output_tokens: null,
    model: modelId,
    output: [item],
    parallel_tool_calls: true,
    previous_response_id: null,
    reasoning: { effort: null, summary: null },
    store: false,
    temperature: 1,
    text: { format: { type: "text" }, verbosity: "medium" },
    tool_choice: "auto",
    tools: [],
    top_p: 1,
    truncation: "disabled",
    usage: {
      input_tokens: 1,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 2,
      output_tokens_details: { reasoning_tokens: 0 },
      total_tokens: 3,
    },
  };
  const events = [
    {
      type: "response.created",
      sequence_number: 0,
      response: { ...response, status: "in_progress", output: [], usage: null },
    },
    {
      type: "response.output_item.added",
      sequence_number: 1,
      output_index: 0,
      item: { ...item, status: "in_progress", content: [] },
    },
    {
      type: "response.output_text.delta",
      sequence_number: 2,
      item_id: item.id,
      output_index: 0,
      content_index: 0,
      delta: "provider fixture",
      logprobs: [],
    },
    {
      type: "response.output_item.done",
      sequence_number: 3,
      output_index: 0,
      item,
    },
    { type: "response.completed", sequence_number: 4, response },
  ];
  return `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`;
}

const runOpenAiFetchScenario = __include_openai__
  ? async function runIncludedOpenAiFetchScenario() {
      const { openaiProvider } =
        await import("@earendil-works/pi-ai/providers/openai");
      const provider = openaiProvider();
      const model = provider.getModels()[0];
      if (!model) throw new Error("OpenAI provider did not expose a model");

      let called = false;
      let requestMethod = "";
      let requestUrl = "";
      let signalForwarded = false;
      const fixtureFetch: typeof fetch = async (input, init) => {
        called = true;
        requestMethod =
          init?.method ?? (input instanceof Request ? input.method : "GET");
        requestUrl = input instanceof Request ? input.url : String(input);
        signalForwarded = Boolean(
          init?.signal ?? (input instanceof Request ? input.signal : undefined),
        );
        return new Response(openAiFixtureEvents(model.id), {
          headers: { "content-type": "text/event-stream" },
          status: 200,
        });
      };
      const stream = provider.streamSimple(
        model,
        {
          systemPrompt: "Provider fetch probe",
          messages: [
            { role: "user", content: "respond", timestamp: Date.now() },
          ],
        },
        { apiKey: "prototype-key", fetch: fixtureFetch },
      );
      let textDeltaCount = 0;
      for await (const event of stream) {
        if (event.type === "text_delta") textDeltaCount += 1;
      }
      const finalMessage = await stream.result();
      return {
        called,
        finalText: assistantText(finalMessage),
        requestMethod,
        requestUrl,
        signalForwarded,
        stopReason: finalMessage.stopReason,
        textDeltaCount,
      };
    }
  : async function skipOpenAiFetchScenario() {
      return undefined;
    };

export async function runPiCompatibilityProbe(
  options: PiCompatibilityProbeOptions = {},
): Promise<PiCompatibilityReport> {
  const runtimeGlobal = globalThis as typeof globalThis & {
    Buffer?: unknown;
    process?: { versions?: { node?: unknown } };
    require?: unknown;
  };
  let nodeBuiltinLoadable = false;
  if (typeof runtimeGlobal.require === "function") {
    try {
      (runtimeGlobal.require as (specifier: string) => unknown)("node:fs");
      nodeBuiltinLoadable = true;
    } catch {
      nodeBuiltinLoadable = false;
    }
  }
  const [{ cleanup, core }, cancellation, openaiFetch] = await Promise.all([
    runCoreScenario(),
    runCancellationScenario(),
    options.includeOpenAiFetch ? runOpenAiFetchScenario() : undefined,
  ]);
  return {
    schema: "pi-zotero-compatibility-probe.v1",
    runtime: {
      bufferType: typeof runtimeGlobal.Buffer,
      nodeBuiltinLoadable,
      nodeGlobalsAbsent:
        runtimeGlobal.process === undefined &&
        runtimeGlobal.require === undefined &&
        runtimeGlobal.Buffer === undefined,
      nodeRuntimeAbsent:
        runtimeGlobal.process?.versions?.node === undefined &&
        !nodeBuiltinLoadable,
      processType: typeof runtimeGlobal.process,
      requireType: typeof runtimeGlobal.require,
    },
    core,
    cancellation,
    cleanup,
    ...(openaiFetch ? { openaiFetch } : {}),
  };
}

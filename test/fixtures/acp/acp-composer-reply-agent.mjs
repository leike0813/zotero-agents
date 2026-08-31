import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

const evidencePath = String(
  process.env.ZOTERO_ACP_COMPOSER_E2E_EVIDENCE || "",
).trim();
const sessionId = "session-platform-composer-e2e";
let sequence = 0;
let promptCount = 0;

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function promptText(params) {
  return (Array.isArray(params?.prompt) ? params.prompt : [])
    .filter((entry) => entry?.type === "text")
    .map((entry) => String(entry.text || ""))
    .join("");
}

function record(request) {
  sequence += 1;
  if (!evidencePath) return;
  appendFileSync(
    evidencePath,
    `${JSON.stringify({
      sequence,
      method: String(request.method || ""),
      id: request.id ?? null,
      sessionId: String(request.params?.sessionId || ""),
      promptText: promptText(request.params),
    })}\n`,
    "utf8",
  );
}

function emitAssistantText(text) {
  writeMessage({
    jsonrpc: "2.0",
    method: "session/update",
    params: {
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text },
      },
    },
  });
}

function handleRequest(request) {
  record(request);
  if (request.method === "initialize") {
    writeMessage({
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: request.params?.protocolVersion ?? 1,
        agentInfo: {
          name: "acp-composer-reply-fixture",
          version: "1",
        },
        agentCapabilities: {},
        authMethods: [],
      },
    });
    return;
  }
  if (request.method === "session/new") {
    writeMessage({
      jsonrpc: "2.0",
      id: request.id,
      result: { sessionId },
    });
    return;
  }
  if (request.method === "session/prompt") {
    promptCount += 1;
    emitAssistantText(
      JSON.stringify(
        promptCount === 1
          ? {
              __SKILL_DONE__: false,
              message: "Need a reply from the real composer.",
              ui_hints: {
                kind: "open_text",
                prompt: "Reply from the ACP Skills composer.",
              },
            }
          : { __SKILL_DONE__: true, ok: true },
      ),
    );
    writeMessage({
      jsonrpc: "2.0",
      id: request.id,
      result: { stopReason: "end_turn" },
    });
    return;
  }
  if (Object.prototype.hasOwnProperty.call(request, "id")) {
    writeMessage({
      jsonrpc: "2.0",
      id: request.id,
      error: {
        code: -32601,
        message: `Method not found: ${String(request.method || "")}`,
      },
    });
  }
}

const input = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

let chain = Promise.resolve();
input.on("line", (line) => {
  const text = line.trim();
  if (!text) return;
  chain = chain.then(() => handleRequest(JSON.parse(text)));
});
input.on("close", () => {
  void chain.finally(() => process.exit(0));
});

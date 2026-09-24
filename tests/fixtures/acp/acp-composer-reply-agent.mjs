import { appendFileSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const evidencePath = String(
  process.env.ZOTERO_ACP_COMPOSER_E2E_EVIDENCE || "",
).trim();
const modeFile = String(process.env.ZOTERO_ACP_COMPOSER_E2E_MODE_FILE || "").trim();
const mode = String(
  modeFile
    ? readFileSync(modeFile, "utf8")
    : process.env.ZOTERO_ACP_COMPOSER_E2E_MODE || "normal",
).trim();
if (
  !["normal", "startup-stall", "exit-during-turn", "cancel-result-race"].includes(
    mode,
  )
) {
  throw new Error(`Unknown ACP fixture mode: ${mode}`);
}
const sessionId = "session-platform-composer-e2e";
let sequence = 0;
let promptCount = 0;
let pendingPromptId = null;
let pendingPromptTail = " trailing text";

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
      mode,
      pid: process.pid,
      method: String(request.method || ""),
      id: request.id ?? null,
      sessionId: String(request.params?.sessionId || ""),
      promptText: promptText(request.params),
      bridgeScopeRequestId: process.env.ZOTERO_BRIDGE_SCOPE
        ? JSON.parse(process.env.ZOTERO_BRIDGE_SCOPE).requestId
        : "",
      ...(mode === "startup-stall" && request.method === "initialize"
        ? { answered: false }
        : {}),
    })}\n`,
    "utf8",
  );
}

function emitUpdate(update) {
  writeMessage({
    jsonrpc: "2.0",
    method: "session/update",
    params: {
      sessionId,
      update,
    },
  });
}

function emitAssistantText(text) {
  emitUpdate({
    sessionUpdate: "agent_message_chunk",
    content: { type: "text", text },
  });
}

function emitInterleavedAssistantText(text) {
  const midpoint = Math.floor(text.length / 2);
  emitAssistantText(text.slice(0, midpoint));
  for (const sessionUpdate of [
    "tool_call_update",
    "usage_update",
    "status_update",
    "workspace_activity",
  ]) {
    emitUpdate({ sessionUpdate });
  }
  emitAssistantText(text.slice(midpoint));
  emitUpdate({ sessionUpdate: "tool_call" });
}

function debugApplyResult(text) {
  const manifestPath = text.match(/^- Input manifest: (.+)$/m)?.[1]?.trim();
  if (!manifestPath) throw new Error("ACP fixture input manifest is missing");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.skill_id !== "debug-apply-result-probe") {
    throw new Error("ACP fixture skill identity mismatch");
  }
  const parameter = manifest.parameter || {};
  return JSON.stringify({
    __SKILL_DONE__: true,
    kind: "debug_apply_contract_result",
    workflow_id: parameter.workflow_id,
    step_id: parameter.step_id,
    run_key: parameter.run_key,
    apply_mode: "result",
    tag: parameter.tag || `debug-result:${parameter.run_key}`,
    message: "synthetic ACP result",
  });
}

async function runBridgeWrite(text) {
  const input = JSON.parse(
    text.match(/system-e2e:approval-write (\{[^\n]+\})/)?.[1] || "{}",
  );
  const child = spawn("zotero-bridge", [
    "mutation", "tag", "add",
    "--items", `${input.itemRef.libraryId}:${input.itemRef.key}`,
    "--tags", input.tag,
    "--operation-id", input.operationId,
  ], {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let error = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => { output += chunk; });
  child.stderr.setEncoding("utf8").on("data", (chunk) => { error += chunk; });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  return JSON.stringify({ operationId: input.operationId, code, output, error });
}

async function handleRequest(request) {
  record(request);
  if (request.method === "initialize") {
    if (mode === "startup-stall") return;
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
    if (mode === "exit-during-turn") {
      process.exit(17);
    }
    if (mode === "cancel-result-race") {
      pendingPromptId = request.id;
      if (promptText(request.params).includes("debug-apply-result-probe")) {
        const output = debugApplyResult(promptText(request.params));
        const midpoint = Math.floor(output.length / 2);
        pendingPromptTail = output.slice(midpoint);
        emitAssistantText(output.slice(0, midpoint));
      } else {
        pendingPromptTail = " trailing text";
        emitAssistantText("initial text");
      }
      return;
    }
    const text = promptText(request.params);
    if (text.includes("system-e2e:approval-write")) {
      let result;
      try {
        result = await runBridgeWrite(text);
      } catch (error) {
        result = JSON.stringify({ error: String(error) });
      }
      emitAssistantText(result);
      writeMessage({
        jsonrpc: "2.0", id: request.id, result: { stopReason: "end_turn" },
      });
      return;
    }
    if (text.includes("debug-apply-result-probe")) {
      const result = debugApplyResult(text);
      if (result.includes("system-e2e:transcript-interleave")) {
        emitInterleavedAssistantText(result);
      } else {
        emitAssistantText(result);
      }
      writeMessage({
        jsonrpc: "2.0",
        id: request.id,
        result: { stopReason: "end_turn" },
      });
      return;
    }
    if (text.includes("system-e2e:transcript-interleave")) {
      emitInterleavedAssistantText("first text second text");
      writeMessage({
        jsonrpc: "2.0",
        id: request.id,
        result: { stopReason: "end_turn" },
      });
      return;
    }
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
  if (request.method === "session/cancel" && mode === "cancel-result-race") {
    const promptId = pendingPromptId;
    if (promptId !== null) {
      pendingPromptId = null;
      setTimeout(() => {
        emitAssistantText(pendingPromptTail);
        writeMessage({
          jsonrpc: "2.0",
          id: promptId,
          result: { stopReason: "end_turn" },
        });
      }, 25);
    }
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

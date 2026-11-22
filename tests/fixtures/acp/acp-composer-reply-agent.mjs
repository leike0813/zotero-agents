import { appendFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
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

function sameEvidenceRef(left, right) {
  return Boolean(
    left &&
      right &&
      left.publication === right.publication &&
      left.identity === right.identity &&
      left.fragmentId === right.fragmentId &&
      left.sourceVersion === right.sourceVersion,
  );
}

async function prepareSemanticMcp() {
  const profilePath = String(process.env.ZOTERO_BRIDGE_PROFILE || "").trim();
  const token = String(process.env.ZOTERO_BRIDGE_TOKEN || "").trim();
  if (!profilePath || !token) throw new Error("Host Bridge MCP credentials unavailable");
  const profile = JSON.parse(readFileSync(profilePath, "utf8"));
  const endpoint = String(profile.endpoint || "")
    .replace(/\/bridge\/v2\/?$/, "/mcp");
  if (!endpoint || !/^https?:\/\//.test(endpoint)) {
    throw new Error("Host Bridge MCP endpoint is invalid");
  }
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
  const initializeResponse = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "acp-semantic-initialize",
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "zotero-e2e-acp-fixture", version: "1" } },
    }),
  });
  let initializeEnvelope;
  try {
    initializeEnvelope = await initializeResponse.json();
  } catch {
    const error = new Error("semantic MCP initialize failed");
    error.failureKind = "invalid_envelope";
    error.httpStatus = initializeResponse.status;
    throw error;
  }
  const serverName = /^[a-z0-9._-]{1,64}$/i.test(String(initializeEnvelope?.result?.serverInfo?.name || ""))
    ? initializeEnvelope.result.serverInfo.name
    : "unknown";
  if (!initializeResponse.ok || initializeEnvelope.error || serverName === "unknown") {
    const error = new Error("semantic MCP initialize failed");
    error.failureKind = initializeEnvelope.error ? "jsonrpc_error" : "initialize_failed";
    error.httpStatus = initializeResponse.status;
    error.rpcCode = Number.isInteger(initializeEnvelope.error?.code) ? initializeEnvelope.error.code : undefined;
    error.rpcErrorData = initializeEnvelope.error?.data;
    error.serverName = serverName;
    throw error;
  }
  return { endpoint, headers, profilePath, serverName };
}

async function callSemanticMcpTool(session, name, args, id) {
  const response = await fetch(session.endpoint, {
    method: "POST",
    headers: session.headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const envelope = await response.json();
  const toolResult = envelope.result;
  const structured = toolResult?.structuredContent;
  const data = structured?.data;
  if (!response.ok || envelope.error || toolResult?.isError || !data) {
    const error = new Error(`semantic MCP call failed: ${name}`);
    error.failureKind = !response.ok
      ? "http_error"
      : envelope.error
        ? "jsonrpc_error"
        : toolResult?.isError
          ? "tool_error"
          : "missing_result";
    error.httpStatus = response.status;
    error.rpcCode = Number.isInteger(envelope.error?.code) ? envelope.error.code : undefined;
    error.rpcErrorData = envelope.error?.data;
    error.serverName = session.serverName;
    error.toolError = toolResult?.isError
      ? {
          errorCode: structured?.error_code,
          reasonCode: structured?.reasonCode,
          reason: structured?.details?.reason,
        }
      : undefined;
    throw error;
  }
  return { data, httpStatus: response.status, serverName: session.serverName };
}

async function runSemanticSearchTools(text) {
  const payloadText = text.match(/^system-e2e:semantic-search (.+)$/m)?.[1];
  if (!payloadText) throw new Error("semantic search payload is missing");
  const payload = JSON.parse(payloadText);
  const burstSize = Number(payload.size);
  const session = await prepareSemanticMcp();
  const skillPath = String(payload.skillPath || "").trim();
  if (!skillPath) throw new Error("current injected Skill path is missing");
  const resolvedSkillPath = resolve(dirname(session.profilePath), "..", skillPath);
  const skillText = readFileSync(resolvedSkillPath, "utf8");
  const skill = {
    id: String(payload.skillId || ""),
    path: skillPath,
    sha256: createHash("sha256").update(skillText).digest("hex"),
  };
  const size = burstSize;
  if (![1, 3, 6].includes(size)) throw new Error("unsupported semantic search burst size");
  const calls = await Promise.all(Array.from({ length: size }, async (_, index) => {
    const startedAt = Date.now();
    const toolCallId = `semantic-search-${Date.now()}-${index}`;
    emitUpdate({
      sessionUpdate: "tool_call",
      toolCallId,
      title: "Search semantic evidence",
      kind: "other",
      status: "in_progress",
      rawInput: { tool: "synthesis.search_semantic_evidence" },
    });
    const { data, httpStatus } = await callSemanticMcpTool(
      session,
      "synthesis.search_semantic_evidence",
      payload.request,
      `acp-semantic-${Date.now()}-${index}`,
    );
    const call = {
      httpStatus,
      serverName: session.serverName,
      status: data.status,
      method: data.method,
      coverage: data.coverage,
      issues: data.issues,
      evidenceRefs: (data.results || []).map((result) => result.evidenceRef),
      elapsedMs: Date.now() - startedAt,
    };
    emitUpdate({
      sessionUpdate: "tool_call_update",
      toolCallId,
      status: "completed",
      result: JSON.stringify(call),
    });
    return call;
  }));
  const result = {
    calls,
    skill,
    size,
  };
  if (evidencePath) {
    appendFileSync(evidencePath, `${JSON.stringify({ semanticSearch: result })}\n`, "utf8");
  }
  return JSON.stringify(result);
}

async function runSemanticContextTools(text) {
  const payloadText = text.match(/^system-e2e:semantic-context (.+)$/m)?.[1];
  if (!payloadText) throw new Error("semantic context payload is missing");
  const payload = JSON.parse(payloadText);
  const requests = Array.isArray(payload.requests) ? payload.requests : [];
  if (requests.length === 0 || requests.length > 8) {
    throw new Error("semantic context request count is invalid");
  }
  const session = await prepareSemanticMcp();
  const contexts = [];
  const startedAt = Date.now();
  for (const [index, request] of requests.entries()) {
    const toolCallId = `semantic-context-${Date.now()}-${index}`;
    emitUpdate({
      sessionUpdate: "tool_call",
      toolCallId,
      title: "Read semantic context",
      kind: "other",
      status: "in_progress",
      rawInput: { tool: "synthesis.read_semantic_context" },
    });
    const callStartedAt = Date.now();
    const { data, httpStatus } = await callSemanticMcpTool(
      session,
      "synthesis.read_semantic_context",
      { evidenceRef: request.evidenceRef },
      `acp-semantic-context-${Date.now()}-${index}`,
    );
    const matches = (data.results || []).filter((row) => row.match === true);
    const match = matches[0];
    const summary = {
      sourceKind: String(request.sourceKind || ""),
      matchCount: matches.length,
      sourceKindMatches: match?.source?.kind === request.sourceKind,
      contentMatches: match?.content === request.expectedContent,
      refMatches: sameEvidenceRef(match?.evidenceRef, request.evidenceRef),
      httpStatus,
      evidenceRef: request.evidenceRef,
      elapsedMs: Date.now() - callStartedAt,
    };
    if (
      matches.length !== 1 ||
      !summary.sourceKindMatches ||
      !summary.contentMatches ||
      !summary.refMatches
    ) {
      throw new Error("semantic context verification failed");
    }
    emitUpdate({
      sessionUpdate: "tool_call_update",
      toolCallId,
      status: "completed",
      result: JSON.stringify(summary),
    });
    contexts.push(summary);
  }
  const result = {
    serverName: session.serverName,
    elapsedMs: Date.now() - startedAt,
    contexts,
  };
  if (evidencePath) {
    appendFileSync(evidencePath, `${JSON.stringify({ semanticContext: result })}\n`, "utf8");
  }
  return JSON.stringify(result);
}

function safeSemanticSearchFailure(error) {
  const failureKind = [
    "http_error",
    "jsonrpc_error",
    "tool_error",
    "missing_result",
    "invalid_envelope",
    "initialize_failed",
  ].includes(error?.failureKind)
    ? error.failureKind
    : "fixture_error";
  const httpStatus = Number.isInteger(error?.httpStatus)
    ? error.httpStatus
    : undefined;
  const rpcData = error?.rpcErrorData && typeof error.rpcErrorData === "object"
    ? error.rpcErrorData
    : {};
  const details = rpcData.details && typeof rpcData.details === "object"
    ? rpcData.details
    : {};
  const safeName = (value) => typeof value === "string" && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value)
    ? value
    : undefined;
  const safeFieldPaths = Array.isArray(details.errors)
    ? details.errors.slice(0, 8).map((entry) => String(entry).match(/^([A-Za-z][A-Za-z0-9_.\[\]]{0,95}):/)?.[1]).filter(Boolean)
    : [];
  const safeViolations = Array.isArray(details.violations)
    ? details.violations.slice(0, 8).map((entry) => ({
        code: safeName(entry?.code),
        field: safeName(entry?.field),
        reasonCode: safeName(entry?.reason),
      })).filter((entry) => entry.code || entry.field || entry.reasonCode)
    : [];
  return JSON.stringify({
    error: {
      code: failureKind,
      ...(httpStatus ? { httpStatus } : {}),
      ...(Number.isInteger(error?.rpcCode) ? { rpcCode: error.rpcCode } : {}),
      ...(safeName(error?.serverName) ? { serverName: safeName(error.serverName) } : {}),
      ...(safeName(rpcData.errorName) ? { errorName: safeName(rpcData.errorName) } : {}),
      ...(safeName(rpcData.toolName) ? { toolName: safeName(rpcData.toolName) } : {}),
      ...(safeName(details.schema) ? { detailsSchema: safeName(details.schema) } : {}),
      ...(safeName(details.phase) ? { phase: safeName(details.phase) } : {}),
      ...(safeName(error?.toolError?.errorCode)
        ? { errorCode: safeName(error.toolError.errorCode) }
        : {}),
      ...(safeName(error?.toolError?.reasonCode)
        ? { reasonCode: safeName(error.toolError.reasonCode) }
        : {}),
      ...(safeName(error?.toolError?.reason)
        ? { reason: safeName(error.toolError.reason) }
        : {}),
      ...(Number.isInteger(error?.burstSize) && [1, 3, 6].includes(error.burstSize)
        ? { burstSize: error.burstSize }
        : {}),
      ...(safeFieldPaths.length ? { fieldPaths: safeFieldPaths } : {}),
      ...(safeViolations.length ? { violations: safeViolations } : {}),
    },
  });
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
    if (text.includes("system-e2e:semantic-context ")) {
      try {
        emitAssistantText(await runSemanticContextTools(text));
      } catch (error) {
        emitAssistantText(safeSemanticSearchFailure(error));
      }
      writeMessage({
        jsonrpc: "2.0",
        id: request.id,
        result: { stopReason: "end_turn" },
      });
      return;
    }
    if (text.includes("system-e2e:semantic-search ")) {
      try {
        emitAssistantText(await runSemanticSearchTools(text));
      } catch (error) {
        const payloadText = text.match(/^system-e2e:semantic-search (.+)$/m)?.[1];
        try {
          error.burstSize = Number(JSON.parse(payloadText || "{}").size);
        } catch {
          // The safe failure envelope only reports a validated burst size.
        }
        emitAssistantText(safeSemanticSearchFailure(error));
      }
      writeMessage({
        jsonrpc: "2.0",
        id: request.id,
        result: { stopReason: "end_turn" },
      });
      return;
    }
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

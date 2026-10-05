import { validateCreatePayload, validateMultipartHasField } from "./contracts";
import { randomUUID } from "node:crypto";
import { joinPath } from "../../src/utils/path";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";

type DynamicImport = (specifier: string) => Promise<any>;
const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

type MockJob = {
  id: string;
  createPayload: unknown;
  expectedUploadTargets: string[];
  uploadReceived: boolean;
  pollCount: number;
  terminalStatus: "succeeded" | "failed" | "canceled";
};

type TrafficRecord = {
  method: string;
  url: string;
  contentType: string;
  body:
    | { kind: "json"; value: unknown }
    | {
        kind: "multipart";
        fields: string[];
        filenames: string[];
      }
    | { kind: "text"; value: string };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeUploadRelativePath(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

function resolveExpectedUploadTargets(createPayload: unknown) {
  const payload = isObject(createPayload) ? createPayload : {};
  const input = isObject(payload.input) ? payload.input : {};
  const skillId = String(payload.skill_id || "").trim();
  const targets: string[] = [];
  if (skillId === "literature-analysis") {
    targets.push(normalizeUploadRelativePath(input.source_path));
  }
  if (skillId === "tag-regulator") {
    targets.push(normalizeUploadRelativePath(input.valid_tags));
  }
  return targets.filter(Boolean);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of value) {
    const text = String(entry || "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    normalized.push(text);
  }
  return normalized;
}

export type MockSkillRunnerServer = {
  baseUrl: string;
  close: () => Promise<void>;
  getJobs: () => MockJob[];
  getTraffic: () => TrafficRecord[];
};

type MockHandshakeConfig =
  | false
  | {
      status?: number;
      body?: unknown;
    };

export async function startMockSkillRunnerServer(args: {
  bundlePath: string;
  pollDelayMs?: number;
  host?: string;
  port?: number;
  handshake?: MockHandshakeConfig;
  handshakeDelayMs?: number;
}) {
  const httpMod = await dynamicImport("http");
  const fsMod = await dynamicImport("fs/promises");
  const createServer =
    httpMod.createServer as typeof import("http").createServer;
  const jobs = new Map<string, MockJob>();
  const instanceId = randomUUID();
  let holdJobs = false;
  const traffic: TrafficRecord[] = [];
  let nextId = 1;
  const bundleBytes = Buffer.from(await fsMod.readFile(args.bundlePath));
  const bundleReader = new ZipBundleReader(args.bundlePath);
  let literatureDigestResultTemplate: Record<string, unknown> = {
    status: "success",
    data: {
      digest_path: "digest.md",
      references_path: "references.json",
      citation_analysis_path: "citation_analysis.json",
    },
    artifacts: [],
    validation_warnings: [],
    error: null,
  };
  try {
    const resultJsonText = await bundleReader.readText("result/result.json");
    const parsed = JSON.parse(resultJsonText);
    const parsedResult =
      isObject(parsed) && isObject(parsed.result)
        ? parsed.result
        : isObject(parsed)
          ? parsed
          : null;
    if (parsedResult) {
      literatureDigestResultTemplate = JSON.parse(JSON.stringify(parsedResult));
    }
  } catch {
    // keep fallback result template when fixture result JSON is unavailable
  }
  const pollDelayMs = Math.max(0, args.pollDelayMs ?? 50);
  let handshakeDelayMs = Math.max(0, args.handshakeDelayMs ?? 0);
  const handshakeConfig =
    args.handshake === undefined
      ? {
          body: {
            schema: "zotero-agents.skillrunner-handshake.response.v1",
            backend: {
              name: "Skill-Runner",
              version: "0.7.3",
            },
            protocols: {
              "skillrunner.job.v1": {
                supported: true,
              },
              "skillrunner.sequence.v1": {
                supported: false,
              },
            },
          },
        }
      : args.handshake;

  const server = createServer((req, res) => {
    const method = req.method || "GET";
    const url = req.url || "/";
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", async () => {
      const bodyRaw = Buffer.concat(chunks).toString("utf8");
      const contentType = String(req.headers["content-type"] || "");
      if (bodyRaw.length > 0) {
        if (contentType.includes("application/json")) {
          let parsed: unknown = {};
          try {
            parsed = JSON.parse(bodyRaw);
          } catch {
            parsed = { raw: bodyRaw };
          }
          traffic.push({
            method,
            url,
            contentType,
            body: {
              kind: "json",
              value: parsed,
            },
          });
        } else if (contentType.includes("multipart/form-data")) {
          const fields = Array.from(
            bodyRaw.matchAll(/;\s*name="([^"]+)"/g),
            (match) => match[1],
          );
          const filenames = Array.from(
            bodyRaw.matchAll(/;\s*filename="([^"]+)"/g),
            (match) => match[1],
          );
          traffic.push({
            method,
            url,
            contentType,
            body: {
              kind: "multipart",
              fields,
              filenames,
            },
          });
        } else {
          traffic.push({
            method,
            url,
            contentType,
            body: {
              kind: "text",
              value: bodyRaw,
            },
          });
        }
      } else {
        traffic.push({
          method,
          url,
          contentType,
          body: {
            kind: "text",
            value: "",
          },
        });
      }

      if (method === "POST" && url === "/__test/jobs") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({ instanceId, requestIds: Array.from(jobs.keys()) }),
        );
        return;
      }

      if (method === "POST" && url === "/__test/hold-jobs") {
        const payload = JSON.parse(bodyRaw || "{}");
        holdJobs = payload.enabled === true;
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ held: holdJobs }));
        return;
      }

      if (method === "POST" && url === "/__test/handshake-delay") {
        const payload = JSON.parse(bodyRaw || "{}");
        const requestedDelay = Number(payload.delayMs);
        handshakeDelayMs = Number.isFinite(requestedDelay)
          ? Math.min(10_000, Math.max(0, Math.floor(requestedDelay)))
          : 0;
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ delayMs: handshakeDelayMs }));
        return;
      }

      const openAiPath = url.split("?")[0];
      if (
        method === "POST" &&
        (openAiPath === "/v1/chat/completions" ||
          openAiPath === "/chat/completions")
      ) {
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(bodyRaw || "{}") as Record<string, unknown>;
        } catch {
          payload = {};
        }
        const messages = Array.isArray(payload.messages)
          ? (payload.messages as Array<Record<string, unknown>>)
          : [];
        const textOf = (message: Record<string, unknown>) => {
          const content = message?.content;
          if (typeof content === "string") return content;
          if (Array.isArray(content)) {
            return content
              .map((part) => (isObject(part) ? String(part.text || "") : ""))
              .join("");
          }
          return "";
        };
        const joined = messages.map(textOf).join("\n");
        const pi04Sequence = joined.includes("[system-e2e:pi04-sequence:v1");
        const pi04Parent = joined.match(
          /\[system-e2e:pi04-sequence:v1:(\d+):([A-Za-z0-9]+)\]/,
        );
        const toolNames = new Map<string, string>();
        for (const message of messages) {
          for (const call of Array.isArray(message.tool_calls)
            ? message.tool_calls
            : []) {
            if (isObject(call) && isObject(call.function))
              toolNames.set(String(call.id), String(call.function.name));
          }
        }
        const pi04ToolResults = messages
          .filter((message) => message.role === "tool")
          .map((message) =>
            String(
              message.name || toolNames.get(String(message.tool_call_id)) || "",
            ),
          );
        const pi04Step = pi04ToolResults.includes("ask_user")
          ? 2
          : pi04ToolResults.includes("zotero_custom_note_write")
            ? 1
            : 0;
        const hasToolResult = messages.some(
          (message) => message.role === "tool",
        );
        const toolMarker = joined.match(
          /\[system-e2e:tool:([A-Za-z0-9_.-]+)\]/,
        );
        // Optional percent-encoded JSON object for the one marked tool call.
        // Encoding keeps JSON strings/arrays from terminating the marker.
        const inputMarker = joined.match(/\[system-e2e:tool-input:([^\]]+)\]/);
        let explicitToolInput: Record<string, unknown> | undefined;
        if (inputMarker) {
          try {
            const input = JSON.parse(decodeURIComponent(inputMarker[1]!));
            if (!isObject(input)) throw new Error("invalid_tool_input");
            explicitToolInput = input;
          } catch {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "invalid_tool_input" }));
            return;
          }
        }
        const asksUser = joined.includes("[system-e2e:tool:ask_user]");
        const sealsAfterTool = joined.includes(
          "[system-e2e:tool:submit_skill_result]",
        );
        const slow = joined.includes("[system-e2e:slow]");
        // Capacity measurement marker: hold every response (plain and
        // tool-call alike) for a fixed interval after the headers and before
        // the first chunk, so a foreground/common prompt can be paced.
        const capacityDelay = joined.includes("[system-e2e:capacity]");
        const model = String(payload.model || "system-e2e-local");
        res.statusCode = 200;
        res.setHeader("content-type", "text/event-stream");
        res.setHeader("cache-control", "no-cache");
        res.setHeader("connection", "keep-alive");
        const completionId = `chatcmpl-${instanceId}-${nextId++}`;
        const created = Math.floor(Date.now() / 1000);
        const emit = (
          delta: Record<string, unknown>,
          finish: string | null = null,
        ) =>
          res.write(
            `data: ${JSON.stringify({
              id: completionId,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [{ index: 0, delta, finish_reason: finish }],
            })}\n\n`,
          );
        if (capacityDelay) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        emit({ role: "assistant", content: "" });
        if (
          pi04Sequence &&
          pi04Step === 2 &&
          messages.some(
            (message) =>
              message.role === "user" &&
              textOf(message).includes("Continue PI-04"),
          )
        ) {
          emit({
            tool_calls: [
              {
                index: 0,
                id: `call-${nextId++}`,
                type: "function",
                function: {
                  name: "submit_skill_result",
                  arguments: JSON.stringify({
                    protocolVersion: 1,
                    result: { ok: true },
                  }),
                },
              },
            ],
          });
          emit({}, "tool_calls");
        } else if (pi04Sequence && pi04Step < 2) {
          const sequence = [
            "zotero_custom_note_write",
            "ask_user",
            "submit_skill_result",
          ] as const;
          const name = sequence[pi04Step]!;
          const argumentsPayload = [
            JSON.stringify({
              target: {
                kind: "create",
                parentRef: {
                  libraryId: Number(pi04Parent?.[1] || 1),
                  key: pi04Parent?.[2] || "PI04",
                },
              },
              title: "PI-04",
              markdown: "PI-04",
            }),
            JSON.stringify({ questions: [{ kind: "text", prompt: "PI-04" }] }),
            JSON.stringify({ protocolVersion: 1, result: { ok: true } }),
          ][pi04Step]!;
          emit({
            tool_calls: [
              {
                index: 0,
                id: `call-${nextId++}`,
                type: "function",
                function: { name, arguments: argumentsPayload },
              },
            ],
          });
          emit({}, "tool_calls");
        } else if (pi04Sequence && pi04Step === 2) {
          const text = "System E2E local provider streaming reply.";
          for (const piece of text.split(" ")) {
            emit({ content: `${piece} ` });
            await new Promise((resolve) =>
              setTimeout(resolve, pollDelayMs + 50),
            );
          }
          emit({}, "stop");
        } else if (toolMarker && !hasToolResult) {
          // Auto Skill Run seals through the production `submit_skill_result`
          // tool, so the deterministic model returns a protocol-valid payload
          // rather than an empty placeholder.
          const argumentsPayload = explicitToolInput
            ? JSON.stringify(explicitToolInput)
            : asksUser
              ? JSON.stringify({
                  questions: [{ kind: "confirm", prompt: "PI-04 continue?" }],
                })
              : ["bash", "powershell"].includes(toolMarker[1]!)
                ? JSON.stringify({
                    command:
                      toolMarker[1] === "bash"
                        ? "sleep 60"
                        : "Start-Sleep -Seconds 60",
                  })
                : sealsAfterTool
                  ? JSON.stringify({ protocolVersion: 1, result: { ok: true } })
                  : "{}";
          emit({
            tool_calls: [
              {
                index: 0,
                id: `call-${nextId++}`,
                type: "function",
                function: { name: toolMarker[1], arguments: argumentsPayload },
              },
            ],
          });
          emit({}, "tool_calls");
        } else if (asksUser && sealsAfterTool) {
          // Interactive second step: once the user interaction is answered, the
          // deterministic model seals through the production tool.
          emit({
            tool_calls: [
              {
                index: 0,
                id: `call-${nextId++}`,
                type: "function",
                function: {
                  name: "submit_skill_result",
                  arguments: JSON.stringify({
                    protocolVersion: 1,
                    result: { ok: true },
                  }),
                },
              },
            ],
          });
          emit({}, "tool_calls");
        } else {
          const text = hasToolResult
            ? "System E2E local provider tool result acknowledged."
            : "System E2E local provider streaming reply.";
          const pieces = slow ? text.split(" ") : [text];
          for (const piece of pieces) {
            emit({ content: slow ? `${piece} ` : piece });
            if (slow) {
              await new Promise((resolve) =>
                setTimeout(resolve, pollDelayMs + 50),
              );
            }
          }
          emit({}, "stop");
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      if (method === "GET" && openAiPath === "/v1/models") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            object: "list",
            data: [{ id: "system-e2e-local", object: "model" }],
          }),
        );
        return;
      }

      if (method === "POST" && url === "/v1/jobs") {
        let payload: unknown;
        try {
          payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "invalid json body" }));
          return;
        }
        const validated = validateCreatePayload(payload);
        if (!validated.ok) {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: validated.errors.join("; ") }));
          return;
        }
        const requestId = `${instanceId}-${nextId++}`;
        const expectedUploadTargets = resolveExpectedUploadTargets(payload);
        jobs.set(requestId, {
          id: requestId,
          createPayload: payload,
          expectedUploadTargets,
          uploadReceived: expectedUploadTargets.length === 0,
          pollCount: 0,
          terminalStatus: (() => {
            const body = isObject(payload) ? payload : {};
            const parameter = isObject(body.parameter) ? body.parameter : {};
            const value = String(parameter.__mock_final_status || "")
              .trim()
              .toLowerCase();
            if (value === "failed" || value === "canceled") {
              return value;
            }
            return "succeeded";
          })(),
        });
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ request_id: requestId }));
        return;
      }

      if (method === "POST" && url === "/v1/generic-http/echo") {
        let payload: unknown = {};
        if (bodyRaw.length > 0) {
          try {
            payload = JSON.parse(bodyRaw);
          } catch {
            payload = { raw: bodyRaw };
          }
        }
        const requestId = `generic-${String(nextId++)}`;
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            request_id: requestId,
            status: "succeeded",
            provider: "generic-http",
            echo: payload,
          }),
        );
        return;
      }

      if (
        method === "POST" &&
        url === "/v1/system/handshake" &&
        handshakeConfig !== false
      ) {
        if (handshakeDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, handshakeDelayMs));
        }
        const status = Math.floor(Number(handshakeConfig.status || 200));
        res.statusCode = Number.isFinite(status) ? status : 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify(
            handshakeConfig.body || {
              schema: "zotero-agents.skillrunner-handshake.response.v1",
              backend: {
                name: "Skill-Runner",
                version: "0.7.3",
              },
              protocols: {
                "skillrunner.job.v1": {
                  supported: true,
                },
                "skillrunner.sequence.v1": {
                  supported: false,
                },
              },
            },
          ),
        );
        return;
      }

      if (
        (method === "HEAD" || method === "GET") &&
        url === "/v1/system/ping"
      ) {
        res.statusCode = 200;
        if (method === "GET") {
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              ok: true,
              status: "ok",
            }),
          );
          return;
        }
        res.end();
        return;
      }

      const uploadMatch = url.match(/^\/v1\/jobs\/([^/]+)\/upload$/);
      if (method === "POST" && uploadMatch) {
        const requestId = uploadMatch[1];
        const job = jobs.get(requestId);
        if (!job) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "job not found" }));
          return;
        }
        const createPayload = isObject(job.createPayload)
          ? job.createPayload
          : {};
        const requiredField =
          createPayload.skill_source === "temp_upload"
            ? "skill_package"
            : "file";
        if (!validateMultipartHasField(bodyRaw, requiredField)) {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              error: `missing multipart field: ${requiredField}`,
            }),
          );
          return;
        }
        for (const targetPath of job.expectedUploadTargets) {
          if (!bodyRaw.includes(targetPath)) {
            res.statusCode = 400;
            res.setHeader("content-type", "application/json");
            res.end(
              JSON.stringify({
                error: `missing uploaded file entry for input path: ${targetPath}`,
              }),
            );
            return;
          }
        }
        job.uploadReceived = true;
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      const chatStreamMatch = url.match(/^\/v1\/jobs\/([^/]+)\/chat(?:\?.*)?$/);
      if (method === "GET" && chatStreamMatch) {
        if (!jobs.has(chatStreamMatch[1])) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "job not found" }));
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "text/event-stream");
        res.end("event: snapshot\ndata: {}\n\n");
        return;
      }

      const chatHistoryMatch = url.match(
        /^\/v1\/jobs\/([^/]+)\/chat\/history(?:\?.*)?$/,
      );
      if (method === "GET" && chatHistoryMatch) {
        const requestId = chatHistoryMatch[1];
        const job = jobs.get(requestId);
        res.setHeader("content-type", "application/json");
        if (!job) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "job not found" }));
          return;
        }
        const events =
          job.uploadReceived && job.pollCount >= 1
            ? [
                {
                  seq: 1,
                  role: "assistant",
                  kind: "assistant_message",
                  text: "System E2E SkillRunner running transcript",
                  ts: new Date().toISOString(),
                },
              ]
            : [];
        if (job.uploadReceived && job.pollCount >= 2 && !holdJobs) {
          events.push({
            seq: 2,
            role: "assistant",
            kind: "assistant_final",
            text: "System E2E SkillRunner completed transcript",
            ts: new Date().toISOString(),
          });
        }
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            request_id: requestId,
            events,
            cursor_floor: 0,
            cursor_ceiling: events.length,
            source: "mock-skillrunner",
          }),
        );
        return;
      }

      const pollMatch = url.match(/^\/v1\/jobs\/([^/]+)$/);
      if (method === "GET" && pollMatch) {
        const requestId = pollMatch[1];
        const job = jobs.get(requestId);
        if (!job) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "job not found" }));
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, pollDelayMs));
        job.pollCount += 1;
        let status = "queued";
        if (holdJobs && job.uploadReceived) {
          status = "running";
        } else if (!job.uploadReceived) {
          status = "queued";
        } else if (job.pollCount === 1) {
          status = "running";
        } else {
          status = job.terminalStatus;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            request_id: requestId,
            status,
            ...(status === "failed"
              ? { error: "mock terminal failed" }
              : status === "canceled"
                ? { error: "mock terminal canceled" }
                : {}),
          }),
        );
        return;
      }

      const bundleMatch = url.match(/^\/v1\/jobs\/([^/]+)\/bundle$/);
      if (method === "GET" && bundleMatch) {
        const requestId = bundleMatch[1];
        const job = jobs.get(requestId);
        if (!job) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "job not found" }));
          return;
        }
        if (!job.uploadReceived) {
          res.statusCode = 409;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "upload missing" }));
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/zip");
        res.end(bundleBytes);
        return;
      }

      const resultMatch = url.match(/^\/v1\/jobs\/([^/]+)\/result$/);
      if (method === "GET" && resultMatch) {
        const requestId = resultMatch[1];
        const job = jobs.get(requestId);
        if (!job) {
          res.statusCode = 404;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "job not found" }));
          return;
        }
        if (!job.uploadReceived) {
          res.statusCode = 409;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "upload missing" }));
          return;
        }
        const createPayload = isObject(job.createPayload)
          ? job.createPayload
          : {};
        const skillId = String(createPayload.skill_id || "").trim();
        const debugParameter = isObject(createPayload.parameter)
          ? createPayload.parameter
          : {};
        if (
          skillId === "debug-apply-result-probe" ||
          (createPayload.skill_source === "temp_upload" &&
            debugParameter.workflow_id === "debug-apply-single-result" &&
            debugParameter.step_id === "result")
        ) {
          const parameter = isObject(createPayload.parameter)
            ? createPayload.parameter
            : {};
          const runKey = String(parameter.run_key || "");
          res.statusCode = 200;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              request_id: requestId,
              result: {
                kind: "debug_apply_contract_result",
                workflow_id: parameter.workflow_id,
                step_id: parameter.step_id,
                run_key: runKey,
                apply_mode: "result",
                tag: parameter.tag || `debug-result:${runKey}`,
                message: "synthetic SkillRunner result",
              },
            }),
          );
          return;
        }
        if (skillId === "tag-regulator") {
          const inlineInput = isObject(createPayload.input)
            ? createPayload.input
            : {};
          const parameter = isObject(createPayload.parameter)
            ? createPayload.parameter
            : {};
          const tagNoteLanguage =
            String(parameter.tag_note_language || "zh-CN").trim() || "zh-CN";
          const inputTags = normalizeStringArray(inlineInput.input_tags);
          const removeTags = inputTags.includes("topic:legacy")
            ? ["topic:legacy"]
            : inputTags.length > 0
              ? [inputTags[0]]
              : [];
          const addTags = inputTags.includes("topic:tunnel")
            ? []
            : ["topic:tunnel"];
          res.statusCode = 200;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              request_id: requestId,
              result: {
                status: "success",
                data: {
                  metadata: isObject(inlineInput.metadata)
                    ? inlineInput.metadata
                    : {},
                  input_tags: inputTags,
                  remove_tags: removeTags,
                  add_tags: addTags,
                  suggest_tags: [
                    {
                      tag: "topic:suggested-by-mock",
                      note: `[${tagNoteLanguage}] suggested by mock`,
                    },
                  ],
                  warnings: ["mock-tag-regulator"],
                  error: null,
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            }),
          );
          return;
        }
        if (skillId === "tag-bootstrapper") {
          const inlineInput = isObject(createPayload.input)
            ? createPayload.input
            : {};
          const existing = Array.isArray(inlineInput.existing_tags)
            ? inlineInput.existing_tags
            : [];
          res.statusCode = 200;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              request_id: requestId,
              result: {
                status: "success",
                data: {
                  add_tags: [
                    {
                      tag: "field:CS/AI",
                      facet: "field",
                      note: "Artificial intelligence",
                    },
                    {
                      tag: "method:survey",
                      facet: "method",
                      note: "Survey study",
                    },
                  ].filter(
                    (candidate) =>
                      !existing.some(
                        (entry) =>
                          isObject(entry) &&
                          String(entry.tag || "").toLowerCase() ===
                            candidate.tag.toLowerCase(),
                      ),
                  ),
                  warnings: ["mock-tag-bootstrapper"],
                  error: null,
                  provenance: {
                    generated_at: "2026-01-01T00:00:00Z",
                  },
                },
                artifacts: [],
                validation_warnings: [],
                error: null,
              },
            }),
          );
          return;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            request_id: requestId,
            result: JSON.parse(JSON.stringify(literatureDigestResultTemplate)),
          }),
        );
        return;
      }

      res.statusCode = 404;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "not found" }));
    });
  });

  const host = args.host || "127.0.0.1";
  const port = typeof args.port === "number" ? args.port : 0;
  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("mock server failed to bind");
  }
  return {
    baseUrl: `http://${host}:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
    getJobs: () => Array.from(jobs.values()),
    getTraffic: () => [...traffic],
  } as MockSkillRunnerServer;
}

export function literatureDigestBundlePath(projectRoot: string) {
  return joinPath(
    projectRoot,
    "tests",
    "fixtures",
    "literature-analysis",
    "run_bundle_canonical.zip",
  );
}

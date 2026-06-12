import {
  validateCreatePayload,
  validateMultipartHasField,
} from "./contracts";
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

export async function startMockSkillRunnerServer(args: {
  bundlePath: string;
  pollDelayMs?: number;
  host?: string;
  port?: number;
}) {
  const httpMod = await dynamicImport("http");
  const fsMod = await dynamicImport("fs/promises");
  const createServer = httpMod.createServer as typeof import("http").createServer;
  const jobs = new Map<string, MockJob>();
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
        const requestId = String(nextId++);
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
        const hasFileField = validateMultipartHasField(bodyRaw, "file");
        if (!hasFileField) {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(
            JSON.stringify({
              error: "missing multipart field: file",
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
        if (!job.uploadReceived) {
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
        if (skillId === "tag-regulator") {
          const inlineInput = isObject(createPayload.input)
            ? createPayload.input
            : {};
          const parameter = isObject(createPayload.parameter)
            ? createPayload.parameter
            : {};
          const tagNoteLanguage = String(
            parameter.tag_note_language || "zh-CN",
          ).trim() || "zh-CN";
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
    "test",
    "fixtures",
    "literature-analysis",
    "run_bundle.zip",
  );
}

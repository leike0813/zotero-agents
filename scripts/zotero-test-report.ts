import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

/**
 * Auxiliary reporter-event evidence for the aggregate `npm test` report. It is
 * independent from the System E2E manifest sink: same events, separate URL,
 * separate file, no change to System E2E semantics.
 */
export const ZOTERO_TEST_REPORT_DIR_ENV = "ZOTERO_TEST_REPORT_DIR";
export const ZOTERO_TEST_REPORT_SCOPE_ENV = "ZOTERO_TEST_REPORT_SCOPE";
export const ZOTERO_TEST_REPORT_EVENT_URL_ENV = "ZOTERO_TEST_REPORT_EVENT_URL";

const SAFE_SCOPE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// A single reporter event carries one mocha error; 4 MiB is far above that
// while still bounding what a broken client can make this sink buffer.
const MAX_EVENT_BYTES = 4 * 1024 * 1024;
const SINK_CLOSE_TIMEOUT_MS = 5_000;

export type ZoteroTestReportTarget = { dir: string; scope: string };

export type ZoteroTestReportSink = {
  url: string;
  filePath: string;
  /** Events accepted by the sink, whether or not they were persisted. */
  eventCount: () => number;
  /** Stops accepting events, awaits persisted writes, then throws the first
   * write failure so the wrapper can exit nonzero. */
  close: () => Promise<void>;
};

export type ZoteroTestFailure = {
  title: string;
  file?: string;
  message?: string;
  stack?: string;
  expected?: unknown;
  actual?: unknown;
};

export type ZoteroTestReport = {
  counts?: { passed: number; failed: number; pending: number };
  failures: ZoteroTestFailure[];
  complete: boolean;
};

export function resolveZoteroTestReportTarget(
  env: NodeJS.ProcessEnv = process.env,
): ZoteroTestReportTarget | undefined {
  const dir = String(env[ZOTERO_TEST_REPORT_DIR_ENV] || "").trim();
  const scope = String(env[ZOTERO_TEST_REPORT_SCOPE_ENV] || "").trim();
  if (!dir && !scope) {
    return undefined;
  }
  if (!dir || !scope) {
    throw new Error("zotero_test_report_target_incomplete");
  }
  if (!SAFE_SCOPE.test(scope)) {
    throw new Error("zotero_test_report_scope_unsafe");
  }
  return { dir: path.resolve(dir), scope };
}

export function resolveZoteroTestReportPath(target: ZoteroTestReportTarget) {
  return path.join(target.dir, "results", `${target.scope}.events.jsonl`);
}

export async function startZoteroTestReportSink(
  target: ZoteroTestReportTarget,
): Promise<ZoteroTestReportSink> {
  const filePath = resolveZoteroTestReportPath(target);
  await mkdir(path.dirname(filePath), { recursive: true });

  let failure: Error | undefined;
  let received = 0;
  let inFlight = 0;
  let queue: Promise<void> = Promise.resolve();

  const server = createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/events") {
      response.writeHead(404).end();
      return;
    }
    inFlight += 1;
    response.on("close", () => {
      inFlight -= 1;
    });
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_EVENT_BYTES) {
        failure ??= new Error("zotero_test_report_event_too_large");
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      let event: unknown;
      try {
        event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        failure ??= new Error("zotero_test_report_event_unreadable");
        response.writeHead(400).end();
        return;
      }
      received += 1;
      const line = `${JSON.stringify(event)}\n`;
      queue = queue
        .then(() => appendFile(filePath, line, "utf8"))
        .catch((error: unknown) => {
          failure ??= error instanceof Error ? error : new Error(String(error));
        });
      void queue.then(() => {
        response.writeHead(failure ? 500 : 200).end();
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("zotero_test_report_event_sink_bind_failed");
  }

  return {
    url: `http://127.0.0.1:${address.port}/events`,
    filePath,
    eventCount: () => received,
    close: async () => {
      const closed = new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      const deadline = Date.now() + SINK_CLOSE_TIMEOUT_MS;
      while (inFlight > 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      // The reporter keeps its loopback connections alive; close() alone would
      // wait for sockets the finished child can no longer close.
      server.closeAllConnections();
      await closed;
      await queue;
      if (failure) {
        throw failure;
      }
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined);
}

function buildFailure(
  title: string,
  detail: Record<string, unknown> | undefined,
  error: Record<string, unknown> | undefined,
): ZoteroTestFailure {
  const message = asText(detail?.message) ?? asText(error?.message);
  const stack = asText(detail?.stack) ?? asText(error?.stack);
  const expected = firstDefined(detail?.expected, error?.expected);
  const actual = firstDefined(detail?.actual, error?.actual);
  return {
    title,
    ...(message ? { message } : {}),
    ...(stack ? { stack } : {}),
    ...(expected !== undefined ? { expected } : {}),
    ...(actual !== undefined ? { actual } : {}),
  };
}

/**
 * Reads the JSONL evidence written by {@link startZoteroTestReportSink}.
 * Counts come from observed reporter events, so a dropped event can only make
 * the report incomplete, never inflate a pass.
 */
export async function readZoteroTestReport(
  filePath: string,
): Promise<ZoteroTestReport> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return { failures: [], complete: false };
  }

  const events: Record<string, unknown>[] = [];
  let malformed = 0;
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      malformed += 1;
      continue;
    }
    const event = asRecord(parsed);
    if (event) events.push(event);
    else malformed += 1;
  }

  // The patched reporter sends one serialized fail detail right before the
  // matching fail event so message/stack survive the browser-side JSON
  // serialization of the error. Details are paired with fail events in event
  // order, so repeated titles keep their own detail.
  const pendingDetails = new Map<string, Record<string, unknown>[]>();
  const takeDetail = (key: string) => {
    const queue = pendingDetails.get(key);
    if (!queue?.length) {
      return undefined;
    }
    const detail = queue.shift()!;
    if (!queue.length) {
      pendingDetails.delete(key);
    }
    return detail;
  };
  const failures: ZoteroTestFailure[] = [];
  let reportIncomplete = false;
  for (const event of events) {
    if (event.reportIncomplete === true) {
      reportIncomplete = true;
    }
    if (event.type === "debug") {
      const data = asRecord(event.data);
      if (!data || data.kind !== "zotero-test-fail-detail") continue;
      const key = asText(data.fullTitle) ?? asText(data.title);
      if (!key) continue;
      const queue = pendingDetails.get(key) ?? [];
      queue.push(data);
      pendingDetails.set(key, queue);
      continue;
    }
    if (event.type !== "fail") continue;
    const data = asRecord(event.data) ?? {};
    const title = asText(data.fulltest) ?? asText(data.title) ?? "";
    const detail = takeDetail(title) ?? takeDetail(asText(data.title) ?? "");
    failures.push(buildFailure(title, detail, asRecord(data.error)));
  }

  // A detail without its fail event means the reporter died between the two
  // events; the test failed even though the fail event never arrived.
  let orphanDetails = 0;
  for (const queue of pendingDetails.values()) {
    for (const detail of queue) {
      orphanDetails += 1;
      failures.push(
        buildFailure(
          asText(detail.fullTitle) ?? asText(detail.title) ?? "",
          detail,
          undefined,
        ),
      );
    }
  }

  // A restarted run appends a new reporter session to the same file; counts and
  // completeness describe the last session, failures keep every attempt.
  let segmentStart = 0;
  for (let index = 0; index < events.length; index += 1) {
    if (events[index].type === "start") segmentStart = index;
  }
  let passed = 0;
  let failed = 0;
  let pending = 0;
  let ended = false;
  let aborted = false;
  let reportedPassed: number | undefined;
  let reportedFailed: number | undefined;
  for (const event of events.slice(segmentStart)) {
    if (event.type === "pass") passed += 1;
    else if (event.type === "fail") failed += 1;
    else if (event.type === "pending") pending += 1;
    else if (event.type === "end") {
      ended = true;
      const data = asRecord(event.data) ?? {};
      aborted = Boolean(data.aborted);
      if (typeof data.passed === "number") reportedPassed = data.passed;
      if (typeof data.failed === "number") reportedFailed = data.failed;
    }
  }

  return {
    ...(events.length ? { counts: { passed, failed, pending } } : {}),
    failures,
    complete:
      ended &&
      !aborted &&
      !reportIncomplete &&
      orphanDetails === 0 &&
      malformed === 0 &&
      (reportedPassed === undefined || reportedPassed === passed) &&
      (reportedFailed === undefined || reportedFailed === failed),
  };
}

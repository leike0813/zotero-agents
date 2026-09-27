import { listRuntimeLogs } from "../../src/modules/runtimeLogManager";
import { cleanupBackgroundRuntimeForZoteroTests } from "../../src/modules/testRuntimeCleanup";
import { cleanupTrackedZoteroTestObjects } from "./objectCleanupHarness";
import {
  captureZoteroLeakProbeSnapshot,
  flushZoteroLeakProbeDigest,
  noteZoteroLeakProbeTestStart,
} from "./leakProbeDigest";
import {
  captureZoteroPerformanceSnapshot,
  flushZoteroPerformanceProbeDigest,
  noteZoteroPerformanceProbeTestStart,
} from "./performanceProbeDigest";
import { readDiagnosticsEnv } from "./testDiagnosticsOutput";

type FailureContextProvider = () => unknown | Promise<unknown>;
type TestZotero = {
  Prefs?: { get?: (key: string, global?: boolean) => unknown };
  HTTP?: {
    request?: (
      method: string,
      url: string,
      options: { body: string },
    ) => Promise<unknown>;
  };
};

const INSTALL_FLAG = "__zs_zotero_failure_diagnostic_installed__";
const PROVIDERS_KEY = "__zs_zotero_failure_context_providers__";

type DiagnosticRuntime = typeof globalThis & {
  window?: {
    debug?: (payload: unknown) => unknown;
  };
  [INSTALL_FLAG]?: boolean;
  [PROVIDERS_KEY]?: Set<FailureContextProvider>;
  IOUtils?: unknown;
  PathUtils?: unknown;
};

function getRuntime() {
  return globalThis as DiagnosticRuntime;
}

function getTestZotero(): TestZotero | undefined {
  return typeof Zotero !== "undefined"
    ? (Zotero as unknown as TestZotero)
    : (getRuntime() as any).Zotero;
}

function isZoteroRuntime() {
  const runtime = getRuntime();
  return (
    (typeof IOUtils !== "undefined" && typeof PathUtils !== "undefined") ||
    (!!runtime.IOUtils && !!runtime.PathUtils)
  );
}

export function isSystemE2ERun() {
  return Boolean(readSystemE2EEventUrl());
}

function readSystemE2EEventUrl() {
  const key = "extensions.zotero-agents.test.systemE2EEventUrl";
  const value = getTestZotero()?.Prefs?.get?.(key, true);
  return /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/events$/.test(value || "")
    ? value!
    : "";
}

function inferDomainFromFilePath(filePath: string) {
  return (
    filePath
      .replace(/\\/g, "/")
      .match(/tests\/zotero\/(core|ui|workflow|e2e)\//)?.[1] || "all"
  );
}

export function shouldRunPerTestSharedTeardown(
  filePath: string,
  configuredDomain = "",
) {
  return (configuredDomain || inferDomainFromFilePath(filePath)) !== "e2e";
}

function getProviders() {
  const runtime = getRuntime();
  if (!runtime[PROVIDERS_KEY]) {
    runtime[PROVIDERS_KEY] = new Set<FailureContextProvider>();
  }
  return runtime[PROVIDERS_KEY];
}

export async function emitZoteroTestDebug(payload: unknown) {
  const runtime = getRuntime();
  if (!isZoteroRuntime()) {
    return;
  }
  const eventUrl = readSystemE2EEventUrl();
  const http = getTestZotero()?.HTTP;
  const request = http?.request;
  if (eventUrl) {
    if (typeof request !== "function") {
      throw new Error("system_e2e_event_transport_unavailable");
    }
    const response = (await request.call(http, "POST", eventUrl, {
      body: JSON.stringify({ type: "debug", data: payload }),
    })) as { status?: number };
    if (response.status !== 200) {
      throw new Error("system_e2e_event_sink_rejected");
    }
    return;
  }
  const debug =
    typeof runtime.window?.debug === "function"
      ? runtime.window.debug.bind(runtime.window)
      : null;
  if (!debug) {
    return;
  }
  try {
    await Promise.resolve(debug(payload));
  } catch {
    // ignore debug bridge failures
  }
}

export function registerZoteroFailureContextProvider(
  provider: FailureContextProvider,
) {
  const providers = getProviders();
  providers.add(provider);
  return () => {
    providers.delete(provider);
  };
}

function getRuntimeLogTail(limit = 12) {
  return listRuntimeLogs({ order: "desc", limit })
    .reverse()
    .map((entry) => ({
      ts: entry.ts,
      level: entry.level,
      scope: entry.scope,
      stage: entry.stage,
      message: entry.message,
      workflowId: entry.workflowId,
      runId: entry.runId,
      requestId: entry.requestId,
      jobId: entry.jobId,
      interactionId: entry.interactionId,
      error: entry.error
        ? {
            name: entry.error.name,
            message: entry.error.message,
            category: entry.error.category,
          }
        : undefined,
    }));
}

async function collectProviderContext() {
  const contexts: unknown[] = [];
  for (const provider of getProviders()) {
    try {
      const value = await provider();
      if (typeof value !== "undefined") {
        contexts.push(value);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.stack || error.message : String(error);
      contexts.push({
        kind: "zotero-test-failure-context-provider-error",
        message,
      });
    }
  }
  return contexts;
}

function shouldReportFailure(currentTest: Mocha.Test | undefined) {
  if (!currentTest) {
    return false;
  }
  const stateFailed = currentTest.state === "failed";
  const currentError = (currentTest as Mocha.Test & { err?: unknown }).err;
  return stateFailed || typeof currentError !== "undefined";
}

export async function runZoteroSharedTeardownForTests(args?: {
  domain?: string;
  fullTitle?: string;
  file?: string;
  testIndex?: number;
}) {
  captureZoteroLeakProbeSnapshot("pre-cleanup", args);
  await captureZoteroPerformanceSnapshot("pre-cleanup", args);
  try {
    await cleanupBackgroundRuntimeForZoteroTests({
      preserveRuntimeLogs: isSystemE2ERun(),
    });
  } finally {
    captureZoteroLeakProbeSnapshot("post-background-cleanup", args);
    await captureZoteroPerformanceSnapshot("post-background-cleanup", args);
    try {
      await cleanupTrackedZoteroTestObjects();
    } finally {
      captureZoteroLeakProbeSnapshot("post-object-cleanup", args);
      await captureZoteroPerformanceSnapshot("post-object-cleanup", args);
    }
  }
}

export function installZoteroFailureDiagnostics() {
  const runtime = getRuntime();
  if (!isZoteroRuntime() || runtime[INSTALL_FLAG]) {
    return;
  }
  runtime[INSTALL_FLAG] = true;
  beforeEach(async function () {
    const currentTest = this.currentTest;
    const meta = {
      domain: inferDomainFromFilePath(currentTest?.file || ""),
      fullTitle: currentTest?.fullTitle(),
      file: currentTest?.file || "",
    };
    noteZoteroLeakProbeTestStart(meta);
    await noteZoteroPerformanceProbeTestStart(meta);
  });
  afterEach(async function () {
    const currentTest = this.currentTest;
    const probeMeta = {
      domain: inferDomainFromFilePath(currentTest?.file || ""),
      fullTitle: currentTest?.fullTitle(),
      file: currentTest?.file || "",
    };
    try {
      if (!shouldReportFailure(currentTest)) {
        return;
      }
      const providerContext = await collectProviderContext();
      await emitZoteroTestDebug({
        kind: "zotero-test-failure-context",
        domain: inferDomainFromFilePath(currentTest?.file || ""),
        fullTitle: currentTest?.fullTitle(),
        title: currentTest?.title,
        file: currentTest?.file,
        runtimeLogTail: getRuntimeLogTail(),
        extraContext: providerContext,
      });
    } finally {
      if (
        shouldRunPerTestSharedTeardown(
          currentTest?.file || "",
          isSystemE2ERun() ? "e2e" : readDiagnosticsEnv("ZOTERO_TEST_DOMAIN"),
        )
      ) {
        await runZoteroSharedTeardownForTests(probeMeta);
      }
    }
  });
  after(async function () {
    await runZoteroSharedTeardownForTests({
      domain: "all",
      fullTitle: "",
      file: "",
    });
    captureZoteroLeakProbeSnapshot("domain-end", {
      domain: "all",
      fullTitle: "",
      file: "",
    });
    await captureZoteroPerformanceSnapshot("domain-end", {
      domain: "all",
      fullTitle: "",
      file: "",
    });
    await flushZoteroLeakProbeDigest();
    await flushZoteroPerformanceProbeDigest();
  });
}

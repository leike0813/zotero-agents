import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import vm from "node:vm";

const outputRoot = process.env.OMP_PROTOTYPE_OUTPUT;
if (!outputRoot) throw new Error("OMP_PROTOTYPE_OUTPUT is required");

const summary = JSON.parse(
  await readFile(join(outputRoot, "build-summary.json"), "utf8"),
);
assert.equal(summary.verdict, "no-go");
assert.equal(summary.versions.nativeCore, "0.84.4");
assert.deepEqual(summary.versions, {
  nativeCore: "0.84.4",
  nativeAiAbi: "0.84.4",
  ompCoreNegativeControl: "18.0.11",
  ompAi: "18.0.11",
  ompCatalog: "18.0.11",
});
assert.deepEqual(summary.reachableHostImports, []);
assert.deepEqual(summary.classifications.direct, [
  "native pi-agent-core",
  "pi-catalog/models",
]);
assert.ok(
  summary.classifications.unavailable.includes(
    "OMP pi-ai OpenAI Responses provider",
  ),
);
assert.ok(summary.bytes > 0);
assert.ok(summary.gzipBytes > 0);
assert.equal(summary.surfaces.nativeCore.status, "direct");
assert.equal(summary.surfaces.hybridMock.status, "adapter-required");
assert.equal(summary.surfaces.hybridOpenAi.status, "unavailable");
assert.equal(summary.surfaces.ompCoreNegativeControl.status, "unavailable");
assert.equal(summary.mainBundle.containsNativeCore, true);
assert.equal(summary.mainBundle.containsOmpAi, true);
assert.equal(summary.mainBundle.containsOmpCore, false);

const bundle = await readFile(join(outputRoot, "omp.iife.js"), "utf8");
const runtime = globalThis;
const sandbox = {
  AbortController: runtime.AbortController,
  AbortSignal: runtime.AbortSignal,
  Blob: runtime.Blob,
  DOMException: runtime.DOMException,
  FormData: runtime.FormData,
  Headers: runtime.Headers,
  ReadableStream: runtime.ReadableStream,
  Request: runtime.Request,
  Response: runtime.Response,
  TextDecoder: runtime.TextDecoder,
  TextEncoder: runtime.TextEncoder,
  TransformStream: runtime.TransformStream,
  URL: runtime.URL,
  URLSearchParams: runtime.URLSearchParams,
  WritableStream: runtime.WritableStream,
  atob: runtime.atob,
  btoa: runtime.btoa,
  clearInterval: runtime.clearInterval,
  clearTimeout: runtime.clearTimeout,
  console: runtime.console,
  crypto: runtime.crypto,
  fetch: runtime.fetch,
  performance: runtime.performance,
  queueMicrotask: runtime.queueMicrotask,
  setInterval: runtime.setInterval,
  setTimeout: runtime.setTimeout,
  structuredClone: runtime.structuredClone,
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(bundle, sandbox, { filename: "omp.iife.js" });

const report = await sandbox.OmpZoteroPrototype.runOmpCompatibilityProbe();
assert.equal(report.schema, "omp-zotero-compatibility.v1");
assert.equal(report.runtime.nodeRuntimeAbsent, true);
assert.equal(report.runtime.bunGlobalAbsent, true);
assert.equal(report.agent.nativeCoreUsed, true);
assert.equal(report.agent.ompCoreLoaded, false);
assert.equal(report.agent.ompCalls, 2);
assert.equal(report.agent.finalStopReason, "stop");
assert.equal(report.agent.finalText, "echo complete");
assert.deepEqual([...report.agent.toolExecutions], ["echo:probe"]);
assert.deepEqual([...report.agent.transformOrder], [
  "transformContext",
  "convertToLlm",
  "transformContext",
  "convertToLlm",
]);
assert.equal(report.cancellation.stopReason, "aborted");
assert.equal(report.catalog.bundledProviders > 0, true);
assert.equal(report.catalog.bundledModels > 0, true);
assert.equal(report.catalog.overlayAccepted, 1);
assert.equal(report.catalog.overlayRejected, 2);
assert.equal(report.auth.explicitApiKeyForwarded, true);
assert.equal(report.auth.ompStateTouched, false);

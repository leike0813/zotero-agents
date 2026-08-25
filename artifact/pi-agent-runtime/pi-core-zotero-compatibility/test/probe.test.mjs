import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const outputRoot = process.env.PI_PROTOTYPE_OUTPUT;
if (!outputRoot) throw new Error("PI_PROTOTYPE_OUTPUT is required");

async function loadProbe(name) {
  const filename = `${name}.iife.js`;
  const bundle = await readFile(join(outputRoot, filename), "utf8");
  const sandbox = {
    AbortController,
    AbortSignal,
    Blob,
    DOMException,
    FormData,
    Headers,
    ReadableStream,
    Request,
    Response,
    TextDecoder,
    TextEncoder,
    TransformStream,
    URL,
    URLSearchParams,
    WritableStream,
    atob,
    btoa,
    clearInterval,
    clearTimeout,
    console,
    crypto,
    fetch,
    performance,
    queueMicrotask,
    setInterval,
    setTimeout,
    structuredClone,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(bundle, sandbox, { filename });
  return sandbox.PiCompatibilityPrototype;
}

const coreProbe = await loadProbe("core-faux");
const report = await coreProbe.runPiCompatibilityProbe();

assert.equal(report.schema, "pi-zotero-compatibility-probe.v1");
assert.equal(report.runtime.nodeGlobalsAbsent, true);
assert.equal(report.runtime.nodeRuntimeAbsent, true);
assert.equal(report.runtime.nodeBuiltinLoadable, false);
assert.equal(report.core.finalText, "tool complete");
assert.equal(report.core.toolArguments?.text, "probe");
assert.equal(report.core.toolResult, "echo:probe");
assert.ok(report.core.eventTypes.includes("message_update"));
assert.ok(report.core.eventTypes.includes("tool_execution_start"));
assert.ok(report.core.eventTypes.includes("tool_execution_end"));
assert.equal(report.core.idleAfterRun, true);
assert.equal(report.cancellation.stopReason, "aborted");
assert.equal(report.cancellation.idleAfterAbort, true);
assert.equal(report.cleanup.listenerDetached, true);
assert.equal(report.cleanup.messagesAfterReset, 0);

const openaiProbe = await loadProbe("openai");
const openaiReport = await openaiProbe.runPiCompatibilityProbe({
  includeOpenAiFetch: true,
});
assert.equal(openaiReport.openaiFetch?.called, true);
assert.equal(openaiReport.openaiFetch?.requestMethod, "POST");
assert.ok(openaiReport.openaiFetch?.requestUrl.endsWith("/responses"));
assert.equal(openaiReport.openaiFetch?.signalForwarded, true);
assert.equal(openaiReport.openaiFetch?.finalText, "provider fixture");
assert.equal(openaiReport.openaiFetch?.stopReason, "stop");

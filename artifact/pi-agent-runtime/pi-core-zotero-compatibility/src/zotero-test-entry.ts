import { runPiCompatibilityProbe } from "./probe";

declare const Zotero: { version?: string };
declare function describe(name: string, suite: () => void): void;
declare function it(
  name: string,
  test: (this: { timeout(milliseconds: number): void }) => Promise<void>,
): void;

function assertProbe(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

describe("Pi core Zotero runtime compatibility prototype", function () {
  it("streams text, executes a tool, aborts, cleans up, and uses provider fetch", async function () {
    this.timeout(20_000);
    const report = await runPiCompatibilityProbe({ includeOpenAiFetch: true });
    console.log(
      `[pi-zotero-compatibility] ${JSON.stringify({
        report,
        zoteroVersion:
          typeof Zotero === "undefined" ? "unknown" : Zotero.version,
      })}`,
    );
    const reportDebug = (globalThis as { debug?: (payload: unknown) => void })
      .debug;
    reportDebug?.({
      kind: "pi-zotero-compatibility",
      report,
      zoteroVersion: typeof Zotero === "undefined" ? "unknown" : Zotero.version,
    });

    assertProbe(
      report.runtime.nodeRuntimeAbsent,
      "Node runtime is reachable from Zotero",
    );
    assertProbe(
      report.core.finalText === "tool complete",
      "core final text mismatch",
    );
    assertProbe(
      report.core.toolArguments?.text === "probe",
      "tool arguments mismatch",
    );
    assertProbe(
      report.core.toolResult === "echo:probe",
      "tool result mismatch",
    );
    assertProbe(
      report.core.eventTypes.includes("message_update"),
      "missing stream event",
    );
    assertProbe(
      report.core.eventTypes.includes("tool_execution_end"),
      "missing tool completion event",
    );
    assertProbe(
      report.cancellation.stopReason === "aborted",
      "abort did not settle",
    );
    assertProbe(
      report.cancellation.idleAfterAbort,
      "agent remained active after abort",
    );
    assertProbe(report.cleanup.listenerDetached, "listener remained attached");
    assertProbe(
      report.cleanup.messagesAfterReset === 0,
      "reset retained messages",
    );
    assertProbe(
      report.openaiFetch?.called,
      "OpenAI provider did not use custom fetch",
    );
    assertProbe(
      report.openaiFetch.requestMethod === "POST",
      "provider method mismatch",
    );
    assertProbe(
      report.openaiFetch.requestUrl.endsWith("/responses"),
      "provider URL mismatch",
    );
    assertProbe(
      report.openaiFetch.signalForwarded,
      "provider signal was not forwarded",
    );
    assertProbe(
      report.openaiFetch.finalText === "provider fixture",
      "provider text mismatch",
    );
    assertProbe(
      report.openaiFetch.stopReason === "stop",
      "provider did not stop cleanly",
    );
  });
});

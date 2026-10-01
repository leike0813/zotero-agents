import {
  parseJSONRPCMessage,
  type JSONRPCMessage,
  type Transport,
} from "@modelcontextprotocol/client";
import {
  startLongLivedProcess,
  type LongLivedProcess,
  type LongLivedProcessRequest,
  type ProcessExit,
} from "../platform/longLivedProcess";
import type { PiPhysicalSettlement } from "./piRuntimeLifecycle";

const MAX_LINE_BYTES = 1024 * 1024;

export class PiMcpStdioTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  private process: LongLivedProcess | null = null;
  private closed = false;
  private exit: Promise<ProcessExit> | null = null;

  /**
   * Real child settlement. Closing the client proves nothing about the child,
   * so callers that hold resources or recovery holds must await this instead.
   */
  get physicalSettlement(): Promise<{ state: PiPhysicalSettlement }> {
    if (!this.exit)
      return Promise.resolve({ state: "unknown" as PiPhysicalSettlement });
    return this.exit.then((exit) => ({
      state:
        exit.outcome === "exited"
          ? ("settled" as PiPhysicalSettlement)
          : ("unknown" as PiPhysicalSettlement),
    }));
  }

  constructor(private readonly request: LongLivedProcessRequest) {}

  async start(): Promise<void> {
    if (this.process || this.closed)
      throw new Error("mcp_stdio_already_started");
    const process = await startLongLivedProcess(this.request);
    if (this.closed) {
      await process.terminate();
      throw new Error("mcp_stdio_closed");
    }
    this.process = process;
    this.exit = process.wait().then(
      (exit) => exit,
      (): ProcessExit => ({
        adapter: "mozilla",
        pid: null,
        exitCode: null,
        outcome: "unknown",
        terminationRequested: true,
      }),
    );
    void this.readStdout(this.process);
    void this.drainStderr(this.process);
    void this.exit.then(
      () => this.notifyClosed(),
      (error: unknown) => {
        this.onerror?.(new Error("mcp_stdio_wait_failed", { cause: error }));
        this.notifyClosed();
      },
    );
  }

  private notifyClosed(): void {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }

  private async readStdout(process: LongLivedProcess): Promise<void> {
    const reader = process.stdout.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let pending = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        if (new TextEncoder().encode(pending).length > MAX_LINE_BYTES)
          throw new Error("mcp_stdio_message_too_large");
        let split: number;
        while ((split = pending.indexOf("\n")) >= 0) {
          const line = pending.slice(0, split).replace(/\r$/, "");
          pending = pending.slice(split + 1);
          if (line) this.onmessage?.(parseJSONRPCMessage(JSON.parse(line)));
        }
      }
      if (pending.trim()) throw new Error("mcp_stdio_truncated_message");
    } catch {
      this.onerror?.(new Error("mcp_stdio_invalid_message"));
      void process.terminate();
    } finally {
      reader.releaseLock();
    }
  }

  private async drainStderr(process: LongLivedProcess): Promise<void> {
    const reader = process.stderr.getReader();
    try {
      while (!(await reader.read()).done) {
        /* stderr remains private */
      }
    } catch {
      this.onerror?.(new Error("mcp_stdio_stderr_failed"));
    } finally {
      reader.releaseLock();
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.process || this.closed) throw new Error("mcp_stdio_closed");
    const bytes = new TextEncoder().encode(`${JSON.stringify(message)}\n`);
    if (bytes.length > MAX_LINE_BYTES)
      throw new Error("mcp_stdio_message_too_large");
    const writer = this.process.stdin.getWriter();
    try {
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    const process = this.process;
    if (process) await process.terminate();
    this.notifyClosed();
  }

  /** Requests termination and returns the real exit evidence. */
  async terminateNow(): Promise<ProcessExit> {
    if (!this.process) {
      return {
        adapter: "mozilla",
        pid: null,
        exitCode: null,
        outcome: "unknown",
        terminationRequested: false,
      };
    }
    return await this.process.terminate();
  }
}

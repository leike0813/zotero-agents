import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const WORKER_PROTOCOL = "synthesis-rust-worker.v1";

export type RustComputeWorkerTransportOptions = {
  executablePath: string;
  arguments?: string[];
};

export class RustComputeWorkerTransport extends EventEmitter {
  readonly child: ChildProcessWithoutNullStreams;
  private ended = false;
  private ready = false;

  constructor(options: RustComputeWorkerTransportOptions) {
    super();
    this.child = spawn(
      options.executablePath,
      ["worker", ...(options.arguments || [])],
      { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
    );
    const lines = createInterface({ input: this.child.stdout });
    lines.on("line", (line) => {
      try {
        const message = JSON.parse(line) as Record<string, unknown>;
        if (message.protocol !== WORKER_PROTOCOL) {
          this.emit("message", { type: "invalid_protocol" });
          return;
        }
        if (message.type === "ready") {
          if (
            this.ready ||
            typeof message.buildFingerprint !== "string" ||
            !message.buildFingerprint
          ) {
            this.emit("message", { type: "invalid_ready" });
            return;
          }
          this.ready = true;
          return;
        }
        this.emit("message", this.ready ? message : { type: "missing_ready" });
      } catch {
        this.emit("message", { type: "invalid_json" });
      }
    });
    this.child.once("error", (error) => this.emit("error", error));
    this.child.once("exit", (code, signal) => {
      this.ended = true;
      this.emit("exit", code, signal);
    });
    this.child.stderr.resume();
  }

  postMessage(message: Record<string, unknown>) {
    if (this.ended || !this.child.stdin.writable) {
      throw new Error("rust_compute_worker_unavailable");
    }
    this.child.stdin.write(
      `${JSON.stringify({ protocol: WORKER_PROTOCOL, ...message })}\n`,
    );
  }

  async terminate() {
    if (this.ended) return 0;
    const exited = new Promise<number>((resolve) => {
      this.child.once("exit", (code) => resolve(code ?? 0));
    });
    this.child.kill();
    return exited;
  }
}

export function defaultRustComputeWorkerPath() {
  const relative = import.meta.url.endsWith(".ts")
    ? `../../../native/synthesis-sidecar/target/debug/synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`
    : `../../../native/synthesis-sidecar/synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`;
  return fileURLToPath(new URL(relative, import.meta.url));
}

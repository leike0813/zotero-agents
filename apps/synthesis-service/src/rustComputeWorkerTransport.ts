import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { fileURLToPath } from "node:url";

const WORKER_PROTOCOL = "synthesis-rust-worker.v1";
const MAX_WORKER_FRAME_BYTES = 8 * 1024 * 1024;

export const RUST_COMPUTE_CANONICAL_ROWS = Symbol("rustComputeCanonicalRows");
export const RUST_COMPUTE_RAW_ROWS_ARTIFACT = Symbol(
  "rustComputeRawRowsArtifact",
);

export type RustComputeWorkerTransportOptions = {
  executablePath: string;
  arguments?: string[];
};

function countRawJsonNodes(source: Buffer) {
  let nodes = 0;
  for (let index = 0; index < source.length; index += 1) {
    const byte = source[index];
    if (byte === 0x7b || byte === 0x5b) {
      nodes += 1;
    } else if (byte === 0x22) {
      nodes += 1;
      while (++index < source.length) {
        if (source[index] === 0x5c) index += 1;
        else if (source[index] === 0x22) break;
      }
    } else if (
      byte === 0x2d ||
      (byte >= 0x30 && byte <= 0x39) ||
      byte === 0x74 ||
      byte === 0x66 ||
      byte === 0x6e
    ) {
      nodes += 1;
      while (
        index + 1 < source.length &&
        ![0x2c, 0x5d, 0x7d, 0x20, 0x09, 0x0d, 0x0a].includes(source[index + 1])
      ) {
        index += 1;
      }
    }
  }
  return nodes;
}

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
    let buffered: Buffer[] = [];
    let bufferedBytes = 0;
    let outputInvalid = false;
    const invalidateOutput = (type: string) => {
      if (outputInvalid) return;
      outputInvalid = true;
      buffered = [];
      bufferedBytes = 0;
      this.emit("message", { type });
      this.child.kill();
    };
    const consumeLine = (line: Buffer) => {
      try {
        const message = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(line),
        ) as unknown;
        if (!message || typeof message !== "object" || Array.isArray(message)) {
          invalidateOutput("invalid_envelope");
          return;
        }
        const frame = message as Record<string, unknown>;
        if (frame.protocol !== WORKER_PROTOCOL) {
          invalidateOutput("invalid_protocol");
          return;
        }
        if (frame.type === "ready") {
          if (
            this.ready ||
            typeof frame.buildFingerprint !== "string" ||
            !frame.buildFingerprint
          ) {
            invalidateOutput("invalid_ready");
            return;
          }
          this.ready = true;
          return;
        }
        if (!this.ready) {
          invalidateOutput("missing_ready");
          return;
        }
        if (
          frame.type === "result_page" &&
          line.length >= 2 &&
          line[line.length - 2] === 0x5d &&
          line[line.length - 1] === 0x7d
        ) {
          const marker = Buffer.from(',"rows":');
          const markerIndex = line.lastIndexOf(marker);
          if (markerIndex < 0) {
            invalidateOutput("invalid_envelope");
            return;
          }
          const rawRows = line.subarray(
            markerIndex + marker.length,
            line.length - 1,
          );
          Object.defineProperty(frame, RUST_COMPUTE_RAW_ROWS_ARTIFACT, {
            value: {
              byteLength: rawRows.length,
              nodeCount: countRawJsonNodes(rawRows),
              sha256: `sha256:${createHash("sha256").update(rawRows).digest("hex")}`,
            },
          });
        }
        this.emit("message", frame);
      } catch {
        invalidateOutput("invalid_json");
      }
    };
    this.child.stdout.on("data", (chunk: Buffer) => {
      if (outputInvalid) return;
      let offset = 0;
      while (offset < chunk.length) {
        const newline = chunk.indexOf(0x0a, offset);
        const end = newline < 0 ? chunk.length : newline;
        const segment = chunk.subarray(offset, end);
        const frameBytes =
          bufferedBytes + segment.length + (newline < 0 ? 0 : 1);
        if (frameBytes > MAX_WORKER_FRAME_BYTES) {
          invalidateOutput("frame_too_large");
          return;
        }
        if (segment.length) {
          buffered.push(segment);
          bufferedBytes += segment.length;
        }
        if (newline < 0) return;
        const line = Buffer.concat(buffered, bufferedBytes);
        buffered = [];
        bufferedBytes = 0;
        consumeLine(line);
        if (outputInvalid) return;
        offset = newline + 1;
      }
    });
    this.child.stdout.once("end", () => {
      if (!outputInvalid && bufferedBytes > 0) {
        invalidateOutput("truncated_frame");
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
    const canonicalRows = (message as Record<PropertyKey, unknown>)[
      RUST_COMPUTE_CANONICAL_ROWS
    ];
    if (Buffer.isBuffer(canonicalRows) && Array.isArray(message.rows)) {
      const { rows: _rows, ...envelope } = message;
      const envelopeJson = JSON.stringify({
        protocol: WORKER_PROTOCOL,
        ...envelope,
      });
      const header = Buffer.from(`${envelopeJson.slice(0, -1)},"rows":`);
      const suffix = Buffer.from("}\n");
      if (
        header.length + canonicalRows.length + suffix.length >
        MAX_WORKER_FRAME_BYTES
      ) {
        throw new Error("rust_compute_worker_frame_too_large");
      }
      this.child.stdin.cork();
      this.child.stdin.write(header);
      this.child.stdin.write(canonicalRows);
      this.child.stdin.write(suffix);
      this.child.stdin.uncork();
      return;
    }
    const frame = Buffer.from(
      `${JSON.stringify({ protocol: WORKER_PROTOCOL, ...message })}\n`,
    );
    if (frame.length > MAX_WORKER_FRAME_BYTES) {
      throw new Error("rust_compute_worker_frame_too_large");
    }
    this.child.stdin.write(frame);
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

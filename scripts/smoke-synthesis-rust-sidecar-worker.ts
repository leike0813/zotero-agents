import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { rebuildSynthesisCitationGraphLayoutRequest } from "../packages/synthesis-engine/src/index.js";

const WORKER_PROTOCOL = "synthesis-rust-worker.v1";

function requiredArgument(index: number, label: string) {
  const value = String(process.argv[index] || "").trim();
  if (!value) throw new Error(`Missing ${label}`);
  return value;
}

async function expectedFingerprint(source: string) {
  if (/^[a-f0-9]{64}$/.test(source)) return source;
  const provenance = JSON.parse(await fs.readFile(source, "utf8")) as {
    sourceFingerprint?: unknown;
  };
  if (
    typeof provenance.sourceFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(provenance.sourceFingerprint)
  ) {
    throw new Error("Invalid Rust sidecar provenance fingerprint");
  }
  return provenance.sourceFingerprint;
}

async function main() {
  const binary = requiredArgument(2, "Rust sidecar binary path");
  const expected = await expectedFingerprint(
    requiredArgument(3, "Rust fingerprint or provenance path"),
  );
  const child = spawn(binary, ["worker"], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  const lines = createInterface({ input: child.stdout });
  const iterator = lines[Symbol.asyncIterator]();
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${String(chunk)}`.slice(-4096);
  });

  const nextFrame = async () => {
    const next = await iterator.next();
    if (next.done) {
      throw new Error(`Rust worker closed unexpectedly: ${stderr}`);
    }
    return JSON.parse(next.value) as Record<string, unknown>;
  };

  try {
    const ready = await nextFrame();
    if (
      ready.protocol !== WORKER_PROTOCOL ||
      ready.type !== "ready" ||
      ready.buildFingerprint !== expected
    ) {
      throw new Error(
        `Unexpected Rust worker ready frame: ${JSON.stringify(ready)}`,
      );
    }

    const payload = rebuildSynthesisCitationGraphLayoutRequest({
      graphHash: `sha256:${"1".repeat(64)}`,
      algorithm: "force",
      nodes: [
        {
          nodeId: "paper:smoke",
          kind: "library_paper",
          title: "Smoke",
          year: "2026",
          initialX: 0,
          initialY: 0,
        },
      ],
      edges: [],
    });
    child.stdin.write(
      `${JSON.stringify({
        protocol: WORKER_PROTOCOL,
        type: "run",
        taskId: "candidate-smoke",
        operation: "citation_graph_layout.v2",
        payload,
      })}\n`,
    );
    const result = await nextFrame();
    const body = result.result as
      | { layoutEngine?: unknown; nodes?: unknown[] }
      | undefined;
    if (
      result.protocol !== WORKER_PROTOCOL ||
      result.type !== "result" ||
      result.taskId !== "candidate-smoke" ||
      body?.layoutEngine !== "forceatlas2-rust" ||
      body.nodes?.length !== 1
    ) {
      throw new Error(`Rust worker smoke failed: ${JSON.stringify(result)}`);
    }
  } finally {
    lines.close();
    child.kill();
  }
  process.stdout.write(
    `${JSON.stringify({
      ok: true,
      protocol: WORKER_PROTOCOL,
      representativeOperation: "citation_graph_layout.v2",
    })}\n`,
  );
}

await main();

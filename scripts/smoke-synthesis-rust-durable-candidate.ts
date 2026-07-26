import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";

const CLIENT_TOKEN = "r7-client-token-0123456789abcdef0123456789abcdef";
const PROFILE_ID = "1".repeat(64);
const DATA_ROOT_ID = "2".repeat(64);

function requiredArgument(index: number, label: string) {
  const value = String(process.argv[index] || "").trim();
  if (!value) throw new Error(`Missing ${label}`);
  return path.resolve(value);
}

async function withDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`candidate_deadline_exceeded:${label}`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function call(
  endpoint: string,
  capability: string,
  payload: unknown,
  requestId = `r7:${capability}`,
) {
  const response = await fetch(`${endpoint}/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${CLIENT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      protocol: "synthesis-sidecar.v1",
      requestId,
      profileId: PROFILE_ID,
      capability,
      payload,
    }),
  });
  return {
    response,
    body: (await response.json()) as Record<string, unknown>,
  };
}

function saturationFixture() {
  const nodeCount = 100;
  const edgeCount = 500;
  return {
    graphHash: `sha256:${"7".repeat(64)}`,
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      nodeId: `paper:${index}`,
      kind: "library_paper",
      libraryId: 1,
      itemKey: `ITEM${index}`,
      title: `Paper ${index}`,
      year: String(2000 + (index % 25)),
    })),
    edges: Array.from({ length: edgeCount }, (_, index) => ({
      edgeId: `edge:${index}`,
      source: `paper:${index % nodeCount}`,
      target: `paper:${(index * 17 + 1) % nodeCount}`,
      mentionCount: 1,
    })),
  };
}

async function main() {
  const binary = requiredArgument(2, "Rust sidecar binary path");
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "synthesis-r7-candidate-"),
  );
  const profileRuntimeRoot = path.join(root, "profile-runtime");
  const configPath = path.join(root, "config.json");
  await fs.writeFile(
    configPath,
    `${JSON.stringify({
      port: 0,
      profileId: PROFILE_ID,
      profileRuntimeRoot,
      dataRootId: DATA_ROOT_ID,
      clientToken: CLIENT_TOKEN,
    })}\n`,
  );
  const child = spawn(binary, ["serve", configPath], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      SYNTHESIS_R7_FAULT_COMPUTE_HOLD_MS: "250",
    },
  });
  const lines = createInterface({ input: child.stdout });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${String(chunk)}`.slice(-8_192);
  });
  try {
    const listening = await withDeadline(
      new Promise<{ port: number }>((resolve, reject) => {
        lines.once("line", (line) => {
          try {
            resolve(JSON.parse(line) as { port: number });
          } catch (error) {
            reject(error);
          }
        });
        child.once("error", reject);
        child.once("exit", (code) =>
          reject(
            new Error(`candidate exited before listen (${code}): ${stderr}`),
          ),
        );
      }),
      5_000,
      "listen",
    );
    const endpoint = `http://127.0.0.1:${listening.port}`;
    const health = (await (await fetch(`${endpoint}/health`)).json()) as Record<
      string,
      any
    >;
    if (
      health.implementation !== "rust-native-candidate" ||
      health.repository?.mode !== "isolated_shadow" ||
      health.repository?.pragmas?.busyTimeout !== 250 ||
      health.canonicalStore?.schemaVersion !==
        "synthesis-topic-canonical-store.v1"
    ) {
      throw new Error(`Invalid durable health: ${JSON.stringify(health)}`);
    }

    const unauthorized = await fetch(`${endpoint}/call`, {
      method: "POST",
      headers: { authorization: "Bearer wrong-token" },
      body: "{}",
    });
    if (unauthorized.status !== 401) {
      throw new Error(`Expected unauthorized, received ${unauthorized.status}`);
    }
    const malformed = await fetch(`${endpoint}/call`, {
      method: "POST",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      body: "{",
    });
    if (malformed.status !== 400) {
      throw new Error(`Expected malformed 400, received ${malformed.status}`);
    }
    const wrongProfile = await fetch(`${endpoint}/call`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${CLIENT_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        protocol: "synthesis-sidecar.v1",
        requestId: "r7:wrong-profile",
        profileId: "3".repeat(64),
        capability: "workbench.chrome.read",
        payload: { state: {} },
      }),
    });
    if (wrongProfile.status !== 409) {
      throw new Error(
        `Expected profile mismatch 409, received ${wrongProfile.status}`,
      );
    }

    const handshake = await call(endpoint, "system.handshake", {});
    const handshakeData = handshake.body.data as Record<string, any>;
    if (
      handshake.response.status !== 200 ||
      handshakeData.mutationEnabled !== false ||
      !handshakeData.capabilities?.includes("workbench.chrome.read") ||
      !handshakeData.capabilities?.includes("topics.canonical.inspect")
    ) {
      throw new Error(`Invalid handshake: ${JSON.stringify(handshake.body)}`);
    }

    const workbench = await call(endpoint, "workbench.chrome.read", {
      state: {},
    });
    const maintenance = (workbench.body.data as Record<string, any>)
      .maintenance;
    if (
      workbench.response.status !== 200 ||
      maintenance?.cacheReadiness?.length !== 2 ||
      maintenance?.backgroundJobs?.length !== 0 ||
      JSON.stringify(workbench.body).length > 1024 * 1024
    ) {
      throw new Error(
        `Invalid Workbench canary: ${JSON.stringify(workbench.body)}`,
      );
    }
    const invalidWorkbench = await call(endpoint, "workbench.chrome.read", {
      state: {},
      unknown: true,
    });
    if (invalidWorkbench.response.status !== 400) {
      throw new Error("Workbench canary accepted an unknown field");
    }

    const canonical = await call(endpoint, "topics.canonical.inspect", {
      topicId: "r7-canary",
    });
    const canonicalData = canonical.body.data as Record<string, any>;
    if (
      canonical.response.status !== 200 ||
      canonicalData.status !== "absent" ||
      canonicalData.pathId !== "r7-canary" ||
      canonicalData.manifestHash !== null ||
      canonicalData.sections?.length !== 0 ||
      JSON.stringify(canonical.body).length > 1024 * 1024
    ) {
      throw new Error(
        `Invalid canonical canary: ${JSON.stringify(canonical.body)}`,
      );
    }

    const compute = call(
      endpoint,
      "compute.citation_graph_metrics",
      saturationFixture(),
      "r7:saturation",
    );
    await withDeadline(
      (async () => {
        for (;;) {
          const snapshot = (await (
            await fetch(`${endpoint}/health`)
          ).json()) as Record<string, any>;
          if (snapshot.computePool?.state === "busy") return;
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      })(),
      2_000,
      "compute_busy",
    );
    const saturatedRead = await withDeadline(
      call(endpoint, "topics.canonical.inspect", {
        topicId: "r7-saturated",
      }),
      500,
      "saturated_read",
    );
    if (
      saturatedRead.response.status !== 200 ||
      (saturatedRead.body.data as Record<string, unknown>).status !== "absent"
    ) {
      throw new Error("Control-plane read failed during compute saturation");
    }
    const computeResult = await withDeadline(compute, 10_000, "compute");
    if (computeResult.response.status !== 200) {
      throw new Error(
        `Saturation compute failed: ${JSON.stringify(computeResult.body)}`,
      );
    }

    const shutdown = await call(endpoint, "system.shutdown", {});
    if (shutdown.response.status !== 200) {
      throw new Error(`Shutdown failed: ${JSON.stringify(shutdown.body)}`);
    }
    await withDeadline(
      new Promise<void>((resolve, reject) => {
        child.once("exit", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`candidate exited with ${code}: ${stderr}`));
        });
      }),
      5_000,
      "shutdown",
    );
    const databasePath = path.join(
      profileRuntimeRoot,
      "shadow-repository",
      DATA_ROOT_ID,
      "synthesis.db",
    );
    await fs.access(databasePath);
    process.stdout.write(
      `${JSON.stringify({
        schema: "synthesis-rust-durable-candidate-smoke.v1",
        canaries: 2,
        computeOperations: 15,
        mutationEnabled: false,
        shutdownClosed: true,
      })}\n`,
    );
  } finally {
    lines.close();
    if (child.exitCode === null) child.kill();
    await fs.rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});

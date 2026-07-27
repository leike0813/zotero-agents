import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import {
  buildSynthesisCitationGraphBuildTransferManifest,
  buildSynthesisCitationGraphBuildTransferPage,
  rebuildSynthesisCitationGraphBuildTransferManifest,
  rebuildSynthesisCitationGraphBuildTransferPage,
} from "../packages/synthesis-engine/src/citationGraphBuildTransfer";

const CLIENT_TOKEN = "r7-client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN = "r8-lifecycle-token-0123456789abcdef0123456789abcdef";
const PROFILE_ID = "1".repeat(64);
const DATA_ROOT_ID = "2".repeat(64);
const RUNTIME_ROOT_ID = "3".repeat(64);
const BUNDLE_ID = "4".repeat(64);
const BUILD_FINGERPRINT = "5".repeat(64);

const TARGET_IDENTITIES = {
  "win32-x64": {
    targetTriple: "x86_64-pc-windows-msvc",
    platformSignature: {
      scheme: "authenticode",
      status: "unsigned-candidate",
      signer: null,
    },
  },
  "darwin-x64": {
    targetTriple: "x86_64-apple-darwin",
    platformSignature: {
      scheme: "apple-code-signing",
      status: "unsigned-candidate",
      signer: null,
    },
  },
  "darwin-arm64": {
    targetTriple: "aarch64-apple-darwin",
    platformSignature: {
      scheme: "apple-code-signing",
      status: "unsigned-candidate",
      signer: null,
    },
  },
  "linux-x64": {
    targetTriple: "x86_64-unknown-linux-gnu",
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
  },
  "linux-arm64": {
    targetTriple: "aarch64-unknown-linux-gnu",
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
  },
} as const;

function requiredArgument(index: number, label: string) {
  const value = String(process.argv[index] || "").trim();
  if (!value) throw new Error(`Missing ${label}`);
  return path.resolve(value);
}

function requiredTarget(index: number) {
  const value = String(process.argv[index] || "").trim();
  if (!(value in TARGET_IDENTITIES)) {
    throw new Error(`Unsupported native target: ${value || "<missing>"}`);
  }
  return value as keyof typeof TARGET_IDENTITIES;
}

function signatureMatches(
  value: Record<string, unknown> | undefined,
  expected: {
    scheme: string;
    status: string;
    signer: null;
  },
) {
  return (
    value?.scheme === expected.scheme &&
    value.status === expected.status &&
    value.signer === expected.signer
  );
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
  token = CLIENT_TOKEN,
) {
  const response = await fetch(`${endpoint}/synthesis/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
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

function layoutFixture() {
  return {
    graphHash: `sha256:${"8".repeat(64)}`,
    algorithm: "components",
    nodes: [
      {
        nodeId: "paper:source",
        kind: "library_paper",
        title: "Source",
        initialX: 0,
        initialY: 0,
      },
      {
        nodeId: "ref:target",
        kind: "external_reference",
        title: "Target",
        initialX: 1,
        initialY: 1,
      },
    ],
    edges: [
      {
        edgeId: "edge:source-target",
        source: "paper:source",
        target: "ref:target",
      },
    ],
  };
}

function graphBuildFixture() {
  return {
    contractVersion: "synthesis-citation-graph-build.v1",
    scope: { kind: "full", sourceIds: [] },
    rolePriority: ["background"],
    libraryNodes: [
      {
        nodeId: "paper:source",
        title: "Source",
        authors: [],
        aliases: [],
      },
    ],
    references: [],
  };
}

async function main() {
  const binary = requiredArgument(2, "Rust sidecar binary path");
  const target = requiredTarget(3);
  const targetIdentity = TARGET_IDENTITIES[target];
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "synthesis-r7-candidate-"),
  );
  const profileRuntimeRoot = path.join(root, "profile-runtime");
  const configPath = path.join(root, "config.json");
  await fs.writeFile(
    configPath,
    `${JSON.stringify({
      schema: "synthesis-sidecar-launch-config.v2",
      profileId: PROFILE_ID,
      profileRuntimeRoot,
      runtimeRootId: RUNTIME_ROOT_ID,
      dataRootId: DATA_ROOT_ID,
      bundleId: BUNDLE_ID,
      implementation: "rust-native",
      target,
      targetTriple: targetIdentity.targetTriple,
      buildFingerprint: BUILD_FINGERPRINT,
      platformSignature: targetIdentity.platformSignature,
      serviceVersion: "0.1.0",
      protocolVersion: "synthesis-sidecar.v1",
      schemaVersion: "synthesis-repository-foundation.v1",
      supervisorInstanceId: "r8-smoke-supervisor",
      leaseNonce: "r8-smoke-lease",
      clientToken: CLIENT_TOKEN,
      lifecycleToken: LIFECYCLE_TOKEN,
      mutationEnabled: false,
      port: 0,
    })}\n`,
  );
  await fs.writeFile(
    path.join(root, "lease.json"),
    `${JSON.stringify({
      schema: "synthesis-sidecar-lease.v1",
      profileId: PROFILE_ID,
      supervisorInstanceId: "r8-smoke-supervisor",
      leaseNonce: "r8-smoke-lease",
      updatedAtMs: Date.now(),
    })}\n`,
  );
  const child = spawn(binary, ["serve", "--config", configPath], {
    stdio: ["pipe", "pipe", "pipe"],
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
    const health = (await (
      await fetch(`${endpoint}/synthesis/v1/health`)
    ).json()) as Record<string, any>;
    if (
      health.implementation !== "rust-native" ||
      health.target !== target ||
      health.targetTriple !== targetIdentity.targetTriple ||
      health.buildFingerprint !== BUILD_FINGERPRINT ||
      !signatureMatches(
        health.platformSignature,
        targetIdentity.platformSignature,
      ) ||
      health.repository?.mode !== "isolated_shadow" ||
      health.repository?.schemaVersion !==
        "synthesis-repository-foundation.v1" ||
      health.canonicalStore?.schemaVersion !==
        "synthesis-topic-canonical-store.v1"
    ) {
      throw new Error(`Invalid durable health: ${JSON.stringify(health)}`);
    }

    const unauthorized = await fetch(`${endpoint}/synthesis/v1/call`, {
      method: "POST",
      headers: { authorization: "Bearer wrong-token" },
      body: "{}",
    });
    if (unauthorized.status !== 401) {
      throw new Error(`Expected unauthorized, received ${unauthorized.status}`);
    }
    const malformed = await fetch(`${endpoint}/synthesis/v1/call`, {
      method: "POST",
      headers: { authorization: `Bearer ${CLIENT_TOKEN}` },
      body: "{",
    });
    if (malformed.status !== 400) {
      throw new Error(`Expected malformed 400, received ${malformed.status}`);
    }
    const wrongProfile = await fetch(`${endpoint}/synthesis/v1/call`, {
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

    const handshake = await call(endpoint, "system.handshake", {
      schemaVersion: "synthesis-repository-foundation.v1",
      bundleId: BUNDLE_ID,
      buildFingerprint: BUILD_FINGERPRINT,
      supervisorInstanceId: "r8-smoke-supervisor",
    });
    const handshakeData = handshake.body.data as Record<string, any>;
    if (
      handshake.response.status !== 200 ||
      handshakeData.mutationEnabled !== false ||
      handshakeData.implementation !== "rust-native" ||
      handshakeData.target !== target ||
      handshakeData.targetTriple !== targetIdentity.targetTriple ||
      handshakeData.buildFingerprint !== BUILD_FINGERPRINT ||
      !signatureMatches(
        handshakeData.platformSignature,
        targetIdentity.platformSignature,
      ) ||
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

    for (const [capability, fixture] of [
      ["compute.citation_graph_layout", layoutFixture()],
      ["compute.citation_graph_build", graphBuildFixture()],
    ] as const) {
      const result = await call(endpoint, capability, fixture);
      if (result.response.status !== 200 || result.body.ok !== true) {
        throw new Error(
          `Native compute failed for ${capability}: ${JSON.stringify(result.body)}`,
        );
      }
    }
    const buildFixture = graphBuildFixture();
    const inputPages = [
      buildSynthesisCitationGraphBuildTransferPage(
        "library_nodes",
        0,
        buildFixture.libraryNodes,
      ),
      buildSynthesisCitationGraphBuildTransferPage(
        "references",
        0,
        buildFixture.references,
      ),
    ];
    const inputManifest = buildSynthesisCitationGraphBuildTransferManifest({
      direction: "input",
      header: {
        contractVersion: buildFixture.contractVersion,
        scope: buildFixture.scope,
        rolePriority: buildFixture.rolePriority,
      },
      pages: inputPages.map((page) => page.descriptor),
    });
    const begun = await call(
      endpoint,
      "compute.citation_graph_build_transfer",
      {
        action: "begin",
        idempotencyKey: "native-smoke-transfer",
        manifest: inputManifest,
      },
    );
    const sessionId = String(
      (begun.body.data as Record<string, unknown>)?.sessionId || "",
    );
    if (!sessionId) throw new Error("Native transfer did not begin");
    for (const page of inputPages.reverse()) {
      const staged = await call(
        endpoint,
        "compute.citation_graph_build_transfer",
        { action: "put_input_page", sessionId, page },
      );
      if (staged.response.status !== 200) {
        throw new Error(
          `Native transfer page failed: ${staged.response.status}`,
        );
      }
    }
    for (const action of ["seal_input", "execute"] as const) {
      const result = await call(
        endpoint,
        "compute.citation_graph_build_transfer",
        { action, sessionId },
      );
      if (result.response.status !== 200) {
        throw new Error(`Native transfer ${action} failed`);
      }
    }
    await withDeadline(
      (async () => {
        for (;;) {
          const snapshot = await call(
            endpoint,
            "compute.citation_graph_build_transfer",
            { action: "status", sessionId },
          );
          const data = snapshot.body.data as Record<string, any>;
          if (data?.state === "completed") return;
          if (data?.execution?.lastFailure) {
            throw new Error(
              `Native transfer worker failed: ${JSON.stringify(data.execution.lastFailure)}`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      })(),
      30_000,
      "native_transfer_complete",
    );
    const outputManifest = await call(
      endpoint,
      "compute.citation_graph_build_transfer",
      { action: "get_output_manifest", sessionId },
    );
    try {
      rebuildSynthesisCitationGraphBuildTransferManifest(
        outputManifest.body.data,
      );
    } catch (error) {
      throw new Error(
        `Native transfer manifest invalid: ${JSON.stringify(outputManifest.body.data)}`,
        { cause: error },
      );
    }
    const outputPage = await call(
      endpoint,
      "compute.citation_graph_build_transfer",
      { action: "get_output_page", sessionId, kind: "nodes", pageIndex: 0 },
    );
    rebuildSynthesisCitationGraphBuildTransferPage(outputPage.body.data);

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
            await fetch(`${endpoint}/synthesis/v1/health`)
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

    const shutdown = await call(
      endpoint,
      "system.shutdown",
      {},
      "r8:shutdown",
      LIFECYCLE_TOKEN,
    );
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
    await fs.writeFile(
      path.join(root, "lease.json"),
      `${JSON.stringify({
        schema: "synthesis-sidecar-lease.v1",
        profileId: PROFILE_ID,
        supervisorInstanceId: "r8-smoke-supervisor",
        leaseNonce: "r8-smoke-lease",
        updatedAtMs: Date.now(),
      })}\n`,
    );
    const reopened = spawn(binary, ["serve", "--config", configPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const reopenedLines = createInterface({ input: reopened.stdout });
    let reopenedStderr = "";
    reopened.stderr.setEncoding("utf8");
    reopened.stderr.on("data", (chunk) => {
      reopenedStderr = `${reopenedStderr}${String(chunk)}`.slice(-8_192);
    });
    try {
      const reopenedListening = await withDeadline(
        new Promise<{ port: number }>((resolve, reject) => {
          reopenedLines.once("line", (line) => {
            try {
              resolve(JSON.parse(line) as { port: number });
            } catch (error) {
              reject(error);
            }
          });
          reopened.once("error", reject);
          reopened.once("exit", (code) =>
            reject(
              new Error(
                `candidate failed to reopen (${code}): ${reopenedStderr}`,
              ),
            ),
          );
        }),
        5_000,
        "reopen_listen",
      );
      const reopenedEndpoint = `http://127.0.0.1:${reopenedListening.port}`;
      const reopenedHealth = (await (
        await fetch(`${reopenedEndpoint}/synthesis/v1/health`)
      ).json()) as Record<string, any>;
      if (
        reopenedHealth.repository?.state !== "ready" ||
        reopenedHealth.canonicalStore?.state !== "ready" ||
        reopenedHealth.citationGraphTransfer?.sessions !== 0 ||
        reopenedHealth.target !== target
      ) {
        throw new Error(
          `Invalid reopened health: ${JSON.stringify(reopenedHealth)}`,
        );
      }
      const staleSession = await call(
        reopenedEndpoint,
        "compute.citation_graph_build_transfer",
        { action: "status", sessionId },
        "r8:stale-transfer",
      );
      if (
        staleSession.response.status !== 404 ||
        (staleSession.body.error as Record<string, unknown>)?.code !==
          "transfer_not_found"
      ) {
        throw new Error(
          `Native transfer session survived restart: ${JSON.stringify(staleSession.body)}`,
        );
      }
      const reopenedShutdown = await call(
        reopenedEndpoint,
        "system.shutdown",
        {},
        "r8:reopen-shutdown",
        LIFECYCLE_TOKEN,
      );
      if (reopenedShutdown.response.status !== 200) {
        throw new Error("Reopened candidate did not accept shutdown");
      }
      await withDeadline(
        new Promise<void>((resolve, reject) => {
          reopened.once("exit", (code) => {
            if (code === 0) resolve();
            else {
              reject(
                new Error(
                  `reopened candidate exited with ${code}: ${reopenedStderr}`,
                ),
              );
            }
          });
        }),
        5_000,
        "reopen_shutdown",
      );
    } finally {
      reopenedLines.close();
      if (reopened.exitCode === null) reopened.kill();
    }
    process.stdout.write(
      `${JSON.stringify({
        schema: "synthesis-rust-durable-candidate-smoke.v1",
        canaries: 2,
        computeOperations: 4,
        mutationEnabled: false,
        shutdownClosed: true,
        reopenVerified: true,
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

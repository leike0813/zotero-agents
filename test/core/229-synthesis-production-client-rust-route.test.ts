import { assert } from "chai";
import {
  execFileSync,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_PROTOCOL,
} from "../../packages/synthesis-contracts/src/sidecarSystem";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EXECUTABLE = path.join(
  ROOT,
  "native/synthesis-sidecar/target/debug",
  `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
);
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN =
  "lifecycle-token-0123456789abcdef0123456789abcdef";

function config(profileRuntimeRoot: string, supervisorInstanceId: string) {
  return {
    schema: "synthesis-sidecar-launch-config.v2",
    profileId: "1".repeat(64),
    profileRuntimeRoot,
    runtimeRootId: "2".repeat(64),
    dataRootId: "3".repeat(64),
    bundleId: "4".repeat(64),
    implementation: "rust-native",
    target: "linux-x64",
    targetTriple: "x86_64-unknown-linux-gnu",
    buildFingerprint: "5".repeat(64),
    platformSignature: {
      scheme: "not-applicable",
      status: "not-applicable",
      signer: null,
    },
    serviceVersion: "0.1.0",
    protocolVersion: SYNTHESIS_SIDECAR_PROTOCOL,
    schemaVersion: "synthesis-repository-foundation.v1",
    supervisorInstanceId,
    leaseNonce: `${supervisorInstanceId}-lease`,
    clientToken: CLIENT_TOKEN,
    lifecycleToken: LIFECYCLE_TOKEN,
    mutationEnabled: false,
    port: 0,
  };
}

function writeLaunchFiles(
  sessionRoot: string,
  runtimeConfig: ReturnType<typeof config>,
) {
  fs.mkdirSync(sessionRoot, { recursive: true });
  const configPath = path.join(sessionRoot, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(runtimeConfig));
  fs.writeFileSync(
    path.join(sessionRoot, "lease.json"),
    JSON.stringify({
      schema: "synthesis-sidecar-lease.v1",
      profileId: runtimeConfig.profileId,
      supervisorInstanceId: runtimeConfig.supervisorInstanceId,
      leaseNonce: runtimeConfig.leaseNonce,
      updatedAtMs: Date.now(),
    }),
  );
  return configPath;
}

function start(
  args: string[],
): {
  child: ChildProcessWithoutNullStreams;
  listening: Promise<{ port: number }>;
} {
  const child = spawn(EXECUTABLE, args, {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const lines = createInterface({ input: child.stdout });
  const listening = new Promise<{ port: number }>((resolve, reject) => {
    lines.once("line", (line) => {
      try {
        resolve(JSON.parse(line) as { port: number });
      } catch (error) {
        reject(error);
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== 0) {
        reject(
          new Error(`sidecar exited with ${code}: ${stderr.trim()}`),
        );
      }
    });
  });
  return { child, listening };
}

async function stop(child: ChildProcessWithoutNullStreams, port: number) {
  const exited = new Promise<void>((resolve) =>
    child.once("exit", () => resolve()),
  );
  await fetch(`http://127.0.0.1:${port}/synthesis/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${LIFECYCLE_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      protocol: SYNTHESIS_SIDECAR_PROTOCOL,
      requestId: "test:shutdown",
      profileId: "1".repeat(64),
      capability: "system.shutdown",
      payload: {},
    }),
  }).catch(() => undefined);
  child.stdin.end();
  await exited;
}

async function call(
  port: number,
  capability: string,
  payload: Record<string, unknown>,
) {
  const response = await fetch(
    `http://127.0.0.1:${port}/synthesis/v1/call`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${CLIENT_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        protocol: SYNTHESIS_SIDECAR_PROTOCOL,
        requestId: `test:${capability}`,
        profileId: "1".repeat(64),
        capability,
        payload,
      }),
    },
  );
  return {
    status: response.status,
    body: (await response.json()) as Record<string, any>,
  };
}

describe("Synthesis Rust production client route", function () {
  this.timeout(30_000);

  it("reads the production database through client.listTopics and fails closed for remaining inventory", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-production-client-route-"),
    );
    const profileRuntimeRoot = path.join(root, "profile-runtime");
    const shadowSession = path.join(root, "shadow-session");
    const shadowConfig = config(profileRuntimeRoot, "shadow-supervisor");
    const shadowConfigPath = writeLaunchFiles(
      shadowSession,
      shadowConfig,
    );
    const shadow = start(["serve", "--config", shadowConfigPath]);
    const shadowReady = await shadow.listening;
    await stop(shadow.child, shadowReady.port);

    const repositoryDbPath = path.join(root, "state/synthesis.db");
    const canonicalRoot = path.join(root, "data/synthesis");
    fs.mkdirSync(path.dirname(repositoryDbPath), { recursive: true });
    fs.mkdirSync(path.dirname(canonicalRoot), { recursive: true });
    fs.copyFileSync(
      path.join(
        profileRuntimeRoot,
        "shadow-repository",
        shadowConfig.dataRootId,
        "synthesis.db",
      ),
      repositoryDbPath,
    );
    fs.cpSync(
      path.join(
        profileRuntimeRoot,
        "shadow-canonical",
        shadowConfig.dataRootId,
      ),
      canonicalRoot,
      { recursive: true },
    );
    fs.rmSync(path.join(canonicalRoot, "identity.json"));

    const productionSession = path.join(root, "production-session");
    const productionConfig = config(
      profileRuntimeRoot,
      "production-supervisor",
    );
    const productionConfigPath = writeLaunchFiles(
      productionSession,
      productionConfig,
    );
    const receiptPath = path.join(
      root,
      "state/synthesis-cutover/receipt.json",
    );
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    const receipt = {
      schema: "synthesis-production-cutover-receipt.v1",
      receiptId: "receipt-1",
      profileId: productionConfig.profileId,
      phase: "backup_verified",
      sourceOwner: "legacy-plugin",
      targetOwner: "rust-native",
      backupId: "6".repeat(64),
      sourceSchemaVersion: productionConfig.schemaVersion,
      targetSchemaVersion: productionConfig.schemaVersion,
      canonicalManifestSha256: "7".repeat(64),
      durableSummarySha256: "8".repeat(64),
      bundleFingerprint: productionConfig.buildFingerprint,
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      serviceInstanceId: null,
      mutationEnabled: false,
      updatedAtMs: Date.now(),
    };
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    const admissionPath = path.join(
      productionSession,
      "production-admission.json",
    );
    const productionAdmission = {
      schema: "synthesis-production-admission.v1",
      purpose: "preflight_copy",
      profileId: productionConfig.profileId,
      supervisorInstanceId: productionConfig.supervisorInstanceId,
      cutoverReceiptId: "receipt-1",
      cutoverReceiptPath: receiptPath,
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      repositoryDbPath,
      canonicalRoot,
      reverseHost: {
        host: "127.0.0.1",
        port: 9134,
        authorizationToken: "9".repeat(64),
      },
      mutationEnabled: false,
    };
    fs.writeFileSync(admissionPath, JSON.stringify(productionAdmission));
    const preflight = JSON.parse(
      execFileSync(
        EXECUTABLE,
        [
          "preflight-production",
          "--config",
          productionConfigPath,
          "--admission",
          admissionPath,
        ],
        { encoding: "utf8" },
      ),
    ) as Record<string, unknown>;
    assert.deepInclude(preflight, {
      type: "production-preflight",
      status: "ready",
      profileId: productionConfig.profileId,
      cutoverReceiptId: "receipt-1",
      mutationEnabled: false,
    });

    fs.writeFileSync(
      receiptPath,
      JSON.stringify({ ...receipt, phase: "preflight_verified" }),
    );
    fs.writeFileSync(
      admissionPath,
      JSON.stringify({ ...productionAdmission, purpose: "live_owner" }),
    );

    const production = start([
      "serve-production",
      "--config",
      productionConfigPath,
      "--admission",
      admissionPath,
    ]);
    let productionPort = 0;
    try {
      const { port } = await production.listening;
      productionPort = port;
      const topics = await call(port, "client.listTopics", {
        args: [{}],
      });
      assert.equal(topics.status, 200);
      assert.deepEqual(topics.body.data, {
        topics: [],
        cursor: "",
        next_cursor: "",
        has_more: false,
        returned: 0,
        total: 0,
        limit: 50,
        diagnostics: {
          count: 0,
          total_count: 0,
          source: "rust-topic-application",
        },
      });

      const pending = await call(
        port,
        "client.findTopicsByPaperRef",
        { args: [{}] },
      );
      assert.equal(pending.status, 503);
      assert.equal(pending.body.error.code, "service_not_ready");

      const unknown = await call(port, "client.notDeclared", {
        args: [],
      });
      assert.equal(unknown.status, 404);
      assert.equal(unknown.body.error.code, "capability_not_found");
    } finally {
      if (productionPort) {
        await stop(production.child, productionPort);
      } else {
        production.child.kill();
      }
    }
  });
});

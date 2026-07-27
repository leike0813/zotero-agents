import { assert } from "chai";
import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import {
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
  SYNTHESIS_SIDECAR_PROTOCOL,
  SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
} from "../../packages/synthesis-contracts/src/sidecarSystem";
import { createSynthesisProductionBackupService } from "../../src/modules/synthesisProductionBackup";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EXECUTABLE = path.join(
  ROOT,
  "native/synthesis-sidecar/target/debug",
  `synthesis-sidecar${process.platform === "win32" ? ".exe" : ""}`,
);
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN = "lifecycle-token-0123456789abcdef0123456789abcdef";
const execFileAsync = promisify(execFile);

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

function start(args: string[]): {
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
        reject(new Error(`sidecar exited with ${code}: ${stderr.trim()}`));
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
  token = CLIENT_TOKEN,
) {
  const response = await fetch(`http://127.0.0.1:${port}/synthesis/v1/call`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      protocol: SYNTHESIS_SIDECAR_PROTOCOL,
      requestId: `test:${capability}`,
      profileId: "1".repeat(64),
      capability,
      payload,
    }),
  });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, any>,
  };
}

describe("Synthesis Rust production client route", function () {
  this.timeout(30_000);

  it("rehearses verified backup, preflight, owner conflict, native reads, and failed preflight recovery", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-production-client-route-"),
    );
    const profileRuntimeRoot = path.join(root, "profile-runtime");
    const shadowSession = path.join(root, "shadow-session");
    const shadowConfig = config(profileRuntimeRoot, "shadow-supervisor");
    const shadowConfigPath = writeLaunchFiles(shadowSession, shadowConfig);
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
    const verifiedBackup = await createSynthesisProductionBackupService({
      persistenceRoot: root,
    }).createVerifiedBackup({
      sourceSchemaVersion: shadowConfig.schemaVersion,
      targetSchemaVersion: shadowConfig.schemaVersion,
    });

    const productionSession = path.join(root, "production-session");
    const productionConfig = config(
      profileRuntimeRoot,
      "production-supervisor",
    );
    const productionConfigPath = writeLaunchFiles(
      productionSession,
      productionConfig,
    );
    const receiptPath = path.join(root, "state/synthesis-cutover/receipt.json");
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    const receipt = {
      schema: "synthesis-production-cutover-receipt.v1",
      receiptId: "receipt-1",
      profileId: productionConfig.profileId,
      phase: "backup_verified",
      sourceOwner: "legacy-plugin",
      targetOwner: "rust-native",
      backupId: verifiedBackup.backupId,
      sourceSchemaVersion: productionConfig.schemaVersion,
      targetSchemaVersion: productionConfig.schemaVersion,
      canonicalManifestSha256: verifiedBackup.canonicalManifestSha256,
      durableSummarySha256: verifiedBackup.durableSummarySha256,
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
    const reverseHostCalls: Array<Record<string, unknown>> = [];
    const reverseHost = http.createServer((request, response) => {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        const call = JSON.parse(body) as { capability?: string };
        reverseHostCalls.push(call);
        const result = (() => {
          switch (call.capability) {
            case "library.items.list_page":
              return {
                items: [],
                cursor: "",
                nextCursor: "",
                hasMore: false,
                returned: 0,
                limit: 100,
              };
            case "library.items.get_by_ref":
              return { items: [], missingPaperRefs: ["1:AAAA1111"] };
            case "library.artifacts.scan_page":
              return {
                artifacts: [],
                cursor: "",
                nextCursor: "",
                hasMore: false,
                returned: 0,
                limit: 100,
              };
            case "delivery.export.publish_archive":
              return {
                status: "unavailable",
                capability: "paper_artifacts.export_filtered",
                diagnostics: ["host_export_delivery_failed"],
              };
            default:
              return { configured: false };
          }
        })();
        const responseBody = JSON.stringify({
          ok: true,
          result,
        });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(responseBody),
        });
        response.end(responseBody);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const reverseHostAddress = reverseHost.address();
    if (!reverseHostAddress || typeof reverseHostAddress === "string") {
      throw new Error("reverse host test listener unavailable");
    }
    const productionAdmission = {
      schema: "synthesis-production-admission.v1",
      purpose: "preflight_copy",
      profileId: productionConfig.profileId,
      supervisorInstanceId: productionConfig.supervisorInstanceId,
      cutoverReceiptId: "receipt-1",
      cutoverReceiptPath: receiptPath,
      capabilityFingerprint:
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
      repositoryDbPath: path.join(
        verifiedBackup.backupRoot,
        "state/synthesis.db",
      ),
      canonicalRoot: path.join(verifiedBackup.backupRoot, "data/synthesis"),
      reverseHost: {
        host: "127.0.0.1",
        port: reverseHostAddress.port,
        authorizationToken: "9".repeat(64),
      },
      mutationEnabled: false,
    };
    fs.writeFileSync(admissionPath, JSON.stringify(productionAdmission));
    const preflight = JSON.parse(
      (
        await execFileAsync(EXECUTABLE, [
          "preflight-production",
          "--config",
          productionConfigPath,
          "--admission",
          admissionPath,
        ])
      ).stdout,
    ) as Record<string, unknown>;
    assert.deepInclude(preflight, {
      type: "production-preflight",
      status: "ready",
      profileId: productionConfig.profileId,
      cutoverReceiptId: "receipt-1",
      mutationEnabled: false,
    });
    assert.equal(reverseHostCalls.length, 1);
    assert.equal(reverseHostCalls[0]?.capability, "webdav.describe");

    fs.writeFileSync(
      receiptPath,
      JSON.stringify({ ...receipt, phase: "preflight_verified" }),
    );
    fs.writeFileSync(
      admissionPath,
      JSON.stringify({
        ...productionAdmission,
        purpose: "live_owner",
        repositoryDbPath,
        canonicalRoot,
      }),
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
      const contestedConfigPath = writeLaunchFiles(
        path.join(root, "contested-session"),
        {
          ...productionConfig,
          profileRuntimeRoot: path.join(root, "contested-profile-runtime"),
        },
      );
      const contestedOwner = start([
        "serve-production",
        "--config",
        contestedConfigPath,
        "--admission",
        admissionPath,
      ]);
      let ownerConflict: unknown;
      try {
        await contestedOwner.listening;
      } catch (error) {
        ownerConflict = error;
      }
      assert.match(String(ownerConflict), /production_owner_conflict/);

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

      const topicDetail = await call(port, "client.readTopicDetail", {
        args: [{ topicId: "missing-topic" }],
      });
      assert.equal(topicDetail.status, 200);
      assert.deepEqual(topicDetail.body.data, {
        status: "absent",
        topicId: "missing-topic",
        diagnostics: [],
      });

      const workbenchChrome = await call(
        port,
        "client.getSynthesisWorkbenchChromeInput",
        { args: [{}] },
      );
      assert.equal(workbenchChrome.status, 200);
      assert.hasAllKeys(workbenchChrome.body.data, ["maintenance"]);

      const backgroundJobs = await call(
        port,
        "client.getSynthesisBackgroundJobRows",
        { args: [] },
      );
      assert.equal(backgroundJobs.status, 200);
      assert.deepEqual(backgroundJobs.body.data, []);

      const schemas = await call(port, "client.getSchemas", {
        args: [{}],
      });
      assert.equal(schemas.status, 200);
      assert.equal(
        schemas.body.data.schema,
        "synthesis-artifact-library-debug-schemas.v1",
      );

      const libraryIndex = await call(port, "client.getLibraryIndex", {
        args: [{}],
      });
      assert.equal(libraryIndex.status, 200);
      assert.deepInclude(libraryIndex.body.data, {
        papers: [],
        total_papers: 0,
      });

      const artifactRead = await call(port, "client.readPaperArtifacts", {
        args: [{}],
      });
      assert.equal(artifactRead.status, 200);
      assert.deepEqual(artifactRead.body.data.artifacts, []);

      const artifactManifest = await call(
        port,
        "client.getPaperArtifactManifest",
        { args: [{}] },
      );
      assert.equal(artifactManifest.status, 200);
      assert.deepInclude(artifactManifest.body.data, {
        artifacts: [],
        total: 0,
      });

      const snapshot = await call(port, "client.debugSynthesisSnapshot", {
        args: [{}],
      });
      assert.equal(snapshot.status, 200);
      assert.equal(snapshot.body.data.status, "ready");

      const cache = await call(port, "client.debugSynthesisCacheList", {
        args: [{}],
      });
      assert.equal(cache.status, 200);
      assert.isArray(cache.body.data.rows);

      const operations = await call(
        port,
        "client.debugSynthesisOperationsList",
        { args: [{}] },
      );
      assert.equal(operations.status, 200);
      assert.isArray(operations.body.data.rows);

      const profiler = await call(port, "client.debugSynthesisProfilerList", {
        args: [{}],
      });
      assert.equal(profiler.status, 200);
      assert.equal(profiler.body.data.databasePath, "[redacted-path]");

      const inspectedPaper = await call(
        port,
        "client.debugSynthesisPaperInspect",
        { args: [{ paperRef: "1:AAAA1111" }] },
      );
      assert.equal(inspectedPaper.status, 200);
      assert.equal(inspectedPaper.body.data.paperRef, "1:AAAA1111");

      const inspectedTopic = await call(
        port,
        "client.debugSynthesisTopicInspect",
        { args: [{ topicId: "missing-topic" }] },
      );
      assert.equal(inspectedTopic.status, 200);
      assert.equal(inspectedTopic.body.data.status, "absent");

      const diff = await call(port, "client.debugSynthesisDiff", {
        args: [{}],
      });
      assert.equal(diff.status, 200);
      assert.deepEqual(diff.body.data.issues, []);

      const malformedDetail = await call(port, "client.readTopicDetail", {
        args: [{ topicId: "missing-topic" }, {}],
      });
      assert.equal(malformedDetail.status, 400);
      assert.equal(malformedDetail.body.error.code, "invalid_request");

      const pending = await call(port, "client.findTopicsByPaperRef", {
        args: [{}],
      });
      assert.equal(pending.status, 200);
      assert.deepEqual(pending.body.data.topics, []);

      const mutationBeforeAdmission = await call(
        port,
        "client.clearTagAuditRecord",
        { args: [{ libraryId: 1, itemKey: "AAAA1111" }] },
      );
      assert.equal(mutationBeforeAdmission.status, 409);
      assert.equal(
        mutationBeforeAdmission.body.error.code,
        "mutation_not_admitted",
      );

      const deliveryCallsBefore = reverseHostCalls.filter(
        (entry) => entry.capability === "delivery.export.publish_archive",
      ).length;
      const exportBeforeAdmission = await call(
        port,
        "client.exportFilteredPaperArtifacts",
        { args: [{ paperRefs: ["1:AAAA1111"] }] },
      );
      assert.equal(exportBeforeAdmission.status, 409);
      assert.equal(
        exportBeforeAdmission.body.error.code,
        "mutation_not_admitted",
      );
      assert.equal(
        reverseHostCalls.filter(
          (entry) => entry.capability === "delivery.export.publish_archive",
        ).length,
        deliveryCallsBefore,
      );

      const activation = await call(
        port,
        "system.production.activate",
        {
          receiptId: "receipt-1",
          serviceInstanceId: topics.body.serviceInstanceId,
          capabilityFingerprint:
            SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
          readyClientCapabilities:
            SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
          smokeEvidenceDigest: "a".repeat(64),
        },
        LIFECYCLE_TOKEN,
      );
      assert.equal(activation.status, 503);
      assert.equal(activation.body.error.code, "production_surface_incomplete");

      const mutationAfterAdmission = await call(
        port,
        "client.clearTagAuditRecord",
        { args: [{ libraryId: 1, itemKey: "AAAA1111" }] },
      );
      assert.equal(mutationAfterAdmission.status, 409);
      assert.equal(
        mutationAfterAdmission.body.error.code,
        "mutation_not_admitted",
      );

      const unknown = await call(port, "client.notDeclared", {
        args: [],
      });
      assert.equal(unknown.status, 400);
      assert.equal(unknown.body.error.code, "invalid_request");
    } finally {
      if (productionPort) {
        await stop(production.child, productionPort);
      } else {
        production.child.kill();
      }
      await new Promise<void>((resolve, reject) =>
        reverseHost.close((error) => (error ? reject(error) : resolve())),
      );
    }

    fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    fs.writeFileSync(admissionPath, JSON.stringify(productionAdmission));
    let preflightFailure: unknown;
    try {
      await execFileAsync(EXECUTABLE, [
        "preflight-production",
        "--config",
        productionConfigPath,
        "--admission",
        admissionPath,
      ]);
    } catch (error) {
      preflightFailure = error;
    }
    assert.match(String(preflightFailure), /reverse_host_unavailable/);
    assert.isFalse(
      fs.existsSync(path.join(root, "state/synthesis.owner.json")),
      "failed preflight must not acquire the live owner",
    );
  });
});

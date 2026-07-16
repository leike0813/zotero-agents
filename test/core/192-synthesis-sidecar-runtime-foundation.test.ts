import { assert } from "chai";
import {
  execFileSync,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_SIDECAR_CALL_PATH,
  SYNTHESIS_SIDECAR_CAPABILITIES,
  SYNTHESIS_SIDECAR_HEALTH_PATH,
  SYNTHESIS_SIDECAR_PROTOCOL,
  rebuildSynthesisSidecarCallRequest,
} from "../../packages/synthesis-contracts/src/sidecarSystem";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BUILD_ENTRY = path.join(
  ROOT,
  ".scaffold/synthesis-service/apps/synthesis-service/src/entrypoint.js",
);
const CLIENT_TOKEN = "client-token-0123456789abcdef0123456789abcdef";
const LIFECYCLE_TOKEN = "lifecycle-token-0123456789abcdef0123456789abcdef";

type ServiceHandle = {
  baseUrl: string;
  configPath: string;
  profileId: string;
  runtimeRootId: string;
  dataRootId: string;
  child: ChildProcessWithoutNullStreams;
  stdout: () => string;
  stderr: () => string;
};

function config(overrides: Record<string, unknown> = {}) {
  return {
    profileId: "profile:test",
    runtimeRootId: "runtime-root:test",
    dataRootId: "data-root:test",
    serviceVersion: "0.1.0-test",
    schemaVersion: "synthesis-schema.test.v1",
    clientToken: CLIENT_TOKEN,
    lifecycleToken: LIFECYCLE_TOKEN,
    mutationEnabled: false,
    port: 0,
    ...overrides,
  };
}

async function startService(
  overrides: Record<string, unknown> = {},
): Promise<ServiceHandle> {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "zs-sidecar-foundation-"),
  );
  const configPath = path.join(tempRoot, "config.json");
  const runtimeConfig = config(overrides);
  fs.writeFileSync(configPath, `${JSON.stringify(runtimeConfig)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  const child = spawn(process.execPath, [BUILD_ENTRY, "--config", configPath], {
    cwd: ROOT,
    env: { ...process.env, PATH: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const listening = await new Promise<{ port: number }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(`service did not listen\nstdout=${stdout}\nstderr=${stderr}`),
      );
    }, 5000);
    const inspect = () => {
      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) {
          continue;
        }
        try {
          const event = JSON.parse(line) as {
            event?: string;
            port?: number;
          };
          if (event.event === "service_listening" && event.port) {
            clearTimeout(timeout);
            child.stdout.off("data", inspect);
            resolve({ port: event.port });
            return;
          }
        } catch {
          // Wait for the complete JSONL record.
        }
      }
    };
    child.stdout.on("data", inspect);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `service exited before listen (${code})\nstdout=${stdout}\nstderr=${stderr}`,
        ),
      );
    });
  });

  return {
    baseUrl: `http://127.0.0.1:${listening.port}`,
    configPath,
    profileId: String(runtimeConfig.profileId),
    runtimeRootId: String(runtimeConfig.runtimeRootId),
    dataRootId: String(runtimeConfig.dataRootId),
    child,
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

async function call(service: ServiceHandle, token: string, request: unknown) {
  const response = await fetch(
    `${service.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

function handshakeRequest(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    requestId: "request:handshake",
    profileId: "profile:test",
    capability: "system.handshake",
    payload: {
      schemaVersion: "synthesis-schema.test.v1",
    },
    ...overrides,
  };
}

async function stopService(service: ServiceHandle) {
  if (service.child.exitCode !== null) {
    return;
  }
  await call(
    service,
    LIFECYCLE_TOKEN,
    handshakeRequest({
      requestId: "request:shutdown",
      capability: "system.shutdown",
      payload: {},
    }),
  ).catch(() => undefined);
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      service.child.kill("SIGKILL");
      resolve();
    }, 3000);
    service.child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

describe("Synthesis sidecar runtime foundation", function () {
  this.timeout(15000);

  const services: ServiceHandle[] = [];

  before(function () {
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, "node_modules/typescript/bin/tsc"),
        "-p",
        path.join(ROOT, "apps/synthesis-service/tsconfig.build.json"),
      ],
      {
        cwd: ROOT,
        stdio: "pipe",
      },
    );
    assert.isTrue(fs.existsSync(BUILD_ENTRY));
  });

  afterEach(async function () {
    await Promise.all(services.splice(0).map(stopService));
  });

  it("exports a strict environment-neutral system contract", function () {
    assert.equal(SYNTHESIS_SIDECAR_PROTOCOL, "synthesis-sidecar.v1");
    assert.deepEqual(SYNTHESIS_SIDECAR_CAPABILITIES, [
      "system.handshake",
      "system.shutdown",
    ]);
    assert.equal(SYNTHESIS_SIDECAR_HEALTH_PATH, "/synthesis/v1/health");
    assert.equal(SYNTHESIS_SIDECAR_CALL_PATH, "/synthesis/v1/call");
    assert.deepEqual(
      rebuildSynthesisSidecarCallRequest({
        ...handshakeRequest(),
        ignored: true,
      }),
      handshakeRequest(),
    );
    assert.throws(() =>
      rebuildSynthesisSidecarCallRequest({
        ...handshakeRequest(),
        requestId: "",
      }),
    );
  });

  it("starts as a plain Node loopback service and separates health from readiness", async function () {
    const service = await startService();
    services.push(service);

    const healthResponse = await fetch(
      `${service.baseUrl}${SYNTHESIS_SIDECAR_HEALTH_PATH}`,
    );
    assert.equal(healthResponse.status, 200);
    const health = (await healthResponse.json()) as Record<string, unknown>;
    assert.equal(health.protocol, SYNTHESIS_SIDECAR_PROTOCOL);
    assert.equal(health.serviceVersion, "0.1.0-test");
    assert.equal(health.lifecycleState, "ready");
    assert.isString(health.serviceInstanceId);
    assert.notProperty(health, "profileId");
    assert.notProperty(health, "runtimeRootId");
    assert.notProperty(health, "dataRootId");
    assert.notProperty(health, "token");

    const missingAuth = await call(service, "", handshakeRequest());
    assert.equal(missingAuth.status, 401);
    assert.equal(
      (missingAuth.body.error as Record<string, unknown>).code,
      "unauthorized",
    );
    const lifecycleCannotHandshake = await call(
      service,
      LIFECYCLE_TOKEN,
      handshakeRequest(),
    );
    assert.equal(lifecycleCannotHandshake.status, 401);

    const handshake = await call(service, CLIENT_TOKEN, handshakeRequest());
    assert.equal(handshake.status, 200);
    assert.isTrue(handshake.body.ok);
    const data = handshake.body.data as Record<string, unknown>;
    assert.equal(data.profileId, "profile:test");
    assert.equal(data.schemaVersion, "synthesis-schema.test.v1");
    assert.equal(data.mutationEnabled, false);
    assert.deepEqual(data.capabilities, SYNTHESIS_SIDECAR_CAPABILITIES);
  });

  it("fails closed on identity mismatch, unknown calls, and bounded input", async function () {
    const service = await startService();
    services.push(service);

    const mismatchCases = [
      {
        request: handshakeRequest({ protocol: "synthesis-sidecar.v2" }),
        code: "protocol_mismatch",
      },
      {
        request: handshakeRequest({ profileId: "profile:other" }),
        code: "profile_mismatch",
      },
      {
        request: handshakeRequest({
          payload: { schemaVersion: "synthesis-schema.other" },
        }),
        code: "schema_mismatch",
      },
      {
        request: handshakeRequest({ capability: "system.unknown" }),
        code: "capability_not_found",
      },
    ];
    for (const entry of mismatchCases) {
      const result = await call(service, CLIENT_TOKEN, entry.request);
      assert.isAtLeast(result.status, 400);
      assert.equal(
        (result.body.error as Record<string, unknown>).code,
        entry.code,
      );
    }

    let nested: unknown = "leaf";
    for (let index = 0; index < 34; index += 1) {
      nested = { nested };
    }
    const tooDeep = await call(
      service,
      CLIENT_TOKEN,
      handshakeRequest({ payload: nested as Record<string, unknown> }),
    );
    assert.equal(
      (tooDeep.body.error as Record<string, unknown>).code,
      "request_json_too_deep",
    );

    const tooLong = await call(
      service,
      CLIENT_TOKEN,
      handshakeRequest({ requestId: "x".repeat(513) }),
    );
    assert.equal(
      (tooLong.body.error as Record<string, unknown>).code,
      "invalid_request",
    );

    const unknownField = await call(service, CLIENT_TOKEN, {
      ...handshakeRequest(),
      unexpected: true,
    });
    assert.equal(
      (unknownField.body.error as Record<string, unknown>).code,
      "invalid_request",
    );

    const tooLongString = await call(
      service,
      CLIENT_TOKEN,
      handshakeRequest({
        payload: { schemaVersion: "x".repeat(64 * 1024 + 1) },
      }),
    );
    assert.equal(
      (tooLongString.body.error as Record<string, unknown>).code,
      "request_string_too_long",
    );

    const malformedResponse = await fetch(
      `${service.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${CLIENT_TOKEN}`,
          "content-type": "application/json",
        },
        body: "{",
      },
    );
    assert.equal(malformedResponse.status, 400);
    const malformed = (await malformedResponse.json()) as {
      error: { code: string };
    };
    assert.equal(malformed.error.code, "malformed_json");

    const oversizedResponse = await fetch(
      `${service.baseUrl}${SYNTHESIS_SIDECAR_CALL_PATH}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${CLIENT_TOKEN}`,
          "content-type": "application/json",
        },
        body: "x".repeat(1024 * 1024 + 1),
      },
    );
    assert.equal(oversizedResponse.status, 413);
    const oversized = (await oversizedResponse.json()) as {
      error: { code: string };
    };
    assert.equal(oversized.error.code, "request_body_too_large");
  });

  it("keeps lifecycle authorization distinct and redacts diagnostics", async function () {
    const service = await startService();
    services.push(service);
    const suppliedBadToken = "bad-token-that-must-never-be-logged";

    const badAuth = await call(service, suppliedBadToken, handshakeRequest());
    assert.equal(badAuth.status, 401);

    const wrongShutdownToken = await call(
      service,
      CLIENT_TOKEN,
      handshakeRequest({
        requestId: "request:wrong-shutdown",
        capability: "system.shutdown",
        payload: {},
      }),
    );
    assert.equal(wrongShutdownToken.status, 403);
    assert.equal(
      (wrongShutdownToken.body.error as Record<string, unknown>).code,
      "lifecycle_forbidden",
    );
    assert.equal(
      (await fetch(`${service.baseUrl}${SYNTHESIS_SIDECAR_HEALTH_PATH}`))
        .status,
      200,
    );

    const shutdown = await call(
      service,
      LIFECYCLE_TOKEN,
      handshakeRequest({
        requestId: "request:shutdown",
        capability: "system.shutdown",
        payload: {},
      }),
    );
    assert.equal(shutdown.status, 200);
    assert.isTrue(shutdown.body.ok);
    await new Promise<void>((resolve) =>
      service.child.once("exit", () => resolve()),
    );

    const diagnosticText = [
      service.stdout(),
      service.stderr(),
      JSON.stringify(badAuth.body),
    ].join("\n");
    for (const secret of [
      CLIENT_TOKEN,
      LIFECYCLE_TOKEN,
      suppliedBadToken,
      service.configPath,
      service.profileId,
      service.runtimeRootId,
      service.dataRootId,
    ]) {
      assert.notInclude(diagnosticText, secret);
    }
  });

  it("rejects mutation-enabled config before listening", async function () {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-sidecar-invalid-config-"),
    );
    const configPath = path.join(tempRoot, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(config({ mutationEnabled: true })),
      "utf8",
    );
    const child = spawn(
      process.execPath,
      [BUILD_ENTRY, "--config", configPath],
      {
        cwd: ROOT,
        env: { ...process.env, PATH: "" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      output += chunk;
    });
    const exitCode = await new Promise<number | null>((resolve) =>
      child.once("exit", resolve),
    );
    assert.notEqual(exitCode, 0);
    assert.notInclude(output, configPath);
    assert.notInclude(output, CLIENT_TOKEN);
    assert.notInclude(output, LIFECYCLE_TOKEN);
    assert.notInclude(output, "service_listening");
  });
});

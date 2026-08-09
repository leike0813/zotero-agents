import { execFile, spawn, type ChildProcess } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";

import {
  loadHostBridgeCapabilityContracts,
  loadHostBridgeCommandContracts,
  type HostBridgeCommandContract,
} from "../../scripts/host-bridge-command-contracts";

const execFileAsync = promisify(execFile);
const TEST_TOKEN = "host-bridge-cli-harness-token";
const BUILD_LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_PROCESS_BUFFER = 32 * 1024 * 1024;

type JsonObject = Record<string, unknown>;

type CommandHandlerContext = {
  command: string;
  capability: string;
  input: JsonObject;
  requestIndex: number;
};

export type HostBridgeCliCommandHandler = (
  context: CommandHandlerContext,
) => JsonObject | Promise<JsonObject>;

export type HostBridgeCliRequest = CommandHandlerContext & {
  headers: IncomingMessage["headers"];
};

export type HostBridgeCliHarness = {
  cliPath: string;
  buildFingerprint: string;
  endpoint: string;
  env: NodeJS.ProcessEnv;
  requests: HostBridgeCliRequest[];
  runCli(
    args: string[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv },
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
    output: JsonObject;
  }>;
};

export type HostBridgeCliFixtureHarness = {
  cliPath: string;
  buildFingerprint: string;
  endpoint: string;
  env: NodeJS.ProcessEnv;
  readRequests(): Promise<HostBridgeCliRequest[]>;
  close(): Promise<void>;
};

type RegisteredCommand = {
  command: string;
  contract: HostBridgeCommandContract;
  handler: HostBridgeCliCommandHandler;
  validateInput: ValidateFunction;
  validateOutput: ValidateFunction;
};

let cliBuildPromise:
  | Promise<{ cliPath: string; buildFingerprint: string }>
  | undefined;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function acquireBuildLock(lockPath: string) {
  const startedAt = Date.now();
  while (true) {
    try {
      return await fs.open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const stat = await fs.stat(lockPath).catch(() => undefined);
      if (stat && Date.now() - stat.mtimeMs > BUILD_LOCK_TIMEOUT_MS) {
        await fs.unlink(lockPath).catch(() => undefined);
        continue;
      }
      if (Date.now() - startedAt > BUILD_LOCK_TIMEOUT_MS) {
        throw new Error(
          `Timed out waiting for Host Bridge CLI build lock: ${lockPath}`,
        );
      }
      await delay(100);
    }
  }
}

async function resolveCurrentHostBridgeCli(root = process.cwd()) {
  if (cliBuildPromise) return cliBuildPromise;
  cliBuildPromise = (async () => {
    const governance =
      (await import("../../scripts/host-bridge-cli-release-governance.mjs")) as {
        computeHostBridgeCliBuildFingerprint(options: {
          root: string;
        }): Promise<{ fingerprint: string }>;
      };
    const { fingerprint } =
      await governance.computeHostBridgeCliBuildFingerprint({ root });
    const cacheRoot = path.join(
      os.tmpdir(),
      "zotero-agents-host-bridge-cli-tests",
      fingerprint,
    );
    const targetDir = path.join(cacheRoot, "target");
    const cliPath = path.join(
      targetDir,
      "debug",
      process.platform === "win32" ? "zotero-bridge.exe" : "zotero-bridge",
    );
    const readyPath = path.join(cacheRoot, "ready.json");
    const lockPath = path.join(
      os.tmpdir(),
      `zotero-agents-host-bridge-cli-${fingerprint}.lock`,
    );
    if ((await pathExists(readyPath)) && (await pathExists(cliPath))) {
      return { cliPath, buildFingerprint: fingerprint };
    }

    await fs.mkdir(cacheRoot, { recursive: true });
    const lock = await acquireBuildLock(lockPath);
    try {
      if ((await pathExists(readyPath)) && (await pathExists(cliPath))) {
        return { cliPath, buildFingerprint: fingerprint };
      }
      try {
        await execFileAsync(
          "cargo",
          [
            "build",
            "--locked",
            "--manifest-path",
            path.join(root, "cli/zotero-bridge/Cargo.toml"),
            "--bin",
            "zotero-bridge",
            "--target-dir",
            targetDir,
          ],
          {
            cwd: root,
            env: {
              ...process.env,
              ZOTERO_BRIDGE_BUILD_FINGERPRINT: fingerprint,
            },
            maxBuffer: MAX_PROCESS_BUFFER,
          },
        );
      } catch (error) {
        const detail = error as Error & { stderr?: string };
        throw new Error(
          `Unable to build the current Host Bridge CLI. Install the Rust toolchain declared by host-bridge/cli-build-recipe.json and retry.\n${detail.stderr || detail.message}`,
        );
      }
      if (!(await pathExists(cliPath))) {
        throw new Error(
          `Host Bridge CLI build completed without producing ${cliPath}`,
        );
      }
      const temporaryReadyPath = `${readyPath}.${process.pid}.tmp`;
      await fs.writeFile(
        temporaryReadyPath,
        `${JSON.stringify({ fingerprint, cliPath })}\n`,
        "utf8",
      );
      await fs.rename(temporaryReadyPath, readyPath);
      return { cliPath, buildFingerprint: fingerprint };
    } finally {
      await lock.close();
      await fs.unlink(lockPath).catch(() => undefined);
    }
  })();
  return cliBuildPromise;
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(text || "{}") as JsonObject;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  const text = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
    connection: "close",
  });
  response.end(text);
}

function formatValidationErrors(validate: ValidateFunction) {
  return JSON.stringify(validate.errors || []);
}

function valueAtDataPath(data: JsonObject, declaredPath: string) {
  const fields = declaredPath.split(".");
  if (fields[0] === "data") fields.shift();
  let value: unknown = data;
  for (const field of fields) {
    if (!value || typeof value !== "object") return undefined;
    value = (value as JsonObject)[field];
  }
  return value;
}

function assertOutputBoundary(
  command: string,
  contract: HostBridgeCommandContract,
  data: JsonObject,
) {
  const boundary = contract.outputBoundary;
  if (
    boundary.section &&
    valueAtDataPath(data, boundary.section) === undefined
  ) {
    throw new Error(
      `${command} mock data is missing SSOT output section ${boundary.section}`,
    );
  }
  for (const continuation of boundary.continuation || []) {
    if (valueAtDataPath(data, continuation) === undefined) {
      throw new Error(
        `${command} mock data is missing SSOT continuation ${continuation}`,
      );
    }
  }
}

const FIXTURE_SERVER_SOURCE = String.raw`
const fs = require("node:fs");
const http = require("node:http");
const { execFileSync } = require("node:child_process");

const config = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const commands = new Map(
  Object.values(config.commands).map((entry) => [entry.capability, entry]),
);

function sendJson(response, statusCode, body) {
  const text = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
    connection: "close",
  });
  response.end(text);
}

function valueAtDataPath(data, declaredPath) {
  const fields = declaredPath.split(".");
  if (fields[0] === "data") fields.shift();
  let value = data;
  for (const field of fields) {
    if (!value || typeof value !== "object") return undefined;
    value = value[field];
  }
  return value;
}

function assertBoundary(entry, data) {
  const boundary = entry.outputBoundary || {};
  const requiredPaths = [
    ...(boundary.section ? [boundary.section] : []),
    ...(boundary.continuation || []),
  ];
  for (const requiredPath of requiredPaths) {
    if (valueAtDataPath(data, requiredPath) === undefined) {
      throw new Error(
        entry.command + " fixture data is missing SSOT field " + requiredPath,
      );
    }
  }
}

const server = http.createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  request.on("end", () => {
    try {
      if (
        request.method === "GET" &&
        request.url === "/bridge/v2/health"
      ) {
        sendJson(response, 200, {
          status: "ok",
          result: { status: "ok", protocol: "host-bridge.v2" },
        });
        return;
      }
      if (request.method !== "POST" || request.url !== "/bridge/v2/call") {
        sendJson(response, 404, {
          status: "error",
          error: { code: "not_found", message: "Unexpected harness endpoint" },
        });
        return;
      }
      if (request.headers.authorization !== "Bearer " + config.token) {
        sendJson(response, 401, {
          status: "error",
          error: { code: "unauthorized", message: "Unexpected bearer token" },
        });
        return;
      }
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const entry = commands.get(String(body.capability || ""));
      if (!entry) {
        throw new Error(
          "No fixture provider command registered for " + body.capability,
        );
      }
      const input =
        body.input && typeof body.input === "object" ? body.input : {};
      const context = {
        command: entry.command,
        capability: entry.capability,
        input,
        requestIndex: config.requestCount++,
      };
      fs.appendFileSync(
        config.requestLog,
        JSON.stringify({ ...context, headers: request.headers }) + "\n",
        "utf8",
      );
      const requestedLimit =
        input.limit === undefined ? undefined : Number(input.limit);
      const maxLimit = entry.outputBoundary?.maxLimit;
      if (
        maxLimit !== undefined &&
        requestedLimit !== undefined &&
        (!Number.isFinite(requestedLimit) || requestedLimit > maxLimit)
      ) {
        sendJson(response, 400, {
          status: "error",
          error: {
            code: "invalid_limit",
            category: "validation",
            message:
              entry.command + " limit must not exceed " + String(maxLimit),
          },
        });
        return;
      }
      const stdout = execFileSync(
        process.execPath,
        [config.providerPath, JSON.stringify(context)],
        {
          cwd: config.cwd,
          env: { ...process.env, ...config.providerEnv },
          encoding: "utf8",
          maxBuffer: ${MAX_PROCESS_BUFFER},
        },
      );
      const data = JSON.parse(stdout);
      assertBoundary(entry, data);
      sendJson(response, 200, {
        status: "ok",
        result: {
          capability: entry.capability,
          approval: entry.approval,
          data,
        },
      });
    } catch (error) {
      sendJson(response, 500, {
        status: "error",
        error: {
          code: "host_bridge_cli_fixture_error",
          category: "internal",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  process.stdout.write(
    JSON.stringify({
      endpoint: "http://127.0.0.1:" + address.port + "/bridge/v2",
    }) + "\n",
  );
});
`;

async function waitForFixtureServer(child: ChildProcess, stderr: () => string) {
  return new Promise<string>((resolve, reject) => {
    let stdout = "";
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out starting Host Bridge fixture server.\n${stderr()}`,
        ),
      );
    }, 30_000);
    const fail = (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    };
    child.once("error", fail);
    child.once("exit", (code) => {
      fail(
        new Error(
          `Host Bridge fixture server exited during startup (${code}).\n${stderr()}`,
        ),
      );
    });
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      try {
        resolve(
          String(
            (JSON.parse(stdout.slice(0, newline)) as { endpoint: string })
              .endpoint,
          ),
        );
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function startHostBridgeCliFixtureHarness(options: {
  commands: readonly string[];
  providerPath: string;
  cwd: string;
  providerEnv?: NodeJS.ProcessEnv;
  root?: string;
}): Promise<HostBridgeCliFixtureHarness> {
  const root = options.root || process.cwd();
  const { cliPath, buildFingerprint } = await resolveCurrentHostBridgeCli(root);
  const commandRegistry = loadHostBridgeCommandContracts(root);
  const capabilityRegistry = loadHostBridgeCapabilityContracts(root);
  const commands: Record<string, JsonObject> = {};
  const capabilities = new Set<string>();
  for (const command of options.commands) {
    const contract = commandRegistry.commands[command];
    if (!contract)
      throw new Error(`Unknown Host Bridge CLI command: ${command}`);
    if (contract.target.kind !== "capability") {
      throw new Error(
        `${command} is not a fixed-capability Host Bridge command`,
      );
    }
    const capability = contract.target.capability;
    if (capabilities.has(capability)) {
      throw new Error(
        `Fixture harness cannot distinguish multiple commands for ${capability}`,
      );
    }
    capabilities.add(capability);
    commands[command] = {
      command,
      capability,
      approval: capabilityRegistry.capabilities[capability].approval,
      outputBoundary: contract.outputBoundary,
    };
  }

  const tempRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "host-bridge-cli-fixture-"),
  );
  const configPath = path.join(tempRoot, "config.json");
  const requestLog = path.join(tempRoot, "requests.jsonl");
  await fs.writeFile(requestLog, "", "utf8");
  await fs.writeFile(
    configPath,
    JSON.stringify({
      commands,
      token: TEST_TOKEN,
      providerPath: path.resolve(options.providerPath),
      providerEnv: options.providerEnv || {},
      cwd: path.resolve(options.cwd),
      requestLog,
      requestCount: 0,
    }),
    "utf8",
  );
  let stderr = "";
  const child = spawn(
    process.execPath,
    ["-e", FIXTURE_SERVER_SOURCE, configPath],
    {
      cwd: root,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const endpoint = await waitForFixtureServer(child, () => stderr);
  let closed = false;
  return {
    cliPath,
    buildFingerprint,
    endpoint,
    env: {
      ...process.env,
      ZOTERO_BRIDGE_BIN: cliPath,
      ZOTERO_BRIDGE_ENDPOINT: endpoint,
      ZOTERO_BRIDGE_TOKEN: TEST_TOKEN,
    },
    async readRequests() {
      const content = await fs.readFile(requestLog, "utf8");
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as HostBridgeCliRequest);
    },
    async close() {
      if (closed) return;
      closed = true;
      child.kill();
      if (child.exitCode === null) {
        await new Promise<void>((resolve) => {
          child.once("exit", () => resolve());
        });
      }
      await fs.rm(tempRoot, { recursive: true, force: true });
    },
  };
}

export async function withHostBridgeCliHarness<T>(
  handlers: Record<string, HostBridgeCliCommandHandler>,
  invoke: (harness: HostBridgeCliHarness) => Promise<T>,
  root = process.cwd(),
) {
  const { cliPath, buildFingerprint } = await resolveCurrentHostBridgeCli(root);
  const commandRegistry = loadHostBridgeCommandContracts(root);
  const capabilityRegistry = loadHostBridgeCapabilityContracts(root);
  const ajv = new Ajv2020({ allErrors: true, strict: false, logger: false });
  const registeredByCapability = new Map<string, RegisteredCommand>();

  for (const [command, handler] of Object.entries(handlers)) {
    const contract = commandRegistry.commands[command];
    if (!contract)
      throw new Error(`Unknown Host Bridge CLI command: ${command}`);
    if (contract.target.kind !== "capability") {
      throw new Error(
        `${command} is not a fixed-capability Host Bridge command`,
      );
    }
    const capability = contract.target.capability;
    if (registeredByCapability.has(capability)) {
      throw new Error(
        `Harness cannot distinguish multiple commands for capability ${capability}`,
      );
    }
    const capabilityContract = capabilityRegistry.capabilities[capability];
    registeredByCapability.set(capability, {
      command,
      contract,
      handler,
      validateInput: ajv.compile(capabilityContract.inputSchema),
      validateOutput: ajv.compile(capabilityContract.outputSchema),
    });
  }

  const requests: HostBridgeCliRequest[] = [];
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "POST" || request.url !== "/bridge/v2/call") {
        sendJson(response, 404, {
          status: "error",
          error: { code: "not_found", message: "Unexpected harness endpoint" },
        });
        return;
      }
      if (request.headers.authorization !== `Bearer ${TEST_TOKEN}`) {
        sendJson(response, 401, {
          status: "error",
          error: { code: "unauthorized", message: "Unexpected bearer token" },
        });
        return;
      }
      const body = await readJsonBody(request);
      const capability = String(body.capability || "");
      const input =
        body.input && typeof body.input === "object"
          ? (body.input as JsonObject)
          : {};
      const registered = registeredByCapability.get(capability);
      if (!registered) {
        throw new Error(`No harness handler registered for ${capability}`);
      }
      if (!registered.validateInput(input)) {
        throw new Error(
          `${registered.command} received input outside the capability SSOT: ${formatValidationErrors(registered.validateInput)}`,
        );
      }
      const context = {
        command: registered.command,
        capability,
        input,
        requestIndex: requests.length,
      };
      requests.push({ ...context, headers: request.headers });
      const maxLimit = registered.contract.outputBoundary.maxLimit;
      const requestedLimit =
        input.limit === undefined ? undefined : Number(input.limit);
      if (
        maxLimit !== undefined &&
        requestedLimit !== undefined &&
        (!Number.isFinite(requestedLimit) || requestedLimit > maxLimit)
      ) {
        sendJson(response, 400, {
          status: "error",
          error: {
            code: "invalid_limit",
            category: "validation",
            message: `${registered.command} limit must not exceed ${maxLimit}`,
          },
        });
        return;
      }
      const data = await registered.handler(context);
      assertOutputBoundary(registered.command, registered.contract, data);
      if (!registered.validateOutput(data)) {
        throw new Error(
          `${registered.command} mock data violates the capability SSOT: ${formatValidationErrors(registered.validateOutput)}`,
        );
      }
      sendJson(response, 200, {
        status: "ok",
        result: {
          capability,
          approval: capabilityRegistry.capabilities[capability].approval,
          data,
        },
      });
    } catch (error) {
      sendJson(response, 500, {
        status: "error",
        error: {
          code: "host_bridge_cli_harness_error",
          category: "internal",
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Host Bridge CLI harness did not bind a TCP port");
  }
  const endpoint = `http://127.0.0.1:${address.port}/bridge/v2`;
  const env = {
    ...process.env,
    ZOTERO_BRIDGE_BIN: cliPath,
    ZOTERO_BRIDGE_ENDPOINT: endpoint,
    ZOTERO_BRIDGE_TOKEN: TEST_TOKEN,
  };
  const harness: HostBridgeCliHarness = {
    cliPath,
    buildFingerprint,
    endpoint,
    env,
    requests,
    async runCli(args, options = {}) {
      try {
        const result = await execFileAsync(cliPath, args, {
          cwd: options.cwd || root,
          env: { ...env, ...options.env },
          encoding: "utf8",
          maxBuffer: MAX_PROCESS_BUFFER,
        });
        const stdout = String(result.stdout || "");
        return {
          exitCode: 0,
          stdout,
          stderr: String(result.stderr || ""),
          output: JSON.parse(stdout) as JsonObject,
        };
      } catch (error) {
        const detail = error as Error & {
          code?: number;
          stdout?: string;
          stderr?: string;
        };
        const stdout = String(detail.stdout || "");
        return {
          exitCode: typeof detail.code === "number" ? detail.code : 1,
          stdout,
          stderr: String(detail.stderr || detail.message),
          output: stdout ? (JSON.parse(stdout) as JsonObject) : {},
        };
      }
    },
  };
  try {
    return await invoke(harness);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

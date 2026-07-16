import fs from "node:fs";
import path from "node:path";
import { SidecarRuntimeError } from "./errors.js";

export type SynthesisSidecarRuntimeConfig = {
  profileId: string;
  runtimeRootId: string;
  dataRootId: string;
  serviceVersion: string;
  schemaVersion: string;
  clientToken: string;
  lifecycleToken: string;
  mutationEnabled: false;
  port: number;
};

const CONFIG_KEYS = new Set([
  "profileId",
  "runtimeRootId",
  "dataRootId",
  "serviceVersion",
  "schemaVersion",
  "clientToken",
  "lifecycleToken",
  "mutationEnabled",
  "port",
]);

function configError(code: string): never {
  throw new SidecarRuntimeError({
    status: 500,
    code: "invalid_request",
    message: "The Synthesis sidecar runtime config is invalid.",
    details: { configCode: code },
  });
}

function strictString(
  value: unknown,
  code: string,
  options: { min?: number; max?: number } = {},
): string {
  const min = options.min ?? 1;
  const max = options.max ?? 512;
  if (typeof value !== "string" || value.length < min || value.length > max) {
    configError(code);
  }
  return value;
}

function rebuildConfig(value: unknown): SynthesisSidecarRuntimeConfig {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    configError("config_not_object");
  }
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!CONFIG_KEYS.has(key)) {
      configError("config_unknown_field");
    }
  }
  if (record.mutationEnabled !== false) {
    configError("mutation_must_be_disabled");
  }
  const port = record.port;
  if (
    typeof port !== "number" ||
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535
  ) {
    configError("port_invalid");
  }
  const clientToken = strictString(record.clientToken, "client_token_invalid", {
    min: 32,
  });
  const lifecycleToken = strictString(
    record.lifecycleToken,
    "lifecycle_token_invalid",
    { min: 32 },
  );
  if (clientToken === lifecycleToken) {
    configError("tokens_must_be_distinct");
  }
  return {
    profileId: strictString(record.profileId, "profile_id_invalid"),
    runtimeRootId: strictString(
      record.runtimeRootId,
      "runtime_root_id_invalid",
    ),
    dataRootId: strictString(record.dataRootId, "data_root_id_invalid"),
    serviceVersion: strictString(
      record.serviceVersion,
      "service_version_invalid",
      { max: 128 },
    ),
    schemaVersion: strictString(
      record.schemaVersion,
      "schema_version_invalid",
      { max: 128 },
    ),
    clientToken,
    lifecycleToken,
    mutationEnabled: false,
    port,
  };
}

export function parseConfigPath(argv: string[]): string {
  if (argv.length !== 2 || argv[0] !== "--config") {
    configError("config_argument_required");
  }
  const configPath = argv[1] ?? "";
  if (!path.isAbsolute(configPath)) {
    configError("config_path_must_be_absolute");
  }
  return configPath;
}

export function loadRuntimeConfig(
  configPath: string,
): SynthesisSidecarRuntimeConfig {
  let source = "";
  try {
    const stat = fs.statSync(configPath);
    if (!stat.isFile() || stat.size > 64 * 1024) {
      configError("config_file_invalid");
    }
    source = fs.readFileSync(configPath, "utf8");
  } catch (error) {
    if (error instanceof SidecarRuntimeError) {
      throw error;
    }
    configError("config_file_unreadable");
  }
  try {
    return rebuildConfig(JSON.parse(source));
  } catch (error) {
    if (error instanceof SidecarRuntimeError) {
      throw error;
    }
    configError("config_json_invalid");
  }
}

import fs from "node:fs";
import path from "node:path";
import {
  rebuildSynthesisSidecarLaunchConfig,
  type SynthesisSidecarLaunchConfig,
} from "../../../packages/synthesis-contracts/src/sidecarLifecycle.js";
import { SidecarRuntimeError } from "./errors.js";

export type SynthesisSidecarRuntimeConfig = SynthesisSidecarLaunchConfig;

function configError(code: string): never {
  throw new SidecarRuntimeError({
    status: 500,
    code: "invalid_request",
    message: "The Synthesis sidecar runtime config is invalid.",
    details: { configCode: code },
  });
}

function expectedConfigPath(config: SynthesisSidecarRuntimeConfig) {
  return path.join(
    config.profileRuntimeRoot,
    "sessions",
    config.supervisorInstanceId,
    "config.json",
  );
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
    const config = rebuildSynthesisSidecarLaunchConfig(JSON.parse(source));
    if (!path.isAbsolute(config.profileRuntimeRoot)) {
      configError("profile_runtime_root_must_be_absolute");
    }
    if (path.resolve(configPath) !== path.resolve(expectedConfigPath(config))) {
      configError("config_path_scope_mismatch");
    }
    return config;
  } catch (error) {
    if (error instanceof SidecarRuntimeError) {
      throw error;
    }
    configError("config_json_invalid");
  }
}

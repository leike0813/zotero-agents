import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACP_BRIDGE_BINARY,
  ACP_BRIDGE_OUTPUT,
  acpBridgeFailure,
  readVerifiedAcpBridgeBuild,
} from "./acp-ws-bridge-build.mjs";

export async function checkAcpWsBridgeFreshness({ root = process.cwd() } = {}) {
  try {
    const directory = path.resolve(root, ACP_BRIDGE_OUTPUT);
    const { record } = await readVerifiedAcpBridgeBuild(root, directory);
    const sidecarPath = path.join(directory, `${ACP_BRIDGE_BINARY}.sha256`);
    let sidecar;
    try {
      sidecar = await readFile(sidecarPath, "utf8");
    } catch (error) {
      throw acpBridgeFailure(
        "native_sidecar_unreadable",
        "ACP bridge checksum is unavailable.",
        { sidecarPath, cause: error.message },
      );
    }
    const match = sidecar.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
    if (!match || match[2] !== ACP_BRIDGE_BINARY) {
      throw acpBridgeFailure(
        "native_sidecar_invalid",
        "Invalid ACP bridge checksum sidecar.",
        { sidecarPath },
      );
    }
    if (match[1].toLowerCase() !== record.binary.sha256) {
      throw acpBridgeFailure(
        "native_checksum_mismatch",
        "ACP bridge checksum does not match its build record.",
      );
    }
    return { ok: true, ...record };
  } catch (error) {
    return {
      ok: false,
      code: error.details ? error.code : "acp_bridge_freshness_check_failed",
      message: error.message,
      details: error.details || {},
    };
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await checkAcpWsBridgeFreshness();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

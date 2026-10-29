import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACP_BRIDGE_TARGET,
  ACP_BRIDGE_PLATFORM,
  ACP_BRIDGE_BINARY,
  ACP_BRIDGE_RECORD,
  ACP_BRIDGE_LOCAL_OUTPUT,
  acpBridgeFailure,
  acpBridgeSha256,
  computeAcpBridgeBuildFingerprint,
  resolveAcpBridgeTarget,
} from "./acp-ws-bridge-build.mjs";
import { packageAcpWsBridge } from "./package-acp-ws-bridge.mjs";

export async function buildAcpWsBridge({
  root = process.cwd(),
  platform = process.platform,
  runCommand = (command, args, options) => spawnSync(command, args, options),
} = {}) {
  if (platform !== "win32") {
    throw acpBridgeFailure(
      "windows_build_required",
      "ACP bridge prebuilds must be built on Windows.",
    );
  }
  const before = await computeAcpBridgeBuildFingerprint(root);
  const head = await runCommand("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  if (head.error) throw head.error;
  const sourceHead = String(head.stdout || "").trim();
  if (head.status !== 0 || !/^[a-f0-9]{40}$/.test(sourceHead)) {
    throw acpBridgeFailure(
      "source_head_unavailable",
      "Cannot identify the ACP bridge source HEAD.",
    );
  }
  const directory = path.join(root, ACP_BRIDGE_LOCAL_OUTPUT);
  const recordPath = path.join(directory, ACP_BRIDGE_RECORD);
  await rm(recordPath, { force: true });
  const result = await runCommand(
    "cargo",
    [
      "build",
      "--release",
      "--locked",
      "--manifest-path",
      "rust/acp-ws-bridge/Cargo.toml",
      "--target",
      ACP_BRIDGE_TARGET,
      "--target-dir",
      path.join(root, "rust/acp-ws-bridge/target"),
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw acpBridgeFailure(
      "cargo_build_failed",
      `cargo build exited ${result.status}`,
    );
  }
  const bytes = await readFile(path.join(directory, ACP_BRIDGE_BINARY));
  const after = await computeAcpBridgeBuildFingerprint(root);
  if (before.fingerprint !== after.fingerprint) {
    throw acpBridgeFailure(
      "build_inputs_changed",
      "ACP bridge inputs changed during compilation; rebuild.",
      {
        before: before.fingerprint,
        after: after.fingerprint,
      },
    );
  }
  const record = {
    schema: "acp-ws-bridge-build.v1",
    target: ACP_BRIDGE_TARGET,
    platform: ACP_BRIDGE_PLATFORM,
    buildFingerprint: before.fingerprint,
    sourceHead,
    binary: {
      name: ACP_BRIDGE_BINARY,
      sha256: acpBridgeSha256(bytes),
      bytes: bytes.length,
    },
  };
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  return packageAcpWsBridge({ root });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  resolveAcpBridgeTarget();
  console.log(JSON.stringify(await buildAcpWsBridge(), null, 2));
}

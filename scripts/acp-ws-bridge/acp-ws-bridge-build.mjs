import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const ACP_BRIDGE_TARGET = "x86_64-pc-windows-msvc";
export const ACP_BRIDGE_PLATFORM = "win32-x64";
export const ACP_BRIDGE_BINARY = "zotero-acp-bridge.exe";
export const ACP_BRIDGE_RECORD = "zotero-acp-bridge.build.json";
export const ACP_BRIDGE_OUTPUT = `addon/bin/${ACP_BRIDGE_PLATFORM}`;
export const ACP_BRIDGE_LOCAL_OUTPUT = `rust/acp-ws-bridge/target/${ACP_BRIDGE_TARGET}/release`;

export function acpBridgeFailure(code, message, details = {}) {
  return Object.assign(new Error(message), { code, details });
}

export function resolveAcpBridgeTarget(argv = process.argv.slice(2)) {
  const target = (
    process.env.ZOTERO_ACP_BRIDGE_TARGET ||
    argv.find((arg) => arg.startsWith("--target="))?.slice(9) ||
    ACP_BRIDGE_TARGET
  ).trim();
  if (target !== ACP_BRIDGE_TARGET) {
    throw acpBridgeFailure(
      "target_unsupported",
      `Unsupported ACP bridge target: ${target}`,
    );
  }
  return target;
}

export function acpBridgeSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function computeAcpBridgeBuildFingerprint(root) {
  const files = [
    "rust/acp-ws-bridge/Cargo.toml",
    "rust/acp-ws-bridge/Cargo.lock",
    "scripts/acp-ws-bridge/acp-ws-bridge-build.mjs",
    "scripts/acp-ws-bridge/build-acp-ws-bridge.mjs",
    "scripts/acp-ws-bridge/package-acp-ws-bridge.mjs",
    "scripts/acp-ws-bridge/check-acp-ws-bridge-freshness.mjs",
  ];
  async function collect(relative) {
    for (const entry of await readdir(path.join(root, relative), {
      withFileTypes: true,
    })) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) await collect(child);
      else if (entry.isFile()) files.push(child);
      else
        throw acpBridgeFailure(
          "build_input_unsupported",
          `Unsupported build input: ${child}`,
        );
    }
  }
  await collect("rust/acp-ws-bridge/src");
  for (const prefix of ["", "rust/", "rust/acp-ws-bridge/"]) {
    for (const name of [
      ".cargo/config",
      ".cargo/config.toml",
      "rust-toolchain",
      "rust-toolchain.toml",
    ]) {
      const relative = `${prefix}${name}`;
      try {
        await readFile(path.join(root, relative));
        files.push(relative);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
  const buildScript = "rust/acp-ws-bridge/build.rs";
  try {
    await readFile(path.join(root, buildScript));
    files.push(buildScript);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  files.sort();
  const hash = createHash("sha256").update(`${ACP_BRIDGE_TARGET}\n`);
  for (const file of files) {
    const bytes = await readFile(path.join(root, file));
    const content = bytes.toString("utf8").replace(/\r\n/g, "\n");
    hash.update(`${file}\0${acpBridgeSha256(content)}\n`);
  }
  return { fingerprint: hash.digest("hex"), files };
}

export async function readVerifiedAcpBridgeBuild(root, directory) {
  const recordPath = path.join(directory, ACP_BRIDGE_RECORD);
  let record;
  try {
    record = JSON.parse(await readFile(recordPath, "utf8"));
  } catch (error) {
    throw acpBridgeFailure(
      error.code === "ENOENT"
        ? "build_record_missing"
        : "build_record_unreadable",
      "ACP bridge build evidence is unavailable; run npm run prebuild:acp-ws-bridge on Windows.",
      { recordPath, cause: error.message },
    );
  }
  const hex = (value, length) =>
    typeof value === "string" &&
    new RegExp(`^[a-f0-9]{${length}}$`).test(value);
  if (
    record?.schema !== "acp-ws-bridge-build.v1" ||
    record.target !== ACP_BRIDGE_TARGET ||
    record.platform !== ACP_BRIDGE_PLATFORM ||
    !hex(record.buildFingerprint, 64) ||
    !hex(record.sourceHead, 40) ||
    record.binary?.name !== ACP_BRIDGE_BINARY ||
    !hex(record.binary.sha256, 64) ||
    !Number.isSafeInteger(record.binary.bytes) ||
    record.binary.bytes <= 0
  ) {
    throw acpBridgeFailure(
      "build_record_invalid",
      "Invalid ACP bridge build record.",
      { recordPath },
    );
  }
  const current = await computeAcpBridgeBuildFingerprint(root);
  if (record.buildFingerprint !== current.fingerprint) {
    throw acpBridgeFailure(
      "build_fingerprint_mismatch",
      "ACP bridge build inputs have changed; rebuild on Windows.",
      {
        recordedFingerprint: record.buildFingerprint,
        currentFingerprint: current.fingerprint,
      },
    );
  }
  let bytes;
  try {
    bytes = await readFile(path.join(directory, ACP_BRIDGE_BINARY));
  } catch (error) {
    throw acpBridgeFailure(
      "native_binary_unreadable",
      "ACP bridge executable is unavailable.",
      { cause: error.message },
    );
  }
  if (
    bytes.length !== record.binary.bytes ||
    acpBridgeSha256(bytes) !== record.binary.sha256
  ) {
    throw acpBridgeFailure(
      "binary_identity_mismatch",
      "ACP bridge executable does not match its build record.",
    );
  }
  return { record, bytes };
}

import { spawnSync } from "node:child_process";

const TARGET = "x86_64-pc-windows-msvc";

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

const target = (
  process.env.ZOTERO_ACP_BRIDGE_TARGET ||
  argValue("target") ||
  TARGET
).trim();
if (target !== TARGET) {
  throw new Error(
    `ACP WebSocket bridge only supports ${TARGET}, got ${target}`,
  );
}
if (process.platform !== "win32") {
  throw new Error("ACP WebSocket bridge prebuilds must be built on Windows");
}

const result = spawnSync(
  "cargo",
  [
    "build",
    "--release",
    "--manifest-path",
    "native/acp-ws-bridge/Cargo.toml",
    "--target",
    target,
  ],
  { stdio: "inherit" },
);
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`cargo build exited ${result.status}`);
}

const packageResult = spawnSync(
  "node",
  ["scripts/package-acp-ws-bridge.mjs", `--target=${target}`],
  { stdio: "inherit" },
);
if (packageResult.error) {
  throw packageResult.error;
}
if (packageResult.status !== 0) {
  throw new Error(`package-acp-ws-bridge exited ${packageResult.status}`);
}

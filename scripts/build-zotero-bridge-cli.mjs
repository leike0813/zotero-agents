import { spawnSync } from "node:child_process";

const PLATFORM_TARGETS = {
  "win32-x64": {
    target: "x86_64-pc-windows-msvc",
    hostPlatform: "win32",
    zigbuild: false,
  },
  "darwin-x64": {
    target: "x86_64-apple-darwin",
    hostPlatform: "darwin",
    zigbuild: false,
  },
  "darwin-arm64": {
    target: "aarch64-apple-darwin",
    hostPlatform: "darwin",
    zigbuild: false,
  },
  "linux-x86": {
    target: "i686-unknown-linux-gnu",
    hostPlatform: null,
    zigbuild: true,
  },
  "linux-x64": {
    target: "x86_64-unknown-linux-gnu",
    hostPlatform: null,
    zigbuild: true,
  },
  "linux-arm": {
    target: "armv7-unknown-linux-gnueabihf",
    hostPlatform: null,
    zigbuild: true,
  },
  "linux-arm64": {
    target: "aarch64-unknown-linux-gnu",
    hostPlatform: null,
    zigbuild: true,
  },
};

function argValue(name) {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function runtimePlatform() {
  if (process.platform === "win32") return "win32-x64";
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  if (process.platform === "linux") {
    if (process.arch === "ia32" || process.arch === "x32") return "linux-x86";
    if (process.arch === "arm") return "linux-arm";
    if (process.arch === "arm64") return "linux-arm64";
    return "linux-x64";
  }
  return "";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}`);
  }
}

function ensureCargoZigbuild() {
  const result = spawnSync("cargo", ["zigbuild", "--help"], {
    stdio: "ignore",
  });
  if (result.status !== 0) {
    throw new Error(
      "cargo-zigbuild is required for Linux Host Bridge CLI prebuilds. Install Zig and cargo-zigbuild, then retry.",
    );
  }
}

const platform = (
  process.env.ZOTERO_BRIDGE_PLATFORM ||
  argValue("platform") ||
  runtimePlatform()
).trim();
const entry = PLATFORM_TARGETS[platform];
if (!entry) {
  throw new Error(`Unsupported Host Bridge CLI platform: ${platform}`);
}

if (entry.hostPlatform && process.platform !== entry.hostPlatform) {
  throw new Error(
    `${platform} Host Bridge CLI builds must run on ${entry.hostPlatform}; use GitHub CI macOS/Windows runners for that platform.`,
  );
}

const target = (
  process.env.ZOTERO_BRIDGE_TARGET ||
  argValue("target") ||
  entry.target
).trim();
if (target !== entry.target) {
  throw new Error(
    `Platform ${platform} expects Rust target ${entry.target}, got ${target}`,
  );
}

if (entry.zigbuild) {
  ensureCargoZigbuild();
}

const cargoArgs = [
  entry.zigbuild ? "zigbuild" : "build",
  "--release",
  "--manifest-path",
  "cli/zotero-bridge/Cargo.toml",
  "--target",
  target,
];
run("cargo", cargoArgs);

run("node", [
  "scripts/package-zotero-bridge-cli.mjs",
  `--platform=${platform}`,
  `--target=${target}`,
]);

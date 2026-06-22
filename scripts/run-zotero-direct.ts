/**
 * Launch Zotero without hot-reload using the same mechanism as `zotero-plugin serve`
 * but skipping the file watcher.
 *
 * How `zotero-plugin serve` actually loads the plugin (default asProxy=false):
 *  1. Writes required dev prefs to profile's prefs.js
 *  2. Starts Zotero with `-start-debugger-server <port>`
 *  3. Connects to Zotero via Firefox Remote Debugger Protocol (RDP over TCP)
 *  4. Sends `installTemporaryAddon` to the addons actor, pointing to the build dir
 *  5. Plugin is loaded dynamically — no proxy file, no XPI needed
 *
 * This script replicates steps 1-4 and then keeps the launcher alive while
 * Zotero runs. No file watcher is started.
 *
 * Usage:
 *  npx tsx scripts/run-zotero-direct.ts          # launch only
 *  npx tsx scripts/run-zotero-direct.ts --build   # build + launch
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve, join } from "path";
import { spawn, execSync } from "child_process";
import * as net from "net";
import { tmpdir } from "os";
import { fileURLToPath } from "url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(SCRIPT_PATH);
const ROOT = resolve(SCRIPT_DIR, "..");
loadEnv({ path: resolve(ROOT, ".env") });

const SHOULD_BUILD = process.argv.includes("--build") || process.argv.includes("-b");
const ADDON_ID = "zotero-skills@leike0813@gmail.com";
const ADDON_SOURCE_DIR = resolve(ROOT, ".scaffold/build/addon");
const PREFS_PREFIX = "extensions.zotero.zotero-skills";

function getEnvVal(key: string): string {
  const raw = process.env[key] || "";
  return raw.replace(/^["']|["']$/g, "").trim();
}

function getZoteroBinary(): string {
  const bin = getEnvVal("ZOTERO_PLUGIN_ZOTERO_BIN_PATH");
  if (!bin) throw new Error("ZOTERO_PLUGIN_ZOTERO_BIN_PATH is not set in .env");
  if (!existsSync(bin)) throw new Error(`Zotero binary not found at: ${bin}`);
  return bin;
}

function getProfilePath(): string {
  const profile = getEnvVal("ZOTERO_PLUGIN_PROFILE_PATH");
  if (!profile) throw new Error("ZOTERO_PLUGIN_PROFILE_PATH is not set in .env");
  return profile;
}

function getDataDir(): string | undefined {
  const dir = getEnvVal("ZOTERO_PLUGIN_DATA_DIR");
  return dir || undefined;
}

export function resolveDirectRuntimeRoot(env: NodeJS.ProcessEnv = process.env) {
  const explicit = (env.ZOTERO_SKILLS_RUNTIME_ROOT || "")
    .replace(/^["']|["']$/g, "")
    .trim();
  if (explicit) {
    return explicit;
  }
  const zoteroDataDir = (env.ZOTERO_PLUGIN_DATA_DIR || "")
    .replace(/^["']|["']$/g, "")
    .trim();
  if (zoteroDataDir) {
    return resolve(zoteroDataDir, "zotero-agents");
  }
  const base =
    env.LOCALAPPDATA ||
    env.LocalAppData ||
    env.APPDATA ||
    env.AppData ||
    env.TEMP ||
    env.TMP ||
    tmpdir();
  return resolve(base, "Zotero-Agents-Direct-Runtime");
}

export function buildZoteroLaunchEnv(env: NodeJS.ProcessEnv = process.env) {
  return {
    ...env,
    ZOTERO_SKILLS_RUNTIME_ROOT: resolveDirectRuntimeRoot(env),
    XPCOM_DEBUG_BREAK: "stack",
    NS_TRACE_MALLOC_DISABLE_STACKS: "1",
  };
}

function runBuild(): void {
  console.log("[build] Building plugin …");
  execSync("npx zotero-plugin build", {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

function encodePrefValue(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function patchRuntimeRootPref(
  profile: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const prefsPath = join(profile, "prefs.js");
  const runtimeRoot = resolveDirectRuntimeRoot(env);
  let existing = "";
  if (existsSync(prefsPath)) {
    existing = readFileSync(prefsPath, "utf-8");
  }
  const prefKey = `${PREFS_PREFIX}.runtimeRoot`;
  const lines = existing
    .split("\n")
    .filter((line) => !line.trim().startsWith(`user_pref("${prefKey}"`));
  lines.push(`user_pref("${prefKey}", ${encodePrefValue(runtimeRoot)});`);
  writeFileSync(prefsPath, lines.join("\n") + "\n", "utf-8");
}

function patchPrefsJs(profile: string): void {
  const prefsPath = join(profile, "prefs.js");

  const requiredPrefs: Record<string, string | number | boolean> = {
    "browser.dom.window.dump.enabled": true,
    "datareporting.policy.dataSubmissionEnabled": false,
    "devtools.debugger.remote-enabled": true,
    "devtools.debugger.remote-websocket": true,
    "devtools.debugger.prompt-connection": false,
    "devtools.browserconsole.contentMessages": true,
    "extensions.logging.enabled": false,
    "extensions.checkCompatibility.nightly": false,
    "extensions.update.enabled": false,
    "extensions.update.notifyUser": false,
    "extensions.enabledScopes": 5,
    "extensions.getAddons.cache.enabled": false,
    "extensions.installDistroAddons": false,
    "extensions.autoDisableScopes": 0,
    "app.update.enabled": false,
    "xpinstall.signatures.required": false,
    "extensions.experiments.enabled": true,
    "browser.link.open_newwindow": 3,
    "extensions.zotero.firstRun.skipFirefoxProfileAccessCheck": true,
    "extensions.zotero.firstRunGuidance": false,
    [`${PREFS_PREFIX}.runtimeRoot`]: resolveDirectRuntimeRoot(process.env),
  };
  const prefsToRemove = ["extensions.lastAppBuildId", "extensions.lastAppVersion"];
  const managedPrefKeys = new Set([
    ...Object.keys(requiredPrefs),
    ...prefsToRemove,
  ]);

  let existing = "";
  if (existsSync(prefsPath)) {
    existing = readFileSync(prefsPath, "utf-8");
  }

  const lines = existing.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    for (const key of managedPrefKeys) {
      if (trimmed.startsWith(`user_pref("${key}"`)) return false;
    }
    return true;
  });

  for (const [key, value] of Object.entries(requiredPrefs)) {
    lines.push(`user_pref("${key}", ${encodePrefValue(value)});`);
  }

  writeFileSync(prefsPath, lines.join("\n") + "\n", "utf-8");
  console.log("[prefs] Patched prefs.js");
}

function findFreeTcpPort(): Promise<number> {
  return new Promise((res) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => res(port));
    });
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Firefox Remote Debugger Protocol (RDP) client – minimal implementation
 *
 * Protocol: length-prefixed JSON over TCP
 *   Format: <byte-length-of-json>:<json-string>
 *   Example: 48:{"to":"root","type":"getRoot"}
 */
class RdpClient {
  private conn: net.Socket | null = null;
  private activeRequests = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private pending: Array<{ msg: Record<string, unknown>; resolve: (v: any) => void; reject: (e: Error) => void }> = [];

  connect(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const conn = net.createConnection({ port, host: "127.0.0.1" });
      this.conn = conn;

      let dataBuf = "";
      conn.on("data", (chunk: Buffer) => {
        dataBuf += chunk.toString();
        while (true) {
          const sep = dataBuf.indexOf(":");
          if (sep < 1) break;
          const len = parseInt(dataBuf.substring(0, sep), 10);
          if (isNaN(len)) {
            reject(new Error("RDP parse error: invalid length"));
            return;
          }
          if (dataBuf.length - sep - 1 < len) break;

          const json = dataBuf.substring(sep + 1, sep + 1 + len);
          dataBuf = dataBuf.substring(sep + 1 + len);

          try {
            const msg = JSON.parse(json);
            this._handle(msg);
          } catch {
            // skip bad messages
          }
        }
      });

      conn.on("error", reject);
      conn.on("close", () => { this.conn = null; });

      // Register the greeting (from "root") as the first expected reply
      this._expectReply("root", { resolve, reject });
    });
  }

  private _expectReply(actor: string, d: { resolve: (v: any) => void; reject: (e: Error) => void }) {
    if (this.activeRequests.has(actor)) throw new Error(`Duplicate request for ${actor}`);
    this.activeRequests.set(actor, d);
  }

  private _handle(msg: any) {
    // Unsolicited events — ignore
    if (!msg.from) {
      if (msg.error) return; // ignore error-only messages
      return;
    }
    // Known unsolicited event types
    const UNSOLICITED = new Set(["addonListChanged", "tabListChanged"]);
    if (msg.type && UNSOLICITED.has(msg.type)) {
      return;
    }
    // Route to active request by sender actor
    if (this.activeRequests.has(msg.from)) {
      const d = this.activeRequests.get(msg.from)!;
      this.activeRequests.delete(msg.from);
      if (msg.error) {
        d.reject(new Error(msg.error + ": " + (msg.message || "")));
      } else {
        d.resolve(msg);
      }
      this._flushPending();
      return;
    }
  }

  private _flushPending() {
    while (this.pending.length > 0) {
      const { msg, resolve, reject } = this.pending[0];
      const actor = msg.to as string;
      if (this.activeRequests.has(actor)) break; // actor busy, wait
      if (!this.conn) { reject(new Error("RDP connection closed")); return; }
      this._expectReply(actor, { resolve, reject });
      this.pending.shift();
      const json = JSON.stringify(msg);
      this.conn.write(`${Buffer.byteLength(json)}:${json}`);
    }
  }

  request(msg: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pending.push({ msg, resolve, reject });
      this._flushPending();
    });
  }

  disconnect() {
    if (this.conn) {
      this.conn.destroy();
      this.conn = null;
    }
  }
}

async function installTemporaryAddon(port: number): Promise<void> {
  const client = new RdpClient();

  console.log("[rdp] Connecting to Zotero debugger …");
  await client.connect(port);

  console.log("[rdp] Getting addons actor …");
  const rootResp = await client.request({ to: "root", type: "getRoot" });
  if (!rootResp.addonsActor) {
    // Fallback: try listTabs
    const tabsResp = await client.request({ to: "root", type: "listTabs" });
    if (!tabsResp.addonsActor) {
      throw new Error("Could not get addonsActor from Zotero");
    }
    rootResp.addonsActor = tabsResp.addonsActor;
  }

  console.log(`[rdp] Installing temporary addon from: ${ADDON_SOURCE_DIR}`);
  const installResp = await client.request({
    to: rootResp.addonsActor,
    type: "installTemporaryAddon",
    addonPath: ADDON_SOURCE_DIR,
  });

  console.log(`[rdp] Addon installed: id=${installResp.addon?.id || "?"}`);
  client.disconnect();
}

async function launchZotero(): Promise<{
  port: number;
  proc: ReturnType<typeof spawn>;
}> {
  const port = await findFreeTcpPort();
  const bin = getZoteroBinary();
  const profile = getProfilePath();
  const dataDir = getDataDir();

  const args = [
    "--purgecaches",
    "no-remote",
    "-profile", profile,
    "--jsdebugger",
    "-start-debugger-server", String(port),
  ];

  if (dataDir) {
    args.push("--dataDir", dataDir);
  }

  console.log(`[launch] ${bin} ${args.join(" ")}`);

  const proc = spawn(bin, args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
    windowsHide: true,
    env: buildZoteroLaunchEnv(process.env),
  });

  proc.on("error", (err) => {
    console.error(`[error] Failed to launch Zotero: ${err.message}`);
    process.exit(1);
  });
  proc.stdout?.on("data", () => undefined);
  proc.stderr?.on("data", () => undefined);

  console.log(`[done] Zotero started (PID ${proc.pid}), debugger on port ${port}`);
  return { port, proc };
}

function waitForProcessClose(proc: ReturnType<typeof spawn>) {
  return new Promise<number>((resolve) => {
    proc.on("exit", (code, signal) => {
      if (typeof code === "number") {
        resolve(code);
        return;
      }
      if (signal === "SIGINT") {
        resolve(130);
        return;
      }
      if (signal === "SIGTERM") {
        resolve(143);
        return;
      }
      resolve(0);
    });
  });
}

async function main() {
  if (SHOULD_BUILD) {
    runBuild();
  }

  const profile = getProfilePath();
  if (!existsSync(ADDON_SOURCE_DIR)) {
    throw new Error(
      `Build output not found at ${ADDON_SOURCE_DIR}. Run with --build or "npm run build" first.`,
    );
  }

  patchPrefsJs(profile);
  const { port, proc } = await launchZotero();
  const stop = (exitCode: number) => {
    try {
      proc.kill();
    } catch {
      // ignore
    }
    process.exit(exitCode);
  };
  process.once("SIGINT", () => stop(130));
  process.once("SIGTERM", () => stop(143));

  // Zotero takes a moment to boot and open the debugger server.
  // The scaffold retries up to 150 times with 1s intervals.
  // We wait a few seconds then connect with retries.
  console.log("[rdp] Waiting for Zotero to start …");
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    try {
      await installTemporaryAddon(port);
      console.log(
        "[done] Plugin loaded. Zotero is running without hot-reload; close Zotero or press Ctrl+C to stop.",
      );
      const exitCode = await waitForProcessClose(proc);
      process.exit(exitCode);
      return;
    } catch (err) {
      console.log(`[rdp] Attempt ${i + 1} failed, retrying …`);
    }
  }

  console.error(
    "[error] Failed to install addon after 30 attempts. Zotero may not have fully started.",
  );
  process.exit(1);
}

const launchedDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === SCRIPT_PATH;

if (launchedDirectly) {
  main();
}

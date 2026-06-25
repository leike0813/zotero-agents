export type AddonRuntimeEnv = "development" | "production";

export function resolveAddonRuntimeEnv(): AddonRuntimeEnv {
  const runtime = globalThis as { __env__?: unknown };
  const value = runtime.__env__;
  return value === "production" ? "production" : "development";
}

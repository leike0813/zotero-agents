export function resolveAddonRuntimeEnv() {
    const runtime = globalThis;
    const value = runtime.__env__;
    return value === "production" ? "production" : "development";
}

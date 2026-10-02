export const HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA = "host-bridge.plugin-skill-bundle.v1";
export function isSafeHostBridgePluginSkillBundlePath(path) {
    return (path.length > 0 &&
        !path.includes("\\") &&
        !path.includes("\0") &&
        !path.startsWith("/") &&
        !path.endsWith("/") &&
        !path.split("/").some((part) => !part || part === "." || part === ".."));
}
export function hostBridgePluginSkillBundleDigestPayload(manifest) {
    return JSON.stringify({
        schema: manifest.schema,
        cli: manifest.cli,
        surfaces: manifest.surfaces,
        skills: manifest.skills,
        files: manifest.files,
    });
}

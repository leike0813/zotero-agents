export const ACP_PERMISSION_OPTION_KINDS = [
    "allow_once",
    "allow_always",
    "reject_once",
    "reject_always",
];
const acpPermissionOptionKindSet = new Set(ACP_PERMISSION_OPTION_KINDS);
const acpAllowPermissionKindSet = new Set([
    "allow_once",
    "allow_always",
]);
export function isAcpPermissionOptionKind(value) {
    return acpPermissionOptionKindSet.has(String(value || "").trim());
}
export function normalizeAcpPermissionOptionKind(value) {
    const normalized = String(value || "").trim();
    return isAcpPermissionOptionKind(normalized) ? normalized : "";
}
export function isAcpAllowPermissionKind(value) {
    return acpAllowPermissionKindSet.has(String(value || "").trim());
}
export function resolveAutoApproveAcpPermissionOptionId(source, options) {
    if (String(source || "").trim() !== "acp-tool-call") {
        return "";
    }
    const allowOptions = (Array.isArray(options) ? options : []).filter((option) => isAcpAllowPermissionKind(option.kind) &&
        String(option.optionId || "").trim());
    const selected = allowOptions.find((option) => String(option.kind || "").trim() === "allow_once") ||
        allowOptions.find((option) => String(option.kind || "").trim() === "allow_always");
    return selected ? String(selected.optionId || "").trim() : "";
}

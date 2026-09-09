export const ACP_PERMISSION_OPTION_KINDS = [
  "allow_once",
  "allow_always",
  "reject_once",
  "reject_always",
] as const;

export type AcpPermissionOptionKind =
  (typeof ACP_PERMISSION_OPTION_KINDS)[number];

const acpPermissionOptionKindSet = new Set<string>(ACP_PERMISSION_OPTION_KINDS);
const acpAllowPermissionKindSet = new Set<string>([
  "allow_once",
  "allow_always",
]);

export function isAcpPermissionOptionKind(
  value: unknown,
): value is AcpPermissionOptionKind {
  return acpPermissionOptionKindSet.has(String(value || "").trim());
}

export function normalizeAcpPermissionOptionKind(
  value: unknown,
): AcpPermissionOptionKind | "" {
  const normalized = String(value || "").trim();
  return isAcpPermissionOptionKind(normalized) ? normalized : "";
}

export function isAcpAllowPermissionKind(value: unknown) {
  return acpAllowPermissionKindSet.has(String(value || "").trim());
}

export function resolveAutoApproveAcpPermissionOptionId(
  source: unknown,
  options: Array<{ kind?: unknown; optionId?: unknown }> | undefined,
) {
  if (String(source || "").trim() !== "acp-tool-call") {
    return "";
  }
  const allowOptions = (Array.isArray(options) ? options : []).filter(
    (option) =>
      isAcpAllowPermissionKind(option.kind) &&
      String(option.optionId || "").trim(),
  );
  const selected =
    allowOptions.find(
      (option) => String(option.kind || "").trim() === "allow_once",
    ) ||
    allowOptions.find(
      (option) => String(option.kind || "").trim() === "allow_always",
    );
  return selected ? String(selected.optionId || "").trim() : "";
}

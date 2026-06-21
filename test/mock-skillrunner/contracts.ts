export type SkillRunnerCreatePayload = {
  skill_id?: unknown;
  engine?: unknown;
  input?: unknown;
  parameter?: unknown;
};

export function validateCreatePayload(payload: unknown) {
  const body = (payload || {}) as SkillRunnerCreatePayload;
  const errors: string[] = [];
  if (typeof body.skill_id !== "string" || body.skill_id.length === 0) {
    errors.push("skill_id is required");
  }
  if (typeof body.engine !== "string" || body.engine.length === 0) {
    errors.push("engine is required");
  }
  if (
    typeof body.parameter !== "object" ||
    body.parameter === null ||
    Array.isArray(body.parameter)
  ) {
    errors.push("parameter must be an object");
  }
  const input =
    body.input && typeof body.input === "object" && !Array.isArray(body.input)
      ? (body.input as Record<string, unknown>)
      : null;
  if (body.skill_id === "literature-analysis") {
    const sourcePath = String(input?.source_path || "").trim();
    if (!sourcePath) {
      errors.push("input.source_path is required for literature-analysis");
    } else if (
      isAbsolutePath(sourcePath) ||
      sourcePath.startsWith("uploads/")
    ) {
      errors.push(
        "input.source_path must be uploads-root relative path without uploads/ prefix",
      );
    }
  }
  if (body.skill_id === "tag-regulator") {
    const validTags = String(input?.valid_tags || "").trim();
    if (!validTags) {
      errors.push("input.valid_tags is required for tag-regulator");
    } else if (isAbsolutePath(validTags) || validTags.startsWith("uploads/")) {
      errors.push(
        "input.valid_tags must be uploads-root relative path without uploads/ prefix",
      );
    }
  }
  if (body.skill_id === "tag-bootstrapper") {
    if (!input) {
      errors.push("input must be an object for tag-bootstrapper");
    } else if (!Array.isArray(input.existing_tags)) {
      errors.push("input.existing_tags must be an array for tag-bootstrapper");
    } else if (
      typeof input.protocol !== "object" ||
      input.protocol === null ||
      Array.isArray(input.protocol)
    ) {
      errors.push("input.protocol must be an object for tag-bootstrapper");
    }
  }
  return {
    ok: errors.length === 0,
    errors,
  };
}

function isAbsolutePath(value: string) {
  const text = String(value || "")
    .trim()
    .replace(/\\/g, "/");
  return /^[A-Za-z]:\//.test(text) || text.startsWith("/");
}

export function validateMultipartHasField(bodyRaw: string, fieldName: string) {
  return bodyRaw.includes(`name="${fieldName}"`);
}

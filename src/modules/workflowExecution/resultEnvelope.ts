function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(source: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function isSkillRunnerEnvelopeObject(value: Record<string, unknown>) {
  return (
    hasOwn(value, "data") &&
    (hasOwn(value, "success_source") ||
      hasOwn(value, "repair_level") ||
      hasOwn(value, "validation_warnings") ||
      hasOwn(value, "artifacts") ||
      hasOwn(value, "error"))
  );
}

function unwrapSkillRunnerEnvelopeObject(value: Record<string, unknown>) {
  return hasOwn(value, "data") ? value.data : value;
}

export function unwrapSkillRunnerResultJson(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }
  if (isSkillRunnerEnvelopeObject(value)) {
    return unwrapSkillRunnerEnvelopeObject(value);
  }
  const nested = value.result;
  if (!isObjectRecord(nested)) {
    return value;
  }
  if (
    hasOwn(value, "request_id") ||
    hasOwn(value, "requestId") ||
    isSkillRunnerEnvelopeObject(nested) ||
    (hasOwn(nested, "status") &&
      (hasOwn(nested, "data") || hasOwn(nested, "error")))
  ) {
    return unwrapSkillRunnerEnvelopeObject(nested);
  }
  return value;
}

export function canonicalizeWorkflowResultJson(value: unknown): unknown {
  return unwrapSkillRunnerResultJson(value);
}

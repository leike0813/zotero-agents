function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value) {
  return String(value || "").trim();
}

function normalizeWarnings(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const warnings = [];
  for (const entry of value) {
    const text = asString(entry);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    warnings.push(text);
  }
  return warnings;
}

function isDiagnosticStatus(value) {
  const normalized = asString(value).toLowerCase();
  return (
    !!normalized &&
    !["ok", "success", "succeeded", "completed"].includes(normalized)
  );
}

function collectResultRecords(value) {
  const records = [];
  const seen = new Set();
  const visit = (candidate) => {
    if (!isRecord(candidate) || seen.has(candidate)) {
      return;
    }
    seen.add(candidate);
    records.push(candidate);
  };

  visit(value?.data?.data);
  visit(value?.result?.data?.data);
  visit(value?.data);
  visit(value?.result?.data);
  visit(value?.result);
  visit(value);
  return records;
}

export function collectSkillOutputDiagnostics(value) {
  const warnings = [];
  const warningSet = new Set();
  let error;
  let status = "";
  let kind = "";
  let reason = "";

  for (const record of collectResultRecords(value)) {
    for (const warning of normalizeWarnings(record.warnings)) {
      if (!warningSet.has(warning)) {
        warningSet.add(warning);
        warnings.push(warning);
      }
    }
    if (
      typeof error === "undefined" &&
      record.error !== null &&
      typeof record.error !== "undefined"
    ) {
      error = record.error;
    }
    if (!status && isDiagnosticStatus(record.status)) {
      status = asString(record.status);
    }
    if (!kind) {
      kind = asString(record.kind);
    }
    if (!reason) {
      reason = asString(record.reason);
    }
  }

  const diagnostics = {};
  if (typeof error !== "undefined") {
    diagnostics.error = error;
  }
  if (status) {
    diagnostics.status = status;
  }
  if (kind) {
    diagnostics.kind = kind;
  }
  if (reason) {
    diagnostics.reason = reason;
  }

  return {
    warnings,
    skill_diagnostics:
      Object.keys(diagnostics).length > 0 ? diagnostics : undefined,
  };
}

export function appendSkillDiagnosticsToResult(result, diagnostics) {
  return {
    ...result,
    warnings: diagnostics?.warnings || [],
    ...(diagnostics?.skill_diagnostics
      ? { skill_diagnostics: diagnostics.skill_diagnostics }
      : {}),
  };
}

function stringifyDiagnosticValue(value) {
  if (typeof value === "undefined") {
    return "";
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (isRecord(value)) {
    const message = asString(value.message);
    const type = asString(value.type || value.code || value.name);
    if (message && type) {
      return `${type}: ${message}`;
    }
    if (message) {
      return message;
    }
    if (type) {
      return type;
    }
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "unserializable diagnostic";
  }
}

export function formatSkillDiagnosticsForError(diagnostics) {
  const payload = diagnostics?.skill_diagnostics;
  if (!payload) {
    return "";
  }
  const parts = [];
  for (const key of ["status", "kind", "reason", "error"]) {
    if (typeof payload[key] === "undefined") {
      continue;
    }
    const text = stringifyDiagnosticValue(payload[key]);
    if (text) {
      parts.push(`${key}=${text}`);
    }
  }
  return parts.length > 0 ? `; skill diagnostics: ${parts.join("; ")}` : "";
}

export const __resultOutputTestOnly = {
  collectResultRecords,
  normalizeWarnings,
  stringifyDiagnosticValue,
};

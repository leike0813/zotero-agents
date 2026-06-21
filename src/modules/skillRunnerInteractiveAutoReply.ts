export const SKILLRUNNER_INTERACTIVE_AUTO_REPLY_ENABLED = true;

let featureOverrideForTests: boolean | undefined;

export function isSkillRunnerInteractiveAutoReplyEnabled() {
  return (
    featureOverrideForTests ?? SKILLRUNNER_INTERACTIVE_AUTO_REPLY_ENABLED
  );
}

export function setSkillRunnerInteractiveAutoReplyEnabledForTests(
  enabled?: boolean,
) {
  featureOverrideForTests = enabled;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = normalizeString(value).toLowerCase();
  if (text === "true" || text === "1" || text === "yes" || text === "on") {
    return true;
  }
  if (
    text === "false" ||
    text === "0" ||
    text === "no" ||
    text === "off"
  ) {
    return false;
  }
  return undefined;
}

export function isSkillRunnerInteractiveAutoReplyRequested(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }
  const runtimeOptions = isRecord(value.runtime_options)
    ? value.runtime_options
    : {};
  return (
    normalizeBoolean(runtimeOptions.interactive_auto_reply) === true ||
    normalizeBoolean(value.interactive_auto_reply) === true
  );
}

export function shouldEnableSkillRunnerAutoReplyForRun(args: {
  executionMode?: unknown;
  providerOptions?: unknown;
  requestPayload?: unknown;
}) {
  if (!isSkillRunnerInteractiveAutoReplyEnabled()) {
    return false;
  }
  const mode =
    normalizeString(args.executionMode).toLowerCase() ||
    (isRecord(args.requestPayload) && isRecord(args.requestPayload.runtime_options)
      ? normalizeString(args.requestPayload.runtime_options.execution_mode)
          .toLowerCase()
      : "");
  if (mode !== "interactive") {
    return false;
  }
  return (
    isSkillRunnerInteractiveAutoReplyRequested(args.providerOptions) ||
    isSkillRunnerInteractiveAutoReplyRequested(args.requestPayload)
  );
}

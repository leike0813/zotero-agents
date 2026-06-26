export const DEFAULT_SKILLRUNNER_ENDPOINT = "http://127.0.0.1:8030";

export const DEFAULT_BACKEND_ID = "backend-default";

export const DEFAULT_BACKEND_TYPE = "skillrunner";

export const ACP_BACKEND_TYPE = "acp";

export const GENERIC_HTTP_BACKEND_TYPE = "generic-http";

export const ACP_PROMPT_REQUEST_KIND = "acp.prompt.v1";

export const ACP_SKILL_RUN_REQUEST_KIND = "acp.skill.run.v1";

export const SKILLRUNNER_SEQUENCE_REQUEST_KIND = "skillrunner.sequence.v1";

export const ACP_OPENCODE_BACKEND_ID = "acp-opencode";

export const ACP_OPENCODE_DISPLAY_NAME = "OpenCode ACP";

export const ACP_OPENCODE_COMMAND = "opencode";

export const ACP_OPENCODE_ARGS = ["acp"];

export const PASS_THROUGH_BACKEND_TYPE = "pass-through";

export const PASS_THROUGH_REQUEST_KIND = "pass-through.run.v1";

export const BACKEND_TYPES = [
  DEFAULT_BACKEND_TYPE,
  ACP_BACKEND_TYPE,
  GENERIC_HTTP_BACKEND_TYPE,
  PASS_THROUGH_BACKEND_TYPE,
] as const;

export type BackendType = (typeof BACKEND_TYPES)[number];

export const DEFAULT_REQUEST_KIND_BY_BACKEND_TYPE: Record<BackendType, string> =
  {
    [DEFAULT_BACKEND_TYPE]: "skillrunner.job.v1",
    [ACP_BACKEND_TYPE]: ACP_PROMPT_REQUEST_KIND,
    [GENERIC_HTTP_BACKEND_TYPE]: "generic-http.request.v1",
    [PASS_THROUGH_BACKEND_TYPE]: PASS_THROUGH_REQUEST_KIND,
  };

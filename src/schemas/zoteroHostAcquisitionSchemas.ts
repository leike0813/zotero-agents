import {
  ACQUISITION_LIMITS,
  ACQUISITION_REASONS,
  type AcquisitionInputs,
} from "../modules/zoteroHost/zoteroHostAcquisitionTypes";

type Schema = Record<string, unknown>;
const ref = { type: "string", minLength: 1, maxLength: 160 };
const text = (maxLength: number) => ({ type: "string", maxLength });
function object(
  properties: Record<string, Schema>,
  required = Object.keys(properties),
): Schema {
  return { type: "object", properties, required, additionalProperties: false };
}
const pageProperties = {
  sessionRef: ref,
  pageRef: ref,
  state: {
    enum: [
      "loading",
      "ready",
      "awaiting_user",
      "closed",
      "timed_out",
      "released",
      "failed",
    ],
  },
};
const page = object(pageProperties);
const reason = { enum: [...ACQUISITION_REASONS] };
const downloadRef = object({ downloadRef: ref });
const target = { pageRef: ref, revision: ref, targetRef: ref };
const downloadBase = {
  downloadRef: ref,
  pollAfterMs: { type: "integer", minimum: 0, maximum: 10000 },
};
const download = {
  oneOf: [
    object({
      ...downloadBase,
      state: { enum: ["pending", "running"] },
      reason: { type: "null" },
      file: { type: "null" },
    }),
    object({
      ...downloadBase,
      state: { const: "ready" },
      reason: { type: "null" },
      file: object({
        fileId: ref,
        contentType: { const: "application/pdf" },
        size: {
          type: "integer",
          minimum: 5,
          maximum: ACQUISITION_LIMITS.downloadBytes,
        },
        pages: { type: "integer", minimum: 1 },
        readable: { const: true },
        title: text(ACQUISITION_LIMITS.titleChars),
        identityMatched: { const: true },
      }),
    }),
    object({
      ...downloadBase,
      state: { enum: ["failed", "canceled"] },
      reason,
      file: { type: "null" },
    }),
  ],
};

export const ACQUISITION_SCHEMAS: Record<
  keyof AcquisitionInputs,
  {
    inputSchema: Schema;
    outputSchema: Schema;
    effect: "read" | "state-change";
    summary: string;
  }
> = {
  profiles: {
    inputSchema: object({}),
    outputSchema: object({
      profiles: {
        type: "array",
        maxItems: ACQUISITION_LIMITS.profiles,
        items: object({ authProfileRef: ref, name: text(120) }),
      },
    }),
    effect: "read",
    summary:
      "List local persistent authentication profiles for a trusted acquisition task.",
  },
  open: {
    inputSchema: object(
      {
        parentRef: object({
          libraryId: { type: "integer", minimum: 1 },
          key: { type: "string", minLength: 1, maxLength: 32 },
        }),
        authProfileRef: ref,
      },
      ["parentRef"],
    ),
    outputSchema: page,
    effect: "state-change",
    summary:
      "Open a task-owned native page from an ingested parent's source using local authentication.",
  },
  observe: {
    inputSchema: object({ pageRef: ref, cursor: ref }, ["pageRef"]),
    outputSchema: object({
      ...pageProperties,
      revision: ref,
      origin: text(2048),
      title: text(ACQUISITION_LIMITS.titleChars),
      text: text(ACQUISITION_LIMITS.textChars),
      targets: {
        type: "array",
        maxItems: ACQUISITION_LIMITS.targetsPerPage,
        items: object({
          targetRef: ref,
          label: text(ACQUISITION_LIMITS.labelChars),
          kind: { const: "link" },
        }),
      },
      nextCursor: { anyOf: [ref, { type: "null" }] },
      pollAfterMs: { type: "integer", minimum: 0, maximum: 10000 },
      authDeadline: { type: ["integer", "null"], minimum: 0 },
      reason: { enum: [null, ...ACQUISITION_REASONS] },
    }),
    effect: "read",
    summary:
      "Observe bounded page facts and revision-bound targets without credentials or signed URLs.",
  },
  navigate: {
    inputSchema: object(
      {
        pageRef: ref,
        url: { type: "string", pattern: "^https?://", maxLength: 4096 },
        authentication: { type: "boolean" },
      },
      ["pageRef", "url"],
    ),
    outputSchema: page,
    effect: "state-change",
    summary:
      "Navigate a task page; explicit authentication starts a non-renewable ten-minute local wait.",
  },
  activate: {
    inputSchema: object(target),
    outputSchema: page,
    effect: "state-change",
    summary:
      "Activate an observed link only in its owning task page and revision.",
  },
  download: {
    inputSchema: object({ ...target, idempotencyKey: ref }),
    outputSchema: download,
    effect: "state-change",
    summary:
      "Start an idempotent asynchronous native download from an observed task-owned target.",
  },
  get_download: {
    inputSchema: downloadRef,
    outputSchema: download,
    effect: "read",
    summary:
      "Observe a download; a ready file is local attachment ingress evidence, not an attachment receipt.",
  },
  cancel_download: {
    inputSchema: downloadRef,
    outputSchema: download,
    effect: "state-change",
    summary:
      "Cancel an owned download without removing committed Zotero attachments.",
  },
  release: {
    inputSchema: object({ sessionRef: ref }),
    outputSchema: object({ sessionRef: ref, state: { const: "released" } }),
    effect: "state-change",
    summary:
      "Release task pages and unleased temporary files while retaining local authentication.",
  },
};

// Shared contract between the Zotero Agent settings MCP page and the runtime
// MCP owners. This file holds only DTOs and derived binding facts; it performs
// no preference, credential or network access.

/**
 * Primary HTTP authentication of one source. The named field is the exact
 * header whose saved secret the transport sends. `bearer` forms one
 * `Bearer <token>` value at transport resolution; `apiKey` sends the secret
 * unchanged in the user's chosen field. Other header bindings are ordinary
 * credential slots and stay editable on their own.
 */
export type PiMcpSourceAuthentication =
  | { kind: "none" }
  | { kind: "bearer"; field: string }
  | { kind: "apiKey"; field: string };

export type PiMcpSource = {
  id: string;
  label: string;
  transport: "http" | "stdio";
  url?: string;
  executable?: string;
  argv?: string[];
  cwd?: string;
  enabled: boolean;
  authentication: PiMcpSourceAuthentication;
  /**
   * Opaque credential references keyed by exact field identity: a header name
   * for HTTP, an environment variable name for stdio. The key is the field, so
   * a changed field is a different binding and never inherits the previous
   * field's secret.
   */
  credentialSlots: Record<string, string>;
  cleartextApproval?: string;
  localNetworkApproval?: string;
};

/**
 * One guided binding row. An absent or empty `secret` keeps the existing
 * same-field binding; a changed field with no secret is rejected instead of
 * borrowing another field's value.
 */
export type PiMcpBindingInput = { field: string; secret?: string };

/**
 * Guided form state for one source. `bindings` are ordered and authoritative
 * for this save: rows absent from the list are cleared. An empty `cwd` is
 * omitted rather than persisted, so transport resolves the managed runtime
 * directory.
 */
export type PiMcpSourceInput = {
  id: string;
  label: string;
  transport: "http" | "stdio";
  enabled: boolean;
  url?: string;
  executable?: string;
  argv?: string[];
  cwd?: string;
  authentication: PiMcpSourceAuthentication;
  bindings: PiMcpBindingInput[];
  /** Explicit user approval for one exact target origin. */
  approveLocalNetwork?: boolean;
  approveCleartext?: boolean;
};

/**
 * One validated proposed change. Forms, full-document JSON and merge import all
 * normalize into this shape before anything is written.
 */
export type PiMcpSourceChangeSet = {
  /**
   * `authoritative` (guided form) adopts every listed source and leaves
   * unlisted ones alone. `merge` (import preview) keeps a same-name saved
   * source unless `conflicts` says otherwise. `replace` (whole-document
   * save) is `authoritative` plus the removals its impact preview reported.
   */
  mode?: "authoritative" | "merge" | "replace";
  sources: PiMcpSourceInput[];
  /** Explicit source removals. JSON omission never implies removal. */
  removals?: string[];
  /**
   * Same-name policy for a merge that reaches an existing source. Unlisted and
   * `"keep"` retain the saved entry; `"replace"` adopts the incoming one.
   */
  conflicts?: Record<string, "keep" | "replace">;
  /**
   * Registry revision the caller prepared against. A concurrent binding edit
   * makes adoption fail instead of overwriting it.
   */
  expectedRevision?: string;
};

export type PiMcpSourceChangePlan = {
  /** Registry revision this plan was validated against. */
  revision: string;
  /** Validated next registry, free of any secret value. */
  next: PiMcpSource[];
  secretWrites: Array<{ ref: string; label: string; secret: string }>;
  /** Bindings orphaned by this change, cleared only after a successful commit. */
  secretRemovals: string[];
  conflictsKept: string[];
  removals: string[];
  /** Targets whose local-network/cleartext approval the user still must give. */
  approvalsRequired: Array<{
    sourceId: string;
    origin: string;
    cleartext: boolean;
  }>;
};

export type PiMcpImportPreview = {
  change: PiMcpSourceChangeSet;
  /** Literal secrets read from the submitted document, never persisted here. */
  secrets: Array<{ sourceId: string; field: string; value: string }>;
  /** Saved sources a whole-document save would remove or re-decide. */
  impact: { removals: string[]; conflicts: string[] };
};

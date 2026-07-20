/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect } from "preact/hooks";

import { equalBySignature, safeText } from "./regionEquality";
import { PanelAction, type PanelActionHandler } from "./ActionControls";

// Preact port of the imperative renderAssistantHint region
// (src/sidebar/assistantPanelRenderer.js). The equality boundary is exactly
// the legacy hint signature: the interaction object alone (labels resolve
// through the labelOf DI and are intentionally outside the boundary, as with
// the old guard).

export type LabelOfFn = (path: string, fallback: string) => string;

function truncateText(value: unknown, maxLength: number): string {
  const text = safeText(value).replace(/\s+/g, " ");
  const limit = Math.max(0, Number(maxLength || 0) || 0);
  if (!limit || text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit - 1)).trimEnd() + "…";
}

function hintLedTone(kind: string): string {
  if (kind === "running" || kind === "repairing") return "is-running";
  if (kind === "permission" || kind === "auth" || kind === "waiting_user") {
    return "is-warning";
  }
  if (kind === "disconnected" || kind === "error") return "is-error";
  if (kind === "completed") return "is-success";
  return "is-muted";
}

function hintText(
  interaction: Record<string, unknown>,
  kind: string,
  labelOf: LabelOfFn,
): string {
  const explicit = safeText(
    interaction.title || interaction.message || interaction.label,
  );
  if (explicit) return explicit;
  if (kind === "running") {
    return labelOf("interaction.agentWorkingMessage", "Agent is working...");
  }
  if (kind === "repairing") {
    return labelOf(
      "interaction.agentRepairingMessage",
      "Agent is repairing output...",
    );
  }
  if (kind === "waiting_user") {
    return labelOf(
      "interaction.waitingReply",
      "Agent is waiting for your reply.",
    );
  }
  if (kind === "completed") {
    return labelOf(
      "interaction.runResultReady",
      "Run completed. Workflow result is ready.",
    );
  }
  if (kind === "canceled") {
    return labelOf("interaction.runCanceledContinue", "Run canceled.");
  }
  if (kind === "disconnected") {
    return labelOf(
      "interaction.disconnectedRecoverable",
      "Run is disconnected and recoverable. Connect to continue.",
    );
  }
  if (kind === "auth") {
    return labelOf(
      "interaction.authenticationRequiredMessage",
      "Authentication required.",
    );
  }
  return kind;
}

function PermissionSummary(props: {
  interaction: Record<string, unknown>;
  onAction: PanelActionHandler;
  labelOf: LabelOfFn;
}) {
  const { interaction, onAction, labelOf } = props;
  const permission =
    interaction.permission && typeof interaction.permission === "object"
      ? (interaction.permission as Record<string, unknown>)
      : {};
  const review =
    permission.review && typeof permission.review === "object"
      ? (permission.review as Record<string, unknown>)
      : {};
  const summary = safeText(
    interaction.message || permission.summary || permission.toolTitle,
  );
  const detail = safeText(
    review.command || review.preview || interaction.detail,
  );
  const approvalLabel =
    safeText(permission.approvalKind) === "zotero-write"
      ? labelOf("permission.zoteroWriteApproval", "Zotero write approval")
      : labelOf("permission.acpToolApproval", "ACP tool approval");
  const meta = [
    approvalLabel,
    permission.toolTitle,
    permission.toolCallId
      ? labelOf("permission.toolCallId", "Tool call") +
        ": " +
        permission.toolCallId
      : "",
  ]
    .map(safeText)
    .filter(Boolean)
    .join(" · ");
  if (!summary && !meta && !detail) return null;
  return (
    <div class="assistant-panel-permission-summary">
      {summary ? (
        <div class="assistant-panel-permission-summary-text" title={summary}>
          {truncateText(summary, 180)}
        </div>
      ) : null}
      {meta ? <div class="assistant-panel-permission-meta">{meta}</div> : null}
      {detail ? (
        <button
          type="button"
          class="asst-button-compact assistant-panel-permission-view-full-request"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAction("open-permission-request", {});
          }}
        >
          {labelOf("permission.viewFullRequest", "View details")}
        </button>
      ) : null}
    </div>
  );
}

function AuthSection(props: {
  interaction: Record<string, unknown>;
  onAction: PanelActionHandler;
  labelOf: LabelOfFn;
}) {
  const { interaction, onAction, labelOf } = props;
  const auth =
    interaction.auth && typeof interaction.auth === "object"
      ? (interaction.auth as Record<string, unknown>)
      : {};
  const authUrl = safeText(auth.authUrl);
  const authUrlLinkable = /^https?:\/\//i.test(authUrl);
  const diagnostics: Array<[string, string]> = [];
  if (authUrl && !authUrlLinkable) {
    diagnostics.push([labelOf("authUrlPrefix", "auth_url:"), authUrl]);
  }
  const userCode = safeText(auth.userCode);
  if (userCode) {
    diagnostics.push([labelOf("userCodePrefix", "user_code:"), userCode]);
  }
  const lastError = safeText(auth.lastError);
  if (lastError) {
    diagnostics.push([labelOf("lastErrorPrefix", "last_error:"), lastError]);
  }
  const importFiles = Array.isArray(auth.importFiles)
    ? (auth.importFiles as Array<Record<string, unknown>>)
    : [];
  const importPending =
    auth.actionPending === true && safeText(auth.actionKind) === "import";
  return (
    <>
      {safeText(auth.hint) && safeText(auth.phase) === "method_selection" ? (
        <div class="assistant-panel-auth-hint">{safeText(auth.hint)}</div>
      ) : null}
      {authUrlLinkable ? (
        <div class="assistant-panel-auth-diagnostic">
          <span class="assistant-panel-auth-diagnostic-label">
            {labelOf("authUrlPrefix", "auth_url:")}
          </span>
          <a
            class="assistant-panel-auth-link"
            href={authUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              event.preventDefault();
              onAction("open-auth-url", { url: authUrl });
            }}
          >
            {authUrl}
          </a>
        </div>
      ) : null}
      {diagnostics.length > 0 ? (
        <div class="assistant-panel-auth-diagnostics">
          {diagnostics.map(([label, value]) => (
            <div class="assistant-panel-auth-diagnostic" key={label}>
              <span class="assistant-panel-auth-diagnostic-label">{label}</span>
              <span class="assistant-panel-auth-diagnostic-value">{value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {importFiles.length > 0 ? (
        <div class="assistant-panel-auth-import">
          <div class="assistant-panel-auth-import-hint">
            {safeText(auth.hint) ||
              labelOf(
                "authImportHintDefault",
                "Upload required auth files and continue.",
              )}
          </div>
          {auth.importRiskNoticeRequired === true ? (
            <div class="assistant-panel-auth-import-risk">
              {labelOf(
                "authImportRiskNotice",
                "Review files before importing.",
              )}
            </div>
          ) : null}
          {importFiles.map((fileSpec, index) => {
            const spec =
              fileSpec && typeof fileSpec === "object" ? fileSpec : {};
            const name = safeText(
              spec.name ||
                spec.label ||
                spec.filename ||
                "Auth file " + String(index + 1),
            );
            const requiredLabel =
              spec.required === true
                ? labelOf("authImportRequired", "Required")
                : labelOf("authImportOptional", "Optional");
            return (
              <label class="assistant-panel-auth-import-file" key={name}>
                <span class="assistant-panel-auth-import-file-label">
                  {name + " (" + requiredLabel + ")"}
                </span>
                <input
                  class="assistant-panel-auth-import-input"
                  type="file"
                  data-assistant-auth-import-file="true"
                  data-assistant-auth-import-name={safeText(
                    spec.name || spec.filename,
                  )}
                  required={spec.required === true}
                  accept={safeText(spec.accept) || undefined}
                />
                {safeText(spec.hint) ? (
                  <small class="assistant-panel-auth-import-file-hint">
                    {safeText(spec.hint)}
                  </small>
                ) : null}
              </label>
            );
          })}
          <button
            type="button"
            class="asst-button-compact assistant-panel-action"
            disabled={importPending}
            aria-busy={importPending ? "true" : undefined}
            onClick={() => onAction("auth-import-run", {})}
          >
            {importPending
              ? labelOf("authImportSubmitting", "Importing...")
              : labelOf("authImportSubmit", "Import and Continue")}
          </button>
        </div>
      ) : null}
    </>
  );
}

export const HintRegion = memo(
  function HintRegion(props: {
    container: HTMLElement;
    interaction: Record<string, unknown> | null;
    onAction: PanelActionHandler;
    labelOf: LabelOfFn;
  }) {
    const { container, onAction, labelOf } = props;
    const interaction = props.interaction || { kind: "hidden" };
    const kind = safeText(interaction.kind || "hidden");
    useLayoutEffect(() => {
      container.setAttribute("data-assistant-interaction", kind);
      container.classList.toggle("hidden", kind === "hidden");
    }, [container, kind]);
    if (kind === "hidden") return null;
    const pending =
      interaction.pendingInteraction &&
      typeof interaction.pendingInteraction === "object"
        ? (interaction.pendingInteraction as Record<string, unknown>)
        : {};
    const text =
      kind === "waiting_user"
        ? safeText(
            pending.uiHints &&
              typeof pending.uiHints === "object" &&
              (pending.uiHints as Record<string, unknown>).prompt,
          ) ||
          labelOf(
            "interaction.waitingReply",
            "Agent is waiting for your reply.",
          )
        : hintText(interaction, kind, labelOf);
    const actions = Array.isArray(interaction.actions)
      ? (interaction.actions as Array<Record<string, unknown>>)
      : [];
    const optionsList =
      pending.uiHints &&
      typeof pending.uiHints === "object" &&
      Array.isArray((pending.uiHints as Record<string, unknown>).options)
        ? ((pending.uiHints as Record<string, unknown>).options as unknown[])
        : [];
    return (
      <>
        <div class="assistant-panel-hint-row">
          <span class={"asst-led " + hintLedTone(kind)} />
          <span>{text}</span>
        </div>
        {kind === "permission" || kind === "auth" ? (
          <PermissionSummary
            interaction={interaction}
            onAction={onAction}
            labelOf={labelOf}
          />
        ) : null}
        {kind === "auth" && interaction.auth ? (
          <AuthSection
            interaction={interaction}
            onAction={onAction}
            labelOf={labelOf}
          />
        ) : null}
        {(kind === "permission" || kind === "auth") && actions.length > 0 ? (
          <div class="assistant-panel-hint-options assistant-panel-permission-actions">
            {actions.map((action, index) => (
              <PanelAction
                action={action}
                onAction={onAction}
                key={safeText(action.action) || index}
              />
            ))}
          </div>
        ) : null}
        {kind === "waiting_user" && optionsList.length > 0 ? (
          <div class="assistant-panel-hint-options">
            {optionsList.map((entry, index) => {
              const record =
                entry && typeof entry === "object"
                  ? (entry as Record<string, unknown>)
                  : null;
              const value =
                typeof entry === "string"
                  ? entry
                  : safeText(
                      record && (record.value || record.label || record.text),
                    );
              const label =
                typeof entry === "string"
                  ? entry
                  : safeText(
                      record && (record.label || record.value || record.text),
                    );
              return (
                <button
                  type="button"
                  class="asst-button-compact assistant-panel-hint-option"
                  key={index}
                  onClick={() => onAction("reply", { message: value || label })}
                >
                  {label || value}
                </button>
              );
            })}
          </div>
        ) : null}
      </>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(prev.interaction, next.interaction),
);

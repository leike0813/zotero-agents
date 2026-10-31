/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import type {
  SynthesisWorkbenchHomeAction,
  SynthesisWorkbenchHomeRetrievalSelection,
  SynthesisWorkbenchHomeText,
} from "./HomeRegion";

// Home semantic-retrieval panel: nonsecret connection configuration, explicit
// synthetic connection testing, pending identity/scope, and the explicit
// build/rebuild/update/cancel/retry/continue maintenance controls. The editable
// form is local component state; the region selection carries observable state
// only. A credential is a one-shot write-only save payload and never enters a
// selection, log or snapshot.

type RetrievalDraft = {
  id: string;
  name: string;
  protocol: "openai" | "ollama";
  baseUrl: string;
  modelId: string;
  queryPrefix: string;
  documentPrefix: string;
  dimensions: string;
  secret: string;
};

function draftFrom(
  selection: SynthesisWorkbenchHomeRetrievalSelection,
  connectionId?: string,
): RetrievalDraft {
  const connection =
    selection.connections.find((row) => row.id === connectionId) ||
    selection.connections.find((row) => row.primary);
  return {
    id: connection?.id || "",
    name: connection?.name || "",
    protocol: connection?.protocol || "openai",
    baseUrl: connection?.baseUrl || "",
    modelId: connection?.modelId || "",
    queryPrefix: connection?.queryPrefix || "",
    documentPrefix: connection?.documentPrefix || "",
    dimensions: connection?.dimensions ? String(connection.dimensions) : "",
    secret: "",
  };
}

function scopeLibraries(selection: SynthesisWorkbenchHomeRetrievalSelection) {
  const scope = selection.pendingScope || selection.activeScope;
  return (scope?.libraryIds || []).join(", ");
}

function scopeSources(selection: SynthesisWorkbenchHomeRetrievalSelection) {
  const scope = selection.pendingScope || selection.activeScope;
  return (scope?.sourceKinds || []).join(", ");
}

function scopeIncludeTopics(
  selection: SynthesisWorkbenchHomeRetrievalSelection,
) {
  const scope = selection.pendingScope || selection.activeScope;
  return scope?.includeTopics === true;
}

function parseLibraries(value: string): number[] {
  return value
    .split(/[,\s]+/)
    .map((entry) => Math.floor(Number(entry)))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
}

function parseSources(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function identityLabel(
  t: SynthesisWorkbenchHomeText,
  identity: { modelId: string; dimensions: number } | undefined,
): string {
  return identity
    ? t("synthesis-retrieval-identity", {
        model: identity.modelId,
        dimensions: identity.dimensions,
      })
    : t("synthesis-retrieval-none");
}

function RetrievalActionButton(props: {
  label: string;
  command: string;
  args?: Record<string, unknown>;
  disabled?: boolean;
  pending: string[];
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const busy = props.pending.includes(props.command);
  return (
    <button
      type="button"
      class={busy ? "is-busy" : ""}
      disabled={props.disabled || busy}
      aria-busy={busy ? "true" : undefined}
      onClick={() =>
        props.onAction("hostCommand", {
          command: props.command,
          ...(props.args ? { args: props.args } : {}),
        })
      }
    >
      {busy ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.label}
    </button>
  );
}

export function RetrievalPanel(props: {
  selection: SynthesisWorkbenchHomeRetrievalSelection;
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const { selection, t, onAction } = props;
  const retrieval = selection;
  const [draft, setDraft] = useState<RetrievalDraft>(() =>
    draftFrom(retrieval),
  );
  const [primary, setPrimary] = useState(retrieval.primaryConnectionId);
  const [enabled, setEnabled] = useState(retrieval.enabled);
  const [fallbacks, setFallbacks] = useState<string[]>(
    retrieval.fallbackConnectionIds,
  );
  const [libraries, setLibraries] = useState(() => scopeLibraries(retrieval));
  const [sources, setSources] = useState(() => scopeSources(retrieval));
  const [includeTopics, setIncludeTopics] = useState(() =>
    scopeIncludeTopics(retrieval),
  );
  const seededFormKey = useRef(retrieval.formKey);

  // formKey tracks saved configuration only. Progress, publication, active
  // index scope and connection test results change the region signature but
  // must never rebuild the draft or clobber unsaved input.
  useLayoutEffect(() => {
    if (seededFormKey.current === retrieval.formKey) return;
    seededFormKey.current = retrieval.formKey;
    setDraft(draftFrom(retrieval, retrieval.primaryConnectionId));
    setEnabled(retrieval.enabled);
    setPrimary(retrieval.primaryConnectionId);
    setFallbacks(retrieval.fallbackConnectionIds);
    setLibraries(scopeLibraries(retrieval));
    setSources(scopeSources(retrieval));
    setIncludeTopics(scopeIncludeTopics(retrieval));
  }, [retrieval]);

  const patchDraft = (patch: Partial<RetrievalDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const toggleFallback = (id: string, enabled: boolean) =>
    setFallbacks((current) =>
      enabled
        ? Array.from(new Set([...current, id]))
        : current.filter((entry) => entry !== id),
    );

  const scopeArgs = () => ({
    libraryIds: parseLibraries(libraries),
    sourceKinds: parseSources(sources),
    includeTopics,
  });
  const parsedDimensions = Math.floor(Number(draft.dimensions));
  const explicitDimensions =
    draft.dimensions.trim() !== "" &&
    Number.isFinite(parsedDimensions) &&
    parsedDimensions > 0
      ? parsedDimensions
      : undefined;
  const maintenanceArgs = {
    identity: retrieval.pendingIdentity || null,
    scope: retrieval.pendingScope || retrieval.activeScope || null,
  };
  const maintenance = retrieval.maintenance;
  const maintenanceStatus = maintenance?.status;
  const maintenanceRunning =
    maintenanceStatus === "pending" || maintenanceStatus === "running";
  // Cancel applies to an in-flight run; retry to a failed or canceled one; and
  // continue only resumes a pending continuation-required run. They are
  // distinct states, so one shared flag cannot gate all three buttons.
  const canCancel = maintenanceRunning;
  const canRetry =
    maintenanceStatus === "failed" || maintenanceStatus === "canceled";
  // Continue only resumes a run that is explicitly continuation-required; a
  // freshly queued pending run is not continuable.
  const canContinue =
    maintenanceStatus === "pending" &&
    maintenance?.phase === "continuation_required";
  const canBuild = Boolean(retrieval.pendingIdentity);
  // Cleanup is the post-publication required tail (it also refreshes candidate
  // Discovery work); it is also the recovery route after a failed/canceled run.
  const canCleanup =
    !maintenanceRunning && (Boolean(retrieval.publication) || canRetry);
  const statusKey =
    retrieval.status === "ready"
      ? "synthesis-retrieval-status-ready"
      : retrieval.status === "paused"
        ? "synthesis-retrieval-status-paused"
        : "synthesis-retrieval-status-missing";

  return (
    <section class="workspace-section retrieval-panel">
      <div class="section-heading">
        <h2>{t("synthesis-home-retrieval")}</h2>
        <span class={retrieval.enabled ? "badge ok" : "badge warn"}>
          {retrieval.enabled
            ? t("synthesis-retrieval-enabled")
            : t("synthesis-retrieval-disabled")}
        </span>
      </div>
      <div class="retrieval-summary">
        <div class="retrieval-summary-item">
          <span class="retrieval-summary-label">
            {t("synthesis-retrieval-active-index")}
          </span>
          <strong class="retrieval-summary-value">
            {identityLabel(t, retrieval.activeIdentity)}
          </strong>
          <span class="retrieval-summary-detail">{t(statusKey)}</span>
        </div>
        <div class="retrieval-summary-item">
          <span class="retrieval-summary-label">
            {t("synthesis-retrieval-pending-index")}
          </span>
          <strong class="retrieval-summary-value">
            {identityLabel(t, retrieval.pendingIdentity)}
          </strong>
          <span class="retrieval-summary-detail">
            {retrieval.publication || t("synthesis-retrieval-not-published")}
          </span>
        </div>
        <div class="retrieval-summary-item">
          <span class="retrieval-summary-label">
            {t("synthesis-retrieval-progress-label")}
          </span>
          <strong class="retrieval-summary-value">
            {t("synthesis-retrieval-progress", {
              completed: retrieval.progress.completedGroups,
              total: retrieval.progress.totalGroups,
            })}
          </strong>
          <span class="retrieval-summary-detail">
            {t("synthesis-retrieval-progress-detail", {
              fragments: retrieval.progress.completedFragments,
              missing: retrieval.progress.missingGroups,
              failed: retrieval.progress.failedGroups,
            })}
          </span>
        </div>
      </div>
      <div class="retrieval-counters">
        <span class="badge warn">
          {t("synthesis-retrieval-coverage", {
            count: retrieval.progress.missingGroups,
          })}
        </span>
        <span class="badge danger">
          {t("synthesis-retrieval-failures", {
            count: retrieval.progress.failedGroups,
          })}
        </span>
        {retrieval.updatedAt ? (
          <span class="muted">
            {t("synthesis-retrieval-updated", { time: retrieval.updatedAt })}
          </span>
        ) : null}
      </div>
      {retrieval.issues.length ? (
        <div class="retrieval-issues">
          {retrieval.issues.map((issue, index) => (
            <div class="retrieval-issue" key={String(issue.code) + ":" + index}>
              <span class="badge danger">{issue.code}</span>
              <span class="muted">
                {issue.sourceKind || "-"} · {issue.affectedCount}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div class="retrieval-connections">
        <h3>{t("synthesis-retrieval-connections")}</h3>
        {retrieval.connections.length === 0 ? (
          <p class="muted">{t("synthesis-retrieval-no-connections")}</p>
        ) : (
          <ul class="retrieval-connection-list">
            {retrieval.connections.map((connection) => (
              <li
                class="retrieval-connection"
                key={connection.id || connection.name}
              >
                <div class="retrieval-connection-head">
                  <strong>{connection.name || connection.id}</strong>
                  <span class="badge blue">{connection.protocol}</span>
                  {connection.primary ? (
                    <span class="badge ok">
                      {t("synthesis-retrieval-primary")}
                    </span>
                  ) : null}
                  {connection.fallback ? (
                    <span class="badge info">
                      {t("synthesis-retrieval-fallback")}
                    </span>
                  ) : null}
                </div>
                <span class="muted">
                  {connection.tested && connection.dimensions
                    ? t("synthesis-retrieval-connection-dimensions", {
                        dimensions: connection.dimensions,
                      })
                    : t("synthesis-retrieval-connection-untested")}
                </span>
                <div class="retrieval-connection-actions">
                  <RetrievalActionButton
                    label={t("synthesis-action-retrieval-test")}
                    command="retrievalTestConnection"
                    args={{ connectionId: connection.id }}
                    disabled={!connection.id}
                    pending={props.pendingOperationKeys}
                    onAction={onAction}
                  />
                  <button
                    type="button"
                    class="retrieval-connection-edit"
                    disabled={!connection.id}
                    onClick={() =>
                      setDraft(draftFrom(retrieval, connection.id))
                    }
                  >
                    {t("synthesis-action-edit")}
                  </button>
                  <button
                    type="button"
                    class="retrieval-connection-delete"
                    disabled={!connection.id}
                    onClick={() =>
                      onAction("hostCommand", {
                        command: "retrievalSaveSettings",
                        args: { removeConnectionId: connection.id },
                      })
                    }
                  >
                    {t("synthesis-action-delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        class="retrieval-form"
        onSubmit={(event) => {
          event.preventDefault();
          onAction("hostCommand", {
            command: "retrievalSaveSettings",
            args: {
              connection: {
                ...(draft.id ? { id: draft.id } : {}),
                name: draft.name,
                protocol: draft.protocol,
                baseUrl: draft.baseUrl,
                modelId: draft.modelId,
                queryPrefix: draft.queryPrefix,
                documentPrefix: draft.documentPrefix,
                ...(explicitDimensions === undefined
                  ? {}
                  : { dimensions: explicitDimensions }),
              },
              enabled,
              ...(draft.secret ? { secret: draft.secret } : {}),
              primaryConnectionId: primary || null,
              fallbackConnectionIds: fallbacks,
              scope: scopeArgs(),
            },
          });
          patchDraft({ secret: "" });
        }}
      >
        <label class="retrieval-field retrieval-field-enabled">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) =>
              setEnabled((event.target as HTMLInputElement).checked)
            }
          />
          <span>{t("synthesis-retrieval-enabled")}</span>
        </label>
        <label class="retrieval-field retrieval-field-name">
          <span>{t("synthesis-retrieval-field-name")}</span>
          <input
            type="text"
            value={draft.name}
            onInput={(event) =>
              patchDraft({ name: (event.target as HTMLInputElement).value })
            }
          />
        </label>
        <label class="retrieval-field">
          <span>{t("synthesis-retrieval-field-protocol")}</span>
          <select
            value={draft.protocol}
            onChange={(event) =>
              patchDraft({
                protocol: (event.target as HTMLSelectElement)
                  .value as RetrievalDraft["protocol"],
              })
            }
          >
            <option value="openai">openai</option>
            <option value="ollama">ollama</option>
          </select>
        </label>
        <label class="retrieval-field">
          <span>{t("synthesis-retrieval-field-base-url")}</span>
          <input
            type="text"
            value={draft.baseUrl}
            onInput={(event) =>
              patchDraft({ baseUrl: (event.target as HTMLInputElement).value })
            }
          />
        </label>
        <label class="retrieval-field retrieval-field-model">
          <span>{t("synthesis-retrieval-field-model")}</span>
          <input
            type="text"
            value={draft.modelId}
            onInput={(event) =>
              patchDraft({ modelId: (event.target as HTMLInputElement).value })
            }
          />
        </label>
        <label class="retrieval-field retrieval-field-dimensions">
          <span>{t("synthesis-column-dimension")}</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.dimensions}
            onInput={(event) =>
              patchDraft({
                dimensions: (event.target as HTMLInputElement).value,
              })
            }
          />
        </label>
        <label class="retrieval-field">
          <span>{t("synthesis-retrieval-field-query-prefix")}</span>
          <input
            type="text"
            value={draft.queryPrefix}
            onInput={(event) =>
              patchDraft({
                queryPrefix: (event.target as HTMLInputElement).value,
              })
            }
          />
        </label>
        <label class="retrieval-field">
          <span>{t("synthesis-retrieval-field-document-prefix")}</span>
          <input
            type="text"
            value={draft.documentPrefix}
            onInput={(event) =>
              patchDraft({
                documentPrefix: (event.target as HTMLInputElement).value,
              })
            }
          />
        </label>
        <label class="retrieval-field">
          <span>{t("synthesis-retrieval-field-secret")}</span>
          <input
            type="password"
            autocomplete="off"
            value={draft.secret}
            onInput={(event) =>
              patchDraft({ secret: (event.target as HTMLInputElement).value })
            }
          />
          <span class="retrieval-field-note">
            {t("synthesis-retrieval-secret-note")}
          </span>
        </label>
        <label class="retrieval-field">
          <span>{t("synthesis-retrieval-field-libraries")}</span>
          <input
            type="text"
            value={libraries}
            onInput={(event) =>
              setLibraries((event.target as HTMLInputElement).value)
            }
          />
        </label>
        <label class="retrieval-field">
          <span>{t("synthesis-retrieval-field-sources")}</span>
          <input
            type="text"
            value={sources}
            onInput={(event) =>
              setSources((event.target as HTMLInputElement).value)
            }
          />
        </label>
        <label class="retrieval-field retrieval-field-checkbox">
          <input
            type="checkbox"
            checked={includeTopics}
            onChange={(event) =>
              setIncludeTopics((event.target as HTMLInputElement).checked)
            }
          />
          <span>{t("synthesis-retrieval-field-include-topics")}</span>
        </label>
        <label class="retrieval-field retrieval-primary">
          <span>{t("synthesis-retrieval-primary")}</span>
          <select
            value={primary}
            onChange={(event) =>
              setPrimary((event.target as HTMLSelectElement).value)
            }
          >
            <option value="">{t("synthesis-retrieval-none")}</option>
            {retrieval.connections.map((connection) => (
              <option value={connection.id} key={connection.id}>
                {connection.name || connection.id}
              </option>
            ))}
          </select>
        </label>
        <div class="retrieval-field retrieval-fallbacks">
          <span>{t("synthesis-retrieval-fallback")}</span>
          {retrieval.connections.map((connection) => (
            <label class="retrieval-fallback-option" key={connection.id}>
              <input
                type="checkbox"
                checked={fallbacks.includes(connection.id)}
                onChange={(event) =>
                  toggleFallback(
                    connection.id,
                    (event.target as HTMLInputElement).checked,
                  )
                }
              />
              <span>{connection.name || connection.id}</span>
            </label>
          ))}
        </div>
        <div class="toolbar retrieval-toolbar">
          <button
            type="submit"
            class={
              props.pendingOperationKeys.includes("retrievalSaveSettings")
                ? "is-busy"
                : ""
            }
            disabled={props.pendingOperationKeys.includes(
              "retrievalSaveSettings",
            )}
            aria-busy={
              props.pendingOperationKeys.includes("retrievalSaveSettings")
                ? "true"
                : undefined
            }
          >
            {props.pendingOperationKeys.includes("retrievalSaveSettings") ? (
              <span class="button-spinner" aria-hidden="true" />
            ) : null}
            {t("synthesis-action-retrieval-save")}
          </button>
          <RetrievalActionButton
            label={t("synthesis-action-retrieval-build")}
            command="retrievalBuildIndex"
            args={maintenanceArgs}
            disabled={!canBuild || maintenanceRunning}
            pending={props.pendingOperationKeys}
            onAction={onAction}
          />
          <RetrievalActionButton
            label={t("synthesis-action-retrieval-rebuild")}
            command="retrievalRebuildIndex"
            args={maintenanceArgs}
            disabled={!canBuild || maintenanceRunning}
            pending={props.pendingOperationKeys}
            onAction={onAction}
          />
          <RetrievalActionButton
            label={t("synthesis-action-retrieval-update")}
            command="retrievalUpdateIndex"
            args={maintenanceArgs}
            disabled={!canBuild || maintenanceRunning}
            pending={props.pendingOperationKeys}
            onAction={onAction}
          />
          <RetrievalActionButton
            label={t("synthesis-action-retrieval-cancel")}
            command="retrievalCancelIndex"
            args={
              maintenance ? { operationId: maintenance.operationId } : undefined
            }
            disabled={!canCancel}
            pending={props.pendingOperationKeys}
            onAction={onAction}
          />
          <RetrievalActionButton
            label={t("synthesis-action-retrieval-retry")}
            command="retrievalRetryIndex"
            args={
              maintenance ? { operationId: maintenance.operationId } : undefined
            }
            disabled={!canRetry}
            pending={props.pendingOperationKeys}
            onAction={onAction}
          />
          <RetrievalActionButton
            label={t("synthesis-action-retrieval-continue")}
            command="retrievalContinueIndex"
            args={
              maintenance ? { operationId: maintenance.operationId } : undefined
            }
            disabled={!canContinue}
            pending={props.pendingOperationKeys}
            onAction={onAction}
          />
          <RetrievalActionButton
            label={t("synthesis-action-retrieval-cleanup")}
            command="retrievalCleanupIndex"
            disabled={!canCleanup}
            pending={props.pendingOperationKeys}
            onAction={onAction}
          />
        </div>
      </form>
    </section>
  );
}

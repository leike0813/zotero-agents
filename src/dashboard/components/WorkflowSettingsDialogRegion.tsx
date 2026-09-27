/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  WorkflowSettingsDialogActionName,
  WorkflowSettingsDialogActionHandler,
} from "../../shared/dashboardWireContract";
import {
  CustomSelectIsland,
  WorkflowSettingsSection,
  cloneWorkflowSettingsRecord,
  type WorkflowFieldCommitterRegistrar,
  type WorkflowFieldRowPresentation,
  type WorkflowFieldTexts,
  type WorkflowSettingsSchemaEntry,
  type WorkflowSettingsSectionPresentation,
} from "./WorkflowOptionsRegion";

// Workflow settings dialog surface: the standalone settings dialog ported
// from addon/content/dashboard/workflow-settings-dialog.js onto the shared
// form engine (WorkflowOptionsRegion). Action names and payload shapes are
// frozen protocol (envelope { type: "workflow-settings-dialog:action",
// action, payload }):
//   ready                              {}
//   update-draft                       { executionOptions: { backendId,
//                                        workflowParams, providerOptions,
//                                        runOptions, hostOptions },
//                                        changedSection, changedKey,
//                                        changedOrigin }
//   toggle-persist                     { checked }
//   resize-to-content                  { contentHeight }
//   refresh-acp-runtime-cache          { executionOptions }
//   refresh-skillrunner-model-cache    { executionOptions }
//   confirm                            { executionOptions }
//   cancel                             {}
//
// Differences from the dashboard inline form, all reproduced here through the
// engine's presentation props:
//   - the draft carries a fifth runOptions section (rendered only when
//     runSchemaEntries is non-empty);
//   - provider-conditional visibility always reads draft.providerOptions,
//     even for workflowParams/runOptions rows;
//   - disabled entries render their real control disabled instead of a
//     placeholder; rows carry data-workflow-settings-field-section and
//     controls data-workflow-settings-control-key anchors;
//   - confirm and cache-refresh clicks first drain every control through the
//     registered committers (silent commit); any failure aborts the action;
//   - the draft resets exactly when formStructureSignature changes;
//   - multi-unit layout mounts the execution-unit preview and host queue
//     cards in a dedicated column.
//
// All user-visible copy arrives pre-resolved in snapshot.labels.

function toText(value: unknown): string {
  return String(value == null ? "" : value);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Wire narrowing
// ---------------------------------------------------------------------------

export type WorkflowSettingsDialogLabels = Record<string, string>;

export type WorkflowSettingsDialogProfile = {
  id: string;
  label: string;
};

export type WorkflowSettingsDialogExecutionUnit = {
  unitId: string;
  taskName: string;
  memberCount: number;
};

export type WorkflowSettingsDialogPreview = {
  status: string;
  units: WorkflowSettingsDialogExecutionUnit[];
};

export type WorkflowSettingsDialogLayout = {
  mode: string;
  showExecutionUnitPreview: boolean;
  showHostMaximumConcurrency: boolean;
};

export type WorkflowSettingsDialogForm = {
  requiresBackendProfile: boolean;
  profileEditable: boolean;
  profileMissing: boolean;
  profiles: WorkflowSettingsDialogProfile[];
  selectedProfile: string;
  workflowSchemaEntries: WorkflowSettingsSchemaEntry[];
  providerSchemaEntries: WorkflowSettingsSchemaEntry[];
  runSchemaEntries: WorkflowSettingsSchemaEntry[];
  workflowParams: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  runOptions: Record<string, unknown>;
  hostOptions: Record<string, unknown>;
  executionUnitPreview: WorkflowSettingsDialogPreview;
  layout: WorkflowSettingsDialogLayout;
  canRefreshAcpRuntimeCache: boolean;
  canRefreshSkillRunnerModelCache: boolean;
};

export type WorkflowSettingsDialogSelection = {
  // Incremented by the entry for every host message so equal-content
  // snapshots still re-render (refresh-button busy state resets on any
  // snapshot, matching the legacy message handler).
  snapshotRevision: number;
  title: string;
  labels: WorkflowSettingsDialogLabels;
  workflow: { id: string; label: string; providerId: string };
  form: WorkflowSettingsDialogForm;
  persistChecked: boolean;
};

export type WorkflowSettingsDialogAction = WorkflowSettingsDialogActionName;

function narrowSchemaEntries(value: unknown): WorkflowSettingsSchemaEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (entry) => entry && typeof entry === "object" && !Array.isArray(entry),
    )
    .map((entry) => ({
      ...(entry as Record<string, unknown>),
      key: toText((entry as Record<string, unknown>).key),
    })) as WorkflowSettingsSchemaEntry[];
}

function narrowLabels(value: unknown): WorkflowSettingsDialogLabels {
  const raw = asRecord(value);
  const labels: WorkflowSettingsDialogLabels = {};
  for (const [key, entry] of Object.entries(raw)) {
    labels[key] = toText(entry);
  }
  return labels;
}

export function projectWorkflowSettingsDialogSelection(
  raw: unknown,
  snapshotRevision: number,
): WorkflowSettingsDialogSelection | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const labels = narrowLabels(source.labels);
  const workflow = asRecord(source.workflow);
  const rawForm = asRecord(source.form);
  const rawPreview = asRecord(rawForm.executionUnitPreview);
  const rawLayout = asRecord(rawForm.layout);
  const title = toText(source.title) || toText(labels.title).trim();
  return {
    snapshotRevision,
    title,
    labels,
    workflow: {
      id: toText(workflow.id || workflow.workflowId || workflow.key),
      label: toText(workflow.label),
      providerId: toText(workflow.providerId),
    },
    form: {
      requiresBackendProfile: rawForm.requiresBackendProfile === true,
      profileEditable: rawForm.profileEditable === true,
      profileMissing: rawForm.profileMissing === true,
      profiles: (Array.isArray(rawForm.profiles) ? rawForm.profiles : [])
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          id: toText((entry as Record<string, unknown>).id),
          label: toText((entry as Record<string, unknown>).label),
        })),
      selectedProfile: toText(rawForm.selectedProfile),
      workflowSchemaEntries: narrowSchemaEntries(rawForm.workflowSchemaEntries),
      providerSchemaEntries: narrowSchemaEntries(rawForm.providerSchemaEntries),
      runSchemaEntries: narrowSchemaEntries(rawForm.runSchemaEntries),
      workflowParams: asRecord(rawForm.workflowParams),
      providerOptions: asRecord(rawForm.providerOptions),
      runOptions: asRecord(rawForm.runOptions),
      hostOptions: asRecord(rawForm.hostOptions),
      executionUnitPreview: {
        status: toText(rawPreview.status),
        units: (Array.isArray(rawPreview.units) ? rawPreview.units : [])
          .filter((unit) => unit && typeof unit === "object")
          .map((unit) => {
            const record = unit as Record<string, unknown>;
            return {
              unitId: toText(record.unitId),
              taskName: toText(record.taskName),
              memberCount: Number(record.memberCount || 0),
            };
          }),
      },
      layout: {
        mode: toText(rawLayout.mode),
        showExecutionUnitPreview: rawLayout.showExecutionUnitPreview === true,
        showHostMaximumConcurrency:
          rawLayout.showHostMaximumConcurrency === true,
      },
      canRefreshAcpRuntimeCache: rawForm.canRefreshAcpRuntimeCache === true,
      canRefreshSkillRunnerModelCache:
        rawForm.canRefreshSkillRunnerModelCache === true,
    },
    persistChecked: source.persistChecked !== false,
  };
}

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

export type WorkflowSettingsDialogDraft = {
  backendId: string;
  workflowParams: Record<string, unknown>;
  providerOptions: Record<string, unknown>;
  runOptions: Record<string, unknown>;
  hostOptions: Record<string, unknown>;
};

export function createWorkflowSettingsDialogDraft(
  form: WorkflowSettingsDialogForm,
): WorkflowSettingsDialogDraft {
  const maxConcurrency = form.hostOptions.maxConcurrency;
  return {
    backendId: toText(form.selectedProfile).trim(),
    workflowParams: cloneWorkflowSettingsRecord(form.workflowParams),
    providerOptions: cloneWorkflowSettingsRecord(form.providerOptions),
    runOptions: cloneWorkflowSettingsRecord(form.runOptions),
    hostOptions:
      typeof maxConcurrency === "number" &&
      Number.isSafeInteger(maxConcurrency) &&
      maxConcurrency > 0
        ? { queue: { maxConcurrency } }
        : {},
  };
}

export function buildWorkflowSettingsDialogExecutionOptions(
  draft: WorkflowSettingsDialogDraft,
): Record<string, unknown> {
  return {
    backendId: toText(draft.backendId).trim(),
    workflowParams: cloneWorkflowSettingsRecord(draft.workflowParams),
    providerOptions: cloneWorkflowSettingsRecord(draft.providerOptions),
    runOptions: cloneWorkflowSettingsRecord(draft.runOptions),
    hostOptions: cloneWorkflowSettingsRecord(draft.hostOptions),
  };
}

// Draft reset key: a faithful port of the legacy formStructureSignature. The
// summary deliberately covers only structure-bearing content (identity,
// profile list and schema entry shape); title/min/max edits do not reset the
// draft.
export function workflowSettingsDialogStructureKey(
  selection: WorkflowSettingsDialogSelection,
): string {
  const form = selection.form;
  const summarizeEntries = (entries: WorkflowSettingsSchemaEntry[]) =>
    entries.map((entry) => ({
      key: toText(entry && entry.key),
      type: toText(entry && entry.type),
      placeholder: toText(entry && entry.placeholder),
      allowCustom: entry.allowCustom === true,
      required: entry.required === true,
      disabled: entry.disabled === true,
      visibleIfProviderOption: entry.visibleIfProviderOption
        ? {
            key: toText(entry.visibleIfProviderOption.key),
            equals: entry.visibleIfProviderOption.equals === true,
          }
        : null,
      enumValues: Array.isArray(entry.enumValues) ? entry.enumValues : [],
      options: Array.isArray(entry.options)
        ? entry.options.map((option) => ({
            value: toText(option && option.value),
            label: toText(option && option.label),
          }))
        : [],
    }));
  return JSON.stringify({
    workflowId: selection.workflow.id || selection.workflow.label,
    providerId: selection.workflow.providerId,
    selectedProfile: toText(form.selectedProfile),
    requiresBackendProfile: form.requiresBackendProfile === true,
    profileEditable: form.profileEditable === true,
    profiles: form.profiles.map((profile) => ({
      id: toText(profile.id),
      label: toText(profile.label),
    })),
    workflowSchemaEntries: summarizeEntries(form.workflowSchemaEntries),
    providerSchemaEntries: summarizeEntries(form.providerSchemaEntries),
    runSchemaEntries: summarizeEntries(form.runSchemaEntries),
  });
}

// ---------------------------------------------------------------------------
// Presentation constants (dialog chrome, distinct from the dashboard inline
// form defaults)
// ---------------------------------------------------------------------------

const DIALOG_FIELD_PRESENTATION_BASE: WorkflowFieldRowPresentation = {
  rowClassName: "field-row",
  labelClassName: "field-label",
  labelWarningClassName: "field-label-warning",
  controlClassName: "field-control",
  errorClassName: "field-error",
  selectControlClassName: "",
  wrapControl: true,
  controlWrapClassName: "field-input-col",
  labelElement: "div",
  showDescription: false,
  disabledMode: "disable-control",
  plainTextRequiredAttr: true,
  booleanBare: true,
  checkboxClassName: "field-checkbox-control",
  comboClassName: "",
  comboNumericClass: true,
};

const DIALOG_SECTION_PRESENTATION: WorkflowSettingsSectionPresentation = {
  cardClassName: "settings-card",
  titleClassName: "settings-card-title",
  emptyClassName: "settings-empty",
};

function dialogFieldPresentation(
  changedSection: string,
): WorkflowFieldRowPresentation {
  return {
    ...DIALOG_FIELD_PRESENTATION_BASE,
    controlKeyPrefix: changedSection,
  };
}

// ---------------------------------------------------------------------------
// Execution unit preview card
// ---------------------------------------------------------------------------

export function isExecutionUnitPreviewVisible(
  form: WorkflowSettingsDialogForm,
): boolean {
  return (
    form.executionUnitPreview.status === "failure" ||
    form.layout.showExecutionUnitPreview === true
  );
}

export function ExecutionUnitPreviewCard(props: {
  form: WorkflowSettingsDialogForm;
  labels: WorkflowSettingsDialogLabels;
}) {
  const preview = props.form.executionUnitPreview;
  return (
    <section class="settings-card workflow-execution-unit-preview">
      <h2 class="settings-card-title">
        {toText(props.labels.workflowExecutionUnitsTitle)}
      </h2>
      {preview.status === "failure" ? (
        <div class="settings-error">
          {toText(props.labels.workflowExecutionUnitsUnavailable)}
        </div>
      ) : (
        <div class="workflow-execution-unit-list">
          {preview.units.map((unit) => (
            <div
              key={unit.unitId || unit.taskName}
              class="workflow-execution-unit-row"
              title={toText(unit.taskName)}
            >
              <span class="workflow-execution-unit-task">
                {toText(unit.taskName)}
              </span>
              {Number.isSafeInteger(unit.memberCount) &&
              unit.memberCount > 1 ? (
                <span class="workflow-execution-unit-input">
                  {`×${unit.memberCount}`}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Host queue options card
// ---------------------------------------------------------------------------

export function isHostQueueCardVisible(
  form: WorkflowSettingsDialogForm,
): boolean {
  return form.layout.showHostMaximumConcurrency === true;
}

export function HostQueueOptionsCard(props: {
  labels: WorkflowSettingsDialogLabels;
  draft: WorkflowSettingsDialogDraft;
  registerCommitter?: WorkflowFieldCommitterRegistrar;
  onCommit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [invalid, setInvalid] = useState(false);

  const collect = (notify: boolean): boolean => {
    const input = inputRef.current;
    if (!input) {
      return true;
    }
    const raw = toText(input.value).trim();
    const parsed = raw ? Number(raw) : 0;
    const valid = !raw || (Number.isSafeInteger(parsed) && parsed >= 0);
    setInvalid(!valid);
    if (!valid) {
      return false;
    }
    props.draft.hostOptions =
      !raw || parsed === 0 ? {} : { queue: { maxConcurrency: parsed } };
    if (notify === true) {
      props.onCommit();
    }
    return true;
  };

  const collectRef = useRef(collect);
  collectRef.current = collect;

  // preact/compat remaps onChange to the input event; the legacy commit
  // semantics need the native change event (same reasoning as the shared
  // field engine).
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    const commit = () => collectRef.current(true);
    input.addEventListener("change", commit);
    return () => {
      input.removeEventListener("change", commit);
    };
  }, []);

  const registerCommitter = props.registerCommitter;
  useLayoutEffect(() => {
    if (!registerCommitter) {
      return;
    }
    return registerCommitter(() => collectRef.current(false));
  }, [registerCommitter]);

  const queue = asRecord(props.draft.hostOptions.queue);
  const maxConcurrency = queue.maxConcurrency;
  const initialValue =
    typeof maxConcurrency === "number" && Number.isFinite(maxConcurrency)
      ? String(maxConcurrency)
      : "";

  return (
    <section class="settings-card workflow-host-options">
      <h2 class="settings-card-title">
        {toText(props.labels.workflowHostOptionsTitle)}
      </h2>
      <div class="field-row">
        <label class="field-label" htmlFor="workflow-host-max-concurrency">
          {toText(props.labels.workflowMaximumConcurrencyLabel)}
        </label>
        <div class="field-input-col">
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            id="workflow-host-max-concurrency"
            class="field-control numeric"
            placeholder={toText(
              props.labels.workflowMaximumConcurrencyUnlimited,
            )}
            defaultValue={initialValue}
            data-workflow-settings-control-key="hostOptions.queue.maxConcurrency"
            aria-invalid={invalid ? "true" : "false"}
          />
          <div class="field-error" hidden={!invalid}>
            {toText(props.labels.workflowMaximumConcurrencyInvalid)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export type WorkflowSettingsDialogRegionProps = {
  selection: WorkflowSettingsDialogSelection;
  onAction: WorkflowSettingsDialogActionHandler;
};

export const WorkflowSettingsDialogRegion = memo(
  function WorkflowSettingsDialogRegion(
    props: WorkflowSettingsDialogRegionProps,
  ) {
    const { selection, onAction } = props;
    const form = selection.form;
    const labels = selection.labels;

    const structureKey = workflowSettingsDialogStructureKey(selection);
    const draftRef = useRef<{
      key: string;
      draft: WorkflowSettingsDialogDraft;
    } | null>(null);
    if (!draftRef.current || draftRef.current.key !== structureKey) {
      draftRef.current = {
        key: structureKey,
        draft: createWorkflowSettingsDialogDraft(form),
      };
    }
    const draft = draftRef.current.draft;

    // Silent-commit registry drained by confirm and cache-refresh clicks
    // (legacy fieldCollectors / flushDraftFromControls).
    const [committers] = useState(() => new Set<() => boolean>());
    const [registrar] = useState<WorkflowFieldCommitterRegistrar>(
      () => (commit: () => boolean) => {
        committers.add(commit);
        return () => {
          committers.delete(commit);
        };
      },
    );

    const [, setRevision] = useState(0);
    const shellRef = useRef<HTMLDivElement | null>(null);
    const resizeFrameRef = useRef<number | null>(null);

    // Refresh busy state resets when any snapshot message arrives; the entry
    // mints a fresh selection object per message, so identity comparison is
    // enough.
    const [busyMark, setBusyMark] = useState<{
      key: "acp" | "skillrunner";
      selection: WorkflowSettingsDialogSelection;
    } | null>(null);
    const busyKey =
      busyMark && busyMark.selection === selection ? busyMark.key : null;

    const scheduleResize = () => {
      if (
        typeof window === "undefined" ||
        typeof window.requestAnimationFrame !== "function"
      ) {
        return;
      }
      if (
        resizeFrameRef.current !== null &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        const shell = shellRef.current;
        if (!shell) {
          return;
        }
        const root = shell.parentElement;
        const rootStyle = root ? window.getComputedStyle(root) : null;
        const paddingTop =
          Number.parseFloat((rootStyle && rootStyle.paddingTop) || "0") || 0;
        const paddingBottom =
          Number.parseFloat((rootStyle && rootStyle.paddingBottom) || "0") || 0;
        const shellHeight = Math.max(
          Number(shell.scrollHeight) || 0,
          Number(shell.getBoundingClientRect().height) || 0,
        );
        const contentHeight = Math.ceil(
          shellHeight + paddingTop + paddingBottom,
        );
        if (contentHeight > 0) {
          onAction("resize-to-content", { contentHeight });
        }
      });
    };

    useLayoutEffect(() => {
      scheduleResize();
    }, [selection]);
    useLayoutEffect(
      () => () => {
        if (
          resizeFrameRef.current !== null &&
          typeof window.cancelAnimationFrame === "function"
        ) {
          window.cancelAnimationFrame(resizeFrameRef.current);
        }
        resizeFrameRef.current = null;
      },
      [],
    );

    const emitUpdateDraft = (meta: {
      changedSection?: string;
      changedKey?: string;
      changedOrigin?: string;
    }) => {
      onAction("update-draft", {
        executionOptions: buildWorkflowSettingsDialogExecutionOptions(draft),
        changedSection:
          typeof meta.changedSection === "string" ? meta.changedSection : "",
        changedKey: typeof meta.changedKey === "string" ? meta.changedKey : "",
        changedOrigin:
          typeof meta.changedOrigin === "string" ? meta.changedOrigin : "",
      });
      scheduleResize();
    };

    const handleSectionChange = (meta: {
      changedSection?: string;
      changedKey?: string;
      changedOrigin?: string;
    }) => {
      // Re-render so cross-section provider-conditional visibility tracks the
      // mutated draft (legacy re-applied visibility from the card-level
      // change listener and after every update-draft).
      setRevision((revision) => revision + 1);
      emitUpdateDraft(meta);
    };

    const flushDraftFromControls = (): boolean => {
      let hasError = false;
      committers.forEach((collector) => {
        try {
          if (collector() === false) {
            hasError = true;
          }
        } catch {
          hasError = true;
        }
      });
      return !hasError;
    };

    const handleRefresh = (key: "acp" | "skillrunner") => {
      if (!flushDraftFromControls()) {
        return;
      }
      setBusyMark({ key, selection });
      onAction(
        key === "acp"
          ? "refresh-acp-runtime-cache"
          : "refresh-skillrunner-model-cache",
        {
          executionOptions: buildWorkflowSettingsDialogExecutionOptions(draft),
        },
      );
    };

    const fieldTexts: WorkflowFieldTexts = {
      parameterRequiredText:
        toText(labels.workflowSettingsParameterRequired) ||
        "This field is required.",
      numberInvalidText: toText(labels.workflowSettingsNumberInvalid),
      positiveIntegerRequiredText: toText(
        labels.workflowSettingsPositiveIntegerRequired,
      ),
      // The dialog never renders the placeholder branch (disabled fields
      // stay interactive-disabled), so this text is unused.
      noSelectableOptionsText: "",
    };

    const profileOptions = form.profiles.map((profile) => ({
      value: profile.id,
      label: profile.label,
    }));
    const fixedProfile = form.profiles.find(
      (profile) =>
        toText(profile.id).trim() === toText(form.selectedProfile).trim(),
    );

    const previewVisible = isExecutionUnitPreviewVisible(form);
    const hostQueueVisible = isHostQueueCardVisible(form);
    const hasMultiUnitRegion =
      form.layout.mode === "multi-unit" && previewVisible && hostQueueVisible;

    const runEntries = form.runSchemaEntries;
    const confirmDisabled = form.profileMissing === true;

    const renderRefreshButton = (
      key: "acp" | "skillrunner",
      text: string,
      runningText: string,
    ) => {
      const isBusy = busyKey === key;
      return (
        <button
          type="button"
          class={isBusy ? "settings-btn is-busy" : "settings-btn"}
          disabled={isBusy}
          aria-busy={isBusy ? "true" : "false"}
          onClick={() => handleRefresh(key)}
        >
          {isBusy ? runningText || text : text}
        </button>
      );
    };

    return (
      <div class="settings-shell" key={structureKey} ref={shellRef}>
        <div class="settings-banner">
          {form.requiresBackendProfile === true ? (
            <div class="settings-banner-profile">
              <div class="settings-banner-profile-label">
                {toText(labels.profileLabel)}
              </div>
              {form.profileEditable === true ? (
                <CustomSelectIsland
                  options={profileOptions}
                  value={toText(draft.backendId || form.selectedProfile).trim()}
                  controlClassName="settings-banner-profile-select"
                  onValueChange={(value) => {
                    draft.backendId = toText(value).trim();
                    emitUpdateDraft({
                      changedSection: "backend",
                      changedKey: "backendId",
                    });
                  }}
                />
              ) : (
                <div class="settings-empty">
                  {fixedProfile
                    ? toText(fixedProfile.label)
                    : toText(labels.noProfiles)}
                </div>
              )}
            </div>
          ) : null}
          <div class="settings-meta">
            <div>{`${toText(labels.workflowLabel)}: ${selection.workflow.label}`}</div>
            <div>{`${toText(labels.providerLabel)}: ${selection.workflow.providerId}`}</div>
          </div>
        </div>
        <div
          class={
            hasMultiUnitRegion
              ? "settings-content-layout has-multi-unit-region"
              : "settings-content-layout"
          }
        >
          {hasMultiUnitRegion ? (
            <div class="settings-multi-unit-column">
              <ExecutionUnitPreviewCard form={form} labels={labels} />
              <HostQueueOptionsCard
                labels={labels}
                draft={draft}
                registerCommitter={registrar}
                onCommit={() =>
                  emitUpdateDraft({
                    changedSection: "hostOptions",
                    changedKey: "queue.maxConcurrency",
                  })
                }
              />
            </div>
          ) : null}
          <div class="settings-options-region">
            {!hasMultiUnitRegion && previewVisible ? (
              <ExecutionUnitPreviewCard form={form} labels={labels} />
            ) : null}
            <div class="settings-grid">
              <div class="settings-options-column">
                <WorkflowSettingsSection
                  title={toText(labels.workflowParamsTitle)}
                  emptyText={toText(labels.noWorkflowParams)}
                  entries={form.workflowSchemaEntries}
                  values={draft.workflowParams}
                  visibilityValues={draft.providerOptions}
                  texts={fieldTexts}
                  changedSection="workflowParams"
                  presentation={DIALOG_SECTION_PRESENTATION}
                  fieldPresentation={dialogFieldPresentation("workflowParams")}
                  registerCommitter={registrar}
                  onChange={handleSectionChange}
                />
                {runEntries.length > 0 ? (
                  <WorkflowSettingsSection
                    title={toText(labels.runOptionsTitle)}
                    emptyText={toText(labels.noRunOptions)}
                    entries={runEntries}
                    values={draft.runOptions}
                    visibilityValues={draft.providerOptions}
                    texts={fieldTexts}
                    changedSection="runOptions"
                    presentation={DIALOG_SECTION_PRESENTATION}
                    fieldPresentation={dialogFieldPresentation("runOptions")}
                    registerCommitter={registrar}
                    onChange={handleSectionChange}
                  />
                ) : null}
              </div>
              <WorkflowSettingsSection
                title={toText(labels.providerOptionsTitle)}
                emptyText={toText(labels.noProviderOptions)}
                entries={form.providerSchemaEntries}
                values={draft.providerOptions}
                visibilityValues={draft.providerOptions}
                texts={fieldTexts}
                changedSection="providerOptions"
                presentation={DIALOG_SECTION_PRESENTATION}
                cardExtraClassName="settings-card-fill"
                fieldPresentation={dialogFieldPresentation("providerOptions")}
                registerCommitter={registrar}
                onChange={handleSectionChange}
              />
            </div>
          </div>
        </div>
        {form.profileMissing === true ? (
          <div class="settings-error">{toText(labels.blockedNoProfile)}</div>
        ) : null}
        <footer class="settings-footer">
          <label class="field-checkbox">
            <input
              type="checkbox"
              checked={selection.persistChecked}
              onChange={(event) =>
                onAction("toggle-persist", {
                  checked: event.currentTarget.checked,
                })
              }
            />
            <span>{toText(labels.persistLabel)}</span>
          </label>
          <div class="settings-actions">
            {form.canRefreshAcpRuntimeCache === true
              ? renderRefreshButton(
                  "acp",
                  toText(labels.refreshAcpRuntimeCache),
                  toText(labels.refreshAcpRuntimeCacheRunning),
                )
              : null}
            {form.canRefreshSkillRunnerModelCache === true
              ? renderRefreshButton(
                  "skillrunner",
                  toText(labels.refreshSkillRunnerModelCache),
                  toText(labels.refreshSkillRunnerModelCacheRunning),
                )
              : null}
            <button
              type="button"
              class="settings-btn"
              onClick={() => onAction("cancel", {})}
            >
              {toText(labels.cancelLabel)}
            </button>
            <button
              type="button"
              class="settings-btn primary"
              disabled={confirmDisabled}
              onClick={() => {
                if (!flushDraftFromControls()) {
                  return;
                }
                onAction("confirm", {
                  executionOptions:
                    buildWorkflowSettingsDialogExecutionOptions(draft),
                });
              }}
            >
              {toText(labels.confirmLabel)}
            </button>
          </div>
        </footer>
      </div>
    );
  },
  (prev, next) =>
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection),
);

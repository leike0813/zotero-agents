/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  SynthesisWorkbenchBackgroundJobStatus,
  SynthesisWorkbenchHostCommandName,
  SynthesisWorkbenchTab,
} from "../../shared/synthesisWorkbenchWireContract";

// Chrome of the synthesis workbench page: the action statusbar with its
// background job popover, and the sidecar runtime indicator hosted in the
// topbar. The panel model resolves every display string and the statusbar
// mode; this component only renders the selection and reports intents.

export type SynthesisWorkbenchStatusbarMode =
  | "idle"
  | "busy"
  | "danger"
  | "warn"
  | "ok";

export type SynthesisWorkbenchStatusbarJobView = {
  jobId: string;
  status: SynthesisWorkbenchBackgroundJobStatus;
  statusLabel: string;
  sourceLabel: string;
  title: string;
  detail: string;
  progressPercent?: number;
  progressLabel?: string;
  command?: SynthesisWorkbenchHostCommandName;
  targetTab?: SynthesisWorkbenchTab;
};

export type SynthesisWorkbenchChromeSelection = {
  mode: SynthesisWorkbenchStatusbarMode;
  stateLabel: string;
  message: string;
  progressDeterminate: boolean;
  progressPercent?: number;
  extraCount: number;
  jobCount: number;
  popoverOpen: boolean;
  jobsShowLabel: string;
  jobsTitle: string;
  jobsEmptyText: string;
  closeLabel: string;
  jobs: SynthesisWorkbenchStatusbarJobView[];
};

type ChromeRegionProps = {
  selection: SynthesisWorkbenchChromeSelection;
  onToggleJobPopover: () => void;
  onOpenJob: (job: SynthesisWorkbenchStatusbarJobView) => void;
};

function StatusbarProgress(props: { determinate: boolean; percent?: number }) {
  return (
    <span
      class={`action-statusbar-progress ${
        props.determinate ? "is-determinate" : "is-indeterminate"
      }`}
      aria-hidden="true"
    >
      <span
        class="action-statusbar-progress-fill"
        style={
          props.determinate && typeof props.percent === "number"
            ? { width: `${props.percent}%` }
            : undefined
        }
      />
    </span>
  );
}

export const ChromeRegion = memo(
  function ChromeRegion(props: ChromeRegionProps) {
    const { selection, onToggleJobPopover, onOpenJob } = props;
    const showJobButton = selection.jobCount > 0 || selection.popoverOpen;
    return (
      <footer
        class={`action-statusbar is-${selection.mode}`}
        role="status"
        aria-live="polite"
        data-region-content="synthesis-chrome"
      >
        {selection.mode === "busy" ? (
          <StatusbarProgress
            determinate={selection.progressDeterminate}
            percent={selection.progressPercent}
          />
        ) : null}
        <span class="action-statusbar-state">{selection.stateLabel}</span>
        {selection.message ? (
          <span class="action-statusbar-message">{selection.message}</span>
        ) : null}
        {selection.extraCount > 0 ? (
          <span class="action-statusbar-count">{`+${selection.extraCount}`}</span>
        ) : null}
        {showJobButton ? (
          <span class="action-statusbar-job-anchor">
            <button
              type="button"
              class="action-statusbar-job-button"
              title={selection.jobsShowLabel}
              aria-label={selection.jobsShowLabel}
              aria-expanded={selection.popoverOpen ? "true" : "false"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleJobPopover();
              }}
            >
              <span
                class="zs-icon-sm action-statusbar-job-icon zs-icon-format-list-bulleted"
                aria-hidden="true"
              />
              {selection.jobCount > 0 ? (
                <span class="action-statusbar-job-button-count">
                  {String(selection.jobCount)}
                </span>
              ) : null}
            </button>
            {selection.popoverOpen ? (
              <div
                class="action-statusbar-job-popover"
                role="dialog"
                aria-label={selection.jobsTitle}
              >
                <div class="action-statusbar-job-popover-header">
                  <strong>{selection.jobsTitle}</strong>
                  <button
                    type="button"
                    class="icon-only action-statusbar-job-popover-close"
                    title={selection.closeLabel}
                    aria-label={selection.closeLabel}
                    onClick={onToggleJobPopover}
                  >
                    {"x"}
                  </button>
                </div>
                {selection.jobs.length === 0 ? (
                  <div class="action-statusbar-job-empty">
                    {selection.jobsEmptyText}
                  </div>
                ) : (
                  <div class="action-statusbar-job-list">
                    {selection.jobs.map((job) => (
                      <button
                        key={job.jobId}
                        type="button"
                        class={`action-statusbar-job-row is-${job.status}`}
                        onClick={() => onOpenJob(job)}
                      >
                        <span class="action-statusbar-job-meta">
                          <span
                            class={`action-statusbar-job-state is-${job.status}`}
                          >
                            {job.statusLabel}
                          </span>
                          <span class="action-statusbar-job-source">
                            {job.sourceLabel}
                          </span>
                        </span>
                        <span class="action-statusbar-job-title">
                          {job.title}
                        </span>
                        {job.detail ? (
                          <span class="action-statusbar-job-detail">
                            {job.detail}
                          </span>
                        ) : null}
                        {job.status === "running" &&
                        typeof job.progressPercent === "number" ? (
                          <StatusbarProgress
                            determinate
                            percent={job.progressPercent}
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </span>
        ) : null}
      </footer>
    );
  },
  (prev, next) =>
    prev.onToggleJobPopover === next.onToggleJobPopover &&
    prev.onOpenJob === next.onOpenJob &&
    equalBySignature(prev.selection, next.selection),
);

export type SynthesisWorkbenchSidecarSelection = {
  state: "offline" | "error" | "recovering" | "degraded" | "busy" | "ready";
  label: string;
  ariaLabel: string;
  statusTitle: string;
  rows: Array<{ label: string; value: string }>;
  showDiagnostics: boolean;
  diagnosticsLabel: string;
};

type SidecarIndicatorRegionProps = {
  selection: SynthesisWorkbenchSidecarSelection;
  onOpenDiagnostics: () => void;
};

export const SidecarIndicatorRegion = memo(
  function SidecarIndicatorRegion(props: SidecarIndicatorRegionProps) {
    const { selection, onOpenDiagnostics } = props;
    return (
      <details
        class={`sidecar-runtime-indicator is-${selection.state}`}
        data-region-content="synthesis-sidecar"
      >
        <summary aria-label={selection.ariaLabel}>
          <span class="sidecar-runtime-dot" />
          <span class="sidecar-runtime-label">{selection.label}</span>
        </summary>
        <div class="sidecar-runtime-popover">
          <strong>{selection.statusTitle}</strong>
          {selection.rows.map((row) => (
            <div class="sidecar-runtime-row" key={row.label}>
              <span class="muted">{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
          {selection.showDiagnostics ? (
            <button
              type="button"
              class="sidecar-runtime-diagnostics"
              onClick={onOpenDiagnostics}
            >
              {selection.diagnosticsLabel}
            </button>
          ) : null}
        </div>
      </details>
    );
  },
  (prev, next) =>
    prev.onOpenDiagnostics === next.onOpenDiagnostics &&
    equalBySignature(prev.selection, next.selection),
);

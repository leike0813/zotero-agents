/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type { ComponentChildren } from "preact";

import type {
  SynthesisWorkbenchActionName,
  SynthesisWorkbenchHostCommandName,
} from "../../shared/synthesisWorkbenchWireContract";
import {
  localizedEnumText,
  topicHostCommandLabelKey,
  topicsHostCommandOperationKey,
  type SynthesisWorkbenchTopicsText,
} from "./topicsRegionData";

// Shared building blocks of the Topics surface: localized badges, the empty
// state card, host-command buttons with pending/busy state, and metric cells.
// Every control reports intents through onAction; no per-element listeners.

export type SynthesisWorkbenchTopicsActionSender = (
  action: SynthesisWorkbenchActionName,
  payload?: Record<string, unknown>,
) => void;

export function TopicsBadge(props: {
  value: unknown;
  tone?: string;
  className?: string;
  t: SynthesisWorkbenchTopicsText;
}) {
  const text = localizedEnumText(props.value, props.t) || "-";
  const className =
    `badge${props.tone ? ` ${props.tone}` : ""}` +
    (props.className ? ` ${props.className}` : "");
  return <span class={className}>{text}</span>;
}

export function TopicsEmptyState(props: {
  title: string;
  message?: string;
  tone?: "default" | "info" | "warning";
  action?: ComponentChildren;
}) {
  return (
    <div class={`empty-state empty-state-${props.tone || "default"}`}>
      <strong class="empty-state-title">{props.title}</strong>
      {props.message ? (
        <p class="empty-state-message">{props.message}</p>
      ) : null}
      {props.action ? (
        <div class="empty-state-actions">{props.action}</div>
      ) : null}
    </div>
  );
}

/**
 * Legacy makeButton for hostCommand actions: renders the busy state
 * (disabled + spinner + aria-busy + in-progress title) when the command's
 * operation key is pending, and dispatches the frozen payload shape — the
 * `args` key is present only when the command carries arguments.
 */
export function HostCommandButton(props: {
  label: string;
  command: SynthesisWorkbenchHostCommandName;
  args?: Record<string, unknown>;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  icon?: "create" | "update";
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
}) {
  const operationKey = topicsHostCommandOperationKey(props.command, props.args);
  const pending =
    !!operationKey && props.pendingOperationKeys.includes(operationKey);
  const className =
    `${props.active ? "active" : ""}${pending ? " is-busy" : ""}`.trim();
  const labelKey = topicHostCommandLabelKey(props.command);
  const operationLabel = labelKey ? props.t(labelKey) : props.command;
  return (
    <button
      type="button"
      class={className || undefined}
      disabled={props.disabled || pending}
      aria-busy={pending ? "true" : undefined}
      aria-label={props.iconOnly ? props.label : undefined}
      title={
        pending
          ? props.t("synthesis-operation-in-progress", {
              operation: operationLabel,
            })
          : props.iconOnly
            ? props.label
            : undefined
      }
      onClick={() =>
        props.onAction(
          "hostCommand",
          props.args
            ? { command: props.command, args: props.args }
            : { command: props.command },
        )
      }
    >
      {pending ? <span class="button-spinner" aria-hidden="true" /> : null}
      {props.iconOnly ? (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          {props.icon === "create" ? (
            <path d="M12 5v14M5 12h14" />
          ) : (
            <path d="M20 7v5h-5M20 12a8 8 0 1 0-2 6M20 7v5" />
          )}
        </svg>
      ) : (
        props.label
      )}
    </button>
  );
}

export function TopicWorkflowButton(props: {
  topicId: string;
  lifecycle?: "planned" | "stale";
  createAvailable?: boolean;
  updateAvailable?: boolean;
  iconOnly?: boolean;
  fullLabel?: boolean;
  pendingOperationKeys: string[];
  t: SynthesisWorkbenchTopicsText;
  onAction: SynthesisWorkbenchTopicsActionSender;
}) {
  const planned = !!props.lifecycle;
  return (
    <HostCommandButton
      label={props.t(
        planned
          ? "synthesis-action-create-topic"
          : props.fullLabel
            ? "synthesis-action-update-topic"
            : "synthesis-action-update",
      )}
      command={planned ? "runSynthesizeTopic" : "submitTopicSynthesisUpdate"}
      args={
        planned ? { plannedTopicId: props.topicId } : { topicId: props.topicId }
      }
      disabled={
        planned ? !props.createAvailable : props.updateAvailable === false
      }
      iconOnly={props.iconOnly}
      icon={planned ? "create" : "update"}
      pendingOperationKeys={props.pendingOperationKeys}
      t={props.t}
      onAction={props.onAction}
    />
  );
}

export function TopicsActionGroup(props: { children?: ComponentChildren }) {
  return <div class="action-group">{props.children}</div>;
}

export function TopicMetric(props: { label: string; value: string | number }) {
  return (
    <div class="metric">
      <strong>{props.value || "-"}</strong>
      <span class="muted">{props.label}</span>
    </div>
  );
}

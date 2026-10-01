/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

import {
  equalBySignature,
  replyRegionEqualityInput,
  replyStructuralSignature,
  safeText,
  stableRegionSignature,
} from "./regionEquality";
import { SelectControl, type PanelActionHandler } from "./ActionControls";
import type { LabelOfFn } from "./HintRegion";
import {
  navigateReplyHistory,
  rememberReplyHistory,
  replyHistoryKey,
  resetReplyHistoryNavigation,
  shouldHandleReplyHistoryKey,
} from "./replyHistory";
import {
  isUserInteractionQuestionSatisfied,
  projectUserInteractionBatchV1,
  userInteractionAnswerFitsQuestionV1,
  type UserInteractionAnswerV1,
  type UserInteractionDraftAnswersV1,
  type UserInteractionQuestionV1,
} from "../../shared/userInteractionContract";

// Preact port of the imperative renderAssistantReply region
// (src/sidebar/assistantPanelRenderer.js), including the two-tier
// structure/live split: the textarea element is never part of the diffed
// value channel, so focus, caret, and in-progress drafts survive live
// updates; a structure change mirrors the old rebuild and re-syncs the
// value (owner switch).

const INTERRUPT_ACTIONS = new Set([
  "cancel",
  "cancel-run",
  "interrupt-run-turn",
]);

function formatTokenCount(value: unknown): string {
  const numeric = Number(value || 0);
  if (numeric <= 0) return "0k";
  const thousands = numeric / 1000;
  const rounded =
    thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
  return String(rounded).replace(/\.0$/, "") + "k";
}

function formatUsageLabel(
  used: number,
  limit: number,
  labelOf: LabelOfFn,
): string {
  if (used <= 0 && limit <= 0) return labelOf("usage.unavailable", "N/A");
  if (limit > 0) {
    return formatTokenCount(used) + "/" + formatTokenCount(limit);
  }
  return formatTokenCount(used);
}

function UsageGauge(props: { usage: unknown; labelOf: LabelOfFn }) {
  const source =
    props.usage && typeof props.usage === "object"
      ? (props.usage as Record<string, unknown>)
      : {};
  const total = Number(
    source.used || source.totalTokens || source.usedTokens || 0,
  );
  const inputOutputTotal =
    Number(source.inputTokens || 0) + Number(source.outputTokens || 0);
  const used = total > 0 ? total : inputOutputTotal;
  const limit = Number(
    source.size ||
      source.contextWindow ||
      source.tokenLimit ||
      source.limitTokens ||
      0,
  );
  const percent =
    limit > 0
      ? Math.max(0, Math.min(100, Math.round((used / limit) * 100)))
      : 0;
  const unavailable = used <= 0 && limit <= 0;
  const tokenLabel = formatUsageLabel(used, limit, props.labelOf);
  const centerLabel = unavailable
    ? props.labelOf("usage.unavailable", "N/A")
    : limit > 0
      ? String(percent) + "%"
      : formatTokenCount(used);
  const title = unavailable
    ? props.labelOf("usage.noData", "No usage data")
    : tokenLabel + " " + props.labelOf("usage.tokens", "tokens");
  return (
    <div
      class={
        "assistant-panel-usage-gauge" + (unavailable ? " is-unavailable" : "")
      }
      title={title}
      aria-label={title}
    >
      <span
        class="assistant-panel-usage-ring"
        style={"--assistant-usage-percent: " + percent + "%"}
      >
        <span class="assistant-panel-usage-label">{centerLabel}</span>
      </span>
    </div>
  );
}

type ReplyPanel = Record<string, unknown>;

// Human-readable answer summary for the interaction Review step. Purely
// presentational; the structured answer stays the source of truth.
function describeInteractionAnswer(
  question: UserInteractionQuestionV1,
  answer: UserInteractionAnswerV1 | undefined,
  labelOf: LabelOfFn,
): string {
  const unanswered = labelOf("interaction.unanswered", "No answer");
  if (!answer || answer.kind === "unanswered") return unanswered;
  if (answer.kind === "text") return answer.text.trim() || unanswered;
  if (answer.kind === "single_select") {
    return (
      question.options.find((option) => option.optionId === answer.optionId)
        ?.label || unanswered
    );
  }
  if (answer.kind === "multi_select") {
    const labels = answer.selections
      .map(
        (selection) =>
          question.options.find(
            (option) => option.optionId === selection.optionId,
          )?.label,
      )
      .filter((label): label is string => !!label);
    return labels.join(", ") || unanswered;
  }
  if (answer.kind === "confirm") {
    return answer.confirmed
      ? labelOf("interaction.confirmYes", "Yes")
      : labelOf("interaction.confirmNo", "No");
  }
  return String(
    answer.slots.reduce((total, slot) => total + slot.files.length, 0),
  );
}

export const ReplyRegion = memo(
  function ReplyRegion(props: {
    container: HTMLElement;
    panel: ReplyPanel;
    onAction: PanelActionHandler;
    labelOf: LabelOfFn;
  }) {
    const { container, panel, onAction, labelOf } = props;
    const reply =
      panel.reply && typeof panel.reply === "object"
        ? (panel.reply as Record<string, unknown>)
        : {};
    const lifecycle =
      panel.lifecycle && typeof panel.lifecycle === "object"
        ? (panel.lifecycle as Record<string, unknown>)
        : {};
    const replyAction = safeText(reply.action || "reply");
    const interruptAction = INTERRUPT_ACTIONS.has(replyAction);
    const historyKey = replyHistoryKey(panel);
    const hasValue = Object.prototype.hasOwnProperty.call(reply, "value");
    const submitDisabled =
      reply.enabled !== true || (reply.sending === true && !interruptAction);
    const inputDisabled =
      reply.inputEnabled === false || reply.enabled !== true;
    const controls = Array.isArray(reply.controls)
      ? (reply.controls as Array<Record<string, unknown>>)
      : [];
    const resources = Array.isArray(reply.resources)
      ? (reply.resources as Array<Record<string, unknown>>)
      : [];
    const resourceMenu =
      reply.resourceMenu && typeof reply.resourceMenu === "object"
        ? (reply.resourceMenu as Record<string, unknown>)
        : null;
    const errors = Array.isArray(reply.errors)
      ? (reply.errors as Array<Record<string, unknown>>)
      : [];
    const [resourceMenuOpen, setResourceMenuOpen] = useState(false);

    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const previousStructure = useRef<string | null>(null);
    const signature = stableRegionSignature(replyRegionEqualityInput(panel));
    const structureSignature = stableRegionSignature(
      replyStructuralSignature(panel),
    );
    // Versioned multi-question interaction flow (Pi Skill Runs). While a
    // collecting batch is present the Reply region replaces the ordinary
    // composer with a one-question-at-a-time form; navigation/review state is
    // local (never part of the region signature), and answers live in the
    // host-persisted batch via the draft/submit/decline actions.
    // The child is the production boundary for the composer batch: the host
    // wire assertion is debug-gated, so a present-but-unparseable batch fails
    // closed into a structured read-only state instead of falling back to the
    // live composer of a run that is actually waiting.
    const hasInteractionBatch =
      reply.interactionBatch != null &&
      typeof reply.interactionBatch === "object";
    const interactionBatch = hasInteractionBatch
      ? projectUserInteractionBatchV1(reply.interactionBatch)
      : null;
    const interactionBatchInvalid =
      hasInteractionBatch && interactionBatch === null;
    const [interactionAnswers, setInteractionAnswers] =
      useState<UserInteractionDraftAnswersV1>({});
    const [interactionIndex, setInteractionIndex] = useState(0);
    const [interactionReviewing, setInteractionReviewing] = useState(false);
    const interactionSeed = useRef<string | null>(null);
    const interactionBatchId = useRef<string | null>(null);
    const interactionMutationSeq = useRef(0);
    // Q202 rebase: local answers follow the accepted batch revision. A stale
    // CAS is resolved by the host republishing the canonical draft, and this
    // region replaces its local answers with that canonical draft; there is no
    // last-write-wins and no per-field/text merge.
    const interactionSeedKey = interactionBatch
      ? interactionBatch.batchId + ":" + String(interactionBatch.revision)
      : null;

    useLayoutEffect(() => {
      container.setAttribute(
        "data-assistant-reply-interaction-status",
        interactionBatch
          ? interactionBatch.status
          : interactionBatchInvalid
            ? "invalid"
            : "",
      );
    }, [container, interactionBatch, interactionBatchInvalid]);

    useLayoutEffect(() => {
      if (!interactionBatch || interactionSeedKey === null) return;
      if (interactionSeed.current === interactionSeedKey) return;
      interactionSeed.current = interactionSeedKey;
      setInteractionAnswers({ ...interactionBatch.draftAnswers });
      // Navigation resets only for a new batch, never for a revision bump.
      if (interactionBatchId.current !== interactionBatch.batchId) {
        interactionBatchId.current = interactionBatch.batchId;
        setInteractionIndex(0);
        setInteractionReviewing(false);
      }
    }, [interactionBatch, interactionSeedKey]);

    useLayoutEffect(() => {
      container.setAttribute(
        "data-assistant-reply-enabled",
        reply.enabled ? "true" : "false",
      );
      container.setAttribute(
        "data-assistant-reply-state",
        safeText(lifecycle.replyState),
      );
    }, [container, signature]);

    useLayoutEffect(() => {
      const input = inputRef.current;
      if (!input) return;
      const structureChanged = previousStructure.current !== structureSignature;
      previousStructure.current = structureSignature;
      if (!hasValue) return;
      if (structureChanged) {
        // Mirror the old rebuild path: value is authoritative, and a focused
        // textarea keeps focus and caret across the structural swap.
        const focused = document.activeElement === input;
        const selectionStart = focused ? input.selectionStart : null;
        const selectionEnd = focused ? input.selectionEnd : null;
        input.value = String(reply.value == null ? "" : reply.value);
        if (focused && !input.disabled) {
          input.focus();
          if (
            typeof selectionStart === "number" &&
            typeof selectionEnd === "number" &&
            typeof input.setSelectionRange === "function"
          ) {
            input.setSelectionRange(selectionStart, selectionEnd);
          }
        }
      } else if (document.activeElement !== input) {
        input.value = String(reply.value == null ? "" : reply.value);
      }
    }, [signature, structureSignature, hasValue]);

    const submit = () => {
      const input = inputRef.current;
      if (!input) return;
      if (!interruptAction) rememberReplyHistory(historyKey, input.value);
      onAction(
        replyAction || "reply",
        Object.assign(
          {},
          reply.payload && typeof reply.payload === "object"
            ? (reply.payload as Record<string, unknown>)
            : {},
          { message: safeText(input.value) },
        ),
      );
      resetReplyHistoryNavigation(historyKey);
      if (reply.clearOnSend !== false && !interruptAction) input.value = "";
    };

    if (interactionBatchInvalid) {
      return (
        <div
          class="assistant-panel-reply-interaction is-invalid"
          data-assistant-interaction-flow="invalid"
          data-assistant-interaction-error="malformed-batch"
        >
          <div class="assistant-panel-interaction-error" role="status">
            {labelOf(
              "interaction.invalidBatch",
              "This interaction request could not be displayed. Cancel the run or reopen the workspace.",
            )}
          </div>
          <div class="assistant-panel-interaction-actions">
            <button
              type="button"
              class="asst-button-compact assistant-panel-interaction-cancel"
              onClick={() => onAction("cancel-run", {})}
            >
              {labelOf("interaction.cancelRun", "Cancel run")}
            </button>
          </div>
        </div>
      );
    }

    if (interactionBatch) {
      const questions = interactionBatch.questions;
      const total = questions.length;
      const index = Math.min(interactionIndex, Math.max(0, total - 1));
      const question = questions[index];
      const readOnly = interactionBatch.status !== "collecting";
      const answerFor = (entry: UserInteractionQuestionV1) =>
        interactionAnswers[entry.questionId];
      const nextMutationId = () => {
        interactionMutationSeq.current += 1;
        return (
          interactionBatch.batchId +
          ":" +
          String(interactionMutationSeq.current) +
          ":" +
          String(Date.now())
        );
      };
      // Every edit persists immediately so the mutation always carries the
      // revision it was made against; there is no deferred/debounced send to
      // turn into a stale CAS later.
      const setAnswer = (
        entry: UserInteractionQuestionV1,
        answer: UserInteractionAnswerV1,
      ) => {
        // Structured boundary: never persist or emit an answer that does not
        // fit its question (wrong kind, undeclared optionId/value, foreign
        // file slot, or a required question marked unanswered).
        if (!userInteractionAnswerFitsQuestionV1(entry, answer)) return;
        setInteractionAnswers((previous) => ({
          ...previous,
          [entry.questionId]: answer,
        }));
        if (!readOnly) {
          onAction("draft", {
            batchId: interactionBatch.batchId,
            questionId: entry.questionId,
            baseRevision: interactionBatch.revision,
            mutationId: nextMutationId(),
            answer,
          });
        }
      };
      const canSubmit =
        !readOnly &&
        questions.every((entry) =>
          isUserInteractionQuestionSatisfied(entry, answerFor(entry)),
        );
      // Submit carries only answers that fit their batch question, so an
      // unknown or malformed questionId can never reach the host.
      const submissionAnswers: UserInteractionDraftAnswersV1 = {};
      for (const entry of questions) {
        const answer = answerFor(entry);
        if (answer && userInteractionAnswerFitsQuestionV1(entry, answer)) {
          submissionAnswers[entry.questionId] = answer;
        }
      }
      // Cancel is the run/turn cancellation action, never a declined result.
      // While waiting_user the owner rejects interrupt-run-turn, so cancel
      // always sends cancel-run directly; decline stays the whole-batch
      // "skip this question set" action.
      const cancelAction = "cancel-run";
      const renderInput = (entry: UserInteractionQuestionV1) => {
        const answer = answerFor(entry);
        if (entry.kind === "text") {
          const text = answer && answer.kind === "text" ? answer.text : "";
          return (
            <textarea
              class="assistant-panel-interaction-input"
              data-interaction-question={entry.questionId}
              disabled={readOnly}
              value={text}
              onInput={(event) =>
                setAnswer(entry, {
                  kind: "text",
                  text: (event.currentTarget as HTMLTextAreaElement).value,
                })
              }
            />
          );
        }
        if (entry.kind === "single_select") {
          const selected =
            answer && answer.kind === "single_select" ? answer.optionId : null;
          return (
            <div class="assistant-panel-interaction-options" role="radiogroup">
              {entry.options.map((option) => (
                <label
                  class="assistant-panel-interaction-option"
                  key={option.optionId}
                >
                  <input
                    type="radio"
                    class="assistant-panel-interaction-radio"
                    name={"interaction-" + entry.questionId}
                    data-interaction-option={option.optionId}
                    checked={selected === option.optionId}
                    disabled={readOnly}
                    onChange={() =>
                      setAnswer(entry, {
                        kind: "single_select",
                        optionId: option.optionId,
                        value: option.value ?? null,
                      })
                    }
                  />
                  <span class="assistant-panel-interaction-option-label">
                    {option.label}
                  </span>
                  {option.description ? (
                    <small class="assistant-panel-interaction-option-description">
                      {option.description}
                    </small>
                  ) : null}
                </label>
              ))}
            </div>
          );
        }
        if (entry.kind === "multi_select") {
          const selected =
            answer && answer.kind === "multi_select" ? answer.selections : [];
          const isSelected = (optionId: string) =>
            selected.some((selection) => selection.optionId === optionId);
          return (
            <div class="assistant-panel-interaction-options" role="group">
              {entry.options.map((option) => (
                <label
                  class="assistant-panel-interaction-option"
                  key={option.optionId}
                >
                  <input
                    type="checkbox"
                    class="assistant-panel-interaction-checkbox"
                    data-interaction-option={option.optionId}
                    checked={isSelected(option.optionId)}
                    disabled={readOnly}
                    onChange={(event) => {
                      const next = event.currentTarget.checked
                        ? [
                            ...selected,
                            {
                              optionId: option.optionId,
                              value: option.value ?? null,
                            },
                          ]
                        : selected.filter(
                            (selection) =>
                              selection.optionId !== option.optionId,
                          );
                      setAnswer(entry, {
                        kind: "multi_select",
                        selections: next,
                      });
                    }}
                  />
                  <span class="assistant-panel-interaction-option-label">
                    {option.label}
                  </span>
                  {option.description ? (
                    <small class="assistant-panel-interaction-option-description">
                      {option.description}
                    </small>
                  ) : null}
                </label>
              ))}
            </div>
          );
        }
        if (entry.kind === "confirm") {
          const confirmed =
            answer && answer.kind === "confirm" ? answer.confirmed : null;
          return (
            <div class="assistant-panel-interaction-confirm">
              <button
                type="button"
                class="asst-button-compact assistant-panel-interaction-confirm-yes"
                data-interaction-confirm="true"
                disabled={readOnly}
                onClick={() =>
                  setAnswer(entry, { kind: "confirm", confirmed: true })
                }
              >
                {labelOf("interaction.confirmYes", "Yes")}
              </button>
              <button
                type="button"
                class="asst-button-compact assistant-panel-interaction-confirm-no"
                data-interaction-confirm="false"
                disabled={readOnly}
                onClick={() =>
                  setAnswer(entry, { kind: "confirm", confirmed: false })
                }
              >
                {labelOf("interaction.confirmNo", "No")}
              </button>
              {confirmed !== null ? (
                <span
                  class="assistant-panel-interaction-confirm-state"
                  data-interaction-confirmed={confirmed ? "true" : "false"}
                >
                  {describeInteractionAnswer(entry, answer, labelOf)}
                </span>
              ) : null}
            </div>
          );
        }
        const files = answer && answer.kind === "files" ? answer.slots : [];
        const countFor = (slotId: string) =>
          files.find((slot) => slot.slotId === slotId)?.files.length ?? 0;
        return (
          <div class="assistant-panel-interaction-files">
            {entry.files.map((slot) => (
              <div
                class="assistant-panel-interaction-file"
                data-interaction-slot={slot.slotId}
                key={slot.slotId}
              >
                <span class="assistant-panel-interaction-file-label">
                  {slot.name}
                </span>
                <small class="assistant-panel-interaction-file-state">
                  {slot.required
                    ? labelOf("interaction.fileRequired", "Required")
                    : labelOf("interaction.fileOptional", "Optional")}
                </small>
                <small
                  class="assistant-panel-interaction-file-count"
                  data-interaction-slot-count={String(countFor(slot.slotId))}
                >
                  {String(countFor(slot.slotId))}
                </small>
                <button
                  type="button"
                  class="asst-button-compact assistant-panel-interaction-choose-files"
                  data-interaction-slot-pick={slot.slotId}
                  disabled={readOnly}
                  onClick={() =>
                    onAction("submit-interaction-files", {
                      batchId: interactionBatch.batchId,
                      questionId: entry.questionId,
                      slotId: slot.slotId,
                      baseRevision: interactionBatch.revision,
                      mutationId: nextMutationId(),
                    })
                  }
                >
                  {labelOf("interaction.chooseFiles", "Choose files")}
                </button>
              </div>
            ))}
            {entry.files.length === 0 ? (
              <button
                type="button"
                class="asst-button-compact assistant-panel-interaction-choose-files"
                data-interaction-slot-pick=""
                disabled={readOnly}
                onClick={() =>
                  onAction("submit-interaction-files", {
                    batchId: interactionBatch.batchId,
                    questionId: entry.questionId,
                    slotId: null,
                    baseRevision: interactionBatch.revision,
                    mutationId: nextMutationId(),
                  })
                }
              >
                {labelOf("interaction.chooseFiles", "Choose files")}
              </button>
            ) : null}
          </div>
        );
      };
      return (
        <div
          class="assistant-panel-reply-interaction"
          data-assistant-interaction-flow="true"
          data-assistant-interaction-batch={interactionBatch.batchId}
          data-assistant-interaction-status={interactionBatch.status}
        >
          <div class="assistant-panel-interaction-progress">
            <span
              class="assistant-panel-interaction-progress-label"
              data-interaction-progress={
                String(index + 1) + "/" + String(total)
              }
            >
              {labelOf("interaction.progress", "Question") +
                " " +
                String(index + 1) +
                " / " +
                String(total)}
            </span>
          </div>
          {interactionReviewing ? (
            <ol class="assistant-panel-interaction-review">
              {questions.map((entry, position) => (
                <li
                  class="assistant-panel-interaction-review-item"
                  data-interaction-review-question={entry.questionId}
                  key={entry.questionId}
                >
                  <span class="assistant-panel-interaction-review-prompt">
                    {entry.prompt}
                  </span>
                  <span
                    class="assistant-panel-interaction-review-answer"
                    data-interaction-review-answer-kind={
                      answerFor(entry)?.kind ?? "unanswered"
                    }
                  >
                    {describeInteractionAnswer(
                      entry,
                      answerFor(entry),
                      labelOf,
                    )}
                  </span>
                  <button
                    type="button"
                    class="asst-button-compact assistant-panel-interaction-review-edit"
                    onClick={() => {
                      setInteractionReviewing(false);
                      setInteractionIndex(position);
                    }}
                  >
                    {labelOf("interaction.editAnswer", "Edit")}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div
              class="assistant-panel-interaction-question"
              data-interaction-question-kind={question.kind}
            >
              {question.header ? (
                <div class="assistant-panel-interaction-header">
                  {question.header}
                </div>
              ) : null}
              <div class="assistant-panel-interaction-prompt">
                {question.prompt}
              </div>
              {question.hint ? (
                <div class="assistant-panel-interaction-hint">
                  {question.hint}
                </div>
              ) : null}
              {renderInput(question)}
            </div>
          )}
          <div class="assistant-panel-interaction-nav">
            <button
              type="button"
              class="asst-button-compact assistant-panel-interaction-prev"
              disabled={readOnly || interactionReviewing || index === 0}
              onClick={() => setInteractionIndex(Math.max(0, index - 1))}
            >
              {labelOf("interaction.previous", "Previous")}
            </button>
            <button
              type="button"
              class="asst-button-compact assistant-panel-interaction-next"
              disabled={readOnly}
              onClick={() => {
                if (index >= total - 1) {
                  setInteractionReviewing(true);
                } else {
                  setInteractionIndex(index + 1);
                }
              }}
            >
              {index >= total - 1
                ? labelOf("interaction.review", "Review")
                : labelOf("interaction.next", "Next")}
            </button>
          </div>
          <div class="assistant-panel-interaction-actions">
            <button
              type="button"
              class="asst-button assistant-panel-interaction-submit"
              disabled={!canSubmit}
              onClick={() =>
                onAction("submit", {
                  batchId: interactionBatch.batchId,
                  baseRevision: interactionBatch.revision,
                  mutationId: nextMutationId(),
                  answers: submissionAnswers,
                })
              }
            >
              {labelOf("interaction.submit", "Submit")}
            </button>
            <button
              type="button"
              class="asst-button-compact assistant-panel-interaction-decline"
              disabled={readOnly}
              onClick={() =>
                onAction("decline", {
                  batchId: interactionBatch.batchId,
                  baseRevision: interactionBatch.revision,
                  mutationId: nextMutationId(),
                })
              }
            >
              {labelOf("interaction.decline", "Skip")}
            </button>
            <button
              type="button"
              class="asst-button-compact assistant-panel-interaction-cancel"
              onClick={() => onAction(cancelAction, {})}
            >
              {labelOf("interaction.cancelRun", "Cancel run")}
            </button>
          </div>
          {errors.length > 0 ? (
            <ul class="assistant-panel-reply-errors" role="status">
              {errors.map((error, position) => (
                <li
                  key={safeText(error.code) || position}
                  class="assistant-panel-reply-error"
                  data-error-code={safeText(error.code)}
                >
                  {safeText(error.message)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    }

    return (
      <>
        {resources.length > 0 || resourceMenu || errors.length > 0 ? (
          <div class="assistant-panel-reply-resources">
            {resources.length > 0 ? (
              <ul class="assistant-panel-reply-resource-list">
                {resources.map((resource, index) => (
                  <li
                    key={safeText(resource.resourceId) || index}
                    class={
                      "assistant-panel-reply-resource" +
                      (safeText(resource.status) === "unavailable"
                        ? " is-unavailable"
                        : "")
                    }
                    title={safeText(resource.detail)}
                    data-resource-kind={safeText(resource.kind)}
                  >
                    <span class="assistant-panel-reply-resource-label">
                      {safeText(resource.label)}
                    </span>
                    <button
                      type="button"
                      class="asst-button-compact assistant-panel-reply-resource-remove"
                      aria-label={safeText(resource.removeLabel)}
                      disabled={inputDisabled}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onAction("remove-resource", {
                          resourceId: safeText(resource.resourceId),
                        });
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {resourceMenu ? (
              <div class="assistant-panel-reply-resource-menu">
                <button
                  type="button"
                  class="asst-button-compact assistant-panel-reply-resource-add"
                  aria-expanded={resourceMenuOpen ? "true" : "false"}
                  disabled={inputDisabled || resourceMenu.full === true}
                  title={safeText(resourceMenu.fullLabel)}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setResourceMenuOpen((open) => !open);
                  }}
                >
                  {safeText(resourceMenu.addLabel)}
                </button>
                {resourceMenuOpen ? (
                  <div
                    class="assistant-panel-reply-resource-options"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      class="asst-button-compact"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setResourceMenuOpen(false);
                        onAction(
                          safeText(resourceMenu.selectionAction) ||
                            "add-resource",
                          { kind: "selection" },
                        );
                      }}
                    >
                      {safeText(resourceMenu.selectionLabel)}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      class="asst-button-compact"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setResourceMenuOpen(false);
                        onAction(
                          safeText(resourceMenu.filesAction) || "add-resource",
                          { kind: "files" },
                        );
                      }}
                    >
                      {safeText(resourceMenu.filesLabel)}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <textarea
          ref={inputRef}
          class="assistant-panel-reply-input"
          placeholder={safeText(reply.placeholder)}
          disabled={inputDisabled}
          onKeyDown={(event) => {
            const input = inputRef.current;
            if (!input) return;
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              if (!submitDisabled) submit();
              return;
            }
            if (!shouldHandleReplyHistoryKey(event, input)) return;
            if (
              event.key === "ArrowUp" &&
              String(input.value || "").lastIndexOf(
                "\n",
                Math.max(0, Number(input.selectionStart || 0) - 1),
              ) < 0
            ) {
              if (navigateReplyHistory(historyKey, input, -1)) {
                event.preventDefault();
              }
              return;
            }
            if (
              event.key === "ArrowDown" &&
              String(input.value || "").indexOf(
                "\n",
                Number(input.selectionStart || 0),
              ) < 0
            ) {
              if (navigateReplyHistory(historyKey, input, 1)) {
                event.preventDefault();
              }
            }
          }}
          onInput={() => resetReplyHistoryNavigation(historyKey)}
        />
        <div class="assistant-panel-reply-footer">
          <div class="assistant-panel-reply-primary">
            <button
              type="button"
              class="asst-button assistant-panel-reply-submit"
              data-assistant-button-tone={safeText(reply.tone) || "primary"}
              disabled={submitDisabled}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                submit();
              }}
            >
              {safeText(reply.submitLabel) || labelOf("actions.send", "Send")}
            </button>
          </div>
          {controls.length > 0 ? (
            <div class="assistant-panel-reply-controls">
              {controls.map((control, index) => (
                <SelectControl
                  selector={control}
                  onAction={onAction}
                  key={safeText(control.id) || index}
                />
              ))}
            </div>
          ) : null}
          <div class="assistant-panel-reply-secondary">
            <span class="assistant-panel-reply-hint">
              {safeText(reply.hint)}
            </span>
            {reply.showUsageGauge === true ? (
              <UsageGauge usage={panel.usage} labelOf={labelOf} />
            ) : null}
          </div>
        </div>
        {errors.length > 0 ? (
          <ul class="assistant-panel-reply-errors" role="status">
            {errors.map((error, index) => (
              <li
                key={safeText(error.code) || index}
                class="assistant-panel-reply-error"
                data-error-code={safeText(error.code)}
              >
                {safeText(error.message)}
              </li>
            ))}
          </ul>
        ) : null}
      </>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(
      replyRegionEqualityInput(prev.panel),
      replyRegionEqualityInput(next.panel),
    ),
);

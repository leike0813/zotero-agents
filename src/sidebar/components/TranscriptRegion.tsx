/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";
import { useLayoutEffect } from "preact/hooks";

import { equalBySignature } from "./regionEquality";

// Component boundary for the imperative transcript renderer.
//
// The transcript container element is permanent (static HTML): the
// imperative renderer keys scroll listeners, node maps, and virtual-scroll
// state to it. This wrapper owns only the time-multiplexed placeholder
// (idle/loading/failed) and the container-level mode classes; transcript
// rows, incremental mutation effects, and pagination stay imperative on the
// same container. While state === "ready" the vnode is null, so Preact
// never diffs the imperatively managed rows. Entering a non-ready state
// removes the rows through the normal Preact diff and then resets the
// imperative virtual state via the injected reset (mirroring the old
// showTranscriptState clear), and repeated same-state renders compare equal
// so the placeholder node identity is preserved.

export type TranscriptRegionState = "idle" | "loading" | "failed" | "ready";

export const TranscriptRegion = memo(
  function TranscriptRegion(props: {
    container: HTMLElement;
    state: TranscriptRegionState;
    message: string;
    mode: "plain" | "bubble";
    ownerKey: string;
    onResetVirtualState: (container: HTMLElement) => void;
  }) {
    const { container, state, message, mode, ownerKey, onResetVirtualState } =
      props;
    useLayoutEffect(() => {
      container.classList.toggle("bubble-mode", mode === "bubble");
      container.classList.toggle("plain-mode", mode !== "bubble");
    }, [container, mode]);
    useLayoutEffect(() => {
      if (state !== "ready") {
        onResetVirtualState(container);
      }
    }, [container, state, message, ownerKey]);
    if (state === "ready") return null;
    const className =
      state === "loading"
        ? "assistant-transcript-loading asst-spinner"
        : "assistant-transcript-empty";
    return (
      <div
        key={ownerKey}
        class={className}
        data-assistant-transcript-state={state}
      >
        {message || ""}
      </div>
    );
  },
  (prev, next) =>
    prev.container === next.container &&
    equalBySignature(
      {
        state: prev.state,
        message: prev.message,
        mode: prev.mode,
        ownerKey: prev.ownerKey,
      },
      {
        state: next.state,
        message: next.message,
        mode: next.mode,
        ownerKey: next.ownerKey,
      },
    ),
);

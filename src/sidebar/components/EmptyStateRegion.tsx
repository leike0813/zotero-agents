/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { memo } from "preact/compat";

import { equalBySignature } from "./regionEquality";

// The empty-state surface text. The hidden class stays child-side (it is
// owner-driven chrome state, not region content); this component only owns
// the label text that configure() used to write imperatively.

export const EmptyStateRegion = memo(
  function EmptyStateRegion(props: { text: string }) {
    return <>{props.text || ""}</>;
  },
  (prev, next) => equalBySignature(prev.text, next.text),
);

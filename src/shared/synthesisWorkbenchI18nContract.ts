// i18n runtime contract for the synthesis workbench page bundle.
//
// src/synthesisWorkbenchI18n.ts is the message SSOT: it is DOM-free and
// already shared by the host (src/modules/synthesisWorkbenchTab.ts, which
// resolves every key into the envelope) and page projections.
// Page bundles under src/synthesis/** may only import src/shared/** modules,
// so this module re-exports the runtime surface they need. The wire envelope
// types live in ./synthesisWorkbenchWireContract.

export {
  SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
  SYNTHESIS_WORKBENCH_MESSAGE_KEYS,
  formatSynthesisWorkbenchMessage,
  projectSynthesisSidecarFailureCard,
} from "../synthesisWorkbenchI18n";
export type {
  SynthesisWorkbenchI18nEnvelope,
  SynthesisWorkbenchMessageKey,
} from "../synthesisWorkbenchI18n";

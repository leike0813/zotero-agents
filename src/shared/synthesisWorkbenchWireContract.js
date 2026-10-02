/**
 * Synthesis Workbench wire contract — single source of truth for the
 * postMessage envelopes exchanged between the synthesis workbench page and
 * the Zotero host (src/modules/synthesis/workbench/synthesisWorkbenchTab.ts), plus the
 * standalone export envelopes the host injects as window globals.
 *
 * Imported both by the host-side modules (src/modules/**) and by the
 * synthesis workbench page bundle (src/synthesis/**). This file must stay
 * free of imports from src/modules/** so the page bundle never pulls in
 * privileged code. Type-only imports from packages/synthesis-contracts and
 * src/synthesisWorkbenchI18n.ts keep this file runtime-free.
 *
 * Boundary rule: every type here is a pure JSON-serializable wire shape.
 * Snapshot views use the concrete SynthesisWorkbenchSnapshotHostTypes map
 * below. The map is defined here so the host and page share one portable
 * contract without importing privileged host modules into the page bundle.
 * Scalar/filter vocabulary the page renders directly (tabs, surfaces, filter
 * enums, action operations, background jobs, graph window metadata) is also
 * declared here as wire types.
 */
export {};

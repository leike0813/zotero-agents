/**
 * Dashboard wire contract — single source of truth for the postMessage
 * envelopes exchanged between the dashboard iframe page and the Zotero host
 * (src/modules/dashboardHost.ts).
 *
 * Imported both by the host-side modules (src/modules/**) and by the
 * dashboard page bundle (src/dashboard/**). This file must stay free of
 * imports from src/modules/** so the page bundle never pulls in privileged
 * code.
 *
 * Boundary rule: every type here is a pure JSON-serializable wire shape.
 * Snapshot views use the concrete portable DTOs below. Host-internal state
 * that never crosses postMessage (e.g. DashboardState) stays in
 * dashboardHost.ts.
 */
export {};

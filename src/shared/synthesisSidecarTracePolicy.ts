// Shared classification of Synthesis sidecar traces.
//
// The host-side trace store (retention budget) and the dashboard page
// projection (default view) must agree on what a trace is: a failure, a key
// call, or a routine success. One rule set, two consumers.

// Flattened view of one trace event; both consumers can produce it.
export type SynthesisSidecarTraceEventFact = {
  // Empty for the outer span of the trace.
  parentSpanId: string;
  phase: string;
  boundary: string;
  outcome: string;
  operation: string;
  capability: string;
};

export type SynthesisSidecarTraceOutcome = "started" | "failed" | "succeeded";

// Retention tiers, weakest first: routine successes are evicted before key
// successes, failures are evicted last.
export type SynthesisSidecarTraceTier = "routine" | "key" | "failure";

export type SynthesisSidecarTraceClassification = {
  outcome: SynthesisSidecarTraceOutcome;
  tier: SynthesisSidecarTraceTier;
  // Whether the trace belongs to the simplified default view.
  defaultVisible: boolean;
};

// A terminal that did not succeed is a failure: timeouts and cancellations
// end the call without a result.
const FAILURE_OUTCOMES = ["failed", "canceled", "timed-out"];

// Exact durable-maintenance phase. The sidecar emits the durable terminal
// after the accepted root has already returned success.
const MAINTENANCE_TERMINAL_PHASE = "maintenance-terminal";

// Repetitive status, paging and polling operations measured in the Workbench.
// Their successes are routine: hidden from the default view and evicted
// first. Everything else (writes, computes, foreground searches and unknown
// names) stays key.
const ROUTINE_OPERATIONS = new Set([
  // Durable maintenance progress poll.
  "client.getPublicMaintenanceOperation",
  // Retrieval index state poll.
  "client.getRetrievalState",
  // Background job status poll.
  "client.getSynthesisBackgroundJobRows",
  // Workbench chrome input polled by the Sync path.
  "client.getSynthesisWorkbenchChromeInput",
  // Tab surface status fetch.
  "client.getSynthesisWorkbenchSurfaceInput",
  // Topic and tag paging.
  "client.listTopics",
  "client.listStagedTagSuggestions",
  "client.loadTagVocabulary",
  // Tag policy status probe.
  "client.isBuiltinTagPolicyInitialized",
  // Notifier-internal bookkeeping: one echo consumption and one retrieval
  // invalidation per changed item.
  "client.consumeRelatedItemsSyncEcho",
  "client.invalidateRetrievalSources",
]);

export function isSynthesisSidecarFailureOutcome(outcome: string): boolean {
  return FAILURE_OUTCOMES.includes(outcome);
}

function lastTerminal(
  events: readonly SynthesisSidecarTraceEventFact[],
  matches: (fact: SynthesisSidecarTraceEventFact) => boolean,
): SynthesisSidecarTraceEventFact | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const fact = events[index]!;
    if (matches(fact) && fact.outcome !== "started") return fact;
  }
  return undefined;
}

// A native reverse-host read without a parent operation is an internal
// library read; the sidecar synthesizes the orphan root for it.
function isInternalReverseHostRead(
  fact: SynthesisSidecarTraceEventFact,
): boolean {
  return (
    fact.boundary === "reverse-host" && fact.capability.startsWith("library.")
  );
}

function isRoutineTrace(
  events: readonly SynthesisSidecarTraceEventFact[],
): boolean {
  const root = events.find((fact) => !fact.parentSpanId) ?? events[0];
  if (!root) return false;
  if (isInternalReverseHostRead(root)) return true;
  return [root.operation, root.capability].some(
    (name) => name !== "" && ROUTINE_OPERATIONS.has(name),
  );
}

export function classifySynthesisSidecarTrace(
  events: readonly SynthesisSidecarTraceEventFact[],
  active: boolean,
): SynthesisSidecarTraceClassification {
  const outerTerminal = lastTerminal(events, (fact) => !fact.parentSpanId);
  const maintenanceTerminal = lastTerminal(
    events,
    (fact) => fact.phase === MAINTENANCE_TERMINAL_PHASE,
  );
  // A durable maintenance failure wins over an accepted successful root: the
  // root returns before the long maintenance settles. A child failure that
  // was recovered never fails the trace.
  const failure = [maintenanceTerminal, outerTerminal].find(
    (terminal) =>
      terminal !== undefined &&
      isSynthesisSidecarFailureOutcome(terminal.outcome),
  );
  if (failure) {
    return { outcome: "failed", tier: "failure", defaultVisible: true };
  }
  const routine = isRoutineTrace(events);
  const tier: SynthesisSidecarTraceTier = routine ? "routine" : "key";
  // Routine calls stay behind show-all in every state, so an ordinary poll
  // does not flicker into the default view while it is in flight.
  if (active) {
    return { outcome: "started", tier, defaultVisible: !routine };
  }
  const terminal = outerTerminal || maintenanceTerminal;
  if (!terminal) {
    // The trace never completed: a failure event is the only evidence left.
    const failed = events.some((fact) =>
      isSynthesisSidecarFailureOutcome(fact.outcome),
    );
    return failed
      ? { outcome: "failed", tier: "failure", defaultVisible: true }
      : { outcome: "started", tier, defaultVisible: !routine };
  }
  return {
    outcome: terminal.outcome === "succeeded" ? "succeeded" : "failed",
    tier,
    defaultVisible: !routine,
  };
}

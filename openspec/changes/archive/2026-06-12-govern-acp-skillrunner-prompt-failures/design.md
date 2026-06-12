# Design: ACP SkillRunner Prompt Failure Governance

## Problem

ACP SkillRunner-compatible runs currently route all prompt outcomes through output validation and repair, even when the ACP backend itself produced no candidate output. This causes:
- Unnecessary repair prompts for protocol-level stops (refusal, max_tokens, etc.)
- Misleading diagnostics that attribute backend-side failures to output contract violations
- Wasted compute on repair loops that cannot succeed

## Solution

Insert a prompt failure classification step between the ACP prompt call and output validation. If the outcome is classified as a prompt failure, the run short-circuits to a failure diagnostic without entering output validation/repair.

## Architecture

### Types

```
AcpPromptOutcome {
  sessionId: string
  stopReason: string
  assistantText: string
  observedAcpActivity: boolean
}

AcpPromptFailureDiagnostic {
  stage: "acp-prompt-no-output" | "acp-prompt-stopped" | "acp-prompt-failed"
  message: string
  error: string
  details: Record<string, unknown>
}
```

### Classification Logic (`classifyAcpPromptFailure`)

1. **Protocol stop** — If stopReason is `refusal`, `max_tokens`, `max_turn_requests`, or `cancelled` → return `acp-prompt-stopped` diagnostic. These are backend-side conditions that cannot be repaired by re-prompting.

2. **Empty inactive turn** — If stopReason is `end_turn` AND assistantText is empty AND no ACP session activity was observed → return `acp-prompt-no-output` diagnostic. The backend returned a turn boundary without producing any output, suggesting a silent backend failure.

3. **Normal outcome** — Otherwise return `null`, allowing the outcome to proceed to normal output validation and repair.

### Flow

```
ACP prompt call
  → classifyAcpPromptFailure(outcome)
    → non-null diagnostic?
      → attempt result-file fallback (for acp-prompt-no-output only)
      → fail run with ACP prompt failure diagnostic
      → SKIP output validation/repair
    → null?
      → proceed to normal output validation
      → bounded repair if needed
      → final convergence check
```

### Integration Points

Two call sites in `acpSkillRunnerOrchestrator.ts`:

- **Recovery path** (convergence loop for recovered runs): classify before converge, with result-file fallback for `acp-prompt-no-output`
- **Main prompt flow**: classify before convergence, with result-file fallback then fail for `acp-prompt-no-output`, direct fail for other diagnostic stages

## Impact

- No changes to skill contracts, workflow manifests, result contracts, or ACP request payload shape
- Prompt failure diagnostics surface in run transcripts as structured events
- Backend boundaries preserved: no inspection of OpenCode, Hermes, or other backend-private state
- Output repair logic remains unchanged — it simply sees fewer invocations

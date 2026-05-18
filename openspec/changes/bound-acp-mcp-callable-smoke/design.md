# Design

## Timeout

ACP callable smoke is bounded by a single hard deadline. The default deadline is
`60000` milliseconds. The orchestrator treats timeout as smoke failure and does
not send the business skill prompt.

The timeout wraps both the default probe and injected test probes. Production
code uses the default; tests may inject a shorter timeout through orchestrator
dependencies.

## Prompt

The smoke prompt instructs the agent to call each declared required tool exactly
once through the injected MCP callable. It explicitly forbids reading project
files, searching MCP configuration, using shell commands, trying alternative
bridges, guessing tool names, initializing runtime DB, or executing skill
steps.

The target remains callable exposure, not business success. Validation errors
from Zotero MCP are acceptable evidence that the callable exists.

The smoke prompt and the required-MCP guard prompt are runtime orchestration
prompts, not skill patch prompts. They are packaged as standalone templates in
`addon/content/acp-runtime-prompts/templates` and loaded by the ACP orchestrator
at runtime. They MUST NOT be stored in `addon/content/acp-skill-patches/templates`
because ACP skill patches are materialized into skill package text, while these
runtime prompts are sent as separate smoke/guard messages around an ACP session.

The recovered-session continuation guard is also a runtime orchestration prompt
and is packaged with the same ACP runtime prompt templates. The runtime template
family uses English wording consistently with the rest of the ACP execution
prompt surface.

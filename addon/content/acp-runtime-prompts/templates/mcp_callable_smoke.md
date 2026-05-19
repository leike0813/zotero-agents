This is a host-initiated MCP callable smoke probe, not the user task.
This smoke probe has a hard timeout of {TIMEOUT_SECONDS} seconds for host gateway observation; after that deadline the host will mark the MCP callable smoke as failed.

Call each of the following Zotero MCP tools once with minimal arguments to prove that the tools are exposed to this ACP session:

{REQUIRED_TOOLS}

If your tool list exposes Claude-style MCP callables, use the listed `mcp__zotero__...` alias exactly. Do not invent dotted callable names such as `mcp__zotero__synthesis.list_topics`; Claude-style callables replace punctuation with underscores.

Choose the minimal arguments from the tool schemas. For tools with complex parameters or side-effect risk, use clearly invalid probe arguments that should trigger a validation error.
The goal is only to prove that the request reaches the injected MCP callable path. Business success is not required.

Only try the listed tool callables; do not guess other tool names.
Do not read project files, search MCP configuration, use shell commands, or try CLI/HTTP/file bridge alternatives.
Do not initialize the runtime DB, do not execute formal skill steps, and do not repeatedly try alternate access paths. When done, reply with one short sentence saying the smoke probe is done.

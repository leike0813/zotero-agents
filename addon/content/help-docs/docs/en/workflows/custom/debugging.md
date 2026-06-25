# Debugging & Testing

After writing a custom workflow, you can use the following methods to validate and debug it.

## Enable Debug Mode

Enable debug mode in preferences to unlock additional debugging tools and information displays:

Zotero → Settings → Zotero Agents → Enable Debug Mode

When debug mode is enabled:

- Debug-related workflows are displayed in the Dashboard
- Runtime logs become more detailed
- Some diagnostic tools become available

## Using the Debug Probe Toolkit

The plugin includes a built-in `workflow-debug-probe` debugging toolkit, containing several diagnostic workflows:

| Workflow | Purpose |
|----------|---------|
| **Workflow Debug Probe** | Inspect workflow pre-execution state, open diagnostic panel |
| **Debug Sequence Linear Probe** | Validate sequential execution and default handoff passing |
| **Debug Sequence Workspace Reuse Probe** | Validate cross-step workspace reuse |
| **Debug Sequence Context Isolation Probe** | Validate explicit handoff filtering and isolated workspaces |

These workflows are visible in the Dashboard's workflow list (in debug mode) and can be run directly to validate sequence execution mechanisms.

## Log Viewing

### Runtime Logs

Workflows generate runtime logs during execution, viewable in the Dashboard:

1. Open the Dashboard
2. Find a running or completed task
3. Click "View Logs" to expand the log panel

### Writing Logs in Hooks

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // Write to runtime log
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `Processing parent: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // For complex debug information, you can use console
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## Troubleshooting Common Issues

### Workflow Not Appearing in Dashboard

1. Check if `workflow.json` is placed in the correct directory
2. Confirm that `workflow.json` is correctly formatted (JSON syntax)
3. Check that `id` is unique and does not conflict with official workflows
4. Confirm that the `applyResult` script path is correct
5. Check the plugin error log (Zotero → Help → Troubleshooting → View Log File)

### filterInputs Returns null

If `filterInputs` returns `null`, it means no qualifying selection was found, and the workflow will not execute. Check whether the filtering logic is correct.

### Conflict Between buildRequest and Declarative Request

The `buildRequest` hook and the `request` field in `workflow.json` are **mutually exclusive**. If both exist, `buildRequest` takes priority. If request behavior is not as expected, check whether both were inadvertently defined simultaneously.

### Hook Script Execution Failure

- Confirm that the Hook script is in `.mjs` (ES Module) format
- Confirm that the correct function names are exported: `filterInputs`, `buildRequest`, `applyResult`
- Confirm that the function signature correctly receives parameters like `{ parent, bundleReader, runtime }`
- Check whether relative import paths are correct

### Result Not Written to Zotero

If `applyResult` uses `hostApi.mutations.execute()` but it does not take effect, possible causes:

- Write operations require user approval, but the approval popup was ignored or timed out
- Attempted a write operation when `execution.zoteroHostAccess.required` was not set to `true`
- `allowWriteApprovalBypass` needs to be used in conjunction with plugin permission configuration

## Development Suggestions

### Start Simple

1. First use the `pass-through` provider with a minimal `applyResult` to verify that the workflow loads successfully
2. Gradually add `filterInputs` and `buildRequest`
3. Finally connect to the actual backend

### Use notifications.toast for Quick Feedback

```js
hostApi.notifications.toast({
  text: `filterInputs received ${selectionContext.items.parents.length} parent items`,
  type: "default",
});
```

This is a quick debugging technique that lets you see execution results without checking logs.

### Reference Official Workflows

Official workflows are the best learning reference. After installing the official package, you can view the source code in the `<Zotero Data>/zotero-agents/content/official/workflows/` directory:

- `literature-workbench-package/literature-analysis/` — Complete skillrunner.job.v1 example
- `content/official/workflows/literature-workbench-package/export-notes/` — Simple pass-through example
- `content/official/workflows/mineru/` — Example with buildRequest + file handling
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — Interactive mode example

## Next Steps

- [Complete Workflow Manifest Reference](#doc/workflows%2Fcustom%2Fmanifest) — All fields in workflow.json
- [Host API Reference](#doc/workflows%2Fcustom%2Fhost-api) — All APIs available in hooks

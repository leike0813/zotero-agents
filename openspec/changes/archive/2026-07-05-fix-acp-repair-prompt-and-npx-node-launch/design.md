## Design

The repair prompt remains focused on actionable contract information: validation errors, branch instructions, runner-owned result path rules, and output contract details. It deliberately omits the previous candidate payload because the repair turn reuses the same ACP session.

Windows npx ACP launch keeps the user-facing backend command as `npx`, but transport planning may substitute the executable argv with `node.exe <npx-cli.js>`. This is scoped to ACP launch planning for commands recognized as npx, so generic PowerShell script handling remains unchanged.

The direct node path is selected only when both of these are true:

- runtime command resolution reports an available node executable;
- `npx-cli.js` can be derived from the resolved npx shim or Node install layout and exists.

If either condition fails, the current launch plan remains the fallback. This preserves existing behavior for installations where only a shim can be found.

## Notes

- The repair prompt builder can remove the public `previousCandidate` argument because it is an internal TypeScript API.
- The command label remains `npx -y ...` even when the process command is `node.exe`, so UI and diagnostics continue to reflect the configured backend command.

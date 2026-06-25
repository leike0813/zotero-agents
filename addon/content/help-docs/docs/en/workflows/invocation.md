# Workflow Invocation & Configuration

## Invocation Methods

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_play.webp" alt="Run Workflow toolbar button" title="Run Workflow toolbar button" loading="lazy" /><figcaption>Run Workflow toolbar button</figcaption></figure>

### Via Context Menu

1. Select one or more items in the Zotero item list
2. Right-click and select the **Zotero Agents** submenu
3. Choose a workflow from the list
4. If a configuration dialog appears, fill in the parameters and click Run

### Via Dashboard

1. Open the **Dashboard** (toolbar button or menu)
2. Find the target workflow in the workflow list on the Home page
3. Click the **Run** button
4. If a configuration dialog appears, fill in the parameters and submit

## Workflow Settings Dialog

Before running a workflow, a settings dialog may appear with the following configuration options:

### Parameter Settings

Displays all configurable parameters declared by the workflow, varying depending on the workflow definition.

### Provider Options

| Option | Description |
|------|------|
| Backend selection | Choose the backend instance to execute this workflow |
| Model selection | The AI model to use (provided by the backend) |
| Mode settings | Run mode configuration |
| Reasoning Effort | Reasoning effort level (if supported by the backend) |

### Execution Modes

| Mode | Description |
|------|------|
| `auto` | Automatic execution, no user intervention required |
| `sync` | Synchronous execution, wait for results |
| `async` | Asynchronous execution, runs in the background |

### SkillRunner Modes

For Skill-Runner backends:

| Mode | Description |
|------|------|
| `auto` | Non-interactive execution, suitable for skills that don't require user input |
| `interactive` | Interactive execution, may require user input during execution |

## Execution & Monitoring

- After a task is submitted, you can view execution progress in the Dashboard
- Real-time status updates (queued → running → succeeded/failed/canceled)
- For interactive workflows, you can reply to tasks awaiting input in the sidebar
- Once execution completes, results are applied to Zotero via hook scripts

## Notes

- Running a workflow for the first time may require backend configuration
- Some workflows may have specific input requirements (e.g., attachments must be selected)
- Interactive workflows require Zotero to remain running to handle user input

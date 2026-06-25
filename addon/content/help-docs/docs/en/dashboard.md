# Dashboard

## Overview

The Dashboard is the central monitoring and control panel for Zotero Agents. Here you can view task status, manage workflows, browse history, and inspect runtime logs.

## How to Open

- **Toolbar Button**: Click the Zotero Agents icon in the Zotero toolbar
- **Menu**: **Tools → Open Dashboard**
- **Zotero Tab**: Opened via the menu, displayed as an independent Zotero tab

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_workbench.webp" alt="Zotero Agents Toolbar Dashboard Button" title="Zotero Agents Toolbar Dashboard Button" loading="lazy" /><figcaption>Zotero Agents Toolbar Dashboard Button</figcaption></figure>

## Pages

### Home

The default page of the Dashboard, displaying:

- **Workflow List**: All available workflows, with run and settings buttons
- **ACP Chat Area**: Quick access to ACP conversations
- **ACP Skill Runs**: Skill run status for ACP backends
- **Skill Feedback**: View recent skill run feedback ratings and comments
- **Task Summary**: Overview of currently running tasks

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_home.webp" alt="Dashboard Home" title="Dashboard Home" loading="lazy" /><figcaption>Dashboard Home</figcaption></figure>

### Workflow Options

The workflow parameter settings page:

- View and modify configuration for each workflow
- Set default parameters
- Select the default backend

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_workflow-settings.webp" alt="Dashboard Workflow Options Page" title="Dashboard Workflow Options Page" loading="lazy" /><figcaption>Dashboard Workflow Options Page</figcaption></figure>

### Backends

The backend management page:

- List of all configured backends
- Task history for each backend
- Backend detail views (varies by type)

Backend detail views:

| Backend Type | Display |
|-------------|---------|
| Generic HTTP | Task table + runtime logs |
| SkillRunner | Run table + status area + conversation area + reply/cancel actions |
| ACP | Skill Run view |

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_acp-backend.webp" alt="Dashboard ACP Backend Task List" title="Dashboard ACP Backend Task List" loading="lazy" /><figcaption>Dashboard ACP Backend Task List</figcaption></figure>

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skillrunner-backend.webp" alt="Dashboard SkillRunner Backend Task List" title="Dashboard SkillRunner Backend Task List" loading="lazy" /><figcaption>Dashboard SkillRunner Backend Task List</figcaption></figure>

### Products

Browsing and managing workflow products:

- View output artifacts from workflow runs
- Open product folders
- Preview and remove products

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_products.webp" alt="Dashboard Product Storage" title="Dashboard Product Storage" loading="lazy" /><figcaption>Dashboard Product Storage</figcaption></figure>

## Skill Feedback

The Skill Feedback panel displays recent skill run feedback:

| Column | Description |
|--------|-------------|
| Workflow | Name of the executed workflow |
| Backend | The backend that executed the run |
| Rating | User rating (1–5) |
| Comment | Feedback comment |
| Timestamp | When the feedback was submitted |

Actions:
- **Filter**: Filter by rating, workflow, or time range
- **Export**: Export feedback data for analysis

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_skill-feedback.webp" alt="Dashboard Skill Feedback Storage" title="Dashboard Skill Feedback Storage" loading="lazy" /><figcaption>Dashboard Skill Feedback Storage</figcaption></figure>

## Task Status

| Status | Description |
|--------|-------------|
| `queued` | Waiting to be executed |
| `running` | Currently executing |
| `waiting_user` | Waiting for user input |
| `waiting_auth` | Waiting for authorization |
| `succeeded` | Execution succeeded |
| `failed` | Execution failed |
| `canceled` | Canceled |

## Runtime Logs Viewer

The Dashboard includes a built-in log viewer:

- Filter by backend
- Filter by workflow
- Filter by log level
- Filter by time range
- Diagnostic export
- Issue summary copy

<figure class="zs-doc-figure"><img src="chrome://zotero-skills/content/help-docs/assets/img/docs/dashboard_logs.webp" alt="Dashboard Runtime Logs Viewer" title="Dashboard Runtime Logs Viewer" loading="lazy" /><figcaption>Dashboard Runtime Logs Viewer</figcaption></figure>

## Toolbar Button

The Zotero Agents icon button in the Zotero toolbar supports:

- Left-click: Open/toggle the Dashboard
- Displays the count of running tasks
- Shows a popup with the list of running tasks

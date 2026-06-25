# Sidebar Overview

## What is the Sidebar?

The sidebar is a convenient operation panel provided by Zotero Agents, floating on the right side of the Zotero main window. It allows you to interact with backends, view run status, and manage skill execution without leaving your current work context.

## How to Open

- **Toolbar Button**: Click the sidebar toggle button in the Zotero toolbar
- **Menu**: **Tools → Open Sidebar**
- **Dashboard Action**: Click "Open/Close Sidebar" in the Dashboard

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_sidebar.webp" alt="Sidebar toolbar button" title="Sidebar toolbar button" loading="lazy" /><figcaption>Sidebar toolbar button</figcaption></figure>

<figure class="zs-doc-figure zs-doc-figure--icon"><img src="chrome://zotero-skills/content/help-docs/assets/img/icon_sidebar_glow.webp" alt="Sidebar awaiting-reply indicator state" title="Sidebar awaiting-reply indicator state" loading="lazy" /><figcaption>Sidebar awaiting-reply indicator state</figcaption></figure>

## Architecture Notes

The sidebar uses an **iframe architecture**: three tabs each load an independent HTML page as a child iframe, communicating with the plugin main process via postMessage. This design ensures tabs do not interfere with each other, with each panel having an independent rendering context.

In Workspace mode, the three tabs are integrated in a unified container; in legacy mode, each panel can also be embedded directly into Zotero's library pane and reader pane.

## Three Tabs

| Tab | Function | Use Cases |
|-----|----------|-----------| 
| **ACP Chat** | Converse with the ACP backend using the current item as context | Asking questions while reading literature, writing assistance |
| **ACP Skills** | Monitor and manage skill runs executed through the ACP backend | View run progress, inspect results, handle permission requests |
| **SkillRunner** | View and interact with Skill-Runner backend runs | Manage interactive runs, handle authentication |

## Interface Guide

### Tab Switching

The tab bar at the top of the sidebar lets you switch between the three panels. The state of the previous tab is preserved when switching.

### Width Adjustment

The sidebar width can be freely adjusted by dragging the left border to accommodate different content display needs.

### Common Components

All tabs share the following common UI components:

- **Banner**: Top information bar displaying the currently selected project information and action buttons
- **Transcript View**: Main area for conversation or run logs, supporting Plain and Bubble display modes
- **Reply Area**: Bottom input area for sending messages or replies
- **Drawer Panels**: Expandable detail panels on the left and right sides
- **Prompt Component**: Prompts displayed when user interaction is required
- **Plan Component**: Visual progress for multi-step plans

## Quick Links to Each Tab

- [ACP Chat Usage](#doc/sidebar%2Facp-chat) — Conversation interaction with the backend
- [ACP Skills](#doc/sidebar%2Facp-skills) — Manage ACP skill runs
- [SkillRunner Tab](#doc/sidebar%2Fskillrunner-tab) — Manage Skill-Runner runs

## Related Pages

- [Dashboard Overview](#doc/dashboard) — Central monitoring and task management

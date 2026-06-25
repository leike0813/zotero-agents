# Installation Guide

## System Requirements

- **Zotero**: 7.0 or later (Zotero 9 recommended)
- **Platform**: Windows 10+, macOS 12+, Linux (x86_64 / x86 / ARM64 / ARM)

> **About Zotero Versions**: This plugin is developed and tested on Zotero 9. Zotero 8 is theoretically fully supported (the plugin framework has no significant changes between Zotero 8/9); Zotero 7 should also be supported in theory but has not been thoroughly tested due to limited resources. Future maintenance will focus on Zotero 9. If you encounter issues on Zotero 7, please report them on [Issues](https://github.com/leike0813/zotero-agents/issues).

## Installing the Plugin

### From GitHub/Gitee Release (Recommended)

1. Visit [GitHub Releases](https://github.com/leike0813/zotero-agents/releases) or [Gitee Releases Mirror](https://gitee.com/leike0813/zotero-agents/releases)
2. Download the latest `.xpi` file
3. In Zotero, open **Tools → Add-ons**
4. Click the gear icon and select **Install Add-on From File...**
5. Select the downloaded `.xpi` file

### Building from Source

```bash
git clone https://github.com/leike0813/zotero-agents.git
cd zotero-agents
npm install
npm run build
```

The build output is located in the `.scaffold/build/` directory.

## Installing Official Workflow Packages

The plugin ships with **no built-in business logic**. All workflows are provided through separate official workflow packages.

### Method 1: Menu Installation (Recommended)

1. After restarting Zotero, right-click any item → **Zotero Agents** → **📦 Install Official Workflow Packages**
2. The plugin automatically downloads the latest official packages from GitHub / Gitee
3. A success notification appears upon completion; all official workflows will then be visible in the Dashboard

### Method 2: Install from Preferences

1. Open **Zotero → Settings → Zotero Agents**
2. In the **Workflow Settings** section, click **Install Official Workflow Packages**
3. You can also switch the update channel (stable / beta / dev) here and check for updates

### Update Mechanism

- The plugin automatically checks for new versions of official packages on startup
- A confirmation dialog appears when a new version is available
- The workflow list is automatically reloaded after updating

Official Workflow Package Repository: [GitHub](https://github.com/leike0813/zotero-agents-workflows) · [Gitee Mirror](https://gitee.com/leike0813/zotero-agents-workflows)

## Verifying the Installation

1. Restart Zotero
2. You should see the **Zotero Agents** icon in the Zotero toolbar
3. Right-click any item — the **Zotero Agents** submenu should appear (with available workflows)

If the right-click menu only shows a **📦 Install Official Workflow Packages** option, the official packages have not been installed yet — follow the instructions above to install them. After successful installation, proceed to [Getting Started](#doc/getting-started) to configure a backend and run your first workflow.

import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "category",
      label: "📖 Guide",
      items: ["intro", "installation", "getting-started", "markdown-reader"],
    },
    {
      type: "category",
      label: "⚙️ Backend Configuration",
      items: [
        "backends/index",
        "backends/backend-manager",
        "backends/acp",
        "backends/skill-runner",
        "backends/host-bridge",
        "backends/mcp-server",
        "backends/generic-http",
      ],
    },
    {
      type: "category",
      label: "🔧 Workflow",
      items: [
        "workflows/index",
        "workflows/invocation",
        {
          type: "category",
          label: "Official Workflows",
          items: [
            "workflows/literature-analysis",
            "workflows/literature-explainer",
            "workflows/literature-deep-reading",
            "workflows/literature-search-ingest",
            "workflows/tag-bootstrapper",
            "workflows/tag-regulator",
            "workflows/export-import-notes",
            "workflows/mineru",
            "workflows/topic-synthesis",
            "workflows/manuscript-literature-framing",
            "workflows/debug-probe",
          ],
        },
        {
          type: "category",
          label: "Custom Workflows",
          items: [
            "workflows/custom/index",
            "workflows/custom/manifest",
            "workflows/custom/hooks",
            "workflows/custom/parameters",
            "workflows/custom/selection-context",
            "workflows/custom/host-api",
            "workflows/custom/packaging",
            "workflows/custom/localization",
            "workflows/custom/request-kinds",
            "workflows/custom/debugging",
          ],
        },
      ],
    },
    {
      type: "doc",
      label: "📊 Dashboard",
      id: "dashboard",
    },
    {
      type: "category",
      label: "🖥️ Sidebar & ACP Chat",
      items: ["sidebar/index", "sidebar/acp-chat", "sidebar/acp-skills", "sidebar/skillrunner-tab"],
    },
    {
      type: "category",
      label: "🔬 Synthesis Workbench",
      items: [
        "synthesis/index",
        "synthesis/home",
        "synthesis/review",
        "synthesis/concepts",
        "synthesis/git-sync",
        "synthesis/webdav-sync",
        "synthesis/tags",
        "synthesis/index-and-citation",
        "synthesis/topic-synthesis",
      ],
    },
    {
      type: "doc",
      label: "⚙️ Preferences",
      id: "preferences",
    },
  ],
};

export default sidebars;

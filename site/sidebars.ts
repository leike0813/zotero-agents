import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: "category",
      label: "📖 指南",
      items: ["intro", "installation", "getting-started"],
    },
    {
      type: "category",
      label: "⚙️ 后端配置",
      items: [
        "backends/index",
        "backends/acp",
        "backends/skill-runner",
        "backends/generic-http",
      ],
    },
    {
      type: "category",
      label: "🔧 Workflow",
      items: ["workflows/index", "workflows/invocation"],
    },
    {
      type: "doc",
      label: "📊 Dashboard",
      id: "dashboard",
    },
    {
      type: "category",
      label: "🖥️ 侧边栏与 ACP Chat",
      items: ["sidebar/index", "sidebar/acp-chat"],
    },
    {
      type: "category",
      label: "🔬 Synthesis Workbench",
      items: [
        "synthesis/index",
        "synthesis/tags",
        "synthesis/index-and-citation",
        "synthesis/topic-synthesis",
      ],
    },
    {
      type: "doc",
      label: "⚙️ 偏好设置",
      id: "preferences",
    },
  ],
};

export default sidebars;

import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const orgName = "leike0813";
const repoName = "zotero-agents";

const config: Config = {
  title: "Zotero Agents",
  tagline: "一个用于执行 Agent 技能的 Zotero 插件",
  favicon: "img/favicon.png",

  url: `https://${orgName}.github.io`,
  baseUrl: `/${repoName}/`,

  organizationName: orgName,
  projectName: repoName,

  onBrokenLinks: "throw",

  clientModules: [
    "./src/clientModules/localePersistence",
    "./src/clientModules/imageCaptions",
  ],

  i18n: {
    defaultLocale: "en",
    locales: ["zh-CN", "en"],
    localeConfigs: {
      en: { label: "English" },
      "zh-CN": { label: "简体中文" },
    },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: `https://github.com/${orgName}/${repoName}/edit/main/site/`,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Zotero Agents",
      logo: {
        alt: "Zotero Agents",
        src: "img/icon_full.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "文档",
        },
        {
          type: "localeDropdown",
          position: "right",
        },
        {
          href: `https://github.com/${orgName}/${repoName}`,
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "文档",
          items: [
            { label: "首页", to: "/intro" },
            { label: "安装", to: "/installation" },
            { label: "快速开始", to: "/getting-started" },
          ],
        },
        {
          title: "更多",
          items: [
            {
              label: "GitHub",
              href: `https://github.com/${orgName}/${repoName}`,
            },
            {
              label: "Issues",
              href: `https://github.com/${orgName}/${repoName}/issues`,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Zotero Agents. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  },
};

export default config;

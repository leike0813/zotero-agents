import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const orgName = "leike0813";
const repoName = "zotero-agents";

const config: Config = {
  title: "Zotero Agents",
  tagline: "A Zotero plugin for executing agent skills",
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
    locales: ["en", "zh-CN", "fr", "ja", "de", "es", "it", "ko", "ru"],
    localeConfigs: {
      en: { label: "English" },
      "zh-CN": { label: "简体中文" },
      fr: { label: "Français" },
      ja: { label: "日本語" },
      de: { label: "Deutsch" },
      es: { label: "Español" },
      it: { label: "Italiano" },
      ko: { label: "한국어" },
      ru: { label: "Русский" },
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
          label: "Docs",
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
          title: "Docs",
          items: [
            { label: "Home", to: "/intro" },
            { label: "Installation", to: "/installation" },
            { label: "Quick Start", to: "/getting-started" },
          ],
        },
        {
          title: "More",
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

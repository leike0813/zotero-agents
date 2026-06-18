import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Link from "@docusaurus/Link";

const L10N: Record<string, { title: string; tagline: string; enterDocs: string; installGuide: string }> = {
  "zh-CN": {
    title: "Zotero Skills",
    tagline: "一个用于执行 Agent 技能的 Zotero 插件",
    enterDocs: "进入文档",
    installGuide: "安装指南",
  },
  en: {
    title: "Zotero Skills",
    tagline: "An Agent-powered skill execution plugin for Zotero",
    enterDocs: "Documentation",
    installGuide: "Installation",
  },
};

export default function Home() {
  const { i18n } = useDocusaurusContext();
  const locale = i18n.currentLocale;
  const t = L10N[locale] ?? L10N.en;

  return (
    <main style={{ textAlign: "center", paddingTop: "4rem" }}>
      <h1>{t.title}</h1>
      <p style={{ fontSize: "1.2rem", color: "var(--ifm-color-emphasis-700)" }}>
        {t.tagline}
      </p>
      <div style={{ marginTop: "2rem" }}>
        <Link
          className="button button--primary button--lg"
          to="/intro"
          style={{ marginRight: "1rem" }}
        >
          {t.enterDocs}
        </Link>
        <Link
          className="button button--secondary button--lg"
          to="/installation"
        >
          {t.installGuide}
        </Link>
      </div>
    </main>
  );
}

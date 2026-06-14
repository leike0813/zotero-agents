import { useEffect } from "react";
import { useLocation } from "@docusaurus/router";
import Link from "@docusaurus/Link";

/**
 * 首页组件。
 *
 * redirectPage 为 false（即访问 /Zotero-Skills/ 时）时渲染品牌落地页。
 * 如果将来需要直接跳转到文档首页，将 redirectPage 改为 true。
 */
const redirectPage = false;

export default function Home() {
  const location = useLocation();

  useEffect(() => {
    if (redirectPage && location.pathname === "/") {
      window.location.href = "/intro";
    }
  }, [location.pathname]);

  if (redirectPage) return null;

  return (
    <main style={{ textAlign: "center", paddingTop: "4rem" }}>
      <h1>Zotero Skills</h1>
      <p style={{ fontSize: "1.2rem", color: "var(--ifm-color-emphasis-700)" }}>
        一个用于执行 Agent 技能的 Zotero 插件
      </p>
      <div style={{ marginTop: "2rem" }}>
        <Link
          className="button button--primary button--lg"
          to="/intro"
          style={{ marginRight: "1rem" }}
        >
          进入文档
        </Link>
        <Link
          className="button button--secondary button--lg"
          to="/installation"
        >
          安装指南
        </Link>
      </div>
    </main>
  );
}

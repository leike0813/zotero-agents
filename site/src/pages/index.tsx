import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Link from "@docusaurus/Link";
import HomeScreenshotSlider from "../components/HomeScreenshotSlider";
import styles from "./index.module.css";

type HomeContent = {
  title: string;
  tagline: string;
  intro: string;
  pillars: Array<{
    title: string;
    description: string;
  }>;
  showcase: {
    eyebrow: string;
    title: string;
    subtitle: string;
    previousLabel: string;
    nextLabel: string;
    slides: Array<{
      title: string;
      description: string;
      badge: string;
      images: Array<{
        src: string;
        alt: string;
      }>;
    }>;
  };
  ctaTitle: string;
  ctaDescription: string;
  enterDocs: string;
  installGuide: string;
};

const L10N: Record<
  string,
  HomeContent
> = {
  "zh-CN": {
    title: "Zotero Agents",
    tagline: "智能体时代的 Zotero 个人研究工作台",
    intro:
      "把 Zotero 文献库、Agent 后端、可插拔 Workflow、Synthesis Workbench 和 Host Bridge 连接起来，让文献搜索、分析、管理、综合和写作准备沉淀为可审校、可追溯、可复用的研究知识。",
    pillars: [
      {
        title: "可插拔 Workflow",
        description: "把论文解析、深度阅读、标签规范化、主题综合等任务组织成可扩展流程。",
      },
      {
        title: "Assistant Sidebar",
        description: "通过 ACP 连接 Agent 后端，围绕当前文献、选中条目或整个文献库对话协作。",
      },
      {
        title: "Synthesis Workbench",
        description: "管理引文网络、概念、标签和主题综合，把阅读积累转化为知识层。",
      },
      {
        title: "Host Bridge",
        description: "通过 CLI 与 MCP 让外部 Agent 直接读取 Zotero 上下文并写回分析结果。",
      },
    ],
    showcase: {
      eyebrow: "研究流程",
      title: "从单篇阅读到主题综合",
      subtitle:
        "在 Zotero 里完成文献分析、Agent 对话、引文图谱、主题综合和深度阅读，把分散论文逐步组织成可继续使用的研究知识。",
      previousLabel: "上一张截图",
      nextLabel: "下一张截图",
      slides: [
        {
          title: "Synthesis 主题图谱",
          description: "在主题之间建立关系，观察研究方向的结构、层次和关联线索。",
          badge: "Synthesis",
          images: [
            {
              src: "/img/docs/synthesis/topic-graph.png",
              alt: "Synthesis Workbench 主题图谱视图",
            },
          ],
        },
        {
          title: "引文网络与文献位置",
          description: "管理参考文献网络，识别基础文献、外部引用和不同主题下的图谱结构。",
          badge: "Citation Graph",
          images: [
            {
              src: "/img/docs/synthesis/citation-graph.png",
              alt: "Synthesis Workbench 引文图谱视图",
            },
          ],
        },
        {
          title: "Assistant Sidebar",
          description: "在 Zotero 侧边栏中与 ACP Chat、ACP Skills 和 SkillRunner 任务保持连续交互。",
          badge: "Assistant",
          images: [
            {
              src: "/img/docs/sidebar/acp-chat.png",
              alt: "ACP Chat 面板",
            },
            {
              src: "/img/docs/sidebar/acp-skills.png",
              alt: "ACP Skills 面板",
            },
            {
              src: "/img/docs/sidebar/skillrunner-tab.png",
              alt: "SkillRunner 面板",
            },
          ],
        },
        {
          title: "Topic Synthesis 概览",
          description: "把一个研究主题整理为概要、关键论点、比较维度和后续写作材料。",
          badge: "Topic Synthesis",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_overview.png",
              alt: "Topic Synthesis 概览页面",
            },
          ],
        },
        {
          title: "文献分析三件套",
          description: "一次运行生成摘要、参考文献和引文分析，为后续图谱与主题综合打基础。",
          badge: "Literature Analysis",
          images: [
            {
              src: "/img/docs/workflows/literature-analysis_digest.png",
              alt: "文献分析摘要笔记",
            },
            {
              src: "/img/docs/workflows/literature-analysis_references.png",
              alt: "文献分析参考文献笔记",
            },
            {
              src: "/img/docs/workflows/literature-analysis_citation-analysis.png",
              alt: "文献分析引文分析笔记",
            },
          ],
        },
        {
          title: "主题参考文献",
          description: "围绕主题汇集相关参考文献，为综述、开题和论文引言提供可追溯材料。",
          badge: "References",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_references.png",
              alt: "Topic Synthesis 参考文献页面",
            },
          ],
        },
        {
          title: "深度阅读产物",
          description: "生成结构化精读页面，将论文导读、章节理解、概念和扩展阅读放在同一视图中。",
          badge: "Deep Reading",
          images: [
            {
              src: "/img/docs/workflows/literature-deep-reading_1.png",
              alt: "文献深度阅读开篇导读页面",
            },
          ],
        },
      ],
    },
    ctaTitle: "把文献库交给可以持续工作的 Agent",
    ctaDescription:
      "从安装、后端配置到第一个 Workflow，文档会带你完成最短路径；之后可以逐步启用 Synthesis、Host Bridge 和自定义 Workflow。",
    enterDocs: "进入文档",
    installGuide: "安装指南",
  },
  en: {
    title: "Zotero Agents",
    tagline: "A personal research workbench for Zotero in the agent era",
    intro:
      "Connect your Zotero library with agent backends, pluggable workflows, Synthesis Workbench, and Host Bridge so literature search, analysis, management, synthesis, and writing preparation become auditable, traceable, reusable research knowledge.",
    pillars: [
      {
        title: "Pluggable Workflows",
        description: "Turn paper analysis, deep reading, tagging, and topic synthesis into extensible flows.",
      },
      {
        title: "Assistant Sidebar",
        description: "Use ACP backends to collaborate with agents around papers, selections, and your library.",
      },
      {
        title: "Synthesis Workbench",
        description: "Manage citation networks, concepts, tags, and topic synthesis as a library-level knowledge layer.",
      },
      {
        title: "Host Bridge",
        description: "Let external agents read Zotero context and write back structured analysis through CLI and MCP.",
      },
    ],
    showcase: {
      eyebrow: "Research Flow",
      title: "From individual papers to topic synthesis",
      subtitle:
        "Analyze papers, talk with agents, inspect citation graphs, synthesize topics, and turn scattered reading into reusable research knowledge inside Zotero.",
      previousLabel: "Previous screenshot",
      nextLabel: "Next screenshot",
      slides: [
        {
          title: "Synthesis Topic Graph",
          description: "Map relationships between topics and understand the structure of a research direction.",
          badge: "Synthesis",
          images: [
            {
              src: "/img/docs/synthesis/topic-graph.png",
              alt: "Synthesis Workbench topic graph view",
            },
          ],
        },
        {
          title: "Citation Network",
          description: "Manage reference networks and inspect library papers, external references, and graph structure.",
          badge: "Citation Graph",
          images: [
            {
              src: "/img/docs/synthesis/citation-graph.png",
              alt: "Synthesis Workbench citation graph view",
            },
          ],
        },
        {
          title: "Assistant Sidebar",
          description: "Keep ACP Chat, ACP Skills, and SkillRunner tasks available inside the Zotero sidebar.",
          badge: "Assistant",
          images: [
            {
              src: "/img/docs/sidebar/acp-chat.png",
              alt: "ACP Chat panel",
            },
            {
              src: "/img/docs/sidebar/acp-skills.png",
              alt: "ACP Skills panel",
            },
            {
              src: "/img/docs/sidebar/skillrunner-tab.png",
              alt: "SkillRunner panel",
            },
          ],
        },
        {
          title: "Topic Synthesis Overview",
          description: "Organize a research topic into summaries, key claims, comparisons, and writing material.",
          badge: "Topic Synthesis",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_overview.png",
              alt: "Topic Synthesis overview page",
            },
          ],
        },
        {
          title: "Literature Analysis Notes",
          description: "Generate digest, references, and citation analysis notes as the basis for graph and topic work.",
          badge: "Literature Analysis",
          images: [
            {
              src: "/img/docs/workflows/literature-analysis_digest.png",
              alt: "Literature analysis digest note",
            },
            {
              src: "/img/docs/workflows/literature-analysis_references.png",
              alt: "Literature analysis references note",
            },
            {
              src: "/img/docs/workflows/literature-analysis_citation-analysis.png",
              alt: "Literature analysis citation analysis note",
            },
          ],
        },
        {
          title: "Topic References",
          description: "Collect traceable references around a topic for reviews, proposals, and paper introductions.",
          badge: "References",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_references.png",
              alt: "Topic Synthesis references page",
            },
          ],
        },
        {
          title: "Deep Reading Output",
          description: "Generate a structured reading page with guided overview, section notes, concepts, and context.",
          badge: "Deep Reading",
          images: [
            {
              src: "/img/docs/workflows/literature-deep-reading_1.png",
              alt: "Literature deep reading overview page",
            },
          ],
        },
      ],
    },
    ctaTitle: "Give your literature library to agents that can keep working",
    ctaDescription:
      "Start with installation, backend setup, and your first workflow; then expand into Synthesis, Host Bridge, and custom workflows.",
    enterDocs: "Documentation",
    installGuide: "Installation",
  },
};

export default function Home() {
  const { i18n } = useDocusaurusContext();
  const locale = i18n.currentLocale;
  const t = L10N[locale] ?? L10N.en;

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Zotero Agents</p>
          <h1>{t.title}</h1>
          <p className={styles.tagline}>{t.tagline}</p>
          <p className={styles.intro}>{t.intro}</p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/intro">
              {t.enterDocs}
            </Link>
            <Link className="button button--secondary button--lg" to="/installation">
              {t.installGuide}
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.pillars} aria-label={t.tagline}>
        {t.pillars.map((pillar) => (
          <article className={styles.pillar} key={pillar.title}>
            <h2>{pillar.title}</h2>
            <p>{pillar.description}</p>
          </article>
        ))}
      </section>

      <HomeScreenshotSlider {...t.showcase} />

      <section className={styles.cta}>
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaDescription}</p>
        <div className={styles.buttons}>
          <Link className="button button--primary button--lg" to="/getting-started">
            {t.enterDocs}
          </Link>
          <Link className="button button--secondary button--lg" to="/installation">
            {t.installGuide}
          </Link>
        </div>
      </section>
    </main>
  );
}

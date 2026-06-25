import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
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

const POSTER_ALT: Record<string, string> = {
  "zh-CN": "Zotero Agents 研究工作台海报",
  en: "Zotero Agents research workbench poster",
  fr: "Affiche de l'atelier de recherche Zotero Agents",
  ja: "Zotero Agents 研究ワークベンチポスター",
  de: "Zotero Agents Research Workbench Poster",
  es: "Póster del banco de trabajo de investigación Zotero Agents",
  it: "Poster del banco di lavoro di ricerca Zotero Agents",
  ko: "Zotero Agents 연구 워크벤치 포스터",
  ru: "Постер исследовательской рабочей среды Zotero Agents",
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
  fr: {
    title: "Zotero Agents",
    tagline: "Un établi de recherche personnel pour Zotero à l'ère des agents",
    intro:
      "Connectez votre bibliothèque Zotero à des backends d'agents, des workflows modulaires, Synthesis Workbench et Host Bridge pour que la recherche, l'analyse, la gestion, la synthèse et la préparation à la rédaction de la littérature deviennent un savoir de recherche auditable, traçable et réutilisable.",
    pillars: [
      {
        title: "Workflows modulaires",
        description: "Transformez l'analyse d'articles, la lecture approfondie, le balisage et la synthèse de sujets en flux extensibles.",
      },
      {
        title: "Barre latérale Assistant",
        description: "Utilisez des backends ACP pour collaborer avec des agents sur vos articles, sélections et bibliothèque.",
      },
      {
        title: "Synthesis Workbench",
        description: "Gérez les réseaux de citations, concepts, balises et synthèse de sujets comme couche de savoir de votre bibliothèque.",
      },
      {
        title: "Host Bridge",
        description: "Permettez à des agents externes de lire le contexte Zotero et d'écrire des analyses structurées via CLI et MCP.",
      },
    ],
    showcase: {
      eyebrow: "Flux de recherche",
      title: "Des articles individuels à la synthèse de sujets",
      subtitle:
        "Analysez des articles, dialoguez avec des agents, inspectez des graphes de citations, synthétisez des sujets et transformez vos lectures dispersées en savoir de recherche réutilisable dans Zotero.",
      previousLabel: "Capture d'écran précédente",
      nextLabel: "Capture d'écran suivante",
      slides: [
        {
          title: "Graphe de sujets Synthesis",
          description: "Cartographiez les relations entre sujets et comprenez la structure d'une direction de recherche.",
          badge: "Synthesis",
          images: [
            {
              src: "/img/docs/synthesis/topic-graph.png",
              alt: "Vue du graphe de sujets Synthesis Workbench",
            },
          ],
        },
        {
          title: "Réseau de citations",
          description: "Gérez les réseaux de références et inspectez les articles de la bibliothèque, les références externes et la structure du graphe.",
          badge: "Graphe de citations",
          images: [
            {
              src: "/img/docs/synthesis/citation-graph.png",
              alt: "Vue du graphe de citations Synthesis Workbench",
            },
          ],
        },
        {
          title: "Barre latérale Assistant",
          description: "Gardez ACP Chat, ACP Skills et les tâches SkillRunner disponibles dans la barre latérale Zotero.",
          badge: "Assistant",
          images: [
            {
              src: "/img/docs/sidebar/acp-chat.png",
              alt: "Panneau ACP Chat",
            },
            {
              src: "/img/docs/sidebar/acp-skills.png",
              alt: "Panneau ACP Skills",
            },
            {
              src: "/img/docs/sidebar/skillrunner-tab.png",
              alt: "Panneau SkillRunner",
            },
          ],
        },
        {
          title: "Aperçu de la synthèse de sujet",
          description: "Organisez un sujet de recherche en résumés, affirmations clés, comparaisons et matériel de rédaction.",
          badge: "Synthèse de sujet",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_overview.png",
              alt: "Page d'aperçu de la synthèse de sujet",
            },
          ],
        },
        {
          title: "Notes d'analyse de littérature",
          description: "Générez des notes de résumé, de références et d'analyse de citations comme base pour le graphe et les sujets.",
          badge: "Analyse de littérature",
          images: [
            {
              src: "/img/docs/workflows/literature-analysis_digest.png",
              alt: "Note de résumé d'analyse de littérature",
            },
            {
              src: "/img/docs/workflows/literature-analysis_references.png",
              alt: "Note de références d'analyse de littérature",
            },
            {
              src: "/img/docs/workflows/literature-analysis_citation-analysis.png",
              alt: "Note d'analyse de citations d'analyse de littérature",
            },
          ],
        },
        {
          title: "Références du sujet",
          description: "Collectez des références traçables autour d'un sujet pour des revues, propositions et introductions d'articles.",
          badge: "Références",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_references.png",
              alt: "Page de références de la synthèse de sujet",
            },
          ],
        },
        {
          title: "Produit de lecture approfondie",
          description: "Générez une page de lecture structurée avec aperçu guidé, notes de sections, concepts et contexte.",
          badge: "Lecture approfondie",
          images: [
            {
              src: "/img/docs/workflows/literature-deep-reading_1.png",
              alt: "Page d'aperçu de lecture approfondie de littérature",
            },
          ],
        },
      ],
    },
    ctaTitle: "Confiez votre bibliothèque littéraire à des agents qui peuvent continuer à travailler",
    ctaDescription:
      "Commencez par l'installation, la configuration du backend et votre premier workflow ; puis étendez-vous vers Synthesis, Host Bridge et les workflows personnalisés.",
    enterDocs: "Documentation",
    installGuide: "Installation",
  },
  ja: {
    title: "Zotero Agents",
    tagline: "エージェント時代の Zotero パーソナル研究ワークベンチ",
    intro:
      "Zotero ライブラリをエージェントバックエンド、プラグイン可能なワークフロー、Synthesis Workbench、Host Bridge と接続し、文献の検索・分析・管理・統合・執筆準備を監査可能で追跡可能かつ再利用可能な研究知識にします。",
    pillars: [
      {
        title: "プラグイン可能なワークフロー",
        description: "論文分析、深読、タグ付け、トピック統合を拡張可能なフローにします。",
      },
      {
        title: "アシスタントサイドバー",
        description: "ACP バックエンドを使って、論文・選択項目・ライブラリについてエージェントと協働します。",
      },
      {
        title: "Synthesis Workbench",
        description: "引用ネットワーク、概念、タグ、トピック統合をライブラリレベルの知識層として管理します。",
      },
      {
        title: "Host Bridge",
        description: "外部エージェントが CLI と MCP を通じて Zotero コンテキストを読み取り、構造化された分析結果を書き戻します。",
      },
    ],
    showcase: {
      eyebrow: "研究フロー",
      title: "個々の論文からトピック統合へ",
      subtitle:
        "論文を分析し、エージェントと対話し、引用グラフを調査し、トピックを統合して、バラバラな読書を Zotero 内で再利用可能な研究知識に変換します。",
      previousLabel: "前のスクリーンショット",
      nextLabel: "次のスクリーンショット",
      slides: [
        {
          title: "Synthesis トピックグラフ",
          description: "トピック間の関係をマッピングし、研究方向の構造を理解します。",
          badge: "Synthesis",
          images: [
            {
              src: "/img/docs/synthesis/topic-graph.png",
              alt: "Synthesis Workbench トピックグラフビュー",
            },
          ],
        },
        {
          title: "引用ネットワーク",
          description: "参照ネットワークを管理し、ライブラリ論文、外部参照、グラフ構造を調査します。",
          badge: "引用グラフ",
          images: [
            {
              src: "/img/docs/synthesis/citation-graph.png",
              alt: "Synthesis Workbench 引用グラフビュー",
            },
          ],
        },
        {
          title: "アシスタントサイドバー",
          description: "Zotero サイドバー内で ACP Chat、ACP Skills、SkillRunner タスクを継続的に利用できます。",
          badge: "アシスタント",
          images: [
            {
              src: "/img/docs/sidebar/acp-chat.png",
              alt: "ACP Chat パネル",
            },
            {
              src: "/img/docs/sidebar/acp-skills.png",
              alt: "ACP Skills パネル",
            },
            {
              src: "/img/docs/sidebar/skillrunner-tab.png",
              alt: "SkillRunner パネル",
            },
          ],
        },
        {
          title: "トピック統合の概要",
          description: "研究トピックを要約、主要な主張、比較、執筆素材として整理します。",
          badge: "トピック統合",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_overview.png",
              alt: "トピック統合の概要ページ",
            },
          ],
        },
        {
          title: "文献分析ノート",
          description: "グラフとトピック作業の基盤として、ダイジェスト、参考文献、引用分析ノートを生成します。",
          badge: "文献分析",
          images: [
            {
              src: "/img/docs/workflows/literature-analysis_digest.png",
              alt: "文献分析ダイジェストノート",
            },
            {
              src: "/img/docs/workflows/literature-analysis_references.png",
              alt: "文献分析参考文献ノート",
            },
            {
              src: "/img/docs/workflows/literature-analysis_citation-analysis.png",
              alt: "文献分析引用分析ノート",
            },
          ],
        },
        {
          title: "トピック参考文献",
          description: "レビュー、提案、論文の導入のために、トピック周辺の追跡可能な参考文献を収集します。",
          badge: "参考文献",
          images: [
            {
              src: "/img/docs/workflows/topic-synthesis_references.png",
              alt: "トピック統合参考文献ページ",
            },
          ],
        },
        {
          title: "深読の成果物",
          description: "ガイド付き概要、セクションノート、概念、コンテキストを含む構造化された読書ページを生成します。",
          badge: "深読",
          images: [
            {
              src: "/img/docs/workflows/literature-deep-reading_1.png",
              alt: "文献深読の概要ページ",
            },
          ],
        },
      ],
    },
    ctaTitle: "持続的に作業できるエージェントに文献ライブラリを任せましょう",
    ctaDescription:
      "インストール、バックエンド設定、最初のワークフローから始め、Synthesis、Host Bridge、カスタムワークフローへと拡張できます。",
    enterDocs: "ドキュメント",
    installGuide: "インストール",
  },
  de: {
    title: "Zotero Agents",
    tagline: "Eine persönliche Forschungsworkbench für Zotero im Zeitalter der Agenten",
    intro:
      "Verbinden Sie Ihre Zotero-Bibliothek mit Agenten-Backends, plug-in-Workflows, Synthesis Workbench und Host Bridge, damit Literatursuche, Analyse, Verwaltung, Synthese und Schreibvorbereitung zu überprüfbarem, nachvollziehbarem und wiederverwendbarem Forschungswissen werden.",
    pillars: [
      { title: "Plugin-Workflows", description: "Machen Sie Paper-Analyse, Deep Reading, Tagging und Themensynthese zu erweiterbaren Abläufen." },
      { title: "Assistenten-Seitenleiste", description: "Nutzen Sie ACP-Backends zur Zusammenarbeit mit Agenten an Papers, Auswahlen und Ihrer Bibliothek." },
      { title: "Synthesis Workbench", description: "Verwalten Sie Zitationsnetzwerke, Konzepte, Tags und Themensynthese als Wissensebene Ihrer Bibliothek." },
      { title: "Host Bridge", description: "Lassen Sie externe Agenten Zotero-Kontext lesen und strukturierte Analysen über CLI und MCP zurückschreiben." },
    ],
    showcase: {
      eyebrow: "Forschungsablauf",
      title: "Von einzelnen Papers zur Themensynthese",
      subtitle: "Analysieren Sie Papers, sprechen Sie mit Agenten, inspizieren Sie Zitationsgraphen, synthetisieren Sie Themen und verwandeln Sie verteilte Lektüre in wiederverwendbares Forschungswissen in Zotero.",
      previousLabel: "Vorheriger Screenshot", nextLabel: "Nächster Screenshot",
      slides: [
        { title: "Synthesis-Themagraph", description: "Beziehungen zwischen Themen kartieren und die Struktur einer Forschungsrichtung verstehen.", badge: "Synthesis", images: [{ src: "/img/docs/synthesis/topic-graph.png", alt: "Synthesis Workbench Themagraph-Ansicht" }] },
        { title: "Zitationsnetzwerk", description: "Referenznetzwerke verwalten und Bibliothekspaper, externe Referenzen und Graphstruktur inspizieren.", badge: "Zitationsgraph", images: [{ src: "/img/docs/synthesis/citation-graph.png", alt: "Synthesis Workbench Zitationsgraph-Ansicht" }] },
        { title: "Assistenten-Seitenleiste", description: "ACP Chat, ACP Skills und SkillRunner-Aufgaben in der Zotero-Seitenleiste verfügbar halten.", badge: "Assistent", images: [{ src: "/img/docs/sidebar/acp-chat.png", alt: "ACP Chat-Panel" }, { src: "/img/docs/sidebar/acp-skills.png", alt: "ACP Skills-Panel" }, { src: "/img/docs/sidebar/skillrunner-tab.png", alt: "SkillRunner-Panel" }] },
        { title: "Themensynthese-Übersicht", description: "Ein Forschungsthema in Zusammenfassungen, Kernaussagen, Vergleiche und Schreibmaterial organisieren.", badge: "Themensynthese", images: [{ src: "/img/docs/workflows/topic-synthesis_overview.png", alt: "Themensynthese Übersichtsseite" }] },
        { title: "Literaturanalyse-Notizen", description: "Zusammenfassungs-, Referenz- und Zitationsanalyse-Notizen als Grundlage für Graphen- und Themenarbeit erstellen.", badge: "Literaturanalyse", images: [{ src: "/img/docs/workflows/literature-analysis_digest.png", alt: "Literaturanalyse Zusammenfassungsnotiz" }, { src: "/img/docs/workflows/literature-analysis_references.png", alt: "Literaturanalyse Referenznotiz" }, { src: "/img/docs/workflows/literature-analysis_citation-analysis.png", alt: "Literaturanalyse Zitationsanalysenotiz" }] },
        { title: "Themenreferenzen", description: "Nachvollziehbare Referenzen zu einem Thema für Reviews, Vorschläge und Paper-Einleitungen sammeln.", badge: "Referenzen", images: [{ src: "/img/docs/workflows/topic-synthesis_references.png", alt: "Themensynthese Referenzseite" }] },
        { title: "Deep-Reading-Ergebnis", description: "Eine strukturierte Leseseite mit geführter Übersicht, Abschnittsnotizen, Konzepten und Kontext erstellen.", badge: "Deep Reading", images: [{ src: "/img/docs/workflows/literature-deep-reading_1.png", alt: "Literatur Deep Reading Übersichtsseite" }] },
      ],
    },
    ctaTitle: "Übergeben Sie Ihre Literaturbibliothek Agenten, die weiterarbeiten können",
    ctaDescription: "Beginnen Sie mit Installation, Backend-Einrichtung und Ihrem ersten Workflow; erweitern Sie dann um Synthesis, Host Bridge und benutzerdefinierte Workflows.",
    enterDocs: "Dokumentation", installGuide: "Installation",
  },
  es: {
    title: "Zotero Agents",
    tagline: "Un banco de trabajo de investigación personal para Zotero en la era de los agentes",
    intro:
      "Conecte su biblioteca Zotero con backends de agentes, flujos de trabajo conectables, Synthesis Workbench y Host Bridge para que la búsqueda, análisis, gestión, síntesis y preparación de escritura de literatura se conviertan en conocimiento de investigación auditable, trazable y reutilizable.",
    pillars: [
      { title: "Workflows conectables", description: "Convierta el análisis de artículos, la lectura profunda, el etiquetado y la síntesis de temas en flujos extensibles." },
      { title: "Barra lateral de asistente", description: "Use backends ACP para colaborar con agentes en artículos, selecciones y su biblioteca." },
      { title: "Synthesis Workbench", description: "Gestione redes de citas, conceptos, etiquetas y síntesis de temas como capa de conocimiento de su biblioteca." },
      { title: "Host Bridge", description: "Permita que agentes externos lean el contexto de Zotero y escriban análisis estructurados a través de CLI y MCP." },
    ],
    showcase: {
      eyebrow: "Flujo de investigación",
      title: "De artículos individuales a la síntesis de temas",
      subtitle: "Analice artículos, hable con agentes, inspeccione grafos de citas, sintetice temas y convierta lecturas dispersas en conocimiento de investigación reutilizable en Zotero.",
      previousLabel: "Captura anterior", nextLabel: "Captura siguiente",
      slides: [
        { title: "Grafo de temas Synthesis", description: "Mapee relaciones entre temas y comprenda la estructura de una dirección de investigación.", badge: "Synthesis", images: [{ src: "/img/docs/synthesis/topic-graph.png", alt: "Vista del grafo de temas Synthesis Workbench" }] },
        { title: "Red de citas", description: "Gestione redes de referencias e inspeccione artículos de biblioteca, referencias externas y estructura del grafo.", badge: "Grafo de citas", images: [{ src: "/img/docs/synthesis/citation-graph.png", alt: "Vista del grafo de citas Synthesis Workbench" }] },
        { title: "Barra lateral de asistente", description: "Mantenga ACP Chat, ACP Skills y tareas SkillRunner disponibles en la barra lateral de Zotero.", badge: "Asistente", images: [{ src: "/img/docs/sidebar/acp-chat.png", alt: "Panel ACP Chat" }, { src: "/img/docs/sidebar/acp-skills.png", alt: "Panel ACP Skills" }, { src: "/img/docs/sidebar/skillrunner-tab.png", alt: "Panel SkillRunner" }] },
        { title: "Resumen de síntesis de tema", description: "Organice un tema de investigación en resúmenes, afirmaciones clave, comparaciones y material de escritura.", badge: "Síntesis de tema", images: [{ src: "/img/docs/workflows/topic-synthesis_overview.png", alt: "Página de resumen de síntesis de tema" }] },
        { title: "Notas de análisis de literatura", description: "Genere notas de resumen, referencias y análisis de citas como base para el trabajo de grafos y temas.", badge: "Análisis de literatura", images: [{ src: "/img/docs/workflows/literature-analysis_digest.png", alt: "Nota de resumen de análisis de literatura" }, { src: "/img/docs/workflows/literature-analysis_references.png", alt: "Nota de referencias de análisis de literatura" }, { src: "/img/docs/workflows/literature-analysis_citation-analysis.png", alt: "Nota de análisis de citas" }] },
        { title: "Referencias del tema", description: "Recoja referencias trazables sobre un tema para revisiones, propuestas e introducciones de artículos.", badge: "Referencias", images: [{ src: "/img/docs/workflows/topic-synthesis_references.png", alt: "Página de referencias de síntesis de tema" }] },
        { title: "Resultado de lectura profunda", description: "Genere una página de lectura estructurada con guía, notas de secciones, conceptos y contexto.", badge: "Lectura profunda", images: [{ src: "/img/docs/workflows/literature-deep-reading_1.png", alt: "Página de resumen de lectura profunda" }] },
      ],
    },
    ctaTitle: "Confíe su biblioteca de literatura a agentes que pueden seguir trabajando",
    ctaDescription: "Comience con la instalación, configuración del backend y su primer workflow; luego amplíe con Synthesis, Host Bridge y workflows personalizados.",
    enterDocs: "Documentación", installGuide: "Instalación",
  },
  it: {
    title: "Zotero Agents",
    tagline: "Un banco di lavoro personale per la ricerca con Zotero nell'era degli agenti",
    intro:
      "Collegate la vostra libreria Zotero con backend di agenti, workflow collegabili, Synthesis Workbench e Host Bridge affinché la ricerca, l'analisi, la gestione, la sintesi e la preparazione alla scrittura della letteratura diventino conoscenza di ricerca verificabile, tracciabile e riutilizzabile.",
    pillars: [
      { title: "Workflow collegabili", description: "Trasformate l'analisi di articoli, la lettura approfondita, il tagging e la sintesi di temi in flussi estendibili." },
      { title: "Barra laterale assistente", description: "Utilizzate i backend ACP per collaborare con gli agenti su articoli, selezioni e la vostra libreria." },
      { title: "Synthesis Workbench", description: "Gestite reti di citazioni, concetti, tag e sintesi di temi come livello di conoscenza della vostra libreria." },
      { title: "Host Bridge", description: "Permettete agli agenti esterni di leggere il contesto Zotero e scrivere analisi strutturate tramite CLI e MCP." },
    ],
    showcase: {
      eyebrow: "Flusso di ricerca",
      title: "Dai singoli articoli alla sintesi di temi",
      subtitle: "Analizzate articoli, dialogate con agenti, ispezionate grafi di citazioni, sintetizzate temi e trasformate letture sparse in conoscenza di ricerca riutilizzabile in Zotero.",
      previousLabel: "Screenshot precedente", nextLabel: "Screenshot successivo",
      slides: [
        { title: "Grafo dei temi Synthesis", description: "Mappate le relazioni tra temi e comprendete la struttura di una direzione di ricerca.", badge: "Synthesis", images: [{ src: "/img/docs/synthesis/topic-graph.png", alt: "Vista grafo temi Synthesis Workbench" }] },
        { title: "Rete di citazioni", description: "Gestite le reti di riferimenti e ispezionate articoli di libreria, riferimenti esterni e struttura del grafo.", badge: "Grafo citazioni", images: [{ src: "/img/docs/synthesis/citation-graph.png", alt: "Vista grafo citazioni Synthesis Workbench" }] },
        { title: "Barra laterale assistente", description: "Mantenete ACP Chat, ACP Skills e attività SkillRunner disponibili nella barra laterale di Zotero.", badge: "Assistente", images: [{ src: "/img/docs/sidebar/acp-chat.png", alt: "Pannello ACP Chat" }, { src: "/img/docs/sidebar/acp-skills.png", alt: "Pannello ACP Skills" }, { src: "/img/docs/sidebar/skillrunner-tab.png", alt: "Pannello SkillRunner" }] },
        { title: "Panoramica sintesi tema", description: "Organizzate un tema di ricerca in riassunti, affermazioni chiave, confronti e materiale di scrittura.", badge: "Sintesi tema", images: [{ src: "/img/docs/workflows/topic-synthesis_overview.png", alt: "Pagina panoramica sintesi tema" }] },
        { title: "Note di analisi letteratura", description: "Generare note di riassunto, riferimenti e analisi citazioni come base per il lavoro su grafi e temi.", badge: "Analisi letteratura", images: [{ src: "/img/docs/workflows/literature-analysis_digest.png", alt: "Nota riassunto analisi letteratura" }, { src: "/img/docs/workflows/literature-analysis_references.png", alt: "Nota riferimenti analisi letteratura" }, { src: "/img/docs/workflows/literature-analysis_citation-analysis.png", alt: "Nota analisi citazioni" }] },
        { title: "Riferimenti del tema", description: "Raccogliete riferimenti tracciabili su un tema per revisioni, proposte e introduzioni di articoli.", badge: "Riferimenti", images: [{ src: "/img/docs/workflows/topic-synthesis_references.png", alt: "Pagina riferimenti sintesi tema" }] },
        { title: "Risultato lettura approfondita", description: "Generate una pagina di lettura strutturata con panoramica guidata, note di sezioni, concetti e contesto.", badge: "Lettura approfondita", images: [{ src: "/img/docs/workflows/literature-deep-reading_1.png", alt: "Pagina panoramica lettura approfondita" }] },
      ],
    },
    ctaTitle: "Affidate la vostra biblioteca letteraria ad agenti che possono continuare a lavorare",
    ctaDescription: "Iniziate con installazione, configurazione del backend e il vostro primo workflow; poi espandete con Synthesis, Host Bridge e workflow personalizzati.",
    enterDocs: "Documentazione", installGuide: "Installazione",
  },
  ko: {
    title: "Zotero Agents",
    tagline: "에이전트 시대의 Zotero 개인 연구 워크벤치",
    intro:
      "Zotero 라이브러리를 에이전트 백엔드, 플러그인 가능한 워크플로, Synthesis Workbench, Host Bridge와 연결하여 문헌 검색·분석·관리·통합·집필 준비를 감사 가능하고 추적 가능하며 재사용 가능한 연구 지식으로 만듭니다.",
    pillars: [
      { title: "플러그인 가능 워크플로", description: "논문 분석, 심층 독서, 태깅, 토픽 통합을 확장 가능한 플로우로 만듭니다." },
      { title: "어시스턴트 사이드바", description: "ACP 백엔드를 사용하여 논문, 선택 항목, 라이브러리에 대해 에이전트와 협업합니다." },
      { title: "Synthesis Workbench", description: "인용 네트워크, 개념, 태그, 토픽 통합을 라이브러리 수준의 지식 계층으로 관리합니다." },
      { title: "Host Bridge", description: "외부 에이전트가 CLI와 MCP를 통해 Zotero 컨텍스트를 읽고 구조화된 분석 결과를 기록합니다." },
    ],
    showcase: {
      eyebrow: "연구 플로우",
      title: "개별 논문에서 토픽 통합으로",
      subtitle: "논문을 분석하고, 에이전트와 대화하고, 인용 그래프를 조사하고, 토픽을 통합하여 흩어진 읽기를 Zotero 내에서 재사용 가능한 연구 지식으로 전환합니다.",
      previousLabel: "이전 스크린샷", nextLabel: "다음 스크린샷",
      slides: [
        { title: "Synthesis 토픽 그래프", description: "토픽 간 관계를 매핑하고 연구 방향의 구조를 이해합니다.", badge: "Synthesis", images: [{ src: "/img/docs/synthesis/topic-graph.png", alt: "Synthesis Workbench 토픽 그래프 뷰" }] },
        { title: "인용 네트워크", description: "참조 네트워크를 관리하고 라이브러리 논문, 외부 참조, 그래프 구조를 조사합니다.", badge: "인용 그래프", images: [{ src: "/img/docs/synthesis/citation-graph.png", alt: "Synthesis Workbench 인용 그래프 뷰" }] },
        { title: "어시스턴트 사이드바", description: "Zotero 사이드바에서 ACP Chat, ACP Skills, SkillRunner 작업을 계속 사용할 수 있습니다.", badge: "어시스턴트", images: [{ src: "/img/docs/sidebar/acp-chat.png", alt: "ACP Chat 패널" }, { src: "/img/docs/sidebar/acp-skills.png", alt: "ACP Skills 패널" }, { src: "/img/docs/sidebar/skillrunner-tab.png", alt: "SkillRunner 패널" }] },
        { title: "토픽 통합 개요", description: "연구 토픽을 요약, 주요 주장, 비교, 집필 자료로 정리합니다.", badge: "토픽 통합", images: [{ src: "/img/docs/workflows/topic-synthesis_overview.png", alt: "토픽 통합 개요 페이지" }] },
        { title: "문헌 분석 노트", description: "그래프와 토픽 작업의 기반이 될 요약, 참고문헌, 인용 분석 노트를 생성합니다.", badge: "문헌 분석", images: [{ src: "/img/docs/workflows/literature-analysis_digest.png", alt: "문헌 분석 요약 노트" }, { src: "/img/docs/workflows/literature-analysis_references.png", alt: "문헌 분석 참고문헌 노트" }, { src: "/img/docs/workflows/literature-analysis_citation-analysis.png", alt: "문헌 분석 인용 분석 노트" }] },
        { title: "토픽 참고문헌", description: "리뷰, 제안, 논문 서론을 위해 토픽 주변의 추적 가능한 참고문헌을 수집합니다.", badge: "참고문헌", images: [{ src: "/img/docs/workflows/topic-synthesis_references.png", alt: "토픽 통합 참고문헌 페이지" }] },
        { title: "심층 독서 결과물", description: "가이드 개요, 섹션 노트, 개념, 컨텍스트가 포함된 구조화된 독서 페이지를 생성합니다.", badge: "심층 독서", images: [{ src: "/img/docs/workflows/literature-deep-reading_1.png", alt: "문헌 심층 독서 개요 페이지" }] },
      ],
    },
    ctaTitle: "지속적으로 작업할 수 있는 에이전트에게 문헌 라이브러리를 맡기세요",
    ctaDescription: "설치, 백엔드 설정, 첫 번째 워크플로로 시작한 후 Synthesis, Host Bridge, 사용자 정의 워크플로로 확장할 수 있습니다.",
    enterDocs: "문서", installGuide: "설치",
  },
  ru: {
    title: "Zotero Agents",
    tagline: "Персональная исследовательская рабочая среда Zotero в эпоху агентов",
    intro:
      "Подключите вашу библиотеку Zotero к бэкендам агентов, подключаемым рабочим процессам, Synthesis Workbench и Host Bridge, чтобы поиск, анализ, управление, синтез и подготовка к написанию литературы стали проверяемым, отслеживаемым и повторно используемым исследовательским знанием.",
    pillars: [
      { title: "Подключаемые рабочие процессы", description: "Превратите анализ статей, глубокое чтение, тегирование и синтез тем в расширяемые процессы." },
      { title: "Боковая панель ассистента", description: "Используйте бэкенды ACP для сотрудничества с агентами над статьями, выделениями и вашей библиотекой." },
      { title: "Synthesis Workbench", description: "Управляйте сетями цитирований, концепциями, тегами и синтезом тем как уровнем знания вашей библиотеки." },
      { title: "Host Bridge", description: "Позвольте внешним агентам читать контекст Zotero и записывать структурированные результаты анализа через CLI и MCP." },
    ],
    showcase: {
      eyebrow: "Исследовательский процесс",
      title: "От отдельных статей к синтезу тем",
      subtitle: "Анализируйте статьи, беседуйте с агентами, исследуйте графы цитирований, синтезируйте темы и превращайте разрозненное чтение в повторно используемое исследовательское знание в Zotero.",
      previousLabel: "Предыдущий скриншот", nextLabel: "Следующий скриншот",
      slides: [
        { title: "Граф тем Synthesis", description: "Картографируйте связи между темами и понимайте структуру направления исследования.", badge: "Synthesis", images: [{ src: "/img/docs/synthesis/topic-graph.png", alt: "Вид графа тем Synthesis Workbench" }] },
        { title: "Сеть цитирований", description: "Управляйте сетями ссылок и исследуйте статьи библиотеки, внешние ссылки и структуру графа.", badge: "Граф цитирований", images: [{ src: "/img/docs/synthesis/citation-graph.png", alt: "Вид графа цитирований Synthesis Workbench" }] },
        { title: "Боковая панель ассистента", description: "Держите ACP Chat, ACP Skills и задачи SkillRunner доступными в боковой панели Zotero.", badge: "Ассистент", images: [{ src: "/img/docs/sidebar/acp-chat.png", alt: "Панель ACP Chat" }, { src: "/img/docs/sidebar/acp-skills.png", alt: "Панель ACP Skills" }, { src: "/img/docs/sidebar/skillrunner-tab.png", alt: "Панель SkillRunner" }] },
        { title: "Обзор синтеза темы", description: "Организуйте исследовательскую тему в резюме, ключевые утверждения, сравнения и материал для написания.", badge: "Синтез темы", images: [{ src: "/img/docs/workflows/topic-synthesis_overview.png", alt: "Страница обзора синтеза темы" }] },
        { title: "Заметки анализа литературы", description: "Создавайте заметки резюме, ссылок и анализа цитирований как основу для работы с графами и темами.", badge: "Анализ литературы", images: [{ src: "/img/docs/workflows/literature-analysis_digest.png", alt: "Заметка резюме анализа литературы" }, { src: "/img/docs/workflows/literature-analysis_references.png", alt: "Заметка ссылок анализа литературы" }, { src: "/img/docs/workflows/literature-analysis_citation-analysis.png", alt: "Заметка анализа цитирований" }] },
        { title: "Ссылки темы", description: "Собирайте отслеживаемые ссылки по теме для обзоров, предложений и введений к статьям.", badge: "Ссылки", images: [{ src: "/img/docs/workflows/topic-synthesis_references.png", alt: "Страница ссылок синтеза темы" }] },
        { title: "Результат глубокого чтения", description: "Создавайте структурированную страницу чтения с направляющим обзором, заметками по разделам, концепциями и контекстом.", badge: "Глубокое чтение", images: [{ src: "/img/docs/workflows/literature-deep-reading_1.png", alt: "Страница обзора глубокого чтения" }] },
      ],
    },
    ctaTitle: "Доверьте вашу библиотеку агентам, которые могут продолжать работать",
    ctaDescription: "Начните с установки, настройки бэкенда и вашего первого рабочего процесса; затем расширьте до Synthesis, Host Bridge и пользовательских рабочих процессов.",
    enterDocs: "Документация", installGuide: "Установка",
  },
};

export default function Home() {
  const { i18n } = useDocusaurusContext();
  const locale = i18n.currentLocale;
  const t = L10N[locale] ?? L10N.en;
  const posterSrc = useBaseUrl("/img/poster.png");
  const posterAlt = POSTER_ALT[locale] ?? POSTER_ALT.en;

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
        <div className={styles.posterFrame}>
          <img className={styles.poster} src={posterSrc} alt={posterAlt} />
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

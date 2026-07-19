const COPY = {
  "en-US": {
    title: "Research Bundle",
    overview: "Bundle overview",
    titleLabel: "Title",
    articleTypeLabel: "Article type",
    schemaLabel: "Manifest schema",
    topicCountLabel: "Topics",
    paperCountLabel: "Papers",
    howToUse: "How to use this bundle",
    howIntro: "This is a read-only research snapshot. It is not a Zotero import package and missing material only means it was unavailable during export.",
    steps: [
      "Read this README to understand the bundle's purpose and layout.",
      "Use `manifest.json` as the authoritative machine-readable inventory for provenance, integrity records, and detailed diagnostics.",
      "Start from the selected core papers and their source files, then use payloads and related papers as supporting evidence.",
      "Treat `warnings` in `manifest.json` as availability diagnostics; do not infer that a missing source or payload disproves a claim.",
    ],
    layout: "Layout and naming",
    layoutBody: "Only `topics/` and `papers/` contain exported research material. Every Topic and paper has its own stable logical-ID directory; paper payloads remain directly inside that paper directory. Markdown images are packaged only from the source Markdown directory tree and retain their source-relative paths.",
    topicIndex: "Topic index",
    paperIndex: "Paper index",
    researchContent: "Research content",
    warnings: "Warnings",
    noWarnings: "No export warnings were recorded.",
    warningCount: "export warning(s) were recorded; see `manifest.json` for the complete diagnostic records.",
    topicId: "Topic ID",
    relevance: "Relevance",
    path: "Path",
    paperRef: "Paper reference",
    role: "Role",
    score: "Score",
    metadata: "Metadata",
    source: "Source",
    payloads: "Payloads",
    unavailable: "unavailable",
  },
  "zh-CN": {
    title: "研究包",
    overview: "研究包概览",
    titleLabel: "标题",
    articleTypeLabel: "文章类型",
    schemaLabel: "清单架构",
    topicCountLabel: "主题数",
    paperCountLabel: "文献数",
    howToUse: "使用顺序",
    howIntro: "这是只读的研究快照，不是 Zotero 导入包。某项材料缺失只表示导出时不可用，并不代表其内容不存在或不成立。",
    steps: [
      "先阅读本 README，了解研究包的用途和文件布局。",
      "将 `manifest.json` 视为机器可读的权威索引，用于查阅溯源、完整性记录和详细诊断。",
      "优先阅读核心文献及其 source 文件，再将 payload 和相关文献作为补充证据。",
      "将 `manifest.json` 的 `warnings` 视为可用性诊断；不要根据 source 或 payload 缺失推断某项主张不成立。",
    ],
    layout: "布局与命名",
    layoutBody: "导出的研究材料只位于 `topics/` 和 `papers/`。每个 Topic 与每篇文献都有稳定逻辑 ID 的独立目录，文献 payload 直接位于该文献目录中。Markdown 图片仅在 Markdown 所在目录树内时打包，并保留相对路径。",
    topicIndex: "主题索引",
    paperIndex: "文献索引",
    researchContent: "研究内容",
    warnings: "警告",
    noWarnings: "未记录导出警告。",
    warningCount: "条导出警告；完整诊断记录见 `manifest.json`。",
    topicId: "主题 ID",
    relevance: "相关度",
    path: "路径",
    paperRef: "文献引用",
    role: "角色",
    score: "得分",
    metadata: "元数据",
    source: "来源",
    payloads: "附加产物",
    unavailable: "不可用",
  },
  "zh-TW": {
    title: "研究包", overview: "研究包概覽", titleLabel: "標題", articleTypeLabel: "文章類型", schemaLabel: "清單架構", topicCountLabel: "主題數", paperCountLabel: "文獻數", howToUse: "使用順序", howIntro: "這是唯讀研究快照，不是 Zotero 匯入包。材料缺失只表示匯出時不可用。", steps: ["先閱讀本 README 以了解用途和布局。", "以 `manifest.json` 作為溯源、完整性與診斷的權威機器索引。", "先閱讀核心文獻及其 source，再使用 payload 與相關文獻補充證據。", "將 `warnings` 視為可用性診斷，不要據此否定主張。"], layout: "布局與命名", layoutBody: "研究材料只位於 `topics/` 與 `papers/`。每個 Topic 與每篇文獻都有以穩定邏輯 ID 命名的獨立目錄，payload 直接位於文獻目錄。Markdown 圖片只在來源 Markdown 目錄樹內時打包，並保留相對路徑。", topicIndex: "主題索引", paperIndex: "文獻索引", researchContent: "研究內容", warnings: "警告", noWarnings: "未記錄匯出警告。", warningCount: "條匯出警告；完整診斷見 `manifest.json`。", topicId: "主題 ID", relevance: "相關度", path: "路徑", paperRef: "文獻參照", role: "角色", score: "分數", metadata: "中繼資料", source: "來源", payloads: "附加產物", unavailable: "不可用" },
  "fr-FR": {
    title: "Dossier de recherche", overview: "Vue d’ensemble", titleLabel: "Titre", articleTypeLabel: "Type d’article", schemaLabel: "Schéma du manifeste", topicCountLabel: "Thèmes", paperCountLabel: "Publications", howToUse: "Mode d’emploi", howIntro: "Cet instantané est en lecture seule et n’est pas un paquet d’importation Zotero. Un élément absent était indisponible lors de l’export.", steps: ["Lisez ce README pour connaître l’objectif et la structure.", "Utilisez `manifest.json` comme inventaire de référence pour la provenance, l’intégrité et les diagnostics.", "Commencez par les publications centrales et leurs sources, puis utilisez les payloads et les publications associées.", "Interprétez `warnings` comme des diagnostics de disponibilité, pas comme une réfutation."], layout: "Structure et nommage", layoutBody: "Le contenu exporté est uniquement dans `topics/` et `papers/`. Chaque thème et publication possède son propre répertoire à identifiant logique stable, avec les payloads directement dans le répertoire de la publication. Les images Markdown ne sont empaquetées que depuis l’arborescence source et conservent leur chemin relatif.", topicIndex: "Index des thèmes", paperIndex: "Index des publications", researchContent: "Contenu de recherche", warnings: "Avertissements", noWarnings: "Aucun avertissement d’export.", warningCount: "avertissement(s) d’export ; consultez `manifest.json`.", topicId: "ID du thème", relevance: "Pertinence", path: "Chemin", paperRef: "Référence", role: "Rôle", score: "Score", metadata: "Métadonnées", source: "Source", payloads: "Payloads", unavailable: "indisponible" },
  "ja-JP": {
    title: "研究バンドル", overview: "バンドルの概要", titleLabel: "タイトル", articleTypeLabel: "論文種別", schemaLabel: "マニフェストのスキーマ", topicCountLabel: "トピック数", paperCountLabel: "文献数", howToUse: "利用手順", howIntro: "これは読み取り専用の研究スナップショットであり、Zotero のインポートパッケージではありません。欠落した資料は出力時に利用できなかったことだけを示します。", steps: ["用途と構成を理解するためにこの README を読みます。", "来歴、完全性、詳細な診断には `manifest.json` を正規の機械可読インデックスとして使います。", "まず中核文献と source を読み、次に payload と関連文献を補助証拠として使います。", "`warnings` は利用可能性の診断であり、主張の反証ではありません。"], layout: "構成と命名", layoutBody: "出力資料は `topics/` と `papers/` だけに置かれます。各トピックと文献には安定した論理 ID の専用ディレクトリがあり、payload は文献ディレクトリ直下です。Markdown 画像はソース Markdown のディレクトリツリー内だけを梱包し、相対パスを保持します。", topicIndex: "トピック索引", paperIndex: "文献索引", researchContent: "研究内容", warnings: "警告", noWarnings: "出力警告はありません。", warningCount: "件の出力警告があります。完全な診断は `manifest.json` を参照してください。", topicId: "トピック ID", relevance: "関連度", path: "パス", paperRef: "文献参照", role: "役割", score: "スコア", metadata: "メタデータ", source: "ソース", payloads: "ペイロード", unavailable: "利用不可" },
  de: {
    title: "Forschungsbündel", overview: "Überblick", titleLabel: "Titel", articleTypeLabel: "Artikeltyp", schemaLabel: "Manifest-Schema", topicCountLabel: "Themen", paperCountLabel: "Publikationen", howToUse: "Verwendung", howIntro: "Dies ist eine schreibgeschützte Forschungssicherung und kein Zotero-Importpaket. Fehlendes Material war beim Export nicht verfügbar.", steps: ["Lesen Sie diese README für Zweck und Struktur.", "Verwenden Sie `manifest.json` als maßgeblichen maschinenlesbaren Index für Herkunft, Integrität und Diagnosen.", "Beginnen Sie mit Kernpublikationen und ihren Quellen; nutzen Sie danach Payloads und verwandte Publikationen.", "`warnings` sind Verfügbarkeitsdiagnosen und keine Widerlegung einer Aussage."], layout: "Struktur und Benennung", layoutBody: "Exportiertes Material liegt nur in `topics/` und `papers/`. Jedes Thema und jede Publikation hat ein eigenes Verzeichnis mit stabiler logischer ID; Payloads liegen direkt im Publikationsverzeichnis. Markdown-Bilder werden nur aus dem Quellverzeichnisbaum übernommen und behalten ihren relativen Pfad.", topicIndex: "Themenindex", paperIndex: "Publikationsindex", researchContent: "Forschungsinhalt", warnings: "Warnungen", noWarnings: "Keine Exportwarnungen.", warningCount: "Exportwarnung(en); vollständige Diagnosen stehen in `manifest.json`.", topicId: "Themen-ID", relevance: "Relevanz", path: "Pfad", paperRef: "Literaturreferenz", role: "Rolle", score: "Wert", metadata: "Metadaten", source: "Quelle", payloads: "Payloads", unavailable: "nicht verfügbar" },
  "es-ES": {
    title: "Paquete de investigación", overview: "Resumen del paquete", titleLabel: "Título", articleTypeLabel: "Tipo de artículo", schemaLabel: "Esquema del manifiesto", topicCountLabel: "Temas", paperCountLabel: "Publicaciones", howToUse: "Cómo usar este paquete", howIntro: "Esta es una instantánea de investigación de solo lectura, no un paquete de importación de Zotero. Un material ausente no estaba disponible durante la exportación.", steps: ["Lea este README para conocer el propósito y la estructura.", "Use `manifest.json` como inventario de referencia para procedencia, integridad y diagnósticos.", "Empiece por las publicaciones centrales y sus fuentes; después use payloads y publicaciones relacionadas.", "`warnings` son diagnósticos de disponibilidad, no una refutación de una afirmación."], layout: "Estructura y nombres", layoutBody: "El material exportado solo está en `topics/` y `papers/`. Cada tema y publicación tiene su propio directorio con ID lógico estable, y los payloads quedan directamente en el directorio de la publicación. Las imágenes Markdown solo se empaquetan desde el árbol del archivo fuente y conservan su ruta relativa.", topicIndex: "Índice de temas", paperIndex: "Índice de publicaciones", researchContent: "Contenido de investigación", warnings: "Advertencias", noWarnings: "No se registraron advertencias de exportación.", warningCount: "advertencia(s) de exportación; consulte `manifest.json`.", topicId: "ID del tema", relevance: "Relevancia", path: "Ruta", paperRef: "Referencia", role: "Rol", score: "Puntuación", metadata: "Metadatos", source: "Fuente", payloads: "Payloads", unavailable: "no disponible" },
  "pt-BR": {
    title: "Pacote de pesquisa", overview: "Visão geral", titleLabel: "Título", articleTypeLabel: "Tipo de artigo", schemaLabel: "Esquema do manifesto", topicCountLabel: "Tópicos", paperCountLabel: "Publicações", howToUse: "Como usar este pacote", howIntro: "Este é um instantâneo de pesquisa somente leitura, não um pacote de importação do Zotero. Material ausente estava indisponível durante a exportação.", steps: ["Leia este README para entender o objetivo e a estrutura.", "Use `manifest.json` como inventário de referência para procedência, integridade e diagnósticos.", "Comece pelas publicações centrais e suas fontes; depois use payloads e publicações relacionadas.", "`warnings` são diagnósticos de disponibilidade, não refutação de uma afirmação."], layout: "Estrutura e nomes", layoutBody: "O material exportado fica apenas em `topics/` e `papers/`. Cada tópico e publicação tem diretório próprio com ID lógico estável, e os payloads ficam diretamente no diretório da publicação. Imagens Markdown só são incluídas da árvore do arquivo-fonte e preservam seu caminho relativo.", topicIndex: "Índice de tópicos", paperIndex: "Índice de publicações", researchContent: "Conteúdo de pesquisa", warnings: "Avisos", noWarnings: "Nenhum aviso de exportação foi registrado.", warningCount: "aviso(s) de exportação; consulte `manifest.json`.", topicId: "ID do tópico", relevance: "Relevância", path: "Caminho", paperRef: "Referência", role: "Papel", score: "Pontuação", metadata: "Metadados", source: "Fonte", payloads: "Payloads", unavailable: "indisponível" },
  "ko-KR": {
    title: "연구 번들", overview: "번들 개요", titleLabel: "제목", articleTypeLabel: "문서 유형", schemaLabel: "매니페스트 스키마", topicCountLabel: "주제", paperCountLabel: "문헌", howToUse: "사용 순서", howIntro: "이 자료는 읽기 전용 연구 스냅샷이며 Zotero 가져오기 패키지가 아닙니다. 누락된 자료는 내보낼 때 사용할 수 없었음을 뜻합니다.", steps: ["용도와 구조를 이해하려면 이 README를 읽습니다.", "출처, 무결성, 상세 진단에는 `manifest.json`을 권위 있는 기계 판독 인덱스로 사용합니다.", "핵심 문헌과 source부터 읽고 payload 및 관련 문헌을 보조 증거로 사용합니다.", "`warnings`는 가용성 진단이며 주장에 대한 반증이 아닙니다."], layout: "구조와 이름", layoutBody: "내보낸 자료는 `topics/`와 `papers/`에만 있습니다. 각 주제와 문헌에는 안정적인 논리 ID의 전용 디렉터리가 있으며 payload는 문헌 디렉터리에 직접 있습니다. Markdown 이미지는 소스 Markdown 디렉터리 트리에서만 포함하고 상대 경로를 유지합니다.", topicIndex: "주제 색인", paperIndex: "문헌 색인", researchContent: "연구 내용", warnings: "경고", noWarnings: "내보내기 경고가 없습니다.", warningCount: "개의 내보내기 경고가 있습니다. 전체 진단은 `manifest.json`을 참조하십시오.", topicId: "주제 ID", relevance: "관련성", path: "경로", paperRef: "문헌 참조", role: "역할", score: "점수", metadata: "메타데이터", source: "소스", payloads: "페이로드", unavailable: "사용 불가" },
  "it-IT": {
    title: "Pacchetto di ricerca", overview: "Panoramica", titleLabel: "Titolo", articleTypeLabel: "Tipo di articolo", schemaLabel: "Schema del manifesto", topicCountLabel: "Argomenti", paperCountLabel: "Pubblicazioni", howToUse: "Come usare questo pacchetto", howIntro: "Questa è un’istantanea di ricerca in sola lettura, non un pacchetto di importazione Zotero. Il materiale assente non era disponibile durante l’esportazione.", steps: ["Leggere questo README per scopo e struttura.", "Usare `manifest.json` come inventario autorevole per provenienza, integrità e diagnostica.", "Iniziare dalle pubblicazioni centrali e dalle loro fonti, poi usare payload e pubblicazioni correlate.", "`warnings` sono diagnostica di disponibilità, non confutazioni di affermazioni."], layout: "Struttura e nomi", layoutBody: "Il materiale esportato è solo in `topics/` e `papers/`. Ogni argomento e pubblicazione ha una directory con ID logico stabile, e i payload restano direttamente nella directory della pubblicazione. Le immagini Markdown sono incluse solo dall’albero del file sorgente e mantengono il percorso relativo.", topicIndex: "Indice degli argomenti", paperIndex: "Indice delle pubblicazioni", researchContent: "Contenuto di ricerca", warnings: "Avvisi", noWarnings: "Nessun avviso di esportazione.", warningCount: "avviso/i di esportazione; consultare `manifest.json`.", topicId: "ID argomento", relevance: "Rilevanza", path: "Percorso", paperRef: "Riferimento", role: "Ruolo", score: "Punteggio", metadata: "Metadati", source: "Fonte", payloads: "Payload", unavailable: "non disponibile" },
  "ru-RU": {
    title: "Исследовательский пакет", overview: "Обзор пакета", titleLabel: "Название", articleTypeLabel: "Тип статьи", schemaLabel: "Схема манифеста", topicCountLabel: "Темы", paperCountLabel: "Публикации", howToUse: "Порядок использования", howIntro: "Это снимок исследования только для чтения, а не пакет импорта Zotero. Отсутствующий материал был недоступен при экспорте.", steps: ["Прочитайте этот README, чтобы понять назначение и структуру.", "Используйте `manifest.json` как авторитетный машиночитаемый индекс происхождения, целостности и диагностики.", "Начните с основных публикаций и их source, затем используйте payload и связанные публикации.", "`warnings` — это диагностика доступности, а не опровержение утверждения."], layout: "Структура и имена", layoutBody: "Экспортированные материалы находятся только в `topics/` и `papers/`. У каждой темы и публикации есть собственный каталог со стабильным логическим ID, а payload лежат непосредственно в каталоге публикации. Изображения Markdown включаются только из дерева исходного Markdown и сохраняют относительный путь.", topicIndex: "Индекс тем", paperIndex: "Индекс публикаций", researchContent: "Содержание исследования", warnings: "Предупреждения", noWarnings: "Предупреждений экспорта нет.", warningCount: "предупреждение(й) экспорта; полная диагностика в `manifest.json`.", topicId: "ID темы", relevance: "Релевантность", path: "Путь", paperRef: "Ссылка на публикацию", role: "Роль", score: "Оценка", metadata: "Метаданные", source: "Источник", payloads: "Payload", unavailable: "недоступно" },
};

function text(value, fallback = "") {
  return String(value ?? "").trim() || fallback;
}

function escapeCell(value) {
  return text(value, "-").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function score(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(3) : "-";
}

function codePath(value, fallback) {
  return `\`${text(value, fallback)}\``;
}

export function resolveResearchBundleReadmeLocale(locale) {
  const normalized = text(locale).replaceAll("_", "-").toLowerCase();
  const match = Object.keys(COPY).find((key) => key.toLowerCase() === normalized);
  return match || "en-US";
}

export function renderResearchBundleReadme(args = {}) {
  const locale = resolveResearchBundleReadmeLocale(args.locale);
  const copy = COPY[locale];
  const intent = args.intent || {};
  const topics = Array.isArray(args.topics) ? args.topics : [];
  const papers = Array.isArray(args.papers) ? args.papers : [];
  const warningCount = Math.max(0, Number(args.warningCount) || 0);
  const lines = [
    `# ${copy.title}`,
    "",
    `## ${copy.overview}`,
    "",
    `- ${copy.titleLabel}: ${text(intent.paper_title, "-")}`,
    `- ${copy.articleTypeLabel}: ${text(intent.article_type, "-")}`,
    `- ${copy.schemaLabel}: \`research_bundle.product@2.0.0\``,
    `- ${copy.topicCountLabel}: ${topics.length}`,
    `- ${copy.paperCountLabel}: ${papers.length}`,
    "",
    `## ${copy.howToUse}`,
    "",
    copy.howIntro,
    "",
    ...copy.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `## ${copy.layout}`,
    "",
    copy.layoutBody,
    "",
    `- \`topics/topic-001/report.md\` — ${copy.topicIndex}.`,
    `- \`papers/paper-001/metadata.json\` — ${copy.metadata}.`,
    `- \`papers/paper-001/source.md\` / \`source.pdf\` — ${copy.source}.`,
    `- \`papers/paper-001/<payload>-001.<ext>\` — ${copy.payloads}; \`manifest.json\` records provenance.`,
    `- \`papers/paper-001/figures/example.png\` — ${copy.source}.`,
    "",
    `## ${copy.topicIndex}`,
    "",
    `| ID | ${copy.topicId} | ${copy.relevance} | ${copy.path} |`,
    "| --- | --- | --- | --- |",
    ...topics.map((topic) => `| ${escapeCell(topic.logical_id)} | ${escapeCell(topic.topic_id)} | ${score(topic.relevance)} | ${topic.report_path ? codePath(topic.report_path) : copy.unavailable} |`),
    "",
    `## ${copy.paperIndex}`,
    "",
    `| ID | ${copy.paperRef} | ${copy.role} | ${copy.score} | ${copy.metadata} | ${copy.source} | ${copy.payloads} |`,
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...papers.map((paper) => `| ${escapeCell(paper.logical_id)} | ${escapeCell(paper.paper_ref)} | ${escapeCell(paper.role)} | ${score(paper.score)} | ${codePath(paper.metadata_path)} | ${paper.source?.path ? codePath(paper.source.path) : copy.unavailable} | ${(paper.payloads || []).map((payload) => codePath(payload.path)).join(", ") || "-"} |`),
    "",
    `## ${copy.researchContent}`,
    "",
    text(intent.research_content, "-"),
    "",
    `## ${copy.warnings}`,
    "",
    warningCount === 0 ? copy.noWarnings : `${warningCount} ${copy.warningCount}`,
    "",
  ];
  return lines.join("\n");
}

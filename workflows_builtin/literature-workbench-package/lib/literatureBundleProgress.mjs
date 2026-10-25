const STAGES = [
  "materialize",
  "product",
  "bibliography",
  "measure",
  "archive",
  "publish",
];
const COPY = {
  en: [
    "Preparing files",
    "Preparing literature",
    "Exporting bibliography",
    "Verifying files",
    "Writing archive",
    "Publishing bundle",
  ],
  "zh-CN": [
    "准备文件",
    "整理文献",
    "导出参考文献",
    "校验文件",
    "写入压缩包",
    "发布文献包",
  ],
  "zh-TW": [
    "準備檔案",
    "整理文獻",
    "匯出參考文獻",
    "校驗檔案",
    "寫入壓縮檔",
    "發布文獻包",
  ],
  fr: [
    "Préparation des fichiers",
    "Préparation des publications",
    "Export de la bibliographie",
    "Vérification des fichiers",
    "Écriture de l’archive",
    "Publication du dossier",
  ],
  ja: [
    "ファイルを準備中",
    "文献を整理中",
    "参考文献を出力中",
    "ファイルを検証中",
    "アーカイブを書き込み中",
    "文献パッケージを公開中",
  ],
  de: [
    "Dateien vorbereiten",
    "Literatur vorbereiten",
    "Bibliografie exportieren",
    "Dateien prüfen",
    "Archiv schreiben",
    "Paket veröffentlichen",
  ],
  es: [
    "Preparando archivos",
    "Preparando bibliografía",
    "Exportando referencias",
    "Verificando archivos",
    "Escribiendo archivo",
    "Publicando paquete",
  ],
  pt: [
    "Preparando arquivos",
    "Preparando literatura",
    "Exportando bibliografia",
    "Verificando arquivos",
    "Gravando arquivo",
    "Publicando pacote",
  ],
  ko: [
    "파일 준비 중",
    "문헌 정리 중",
    "참고문헌 내보내는 중",
    "파일 검증 중",
    "압축 파일 쓰는 중",
    "문헌 패키지 게시 중",
  ],
  it: [
    "Preparazione dei file",
    "Preparazione della letteratura",
    "Esportazione bibliografia",
    "Verifica dei file",
    "Scrittura archivio",
    "Pubblicazione pacchetto",
  ],
  ru: [
    "Подготовка файлов",
    "Подготовка литературы",
    "Экспорт библиографии",
    "Проверка файлов",
    "Запись архива",
    "Публикация пакета",
  ],
};

export function createLiteratureBundleProgress(host, runtime, interactive) {
  const locale = String(runtime?.locale || "en").replace(/_/g, "-");
  const copy = COPY[locale] || COPY[locale.split("-")[0]] || COPY.en;
  let controller;
  let phase;
  let startedAt;
  let counts;
  const observe = (callback) => {
    try {
      callback();
    } catch {
      /* Feedback must not change export settlement. */
    }
  };
  const log = (status) => {
    if (!phase) return;
    observe(() =>
      host.logging?.appendRuntimeLog({
        level: status === "failed" ? "error" : "info",
        stage: "literature-export-phase",
        operation: "export-literature-bundle",
        phase,
        message: "Literature export phase",
        details: { status, elapsedMs: Date.now() - startedAt, ...counts },
      }),
    );
  };
  const stage = (next) => {
    if (phase === next) return;
    log("completed");
    phase = next;
    startedAt = Date.now();
    counts = undefined;
    const text = copy[STAGES.indexOf(phase)];
    if (!text) return;
    observe(() => {
      if (controller) controller.update({ text });
      else if (interactive)
        controller = host.notifications.createProgress({ text });
    });
  };
  return {
    stage,
    control: {
      signal: runtime?.signal,
      onProgress(event) {
        stage(event.phase);
        counts = {
          completed: event.completed,
          ...(event.total === undefined ? {} : { total: event.total }),
          unit: event.unit,
        };
        const text = copy[STAGES.indexOf(phase)];
        observe(() =>
          controller?.update({
            text: `${text} (${event.completed}${event.total === undefined ? "" : `/${event.total}`})`,
            ...(event.total > 0
              ? { progress: (100 * event.completed) / event.total }
              : {}),
          }),
        );
      },
    },
    finish(status) {
      log(status);
      phase = undefined;
      observe(() => controller?.close());
      controller = undefined;
    },
  };
}

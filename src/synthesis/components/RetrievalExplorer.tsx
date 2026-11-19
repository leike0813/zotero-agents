/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { useRef, useState } from "preact/hooks";
import type { SynthesisWorkbenchSnapshot } from "../../shared/synthesisWorkbenchWireContract";
import {
  narrowSynthesisWorkbenchHomeRetrieval,
  type SynthesisWorkbenchHomeAction,
  type SynthesisWorkbenchHomeText,
} from "./HomeRegion";
import { RetrievalPanel } from "./RetrievalPanel";

export function RetrievalExplorer({
  retrieval,
  explorer,
  pending,
  t,
  onAction,
}: {
  retrieval: SynthesisWorkbenchSnapshot["retrieval"];
  explorer: SynthesisWorkbenchSnapshot["retrievalExplorer"];
  pending: string[];
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const [mode, setMode] = useState<"search" | "browse">("search");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState("paper");
  const [threshold, setThreshold] = useState("");
  const [library, setLibrary] = useState("");
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [expanded, setExpanded] = useState("");
  const [history, setHistory] = useState<string[]>([""]);
  const seq = useRef(0);
  const read = (
    op: "search" | "browse" | "fragments",
    args: Record<string, unknown>,
  ) => {
    const command = {
      search: "retrievalSemanticSearch",
      browse: "retrievalBrowseIndex",
      fragments: "retrievalReadFragments",
    }[op];
    onAction("hostCommand", {
      command,
      args: { ...args, requestId: ++seq.current },
    });
  };
  const browse = (cursor = "", filters = { library, kind, status }) => {
    setExpanded("");
    read("browse", {
      ...(filters.library && { libraryId: Number(filters.library) }),
      ...(filters.kind && { sourceKind: filters.kind }),
      ...(filters.status && { status: filters.status }),
      ...(cursor && {
        cursor,
        publication: explorer?.browse?.result?.publication,
      }),
    });
  };
  const filter = (field: "library" | "kind" | "status", value: string) => {
    ({ library: setLibrary, kind: setKind, status: setStatus })[field](value);
    setHistory([""]);
    browse("", { library, kind, status, [field]: value });
  };
  const scope = (
    s: NonNullable<typeof retrieval>["activeScope"] | undefined,
  ) =>
    s
      ? [
          ...s.libraryIds,
          ...s.sourceKinds,
          ...(s.includeTopics ? [t("synthesis-explorer-topic")] : []),
        ].join(" · ")
      : "—";
  const slot = explorer?.[mode];
  const result = slot?.result;
  const rows =
    result?.rows.filter(
      (row) =>
        mode !== "search" ||
        threshold === "" ||
        (row.score ?? -1) >= Number(threshold),
    ) ?? [];
  const fragmentPage =
    explorer?.fragments?.result?.publication === result?.publication &&
    explorer?.fragments?.result?.rows.every((row) => row.identity === expanded)
      ? explorer.fragments
      : explorer?.fragments?.status !== "ready"
        ? explorer?.fragments
        : undefined;
  const active = retrieval?.activeIdentity;
  const diagnostic = (code: string) => {
    const messages: Partial<Record<string, Parameters<typeof t>[0]>> = {
      retrieval_index_missing: "synthesis-retrieval-status-missing",
      retrieval_index_paused: "synthesis-retrieval-status-paused",
      embedding_disabled: "synthesis-similarity-unavailable",
      embedding_service_unavailable: "synthesis-similarity-unavailable",
      query_encoding_failed: "synthesis-similarity-unavailable",
      basis_mismatch: "synthesis-status-stale",
    };
    const key = messages[code];
    return key ? `${t(key)} (${code})` : code;
  };
  const showFragments = (identity: string, cursor?: string) => {
    setExpanded(identity);
    read("fragments", {
      identity,
      publication: result?.publication,
      ...(cursor && { cursor }),
    });
  };
  return (
    <section class="surface-panel retrieval-explorer">
      <header>
        <h2>{t("synthesis-tab-retrieval")}</h2>
        <span>
          {t("synthesis-retrieval-active-index")} ·{" "}
          {t(`synthesis-retrieval-status-${retrieval?.status ?? "missing"}`)}
        </span>
        {" · "}
        {t("synthesis-explorer-service")} ·{" "}
        {t(
          `synthesis-explorer-${retrieval?.queryServiceStatus ?? "unverified"}`,
        )}
        {retrieval?.stateReadFailed && (
          <p role="status">{t("synthesis-explorer-stale")}</p>
        )}
        <details>
          <summary>{t("synthesis-explorer-details")}</summary>
          {active && (
            <p>
              {t("synthesis-retrieval-identity", {
                model: active.modelId,
                dimensions: active.dimensions,
              })}
            </p>
          )}
          {retrieval?.pendingIdentity && (
            <p>
              {t("synthesis-explorer-pending")} ·{" "}
              {t("synthesis-retrieval-identity", {
                model: retrieval.pendingIdentity.modelId,
                dimensions: retrieval.pendingIdentity.dimensions,
              })}
            </p>
          )}
          <p>
            {t("synthesis-explorer-scope")} · {scope(retrieval?.activeScope)}
            <br />
            {t("synthesis-explorer-pending")} · {scope(retrieval?.pendingScope)}
          </p>
          {retrieval?.updatedAt && (
            <p>
              {t("synthesis-explorer-update")} · {retrieval.updatedAt}
            </p>
          )}
          <RetrievalPanel
            selection={narrowSynthesisWorkbenchHomeRetrieval(retrieval)}
            pendingOperationKeys={pending}
            t={t}
            onAction={onAction}
          />
        </details>
        <button
          aria-pressed={mode === "search"}
          onClick={() => setMode("search")}
        >
          {t("synthesis-explorer-semantic")}
        </button>
        <button
          aria-pressed={mode === "browse"}
          onClick={() => {
            setMode("browse");
            if (!explorer?.browse) browse();
          }}
        >
          {t("synthesis-explorer-contents")}
        </button>
      </header>
      {mode === "search" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) read("search", { query: query.trim(), target });
          }}
        >
          <input
            type="search"
            maxLength={4096}
            aria-label={t("synthesis-search")}
            value={query}
            onInput={(e) => setQuery(e.currentTarget.value)}
          />
          <select
            aria-label={t("synthesis-explorer-kind")}
            value={target}
            onChange={(e) => setTarget(e.currentTarget.value)}
          >
            <option value="paper">{t("synthesis-explorer-paper")}</option>
            <option value="topic">{t("synthesis-explorer-topic")}</option>
          </select>
          <button disabled={!query.trim()}>{t("synthesis-search")}</button>
          <label>
            {t("synthesis-explorer-threshold")}{" "}
            <input
              type="number"
              min="-1"
              max="1"
              step="0.01"
              value={threshold}
              onInput={(e) => setThreshold(e.currentTarget.value)}
            />
          </label>
        </form>
      ) : (
        <div>
          {(
            [
              [
                "library",
                library,
                (retrieval?.activeScope?.libraryIds ?? []).map(String),
              ],
              ["kind", kind, ["metadata", "fulltext", "analysis", "topic"]],
              ["status", status, ["ready", "missing", "failed", "suspended"]],
            ] as const
          ).map(([field, val, opts]) => (
            <label key={field}>
              {t(`synthesis-explorer-${field}`)}{" "}
              <select
                value={val}
                onChange={(e) => filter(field, e.currentTarget.value)}
              >
                <option value="">{t("synthesis-explorer-all")}</option>
                {opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
          ))}
          <button
            onClick={() => {
              setHistory([""]);
              browse();
            }}
          >
            {t("synthesis-action-refresh")}
          </button>
        </div>
      )}
      {slot?.status === "loading" && (
        <div role="status">{t("synthesis-explorer-loading")}</div>
      )}
      {slot?.error && <div role="alert">{diagnostic(slot.error)}</div>}
      {result?.limited && (
        <div role="status">{t("synthesis-explorer-limited")}</div>
      )}
      {result?.issues.map((issue) => (
        <div key={issue}>{diagnostic(issue)}</div>
      ))}
      <div class="zs-scroll-region">
        {result && !rows.length && (
          <p>
            {t(
              mode === "browse"
                ? "synthesis-explorer-none"
                : result.rows.length
                  ? "synthesis-explorer-filtered"
                  : "synthesis-explorer-empty",
            )}
          </p>
        )}
        {rows.map((row) => (
          <article key={row.identity}>
            <button
              onClick={() =>
                row.itemRef
                  ? onAction("hostCommand", {
                      command: "openZoteroItem",
                      args: {
                        libraryId: row.itemRef.libraryId,
                        itemKey: row.itemRef.key,
                      },
                    })
                  : row.topicId &&
                    onAction("showArtifactReader", {
                      topicId: row.topicId,
                      previousTab: "retrieval",
                      section: row.section,
                    })
              }
            >
              {row.title}
            </button>
            <span>
              {" "}
              {row.section ?? row.sourceKind} {row.score?.toFixed(3)}{" "}
              {row.status}
            </span>
            {row.preview && <p>{row.preview}</p>}
            {mode === "browse" && (
              <>
                <span>
                  {" "}
                  {t("synthesis-explorer-sources")} {row.sourceCount} ·{" "}
                  {t("synthesis-explorer-fragments")} {row.fragmentCount}{" "}
                </span>
                <button
                  aria-expanded={expanded === row.identity}
                  onClick={() =>
                    expanded === row.identity
                      ? setExpanded("")
                      : showFragments(row.identity)
                  }
                >
                  {t("synthesis-explorer-expand")}
                </button>
                {expanded === row.identity && (
                  <div>
                    {fragmentPage?.status === "loading"
                      ? t("synthesis-explorer-loading")
                      : fragmentPage?.error ||
                        fragmentPage?.result?.rows
                          .filter((f) => f.identity === row.identity)
                          .map((f, i) => (
                            <p key={i}>
                              {f.section ?? f.sourceKind} [{f.start}, {f.end}){" "}
                              {f.preview}
                            </p>
                          ))}
                    {fragmentPage?.result?.issues.join(", ")}
                    {fragmentPage?.result?.nextCursor && (
                      <button
                        onClick={() =>
                          showFragments(
                            row.identity,
                            fragmentPage.result!.nextCursor!,
                          )
                        }
                      >
                        {t("synthesis-explorer-next")}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>
      {mode === "browse" && (
        <footer>
          <button
            disabled={history.length < 2}
            onClick={() => {
              const pages = history.slice(0, -1);
              setHistory(pages);
              browse(pages[pages.length - 1]);
            }}
          >
            {t("synthesis-explorer-back")}
          </button>
          <button
            disabled={!result?.nextCursor || slot?.status === "loading"}
            onClick={() => {
              if (result?.nextCursor) {
                setHistory([...history, result.nextCursor]);
                browse(result.nextCursor);
              }
            }}
          >
            {t("synthesis-explorer-next")}
          </button>
        </footer>
      )}
    </section>
  );
}

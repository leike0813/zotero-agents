/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import { Fragment } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { SynthesisWorkbenchSnapshot } from "../../shared/synthesisWorkbenchWireContract";
import type {
  SynthesisWorkbenchHomeAction,
  SynthesisWorkbenchHomeText,
} from "./HomeRegion";
import { RetrievalMaintenance } from "./RetrievalMaintenance";

type Explorer = NonNullable<SynthesisWorkbenchSnapshot["retrievalExplorer"]>;
type Slot = NonNullable<Explorer["search"]>;
type Row = NonNullable<Slot["result"]>["rows"][number];
type Mode = "search" | "browse";

export function RetrievalExplorer({
  retrieval,
  explorer,
  pending,
  t,
  onAction,
}: {
  retrieval: SynthesisWorkbenchSnapshot["retrieval"];
  explorer: Explorer | undefined;
  pending: string[];
  t: SynthesisWorkbenchHomeText;
  onAction: SynthesisWorkbenchHomeAction;
}) {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const submitted = useRef<{ query: string; target: string }>();
  const [target, setTarget] = useState("paper");
  const [threshold, setThreshold] = useState("");
  const [filters, setFilters] = useState({ library: "", kind: "", status: "" });
  const [expanded, setExpanded] = useState("");
  const [fragmentRequest, setFragmentRequest] = useState(0);
  const [pages, setPages] = useState([""]);
  const seq = useRef(0);
  const settings = useRef<HTMLDetailsElement>(null);
  const searchList = useRef<HTMLDivElement>(null);
  const browseList = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const body = searchList.current?.ownerDocument?.body;
    body?.classList.add("retrieval-workbench-open");
    return () => body?.classList.remove("retrieval-workbench-open");
  }, []);
  const commands = {
    search: "retrievalSemanticSearch",
    browse: "retrievalBrowseIndex",
    fragments: "retrievalReadFragments",
  } as const;
  function read(op: keyof Explorer, args: Record<string, unknown>) {
    const requestId = ++seq.current;
    onAction("hostCommand", {
      command: commands[op],
      args: { ...args, requestId },
    });
    return requestId;
  }
  const search = explorer?.search;
  const browse = explorer?.browse;
  const indexed = browse?.result;
  const found = search?.result;
  const rows =
    found?.rows.filter(
      (row) => threshold === "" || (row.score ?? -1) >= Number(threshold),
    ) ?? [];
  function submit() {
    if (!query.trim()) return;
    submitted.current = { query: query.trim(), target };
    read("search", submitted.current);
    if (searchList.current) searchList.current.scrollTop = 0;
  }
  function list(cursor = "", selection = filters) {
    setExpanded("");
    read("browse", {
      ...(selection.library && { libraryId: Number(selection.library) }),
      ...(selection.kind && { sourceKind: selection.kind }),
      ...(selection.status && { status: selection.status }),
      ...(cursor && { cursor, publication: indexed?.publication }),
    });
    if (browseList.current) browseList.current.scrollTop = 0;
  }
  function firstPage(selection = filters) {
    setPages([""]);
    list("", selection);
  }
  function select(next: Mode) {
    setMode(next);
    if (next === "browse" && !browse) firstPage();
  }
  function fragments(identity: string, cursor?: string) {
    setExpanded(identity);
    setFragmentRequest(
      read("fragments", {
        identity,
        publication: indexed?.publication,
        ...(cursor && { cursor }),
      }),
    );
  }
  function title(row: Row) {
    return (
      <button
        class="retrieval-title"
        onClick={() => {
          if (row.itemRef)
            onAction("hostCommand", {
              command: "openZoteroItem",
              args: {
                libraryId: row.itemRef.libraryId,
                itemKey: row.itemRef.key,
              },
            });
          else if (row.topicId)
            onAction("showArtifactReader", {
              topicId: row.topicId,
              previousTab: "retrieval",
              section: row.section,
            });
        }}
      >
        {row.title}
      </button>
    );
  }
  function kindLabel(kind: NonNullable<Row["sourceKind"]>) {
    return kind === "topic"
      ? t("synthesis-explorer-topic")
      : t(`synthesis-retrieval-source-${kind}`);
  }
  function source(row: Row) {
    return [
      row.sourceKind && kindLabel(row.sourceKind),
      row.section === "title" ? t("synthesis-column-title") : row.section,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  function maintenance() {
    if (settings.current) {
      settings.current.open = true;
      settings.current.querySelector("summary")?.focus();
    }
  }
  function feedback(slot: Slot | undefined, retry: () => void) {
    if (slot?.status === "loading")
      return (
        <div class="retrieval-notice" role="status">
          {t("synthesis-explorer-loading")}
        </div>
      );
    const codes = new Set(slot?.result?.issues);
    if (slot?.error) codes.add(slot.error);
    const messages = new Set<string>();
    let inspect = false;
    for (const code of codes) {
      switch (code) {
        case "retrieval_target_empty":
          messages.add(t("synthesis-explorer-target-empty"));
          inspect = true;
          break;
        case "retrieval_no_scorable_fragments":
          messages.add(t("synthesis-explorer-no-scorable"));
          inspect = true;
          break;
        case "retrieval_index_paused":
          messages.add(t("synthesis-retrieval-status-paused"));
          inspect = true;
          break;
        case "retrieval_index_missing":
          messages.add(t("synthesis-retrieval-status-missing"));
          inspect = true;
          break;
        case "source_changed":
        case "source_unavailable":
          inspect = true;
          messages.add(t("synthesis-explorer-source-changed"));
          break;
        case "source_read_failed":
          messages.add(t("synthesis-explorer-source-changed"));
          break;
        case "basis_mismatch":
          messages.add(t("synthesis-status-stale"));
          break;
        case "result_budget_exhausted":
          messages.add(t("synthesis-explorer-limited-results"));
          break;
        case "timeout":
        case "request_timeout":
        case "worker_timeout":
        case "operation_timeout":
          messages.add(t("synthesis-explorer-timeout"));
          break;
        case "invalid_request":
        case "response_invalid":
        case "protocol_result_invalid":
        case "worker_result_invalid":
        case "reverse_host_result_invalid":
        case "reverse_host_response_envelope_invalid":
        case "production_projection_invalid":
          messages.add(t("synthesis-explorer-invalid-response"));
          break;
        default:
          messages.add(
            t(
              code.startsWith("embedding_")
                ? "synthesis-explorer-encoding-error"
                : "synthesis-explorer-service-error",
            ),
          );
          break;
      }
    }
    if (!messages.size && slot?.result?.limited)
      messages.add(t("synthesis-explorer-limited"));
    if (!messages.size) return null;
    return (
      <div
        class="retrieval-notice"
        data-kind={
          codes.size === 1 && codes.has("result_budget_exhausted")
            ? "info"
            : undefined
        }
        role={slot?.error ? "alert" : "status"}
      >
        <span>{[...messages].join(" · ")}</span>
        {slot?.error && <code dir="ltr">{slot.error}</code>}
        {inspect && mode === "search" && (
          <button onClick={() => select("browse")}>
            {t("synthesis-explorer-view-index")}
          </button>
        )}
        {inspect && (
          <button onClick={maintenance}>
            {t("synthesis-explorer-details")}
          </button>
        )}
        {(slot?.error ||
          codes.has("source_read_failed") ||
          codes.has("source_changed") ||
          codes.has("source_unavailable")) && (
          <button onClick={retry}>{t("synthesis-explorer-retry")}</button>
        )}
      </div>
    );
  }
  function empty(label: string, action?: () => void, actionLabel?: string) {
    return (
      <div class="retrieval-empty">
        <h3>{label}</h3>
        {action && <button onClick={action}>{actionLabel}</button>}
      </div>
    );
  }
  const readyEmpty = (slot: Slot | undefined) =>
    slot?.status === "ready" &&
    !slot.result?.issues.length &&
    !slot.result?.limited;
  const variants = ["search", "browse"] as const;
  const kinds = ["metadata", "fulltext", "analysis", "topic"] as const;
  const states = ["ready", "missing", "failed", "suspended"] as const;
  const service = retrieval?.queryServiceStatus ?? "unverified";
  const status = retrieval?.status ?? "missing";
  const fragmentSlot =
    explorer?.fragments?.requestId === fragmentRequest
      ? explorer.fragments
      : undefined;
  const fragmentPage = fragmentSlot?.result;
  const fragmentRows =
    fragmentPage?.publication === indexed?.publication
      ? (fragmentPage?.rows.filter((row) => row.identity === expanded) ?? [])
      : [];
  function filter(
    field: keyof typeof filters,
    label: string,
    options: Array<[string, string]>,
  ) {
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={filters[field]}
          onChange={(e) => {
            const next = { ...filters, [field]: e.currentTarget.value };
            setFilters(next);
            firstPage(next);
          }}
        >
          <option value="">{t("synthesis-explorer-all")}</option>
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <section class="surface-panel retrieval-explorer zs-fill-col">
      <header class="retrieval-header">
        <div>
          <h2>{t("synthesis-tab-retrieval")}</h2>
          <div class="retrieval-health">
            <span
              class={`zs-badge zs-badge--${status === "ready" ? "success" : "warning"}`}
            >
              {t("synthesis-retrieval-active-index")} ·{" "}
              {t(`synthesis-retrieval-status-${status}`)}
            </span>
            <span
              class={`zs-badge zs-badge--${service === "available" ? "success" : "muted"}`}
            >
              {t("synthesis-explorer-service")} ·{" "}
              {t(`synthesis-explorer-${service}`)}
            </span>
            {retrieval?.stateReadFailed && (
              <span role="status">{t("synthesis-explorer-stale")}</span>
            )}
          </div>
        </div>
        <details
          class="retrieval-settings"
          ref={settings}
          onKeyDown={(e) => {
            if (e.key === "Escape" && settings.current) {
              settings.current.open = false;
              settings.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>{t("synthesis-explorer-details")}</summary>
          <div class="retrieval-settings-body">
            <RetrievalMaintenance {...{ retrieval, pending, t, onAction }} />
          </div>
        </details>
      </header>
      <nav
        class="retrieval-tabs"
        role="tablist"
        aria-label={t("synthesis-tab-retrieval")}
      >
        {variants.map((name) => (
          <button
            key={name}
            id={`retrieval-${name}-tab`}
            role="tab"
            aria-selected={mode === name}
            aria-controls={`retrieval-${name}-panel`}
            tabIndex={mode === name ? 0 : -1}
            onClick={() => select(name)}
            onKeyDown={(e) => {
              let next: Mode;
              if (e.key === "Home") next = "search";
              else if (e.key === "End") next = "browse";
              else if (e.key === "ArrowLeft" || e.key === "ArrowRight")
                next = name === "search" ? "browse" : "search";
              else return;
              e.preventDefault();
              select(next);
              e.currentTarget.ownerDocument
                .getElementById(`retrieval-${next}-tab`)
                ?.focus();
            }}
          >
            {t(
              name === "search"
                ? "synthesis-explorer-semantic"
                : "synthesis-explorer-contents",
            )}
          </button>
        ))}
      </nav>
      <section
        class="retrieval-pane"
        id="retrieval-search-panel"
        role="tabpanel"
        hidden={mode !== "search"}
        aria-labelledby="retrieval-search-tab"
      >
        <form
          class="retrieval-tools"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label class="retrieval-query">
            <span aria-hidden="true" class="zs-icon zs-icon-manage-search" />
            <input
              type="search"
              aria-label={t("synthesis-search")}
              placeholder={t("synthesis-explorer-prompt")}
              maxLength={4096}
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </label>
          <select
            aria-label={t("synthesis-explorer-target")}
            value={target}
            onChange={(e) => setTarget(e.currentTarget.value)}
          >
            <option value="paper">{t("synthesis-explorer-paper")}</option>
            <option value="topic">{t("synthesis-explorer-topic")}</option>
          </select>
          <button class="primary" type="submit" disabled={!query.trim()}>
            {t("synthesis-search")}
          </button>
          <details class="retrieval-filter">
            <summary>
              {t("synthesis-explorer-filters")}
              {threshold !== "" && ` ≥ ${threshold}`}
            </summary>
            <label>
              {t("synthesis-explorer-threshold")}
              <input
                type="number"
                min="-1"
                max="1"
                step="0.01"
                aria-label={t("synthesis-explorer-threshold")}
                value={threshold}
                onInput={(e) => setThreshold(e.currentTarget.value)}
              />
            </label>
          </details>
        </form>
        {feedback(search, () =>
          submitted.current ? read("search", submitted.current) : submit(),
        )}
        <div
          ref={searchList}
          class="retrieval-results-scroll zs-scroll-region"
          data-populated={rows.length > 0}
        >
          {!search && empty(t("synthesis-explorer-start"))}
          {found?.rows.length && !rows.length
            ? empty(
                t("synthesis-explorer-filtered"),
                () => setThreshold(""),
                t("synthesis-explorer-clear-threshold"),
              )
            : null}
          {readyEmpty(search) &&
            !found?.rows.length &&
            empty(t("synthesis-explorer-empty"))}
          {rows.map((row) => (
            <article key={row.identity} class="retrieval-result-row">
              <div class="retrieval-result-head">
                {title(row)}
                <span class="retrieval-score">
                  {t("synthesis-explorer-score")} {row.score?.toFixed(3)}
                </span>
              </div>
              <div class="retrieval-source">{source(row)}</div>
              <p class="retrieval-excerpt">{row.preview}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        class="retrieval-pane"
        id="retrieval-browse-panel"
        role="tabpanel"
        hidden={mode !== "browse"}
        aria-labelledby="retrieval-browse-tab"
      >
        <div class="retrieval-tools">
          {filter(
            "library",
            t("synthesis-explorer-library"),
            (retrieval?.activeScope?.libraryIds ?? []).map((id) => [
              String(id),
              retrieval?.libraryNames?.[id] ??
                t("synthesis-library-label", { libraryId: id }),
            ]),
          )}
          {filter(
            "kind",
            t("synthesis-explorer-kind"),
            kinds.map((kind) => [kind, kindLabel(kind)]),
          )}
          {filter(
            "status",
            t("synthesis-explorer-status"),
            states.map((status) => [
              status,
              t(`synthesis-explorer-state-${status}`),
            ]),
          )}
          <button onClick={() => firstPage()}>
            {t("synthesis-action-refresh")}
          </button>
        </div>
        {feedback(browse, () => firstPage())}
        <div
          class="retrieval-directory-scroll zs-scroll-region"
          data-populated={!!indexed?.rows.length}
          ref={browseList}
        >
          {readyEmpty(browse) &&
            !indexed?.rows.length &&
            empty(t("synthesis-explorer-none"))}
          {!!indexed?.rows.length && (
            <table class="retrieval-table">
              <thead>
                <tr>
                  {(
                    [
                      "synthesis-column-title",
                      "synthesis-explorer-status",
                      "synthesis-explorer-sources",
                      "synthesis-explorer-fragments",
                    ] as const
                  ).map((key) => (
                    <th key={key} scope="col">
                      {t(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {indexed.rows.map((row) => (
                  <Fragment key={row.identity}>
                    <tr>
                      <td>
                        <div class="retrieval-item">
                          <button
                            class="retrieval-expand"
                            aria-expanded={expanded === row.identity}
                            aria-label={`${t("synthesis-explorer-expand")} · ${row.title}`}
                            onClick={() =>
                              expanded === row.identity
                                ? setExpanded("")
                                : fragments(row.identity)
                            }
                          >
                            {expanded === row.identity ? "▾" : "▸"}
                          </button>
                          {title(row)}
                        </div>
                      </td>
                      <td>
                        {row.status && (
                          <span
                            class={`zs-badge zs-badge--${row.status === "ready" ? "success" : "warning"}`}
                          >
                            {t(`synthesis-explorer-state-${row.status}`)}
                          </span>
                        )}
                      </td>
                      <td>{row.sourceCount}</td>
                      <td>{row.fragmentCount}</td>
                    </tr>
                    {expanded === row.identity && (
                      <tr class="retrieval-fragments">
                        <td colSpan={4}>
                          {feedback(fragmentSlot, () =>
                            fragments(row.identity),
                          )}
                          <ol>
                            {fragmentRows.map((f) => (
                              <li
                                key={`${source(f)}:${f.start}:${f.end}:${f.preview}`}
                              >
                                <small>
                                  {source(f)} · {f.start}–{f.end}
                                </small>
                                <p>{f.preview}</p>
                              </li>
                            ))}
                          </ol>
                          {fragmentPage?.publication === indexed.publication &&
                            fragmentPage.nextCursor && (
                              <button
                                onClick={() =>
                                  fragments(
                                    row.identity,
                                    fragmentPage.nextCursor!,
                                  )
                                }
                              >
                                {t("synthesis-explorer-next")}
                              </button>
                            )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <footer class="retrieval-pager">
          <button
            disabled={pages.length < 2 || browse?.status === "loading"}
            onClick={() => {
              const previous = pages.slice(0, -1);
              setPages(previous);
              list(previous.at(-1));
            }}
          >
            {t("synthesis-explorer-back")}
          </button>
          <span>{pages.length}</span>
          <button
            disabled={!indexed?.nextCursor || browse?.status !== "ready"}
            onClick={() => {
              if (indexed?.nextCursor) {
                setPages([...pages, indexed.nextCursor]);
                list(indexed.nextCursor);
              }
            }}
          >
            {t("synthesis-explorer-next")}
          </button>
        </footer>
      </section>
    </section>
  );
}

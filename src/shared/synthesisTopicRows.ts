import type { SynthesisWorkbenchArtifactsFilters } from "./synthesisWorkbenchWireContract";

type TopicRow = {
  id: string;
  title: string;
  definition?: string;
  paper_count?: number;
  updated_at?: string;
  source_materials_status?: string;
  freshness?: string;
};

/** Shared ordering and filtering for artifact inventories and Topics presentation. */
export function filterSynthesisTopicRows<T extends TopicRow>(
  rows: readonly T[],
  filters: SynthesisWorkbenchArtifactsFilters,
): T[] {
  const query = filters.search.toLowerCase();
  return rows
    .filter(
      (row) =>
        `${row.title} ${row.id} ${row.definition || ""}`
          .toLowerCase()
          .includes(query) &&
        (filters.sourceMaterials === "all" ||
          row.source_materials_status === filters.sourceMaterials) &&
        (filters.freshness === "all" || row.freshness === filters.freshness),
    )
    .sort((left, right) => {
      const byTitle = () =>
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id);
      if (filters.sort === "paper_count")
        return (right.paper_count || 0) - (left.paper_count || 0) || byTitle();
      if (filters.sort === "updated_at")
        return (
          String(right.updated_at || "").localeCompare(
            String(left.updated_at || ""),
          ) || byTitle()
        );
      return byTitle();
    });
}

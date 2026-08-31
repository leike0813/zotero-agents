export function collectStatusTransitionDiagnostics(
  transition,
  code,
  context = {},
) {
  if (
    transition?.outcome === "committed" ||
    transition?.outcome === "unchanged"
  ) {
    return [];
  }
  return [
    {
      code,
      ...context,
      outcome: String(transition?.outcome || "failed"),
      attempt: transition?.attempt || null,
    },
  ];
}

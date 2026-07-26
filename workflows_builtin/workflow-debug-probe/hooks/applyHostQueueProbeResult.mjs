export async function applyResult(args) {
  const result = args?.runResult?.resultJson || {};
  if (result.ok !== true) {
    throw new Error(`debug host queue probe failed: ${JSON.stringify(result)}`);
  }
  return { ok: true, applied: true };
}

export function buildCommittedPayload(entries) {
  return {
    version: 1,
    entries: Array.isArray(entries) ? entries : [],
  };
}

export function buildProjectionPayload(entries) {
  return {
    version: 1,
    entries: Array.isArray(entries) ? entries : [],
  };
}

export function buildStagedPayload(entries) {
  return {
    version: 1,
    entries: Array.isArray(entries) ? entries : [],
  };
}

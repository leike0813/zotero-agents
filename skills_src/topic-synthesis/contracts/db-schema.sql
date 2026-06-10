-- SQLite state machine for the generated topic synthesis split-skill runtime.

CREATE TABLE IF NOT EXISTS runtime_metadata (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stage_state (
  stage_id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  state TEXT NOT NULL,
  result_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS handoff_registry (
  handoff_key TEXT PRIMARY KEY,
  manifest_path TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  skill_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_workset (
  paper_ref TEXT PRIMARY KEY,
  item_key TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS paper_triage (
  paper_ref TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

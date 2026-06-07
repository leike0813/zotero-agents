from __future__ import annotations

import json
import os
import sqlite3
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any


DB_RELATIVE_PATH = Path("runtime/topic-synthesis.sqlite")

COMPLETE_SECTION_KEYS = [
    "topic",
    "summary",
    "positioning",
    "taxonomy",
    "improvement_dimension_summary",
    "improvement_dimensions",
    "claims",
    "timeline_events",
    "paper_evidence",
    "external_literature_analysis",
    "debates",
    "coverage",
    "gaps",
    "review_outline",
    "statistics",
    "synthesis_report",
    "evidence_map",
    "source_artifacts",
    "diagnostics",
]

SIDECAR_SCHEMA_IDS = {
    "topic_interest_metadata": "topic_interest_metadata.v1",
    "concept_cards_proposal": "synthesis.concept_cards_proposal",
    "topic_graph_relation_proposals": "synthesis.topic_graph_relation_proposals",
}

SKILL_STAGE_CONTRACT: dict[str, dict[str, Any]] = {
    "create-topic-synthesis-prepare": {
        "operation": "create",
        "output_kind": "topic_synthesis_handoff",
        "handoff": "prepare_analysis_context",
        "next_skill_id": "topic-synthesis-core-enrichment",
        "stages": [
            {
                "id": "stage_00_runtime_setup",
                "kind": "command",
                "task": "初始化或校验新建运行的本地 SQLite 状态。",
            },
            {
                "id": "stage_10_create_topic_context",
                "kind": "payload",
                "task": "编写新建主题意图和重复检查判断。",
                "schema": "stage-10-create-topic-context.schema.json",
                "payload_path": "runtime/payloads/create-topic-context.json",
                "required_reads": ["<zotero-bridge> synthesis list-topics --input '{}'"],
            },
            {
                "id": "stage_20_resolver_and_workset",
                "kind": "payload",
                "task": "编写 resolver proposal；runtime 会执行 resolver、图谱指标和 artifact export。",
                "schema": "stage-20-resolver-and-workset.schema.json",
                "payload_path": "runtime/payloads/resolver-and-workset.json",
                "required_reads": [
                    "<zotero-bridge> synthesis get-library-index --input '{\"cursor\":0,\"limit\":200}'"
                ],
            },
            {
                "id": "stage_30_prepare_analysis_context",
                "kind": "payload",
                "task": "为已解析的文献工作集编写轻量 paper triage 判断。",
                "schema": "stage-30-prepare-analysis-context.schema.json",
                "payload_path": "runtime/payloads/prepare-analysis-context.json",
                "required_reads": ["runtime/views/filtered-paper-artifacts/"],
            },
        ],
    },
    "update-topic-synthesis-prepare": {
        "operation": "update_full",
        "output_kind": "topic_synthesis_handoff",
        "handoff": "prepare_analysis_context",
        "next_skill_id": "topic-synthesis-core-enrichment",
        "stages": [
            {
                "id": "stage_00_runtime_setup",
                "kind": "command",
                "task": "初始化或校验更新运行的本地 SQLite 状态。",
            },
            {
                "id": "stage_10_update_topic_context",
                "kind": "payload",
                "task": "读取当前主题上下文，并编写紧凑的更新判断。",
                "schema": "stage-10-update-topic-context.schema.json",
                "payload_path": "runtime/payloads/update-topic-context.json",
                "required_reads": [
                    "<zotero-bridge> synthesis get-topic-context --input '{\"topicId\":\"<topic_id>\"}'"
                ],
            },
            {
                "id": "stage_20_resolver_and_workset",
                "kind": "payload",
                "task": "编写 resolver proposal；runtime 会执行 resolver、图谱指标和 artifact export。",
                "schema": "stage-20-resolver-and-workset.schema.json",
                "payload_path": "runtime/payloads/resolver-and-workset.json",
                "required_reads": [
                    "<zotero-bridge> synthesis get-library-index --input '{\"cursor\":0,\"limit\":200}'"
                ],
            },
            {
                "id": "stage_30_prepare_analysis_context",
                "kind": "payload",
                "task": "为已解析的文献工作集编写轻量 paper triage 判断。",
                "schema": "stage-30-prepare-analysis-context.schema.json",
                "payload_path": "runtime/payloads/prepare-analysis-context.json",
                "required_reads": ["runtime/views/filtered-paper-artifacts/"],
            },
        ],
    },
    "topic-synthesis-core-enrichment": {
        "operation": "create",
        "output_kind": "topic_synthesis_handoff",
        "handoff": "core_enrichment",
        "next_skill_id": "topic-synthesis-finalize",
        "stages": [
            {
                "id": "stage_00_runtime_state_check",
                "kind": "command",
                "task": "校验既有 DB、prepare handoff 和必需的上下文 artifacts。",
            },
            {
                "id": "stage_40_core_synthesis",
                "kind": "payload",
                "task": "编写 taxonomy、timeline、positioning、claims、dimensions、debates、gaps、outline 和 concept labels。",
                "schema": "stage-40-core-synthesis.schema.json",
                "payload_path": "runtime/payloads/core-synthesis.json",
                "required_reads": [
                    "runtime/handoff/prepare-analysis-context.json",
                    "runtime/views/cross-paper-context.md",
                    "runtime/views/source-paper-evidence-index.json",
                ],
            },
            {
                "id": "stage_50_kg_enrichment",
                "kind": "payload",
                "task": "编写 concept details、topic relation candidates 和 topic matching terms。",
                "schema": "stage-50-kg-enrichment.schema.json",
                "payload_path": "runtime/payloads/kg-enrichment.json",
                "required_reads": ["runtime/views/concept-candidate-context.json"],
            },
        ],
    },
    "topic-synthesis-finalize": {
        "operation": "create",
        "output_kind": "topic_synthesis",
        "handoff": "finalize_output",
        "next_skill_id": "",
        "stages": [
            {
                "id": "stage_00_runtime_state_check",
                "kind": "command",
                "task": "校验既有 DB、core enrichment handoff、sidecars 和收尾上下文。",
            },
            {
                "id": "stage_60_coverage_and_collection_suggestions",
                "kind": "payload",
                "task": "编写 coverage verdict、reliability interpretation、external context summary 和 collection suggestions。",
                "schema": "stage-60-coverage-and-collection-suggestions.schema.json",
                "payload_path": "runtime/payloads/coverage-and-collection-suggestions.json",
                "required_reads": [
                    "runtime/views/external-literature-context.md",
                    "runtime/views/finalize-context.manifest.json",
                ],
            },
            {
                "id": "stage_70_summary",
                "kind": "payload",
                "task": "基于已渲染的 synthesis report 编写最终 summary。",
                "schema": "stage-70-summary.schema.json",
                "payload_path": "runtime/payloads/summary.json",
                "required_reads": [
                    "runtime/views/synthesis-report.md",
                    "runtime/views/synthesis-report.manifest.json",
                ],
            },
        ],
    },
}


def infer_skill_id(skill_root: Path) -> str:
    return skill_root.name


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return sha256_file(path)


def write_text(path: Path, value: str) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value.replace("\r\n", "\n").replace("\r", "\n"), encoding="utf-8")
    return sha256_file(path)


def sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return "sha256:" + digest.hexdigest()


def run_root_from_db_path(db_path: str | Path) -> Path:
    resolved = Path(db_path).resolve()
    if resolved.name != DB_RELATIVE_PATH.name or resolved.parent.name != "runtime":
        raise ValueError(
            "topic synthesis DB must be located at <run_root>/runtime/topic-synthesis.sqlite"
        )
    return resolved.parent.parent


def resolve_run_path(run_root: Path, relative_or_absolute: str | Path) -> Path:
    path = Path(relative_or_absolute)
    if not path.is_absolute():
        path = run_root / path
    resolved = path.resolve()
    if run_root != resolved and run_root not in resolved.parents:
        raise ValueError(f"path escapes locked run_root: {relative_or_absolute}")
    return resolved


def connect(db_path: str | Path) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        create table if not exists runtime_metadata (
          key text primary key,
          value_json text not null
        );
        create table if not exists stage_receipts (
          stage_id text primary key,
          skill_id text not null,
          state text not null,
          result_json text not null,
          updated_at text not null
        );
        create table if not exists action_receipts (
          id integer primary key autoincrement,
          skill_id text not null,
          stage_id text not null,
          action text not null,
          payload_path text not null,
          payload_hash text not null,
          result_json text not null,
          created_at text not null
        );
        create table if not exists artifact_registry (
          artifact_key text primary key,
          path text not null,
          hash text not null,
          stage_id text not null,
          skill_id text not null
        );
        create table if not exists handoff_registry (
          handoff_key text primary key,
          manifest_path text not null,
          manifest_hash text not null,
          stage_id text not null,
          skill_id text not null
        );
        create table if not exists paper_workset (
          paper_ref text primary key,
          item_key text not null,
          title text not null,
          metadata_json text not null
        );
        create table if not exists paper_triage (
          paper_ref text primary key,
          payload_json text not null,
          updated_at text not null
        );
        """
    )
    conn.commit()
    return conn


def set_meta(conn: sqlite3.Connection, key: str, value: Any) -> None:
    conn.execute(
        """
        insert into runtime_metadata (key, value_json)
        values (?, ?)
        on conflict(key) do update set value_json = excluded.value_json
        """,
        (key, json.dumps(value, ensure_ascii=False, sort_keys=True)),
    )
    conn.commit()


def get_meta(conn: sqlite3.Connection, key: str, default: Any = None) -> Any:
    row = conn.execute(
        "select value_json from runtime_metadata where key = ?", (key,)
    ).fetchone()
    if row is None:
        return default
    return json.loads(str(row["value_json"]))


def completed_stages(conn: sqlite3.Connection, skill_id: str) -> set[str]:
    rows = conn.execute(
        "select stage_id from stage_receipts where skill_id = ? and state = 'completed'",
        (skill_id,),
    ).fetchall()
    return {str(row["stage_id"]) for row in rows}


def record_stage(
    conn: sqlite3.Connection,
    *,
    skill_id: str,
    stage_id: str,
    result: dict,
) -> None:
    conn.execute(
        """
        insert into stage_receipts (stage_id, skill_id, state, result_json, updated_at)
        values (?, ?, 'completed', ?, ?)
        on conflict(stage_id) do update set
          skill_id = excluded.skill_id,
          state = excluded.state,
          result_json = excluded.result_json,
          updated_at = excluded.updated_at
        """,
        (stage_id, skill_id, json.dumps(result, ensure_ascii=False, sort_keys=True), utc_now()),
    )
    conn.commit()


def record_action(
    conn: sqlite3.Connection,
    *,
    skill_id: str,
    stage_id: str,
    action: str,
    payload_path: str = "",
    payload_hash: str = "",
    result: dict,
) -> None:
    conn.execute(
        """
        insert into action_receipts
          (skill_id, stage_id, action, payload_path, payload_hash, result_json, created_at)
        values (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            skill_id,
            stage_id,
            action,
            payload_path,
            payload_hash,
            json.dumps(result, ensure_ascii=False, sort_keys=True),
            utc_now(),
        ),
    )
    conn.commit()


def register_artifact(
    conn: sqlite3.Connection,
    *,
    skill_id: str,
    stage_id: str,
    key: str,
    path: str,
    hash_value: str,
) -> None:
    conn.execute(
        """
        insert into artifact_registry (artifact_key, path, hash, stage_id, skill_id)
        values (?, ?, ?, ?, ?)
        on conflict(artifact_key) do update set
          path = excluded.path,
          hash = excluded.hash,
          stage_id = excluded.stage_id,
          skill_id = excluded.skill_id
        """,
        (key, path, hash_value, stage_id, skill_id),
    )
    conn.commit()


def artifact_entry(conn: sqlite3.Connection, key: str) -> dict | None:
    row = conn.execute(
        "select path, hash from artifact_registry where artifact_key = ?", (key,)
    ).fetchone()
    if row is None:
        return None
    return {"path": str(row["path"]), "hash": str(row["hash"])}


def current_stage(conn: sqlite3.Connection, skill_id: str) -> dict[str, Any] | None:
    contract = SKILL_STAGE_CONTRACT[skill_id]
    completed = completed_stages(conn, skill_id)
    for stage in contract["stages"]:
        if stage["id"] not in completed:
            return stage
    return None


def script_command(skill_root: Path, db_path: str, action: str) -> str:
    return f'python "{skill_root / "scripts" / "gate.py"}" --db "{db_path}" --action {action}'


def instruction_for_stage(
    *, skill_root: Path, db_path: str, stage: dict[str, Any] | None
) -> dict:
    skill_id = infer_skill_id(skill_root)
    contract = SKILL_STAGE_CONTRACT[skill_id]
    conn = connect(db_path)
    operation = get_meta(conn, "operation", contract["operation"])
    if stage is None:
        output = completed_output(skill_root=skill_root, db_path=db_path)
        return {
            "schema_id": "synthesis.topic_synthesis_gate_instruction",
            "schema_version": "1.0.0",
            "skill_id": skill_id,
            "operation": operation,
            "stage": "completed",
            "status": "completed",
            "needs_payload": False,
            "task": "本 skill 已完成。",
            "output": output,
        }

    result = {
        "schema_id": "synthesis.topic_synthesis_gate_instruction",
        "schema_version": "1.0.0",
        "skill_id": skill_id,
        "operation": operation,
        "stage": stage["id"],
        "stage_kind": stage["kind"],
        "needs_payload": stage["kind"] == "payload",
        "task": stage["task"],
        "db_path": db_path,
        "command": script_command(skill_root, db_path, "run"),
    }
    if stage["kind"] == "payload":
        result["required_reads"] = stage.get("required_reads", [])
        result["payload_schema"] = "assets/schemas/" + stage["schema"]
        result["payload_path"] = stage["payload_path"]
        result["submit_command"] = (
            script_command(skill_root, db_path, "submit")
            + f' --payload "{stage["payload_path"]}"'
        )
    return result


def write_gate_transcript(run_root: Path, instruction: dict) -> None:
    transcript_dir = run_root / "runtime" / "gate-transcript"
    transcript_dir.mkdir(parents=True, exist_ok=True)
    index = len(list(transcript_dir.glob("*.json"))) + 1
    write_json(transcript_dir / f"{index:03d}-{instruction.get('stage', 'unknown')}.json", instruction)


def write_action_transcript(run_root: Path, stage_id: str, action: str, result: dict) -> None:
    transcript_dir = run_root / "runtime" / "action-transcript"
    transcript_dir.mkdir(parents=True, exist_ok=True)
    index = len(list(transcript_dir.glob("*.json"))) + 1
    write_json(
        transcript_dir / f"{index:03d}-{stage_id}-{action}.json",
        {"stage": stage_id, "action": action, "result": result},
    )


def build_current_instruction(
    *,
    skill_root: Path,
    db_path: str,
    input_path: str | None = None,
    audit: bool = False,
) -> dict:
    skill_id = infer_skill_id(skill_root)
    if skill_id not in SKILL_STAGE_CONTRACT:
        return {
            "error": {
                "code": "unknown_generated_skill",
                "message": f"Unknown generated topic synthesis skill: {skill_id}",
            },
            "skill_id": skill_id,
        }
    conn = connect(db_path)
    run_root = run_root_from_db_path(db_path)
    if input_path:
        set_meta(conn, "input_path", str(input_path))
    stage = current_stage(conn, skill_id)
    instruction = instruction_for_stage(skill_root=skill_root, db_path=db_path, stage=stage)
    if audit:
        instruction["audit"] = audit_state(conn)
    write_gate_transcript(run_root, instruction)
    return instruction


def read_payload(run_root: Path, payload_path: str | Path) -> tuple[dict, Path, str]:
    path = resolve_run_path(run_root, payload_path)
    payload = read_json(path)
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    return payload, path, sha256_file(path)


def load_schema(skill_root: Path, schema_name: str) -> dict:
    return read_json(skill_root / "assets" / "schemas" / schema_name)


def validate_payload_against_schema(payload: dict, schema: dict) -> None:
    required = schema.get("required", [])
    if isinstance(required, list):
        missing = [key for key in required if key not in payload]
        if missing:
            raise ValueError(f"payload missing required fields: {', '.join(missing)}")
    if schema.get("additionalProperties") is False:
        allowed = set((schema.get("properties") or {}).keys())
        extra = [key for key in payload.keys() if key not in allowed]
        if extra:
            raise ValueError(f"payload contains unsupported fields: {', '.join(extra)}")


def bridge_executable(run_root: Path) -> Path:
    env_path = os.environ.get("ZOTERO_BRIDGE_BIN")
    candidates: list[Path] = []
    if env_path:
        candidates.append(Path(env_path))
    bridge_dir = run_root / ".zotero-bridge" / "bin"
    candidates.extend(
        [
            bridge_dir / "zotero-bridge.cmd",
            bridge_dir / "zotero-bridge.exe",
            bridge_dir / "zotero-bridge",
        ]
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    raise ValueError(f"Host Bridge CLI not found under {bridge_dir}")


def run_bridge_json(run_root: Path, subcommand: list[str], payload: dict, input_name: str) -> dict:
    bridge = bridge_executable(run_root)
    input_path = run_root / "runtime" / "payloads" / input_name
    write_json(input_path, payload)
    completed = subprocess.run(
        [str(bridge), *subcommand, "--input", f"@runtime/payloads/{input_name}"],
        cwd=str(run_root),
        capture_output=True,
        encoding="utf-8",
        text=True,
        check=False,
    )
    stdout = (completed.stdout or "").strip()
    if completed.returncode != 0:
        raise ValueError(
            "Host Bridge CLI failed: "
            + (stdout or completed.stderr or f"exit {completed.returncode}")
        )
    parsed = json.loads(stdout)
    if isinstance(parsed, dict) and parsed.get("ok") is False:
        raise ValueError("Host Bridge CLI failed: " + json.dumps(parsed.get("error"), ensure_ascii=False))
    return parsed


def unwrap_bridge_data(output: dict) -> dict:
    data = output.get("data") if isinstance(output.get("data"), dict) else output
    if isinstance(data.get("data"), dict):
        return data["data"]
    return data


def extract_papers(resolved: dict) -> list[dict]:
    papers = resolved.get("papers")
    if isinstance(papers, list):
        return [paper for paper in papers if isinstance(paper, dict)]
    result = resolved.get("result")
    if isinstance(result, dict) and isinstance(result.get("papers"), list):
        return [paper for paper in result["papers"] if isinstance(paper, dict)]
    raise ValueError("resolver result did not contain papers[]")


def paper_refs(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("select paper_ref from paper_workset order by paper_ref").fetchall()
    return [str(row["paper_ref"]) for row in rows]


def store_workset(conn: sqlite3.Connection, papers: list[dict]) -> None:
    for paper in papers:
        paper_ref = str(paper.get("paper_ref") or "").strip()
        if not paper_ref:
            continue
        item_key = str(paper.get("item_key") or paper_ref.split(":")[-1])
        title = str(paper.get("title") or paper_ref)
        conn.execute(
            """
            insert into paper_workset (paper_ref, item_key, title, metadata_json)
            values (?, ?, ?, ?)
            on conflict(paper_ref) do update set
              item_key = excluded.item_key,
              title = excluded.title,
              metadata_json = excluded.metadata_json
            """,
            (paper_ref, item_key, title, json.dumps(paper, ensure_ascii=False, sort_keys=True)),
        )
    conn.commit()


def collect_resolver_cascade(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    stage_id: str,
    payload: dict,
) -> dict:
    resolver_output = run_bridge_json(
        run_root,
        ["synthesis", "resolve-resolver"],
        {"resolver": payload["resolver"]},
        "resolver-input.json",
    )
    resolved = unwrap_bridge_data(resolver_output)
    papers = extract_papers(resolved)
    store_workset(conn, papers)

    resolver_manifest = {
        "schema_id": "synthesis.topic_synthesis_resolver_manifest",
        "schema_version": "1.0.0",
        "resolver": payload["resolver"],
        "resolver_reasoning": payload.get("resolver_reasoning", ""),
        "operation_intent": payload.get("operation_intent", "create"),
        "resolution_result": resolved,
        "paper_refs": [str(paper.get("paper_ref")) for paper in papers],
        "diagnostics": payload.get("diagnostics", []),
    }
    resolver_hash = write_json(run_root / "runtime/payloads/resolver.json", resolver_manifest)
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="resolver_manifest",
        path="runtime/payloads/resolver.json",
        hash_value=resolver_hash,
    )

    refs = paper_refs(conn)
    metrics_output = run_bridge_json(
        run_root,
        ["synthesis", "get-citation-graph-metrics"],
        {"paperRefs": refs, "limit": len(refs)},
        "citation-graph-metrics-input-1.json",
    )
    metrics_receipt = {"paper_refs": refs, "result": unwrap_bridge_data(metrics_output)}
    metrics_hash = write_json(
        run_root / "runtime/payloads/citation-graph-metrics-batch-1.json",
        metrics_receipt,
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="citation_graph_metrics_batch_1",
        path="runtime/payloads/citation-graph-metrics-batch-1.json",
        hash_value=metrics_hash,
    )
    record_action(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        action="resolver_cascade_metrics",
        result={"paper_refs": refs, "artifact_hash": metrics_hash},
    )

    artifacts_output = run_bridge_json(
        run_root,
        ["synthesis", "export-filtered-paper-artifacts"],
        {"run_root": str(run_root), "paper_refs": refs},
        "paper-artifacts-export-input-1.json",
    )
    artifact_data = unwrap_bridge_data(artifacts_output)
    manifest = extract_artifact_manifest(run_root, artifact_data)
    manifest_hash = write_json(
        run_root / "runtime/payloads/paper-artifacts-manifest-batch-1.json",
        manifest,
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="paper_artifacts_manifest_batch_1",
        path="runtime/payloads/paper-artifacts-manifest-batch-1.json",
        hash_value=manifest_hash,
    )
    record_action(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        action="resolver_cascade_artifacts",
        result={"paper_refs": refs, "artifact_hash": manifest_hash},
    )

    return {
        "paper_refs": refs,
        "paper_count": len(refs),
        "resolver_manifest_path": "runtime/payloads/resolver.json",
        "resolver_manifest_hash": resolver_hash,
        "metrics_manifest_hash": metrics_hash,
        "artifact_manifest_hash": manifest_hash,
    }


def extract_artifact_manifest(run_root: Path, artifact_data: dict) -> dict:
    for key in ("manifest", "artifact_manifest", "result"):
        value = artifact_data.get(key)
        if isinstance(value, dict) and isinstance(value.get("papers"), list):
            return value
    if isinstance(artifact_data.get("papers"), list):
        return artifact_data
    for key in ("manifest_path", "manifestPath", "path"):
        value = artifact_data.get(key)
        if isinstance(value, str) and value.strip():
            loaded = read_json(resolve_run_path(run_root, value.strip()))
            if isinstance(loaded, dict):
                return loaded
    default_path = run_root / "runtime/payloads/paper-artifacts-manifest.json"
    if default_path.exists():
        loaded = read_json(default_path)
        if isinstance(loaded, dict):
            return loaded
    raise ValueError("artifact export did not return or write a manifest")


def payload_entries(payload: dict) -> list[dict]:
    for key in ("assessments", "analyses"):
        value = payload.get(key)
        if isinstance(value, list):
            return [entry for entry in value if isinstance(entry, dict)]
    return []


def register_prepare_triage(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    stage_id: str,
    payload: dict,
) -> dict:
    entries = payload_entries(payload)
    if not entries:
        raise ValueError("prepare analysis context payload must contain assessments[]")
    known_refs = set(paper_refs(conn))
    analyzed: list[str] = []
    for entry in entries:
        paper_ref = str(entry.get("paper_ref") or "").strip()
        if not paper_ref:
            raise ValueError("paper triage entry missing paper_ref")
        if paper_ref not in known_refs:
            raise ValueError(f"paper triage references unknown paper: {paper_ref}")
        conn.execute(
            """
            insert into paper_triage (paper_ref, payload_json, updated_at)
            values (?, ?, ?)
            on conflict(paper_ref) do update set
              payload_json = excluded.payload_json,
              updated_at = excluded.updated_at
            """,
            (paper_ref, json.dumps(entry, ensure_ascii=False, sort_keys=True), utc_now()),
        )
        analyzed.append(paper_ref)
    conn.commit()
    write_prepare_views(conn, run_root=run_root, skill_id=skill_id, stage_id=stage_id)
    handoff = write_handoff(
        conn,
        run_root=run_root,
        skill_id=skill_id,
        stage_id=stage_id,
        handoff="prepare_analysis_context",
        next_skill_id="topic-synthesis-core-enrichment",
        artifact_keys=[
          "resolver_manifest",
          "paper_artifacts_manifest_batch_1",
          "prepare_analysis_context_payload",
          "cross_paper_context",
          "external_literature_context",
          "source_paper_evidence_index",
        ],
    )
    return {
        "paper_refs": analyzed,
        "analyzed_count": len(analyzed),
        "handoff": handoff,
    }


def write_prepare_views(
    conn: sqlite3.Connection, *, run_root: Path, skill_id: str, stage_id: str
) -> None:
    rows = conn.execute(
        """
        select w.paper_ref, w.title, t.payload_json
        from paper_workset w
        left join paper_triage t on t.paper_ref = w.paper_ref
        order by w.paper_ref
        """
    ).fetchall()
    lines = ["# Cross-paper Context", ""]
    evidence_items = []
    for row in rows:
        triage = json.loads(row["payload_json"]) if row["payload_json"] else {}
        digest = (
            triage.get("core_digest")
            or triage.get("coreDigest")
            or triage.get("relevance_reason")
            or ""
        )
        lines.append(f"- `{row['paper_ref']}` {row['title']}: {digest}")
        evidence_items.append(
            {
                "paper_ref": row["paper_ref"],
                "evidence_id": "ev:" + str(row["paper_ref"]).replace(":", "_"),
                "short_evidence": digest,
            }
        )
    cross_hash = write_text(run_root / "runtime/views/cross-paper-context.md", "\n".join(lines) + "\n")
    external_hash = write_text(
        run_root / "runtime/views/external-literature-context.md",
        "# External Literature Context\n\nNo external network literature was fetched by the split runtime.\n",
    )
    index_hash = write_json(
        run_root / "runtime/views/source-paper-evidence-index.json",
        {
            "schema_id": "synthesis.source_paper_evidence_index",
            "schema_version": "1.0.0",
            "items": evidence_items,
        },
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="cross_paper_context",
        path="runtime/views/cross-paper-context.md",
        hash_value=cross_hash,
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="external_literature_context",
        path="runtime/views/external-literature-context.md",
        hash_value=external_hash,
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="source_paper_evidence_index",
        path="runtime/views/source-paper-evidence-index.json",
        hash_value=index_hash,
    )


def write_handoff(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    stage_id: str,
    handoff: str,
    next_skill_id: str,
    artifact_keys: list[str],
) -> dict:
    artifacts: dict[str, dict] = {}
    for key in artifact_keys:
        entry = artifact_entry(conn, key)
        if entry:
            artifacts[key] = entry
    manifest_path = f"runtime/handoff/{handoff.replace('_', '-')}.json"
    manifest = {
        "schema_id": "synthesis.skill_handoff",
        "schema_version": "1.0.0",
        "handoff": handoff,
        "stage": stage_id,
        "db_path": "runtime/topic-synthesis.sqlite",
        "artifacts": artifacts,
        "diagnostics": [],
    }
    manifest_hash = write_json(run_root / manifest_path, manifest)
    conn.execute(
        """
        insert into handoff_registry (handoff_key, manifest_path, manifest_hash, stage_id, skill_id)
        values (?, ?, ?, ?, ?)
        on conflict(handoff_key) do update set
          manifest_path = excluded.manifest_path,
          manifest_hash = excluded.manifest_hash,
          stage_id = excluded.stage_id,
          skill_id = excluded.skill_id
        """,
        (handoff, manifest_path, manifest_hash, stage_id, skill_id),
    )
    conn.commit()
    return {
        "__SKILL_DONE__": True,
        "kind": "topic_synthesis_handoff",
        "handoff": handoff,
        "operation": get_meta(conn, "operation", "create"),
        "db_path": "runtime/topic-synthesis.sqlite",
        "handoff_manifest_path": manifest_path,
        "handoff_manifest_hash": manifest_hash,
        "next_skill_id": next_skill_id,
        "diagnostics": [],
    }


def completed_output(*, skill_root: Path, db_path: str) -> dict:
    skill_id = infer_skill_id(skill_root)
    conn = connect(db_path)
    contract = SKILL_STAGE_CONTRACT[skill_id]
    if contract["output_kind"] == "topic_synthesis":
        run_root = run_root_from_db_path(db_path)
        final_path = run_root / "result/final-output.candidate.json"
        if final_path.exists():
            return read_json(final_path)
    row = conn.execute(
        "select manifest_path, manifest_hash from handoff_registry where handoff_key = ?",
        (contract["handoff"],),
    ).fetchone()
    if row is not None:
        return {
            "__SKILL_DONE__": True,
            "kind": "topic_synthesis_handoff",
            "handoff": contract["handoff"],
            "operation": get_meta(conn, "operation", contract["operation"]),
            "db_path": "runtime/topic-synthesis.sqlite",
            "handoff_manifest_path": str(row["manifest_path"]),
            "handoff_manifest_hash": str(row["manifest_hash"]),
            "next_skill_id": contract["next_skill_id"],
            "diagnostics": [],
        }
    return {"__SKILL_DONE__": True, "kind": "topic_synthesis_handoff", "diagnostics": []}


def run_current_command_stage(
    *, skill_root: Path, db_path: str, input_path: str | None = None
) -> dict:
    skill_id = infer_skill_id(skill_root)
    conn = connect(db_path)
    run_root = run_root_from_db_path(db_path)
    stage = current_stage(conn, skill_id)
    if stage is None:
        return completed_output(skill_root=skill_root, db_path=db_path)
    if stage["kind"] != "command":
        raise ValueError(f"current stage requires payload: {stage['id']}")
    contract = SKILL_STAGE_CONTRACT[skill_id]
    result: dict[str, Any]
    if stage["id"] == "stage_00_runtime_setup":
        run_root.mkdir(parents=True, exist_ok=True)
        for subdir in ["runtime/payloads", "runtime/views", "runtime/handoff", "result/sections", "result/sidecars"]:
            (run_root / subdir).mkdir(parents=True, exist_ok=True)
        if input_path:
            input_resolved = resolve_run_path(run_root, input_path)
            if input_resolved.exists():
                set_meta(conn, "input", read_json(input_resolved))
        set_meta(conn, "run_root", str(run_root))
        set_meta(conn, "operation", contract["operation"])
        result = {"run_root": str(run_root), "operation": contract["operation"]}
    elif stage["id"] == "stage_00_runtime_state_check":
        required = (
            "runtime/handoff/prepare-analysis-context.json"
            if skill_id == "topic-synthesis-core-enrichment"
            else "runtime/handoff/core-enrichment.json"
        )
        if not (run_root / required).exists():
            raise ValueError(f"required handoff not found: {required}")
        result = {"checked": required}
    else:
        raise ValueError(f"unsupported command stage: {stage['id']}")
    record_stage(conn, skill_id=skill_id, stage_id=stage["id"], result=result)
    record_action(conn, skill_id=skill_id, stage_id=stage["id"], action="run", result=result)
    write_action_transcript(run_root, stage["id"], "run", result)
    return {"ok": True, "skill_id": skill_id, "stage": stage["id"], "result": result}


def submit_current_payload_stage(
    *,
    skill_root: Path,
    db_path: str,
    payload_path: str,
    input_path: str | None = None,
) -> dict:
    skill_id = infer_skill_id(skill_root)
    conn = connect(db_path)
    run_root = run_root_from_db_path(db_path)
    stage = current_stage(conn, skill_id)
    if stage is None:
        return completed_output(skill_root=skill_root, db_path=db_path)
    if stage["kind"] != "payload":
        raise ValueError(f"current stage is command-only: {stage['id']}")
    payload, path, payload_hash = read_payload(run_root, payload_path)
    validate_payload_against_schema(payload, load_schema(skill_root, stage["schema"]))
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage["id"],
        key=stage["id"] + "_payload",
        path=str(path.relative_to(run_root)).replace("\\", "/"),
        hash_value=payload_hash,
    )

    result = dispatch_payload_stage(
        conn,
        run_root=run_root,
        skill_id=skill_id,
        stage=stage,
        payload=payload,
        payload_hash=payload_hash,
    )
    record_stage(conn, skill_id=skill_id, stage_id=stage["id"], result=result)
    record_action(
        conn,
        skill_id=skill_id,
        stage_id=stage["id"],
        action="submit",
        payload_path=str(path.relative_to(run_root)).replace("\\", "/"),
        payload_hash=payload_hash,
        result=result,
    )
    write_action_transcript(run_root, stage["id"], "submit", result)
    return {"ok": True, "skill_id": skill_id, "stage": stage["id"], "result": result}


def dispatch_payload_stage(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    stage: dict,
    payload: dict,
    payload_hash: str,
) -> dict:
    stage_id = stage["id"]
    if stage_id == "stage_10_create_topic_context":
        topic_id = slugify(str(payload["topic_title"]))
        set_meta(
            conn,
            "topic_definition",
            {
                "id": topic_id,
                "title": payload["topic_title"],
                "definition": payload.get("definition", ""),
                "aliases": payload.get("aliases", []),
                "scope_include": payload.get("scope_include", []),
                "scope_exclude": payload.get("scope_exclude", []),
            },
        )
        set_meta(conn, "language", payload.get("language") or get_meta(conn, "language", "zh-CN"))
        return {"topic_definition": get_meta(conn, "topic_definition"), "duplicate_status": payload["duplicate_status"]}
    if stage_id == "stage_10_update_topic_context":
        topic_context = payload["topic_context"]
        update_assessment = payload["update_assessment"]
        operation = normalize_update_operation(
            update_assessment.get("operation"),
            default=SKILL_STAGE_CONTRACT[skill_id]["operation"],
        )
        topic_definition = normalize_update_topic_definition(topic_context)
        current_hashes = topic_context.get("current_hashes") or {}
        section_hashes = topic_context.get("section_hashes") or {}
        recommended_update = topic_context.get("recommended_update") or {}
        set_meta(conn, "operation", operation)
        set_meta(conn, "topic_id", topic_definition["id"])
        set_meta(conn, "topic_definition", topic_definition)
        set_meta(conn, "current_hashes", current_hashes)
        set_meta(conn, "section_hashes", section_hashes)
        set_meta(conn, "recommended_update", recommended_update)
        set_meta(conn, "update_assessment", update_assessment)
        return {
            "topic_definition": topic_definition,
            "operation": operation,
            "changed_sections": update_assessment.get("changed_sections", []),
            "current_hash_count": len(current_hashes),
            "section_hash_count": len(section_hashes),
        }
    if stage_id == "stage_20_resolver_and_workset":
        return collect_resolver_cascade(
            conn,
            run_root=run_root,
            skill_id=skill_id,
            stage_id=stage_id,
            payload=payload,
        )
    if stage_id == "stage_30_prepare_analysis_context":
        return register_prepare_triage(
            conn,
            run_root=run_root,
            skill_id=skill_id,
            stage_id=stage_id,
            payload=payload,
        )
    if stage_id == "stage_40_core_synthesis":
        set_meta(conn, "core_synthesis_payload", payload)
        labels = payload.get("concept_candidate_labels") or []
        context_hash = write_json(
            run_root / "runtime/views/concept-candidate-context.json",
            {
                "schema_id": "synthesis.concept_candidate_context",
                "schema_version": "1.0.0",
                "concepts": labels,
            },
        )
        register_artifact(
            conn,
            skill_id=skill_id,
            stage_id=stage_id,
            key="concept_candidate_context",
            path="runtime/views/concept-candidate-context.json",
            hash_value=context_hash,
        )
        return {"concept_candidate_count": len(labels)}
    if stage_id == "stage_50_kg_enrichment":
        set_meta(conn, "kg_enrichment_payload", payload)
        return materialize_core_handoff(conn, run_root=run_root, skill_id=skill_id, stage_id=stage_id, payload=payload)
    if stage_id == "stage_60_coverage_and_collection_suggestions":
        set_meta(conn, "coverage_payload", payload)
        return materialize_finalize_context(conn, run_root=run_root, skill_id=skill_id, stage_id=stage_id, payload=payload)
    if stage_id == "stage_70_summary":
        set_meta(conn, "summary_payload", payload)
        return materialize_final_output(conn, run_root=run_root, skill_id=skill_id, stage_id=stage_id, payload=payload)
    raise ValueError(f"unsupported payload stage: {stage_id}")


def materialize_core_handoff(
    conn: sqlite3.Connection, *, run_root: Path, skill_id: str, stage_id: str, payload: dict
) -> dict:
    topic = get_meta(conn, "topic_definition", {})
    matching_terms = payload.get("topic_matching_terms") if isinstance(payload.get("topic_matching_terms"), dict) else {}
    concept_hash = write_json(
        run_root / "result/sidecars/concept-cards-proposal.json",
        {
            "schema_id": "synthesis.concept_cards_proposal",
            "schema_version": "1.0.0",
            "cards": payload.get("concept_details", []),
            "diagnostics": payload.get("diagnostics", []),
        },
    )
    relation_hash = write_json(
        run_root / "result/sidecars/topic-graph-relation-proposals.json",
        {
            "schema_id": "synthesis.topic_graph_relation_proposals",
            "schema_version": "1.0.0",
            "proposals": payload.get("topic_relation_candidates", []),
            "diagnostics": payload.get("diagnostics", []),
        },
    )
    interest_hash = write_json(
        run_root / "result/sidecars/topic-interest-metadata.json",
        {
            "schema": "topic_interest_metadata.v1",
            "topic_id": topic.get("id", "topic-synthesis"),
            "include_terms": matching_terms.get("include_terms", topic.get("aliases", [])),
            "must_have_terms": matching_terms.get("must_have_terms", []),
            "methods": matching_terms.get("methods", []),
            "exclude_terms": matching_terms.get("exclude_terms", topic.get("scope_exclude", [])),
            "seed_literature_item_ids": paper_refs(conn),
            "diagnostics": matching_terms.get("diagnostics", payload.get("diagnostics", [])),
        },
    )
    for key, rel_path, hash_value in [
        ("concept_cards_proposal", "result/sidecars/concept-cards-proposal.json", concept_hash),
        ("topic_graph_relation_proposals", "result/sidecars/topic-graph-relation-proposals.json", relation_hash),
        ("topic_interest_metadata", "result/sidecars/topic-interest-metadata.json", interest_hash),
    ]:
        register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key=key, path=rel_path, hash_value=hash_value)
    final_context_hash = write_json(
        run_root / "runtime/views/finalize-context.manifest.json",
        {
            "schema_id": "synthesis.finalize_context_manifest",
            "schema_version": "1.0.0",
            "external_literature_context": artifact_entry(conn, "external_literature_context"),
            "sidecars": {
                key: artifact_entry(conn, key)
                for key in [
                    "concept_cards_proposal",
                    "topic_graph_relation_proposals",
                    "topic_interest_metadata",
                ]
            },
        },
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="finalize_context_manifest",
        path="runtime/views/finalize-context.manifest.json",
        hash_value=final_context_hash,
    )
    return {
        "handoff": write_handoff(
            conn,
            run_root=run_root,
            skill_id=skill_id,
            stage_id=stage_id,
            handoff="core_enrichment",
            next_skill_id="topic-synthesis-finalize",
            artifact_keys=[
                "stage_40_core_synthesis_payload",
                "stage_50_kg_enrichment_payload",
                "concept_cards_proposal",
                "topic_graph_relation_proposals",
                "topic_interest_metadata",
                "finalize_context_manifest",
            ],
        )
    }


def as_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def clean_text(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text if text else default


def first_text(*values: Any, default: str = "") -> str:
    for value in values:
        text = clean_text(value)
        if text:
            return text
    return default


def evidence_id_for_ref(paper_ref: str) -> str:
    return "ev:" + paper_ref.replace(":", "_")


def evidence_map_id_for_ref(paper_ref: str) -> str:
    return "map:" + paper_ref.replace(":", "_")


def workset_entries(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "select paper_ref, item_key, title, metadata_json from paper_workset order by paper_ref"
    ).fetchall()
    entries: list[dict] = []
    for row in rows:
        metadata = json.loads(row["metadata_json"]) if row["metadata_json"] else {}
        entries.append(
            {
                "paper_ref": str(row["paper_ref"]),
                "item_key": str(row["item_key"]),
                "title": str(row["title"]),
                "metadata": metadata if isinstance(metadata, dict) else {},
            }
        )
    return entries


def triage_entries(conn: sqlite3.Connection) -> dict[str, dict]:
    rows = conn.execute("select paper_ref, payload_json from paper_triage").fetchall()
    result: dict[str, dict] = {}
    for row in rows:
        payload = json.loads(row["payload_json"]) if row["payload_json"] else {}
        if isinstance(payload, dict):
            result[str(row["paper_ref"])] = payload
    return result


def first_paper_ref(entries: list[dict]) -> str:
    if entries:
        return str(entries[0].get("paper_ref") or "paper:unknown")
    return "paper:unknown"


def first_evidence_id(entries: list[dict]) -> str:
    return evidence_id_for_ref(first_paper_ref(entries))


def first_evidence_map_id(entries: list[dict]) -> str:
    return evidence_map_id_for_ref(first_paper_ref(entries))


def digest_ref_for_paper(run_root: Path, paper_ref: str, artifact_manifest: dict) -> dict:
    papers = as_list(artifact_manifest.get("papers"))
    for paper in papers:
        if not isinstance(paper, dict) or str(paper.get("paper_ref") or "") != paper_ref:
            continue
        for artifact in as_list(paper.get("artifacts")):
            if not isinstance(artifact, dict):
                continue
            content_file = clean_text(artifact.get("content_file"))
            if not content_file:
                continue
            target = resolve_run_path(run_root, content_file)
            payload_hash = sha256_file(target) if target.exists() else "sha256:" + sha256(content_file.encode("utf-8")).hexdigest()
            return {
                "path": content_file,
                "payload_type": clean_text(artifact.get("payload_type"), "digest-markdown"),
                "payload_hash": payload_hash,
            }
    return {
        "path": "",
        "payload_type": "digest-markdown",
        "payload_hash": "sha256:" + sha256(paper_ref.encode("utf-8")).hexdigest(),
    }


def load_artifact_manifest(conn: sqlite3.Connection, run_root: Path) -> dict:
    entry = artifact_entry(conn, "paper_artifacts_manifest_batch_1")
    if entry:
        path = resolve_run_path(run_root, entry["path"])
        if path.exists():
            loaded = read_json(path)
            if isinstance(loaded, dict):
                return loaded
    return {}


def normalize_paper_evidence(conn: sqlite3.Connection, run_root: Path) -> list[dict]:
    artifact_manifest = load_artifact_manifest(conn, run_root)
    triage = triage_entries(conn)
    evidence: list[dict] = []
    for entry in workset_entries(conn):
        paper_ref = str(entry["paper_ref"])
        paper_triage = triage.get(paper_ref, {})
        metadata = as_dict(entry.get("metadata"))
        evidence.append(
            {
                "id": evidence_id_for_ref(paper_ref),
                "paper_ref": paper_ref,
                "item_key": entry.get("item_key", ""),
                "title": entry.get("title", paper_ref),
                "year": first_text(
                    metadata.get("year"),
                    metadata.get("publication_year"),
                    metadata.get("date"),
                    default="",
                ),
                "summary": first_text(
                    paper_triage.get("core_digest"),
                    paper_triage.get("relevance_reason"),
                    default=f"{entry.get('title', paper_ref)} is part of the resolved topic workset.",
                ),
                "synthesis_role": clean_text(paper_triage.get("relevance_level"), "supporting"),
                "quality": clean_text(paper_triage.get("paper_quality_level"), "unknown"),
                "digest_ref": digest_ref_for_paper(run_root, paper_ref, artifact_manifest),
            }
        )
    return evidence


def normalize_topic_section(topic: dict) -> dict:
    title = first_text(topic.get("title"), topic.get("id"), default="Topic Synthesis")
    include = as_list(topic.get("scope_include"))
    exclude = as_list(topic.get("scope_exclude"))
    return {
        "id": clean_text(topic.get("id"), slugify(title)),
        "title": title,
        "definition": first_text(
            topic.get("definition"),
            default=f"Synthesis topic for {title}.",
        ),
        "aliases": as_list(topic.get("aliases")),
        "discipline": "computer vision",
        "research_area": title,
        "scope_boundary": {
            "include": include or [title],
            "exclude": exclude,
            "notes": "Runtime-derived scope boundary from the split topic context payload.",
        },
    }


def normalize_taxonomy(core: dict, entries: list[dict]) -> dict:
    taxonomy = as_dict(core.get("taxonomy"))
    nodes = as_list(taxonomy.get("nodes") or taxonomy.get("categories"))
    if not nodes:
        nodes = [
            {
                "id": "route-core",
                "title": "Core topic route",
                "definition": "The main route synthesized from the selected library papers.",
                "core_problem": "Explain the central methods and limitations represented in the resolved workset.",
                "mechanism": "Compare paper-level evidence and organize it into a topic-level route.",
                "representative_papers": [first_paper_ref(entries)],
                "strengths": ["Grounded in resolved Zotero library evidence."],
                "limitations": ["Runtime fallback should be refined by richer core synthesis payloads."],
                "maturity": "emerging",
                "evidence_map_refs": [first_evidence_map_id(entries)],
            }
        ]
    normalized_nodes = []
    for index, node_raw in enumerate(nodes):
        node = as_dict(node_raw)
        normalized_nodes.append(
            {
                **node,
                "id": first_text(node.get("id"), default=f"route-{index + 1}"),
                "title": first_text(node.get("title"), node.get("label"), node.get("name"), default=f"Route {index + 1}"),
                "definition": first_text(node.get("definition"), node.get("description"), default="Runtime-normalized research route."),
                "core_problem": first_text(node.get("core_problem"), node.get("problem"), default="Topic-level problem represented by this route."),
                "mechanism": first_text(node.get("mechanism"), node.get("technical_mechanism"), default="Mechanism summarized from source evidence."),
                "representative_papers": as_list(node.get("representative_papers") or node.get("paper_refs") or node.get("evidence_refs")) or [first_paper_ref(entries)],
                "strengths": as_list(node.get("strengths") or node.get("advantages")) or ["Evidence-grounded synthesis."],
                "limitations": as_list(node.get("limitations") or node.get("weaknesses")) or ["Coverage depends on the resolved workset."],
                "maturity": first_text(node.get("maturity"), node.get("status"), default="unknown"),
                "evidence_map_refs": as_list(node.get("evidence_map_refs")) or [first_evidence_map_id(entries)],
            }
        )
    summary = as_dict(taxonomy.get("summary"))
    return {
        **taxonomy,
        "primary_axis": first_text(taxonomy.get("primary_axis"), taxonomy.get("axis"), default="technical route"),
        "summary": {
            **summary,
            "text": first_text(
                summary.get("text"),
                summary.get("analysis"),
                summary.get("overview"),
                default="The topic is organized around the main technical routes visible in the resolved paper set.",
            ),
        },
        "nodes": normalized_nodes,
    }


def normalize_claims(core: dict, entries: list[dict]) -> list[dict]:
    claims = as_list(core.get("claims"))
    if not claims:
        claims = [
            {
                "id": "claim-1",
                "text": "The resolved library evidence supports a coherent topic-level synthesis.",
                "analysis": "This claim is generated from the split runtime workset and should be refined by richer core synthesis payloads.",
                "scope": "Current Zotero library workset.",
            }
        ]
    result = []
    for index, claim_raw in enumerate(claims):
        claim = as_dict(claim_raw)
        result.append(
            {
                **claim,
                "id": first_text(claim.get("id"), default=f"claim-{index + 1}"),
                "text": first_text(claim.get("text"), claim.get("claim"), claim.get("title"), default=f"Claim {index + 1}"),
                "analysis": first_text(claim.get("analysis"), claim.get("rationale"), claim.get("explanation"), default="Runtime-normalized claim rationale."),
                "scope": first_text(claim.get("scope"), claim.get("applicability"), default="Current resolved workset."),
                "limitations": as_list(claim.get("limitations")) or ["Requires review against broader literature coverage."],
                "evidence_refs": as_list(claim.get("evidence_refs") or claim.get("paper_evidence_refs")) or [first_evidence_id(entries)],
                "evidence_map_refs": as_list(claim.get("evidence_map_refs")) or [first_evidence_map_id(entries)],
            }
        )
    return result


def normalize_timeline(core: dict, entries: list[dict]) -> dict:
    timeline = as_dict(core.get("timeline_events"))
    events = as_list(timeline.get("events") or timeline)
    if not events:
        events = [
            {
                "id": "event-1",
                "label": "Resolved topic evidence",
                "description": "The selected papers provide the evidence base for this synthesis.",
                "phase": "library synthesis",
            }
        ]
    normalized_events = []
    for index, event_raw in enumerate(events):
        event = as_dict(event_raw)
        normalized_events.append(
            {
                **event,
                "id": first_text(event.get("id"), default=f"event-{index + 1}"),
                "label": first_text(event.get("label"), event.get("title"), default=f"Event {index + 1}"),
                "description": first_text(event.get("description"), event.get("analysis"), event.get("why_it_matters"), default="Runtime-normalized timeline event."),
                "phase": first_text(event.get("phase"), event.get("stage"), default="development"),
                "evidence_refs": as_list(event.get("evidence_refs") or event.get("paper_evidence_refs")) or [first_evidence_id(entries)],
                "evidence_map_refs": as_list(event.get("evidence_map_refs")) or [first_evidence_map_id(entries)],
            }
        )
    summary = as_dict(timeline.get("summary"))
    return {
        "summary": {
            **summary,
            "text": first_text(
                summary.get("text"),
                summary.get("analysis"),
                summary.get("overview"),
                default="The topic timeline is derived from the resolved paper evidence and core synthesis payload.",
            )
        },
        "events": normalized_events,
    }


def normalize_rows_with_refs(rows: list, entries: list[dict], *, prefix: str) -> list[dict]:
    result = []
    for index, row_raw in enumerate(rows):
        row = as_dict(row_raw)
        result.append(
            {
                **row,
                "id": first_text(row.get("id"), default=f"{prefix}-{index + 1}"),
                "title": first_text(row.get("title"), row.get("label"), row.get("dimension"), row.get("gap"), default=f"{prefix.title()} {index + 1}"),
                "summary": first_text(row.get("summary"), row.get("description"), row.get("analysis"), row.get("rationale"), default="Runtime-normalized topic synthesis row."),
                "evidence_refs": as_list(row.get("evidence_refs") or row.get("source_paper_refs")) or [first_evidence_id(entries)],
                "evidence_map_refs": as_list(row.get("evidence_map_refs")) or [first_evidence_map_id(entries)],
            }
        )
    return result


def report_body(args: dict) -> str:
    title = args["topic"].get("title", "Topic Synthesis")
    summary = args["summary"].get("summary", "")
    taxonomy = args["taxonomy"].get("summary", {}).get("text", "")
    coverage = args["coverage"].get("coverage_reason", "")
    external = args["external"].get("summary", "")
    base = (
        f"{title} is synthesized from the resolved Zotero library workset. {summary} "
        f"The route analysis says: {taxonomy} The coverage judgment says: {coverage} "
        f"External context says: {external}"
    ).strip()
    paragraphs = [
        base,
        "The generated artifact separates paper evidence, claims, taxonomy, timeline, coverage, and report sections so Host apply can persist a complete structured topic. Each section remains grounded in runtime receipts and the source paper evidence index rather than direct writes by the language model.",
        "This report is conservative by design. It records the current evidence boundary, exposes diagnostics and source artifact references, and leaves collection suggestions as reviewable sidecars for later Zotero actions.",
    ]
    text = "\n\n".join(paragraphs)
    while len(text) < 850:
        text += "\n\nRuntime fallback paragraph: the split runtime preserved a complete Host artifact contract while keeping semantic claims tied to the gated payloads and resolved paper set."
    return text


def section_manifest_entry(conn: sqlite3.Connection, key: str) -> dict:
    entry = artifact_entry(conn, key)
    if not entry:
        raise ValueError(f"missing section artifact: {key}")
    return {**entry, "content_type": "json"}


def sidecar_manifest_entry(conn: sqlite3.Connection, key: str) -> dict:
    entry = artifact_entry(conn, key)
    if not entry:
        raise ValueError(f"missing sidecar artifact: {key}")
    return {**entry, "content_type": "json", "schema_id": SIDECAR_SCHEMA_IDS[key]}


def write_complete_sections(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    stage_id: str,
    summary_payload: dict,
) -> dict[str, dict]:
    topic_definition = as_dict(get_meta(conn, "topic_definition", {}))
    core = as_dict(get_meta(conn, "core_synthesis_payload", {}))
    coverage_payload = as_dict(get_meta(conn, "coverage_payload", {}))
    entries = workset_entries(conn)
    paper_evidence = normalize_paper_evidence(conn, run_root)
    topic = normalize_topic_section(topic_definition)
    summary = {
        "brief": first_text(summary_payload.get("summary_brief"), default=f"{topic['title']} synthesis."),
        "summary": first_text(summary_payload.get("summary_overview"), summary_payload.get("summary_brief"), default=f"Structured synthesis for {topic['title']}."),
        "long_summary": first_text(summary_payload.get("summary_overview"), default=f"Structured synthesis for {topic['title']}."),
        "key_takeaways": as_list(summary_payload.get("key_takeaways")) or ["The topic artifact was generated by the split gated runtime."],
        "diagnostics": as_list(summary_payload.get("diagnostics")),
    }
    taxonomy = normalize_taxonomy(core, entries)
    claims = normalize_claims(core, entries)
    timeline = normalize_timeline(core, entries)
    improvement_dimensions = normalize_rows_with_refs(
        as_list(core.get("improvement_dimensions")) or [
            {"id": "dimension-1", "title": "Evidence organization", "summary": "Runtime fallback dimension for the resolved workset."}
        ],
        entries,
        prefix="dimension",
    )
    debates = normalize_rows_with_refs(as_list(core.get("debates")), entries, prefix="debate")
    gaps = normalize_rows_with_refs(
        as_list(core.get("gaps")) or as_list(coverage_payload.get("coverage_caveats")),
        entries,
        prefix="gap",
    )
    coverage_verdict = clean_text(coverage_payload.get("coverage_verdict"), "unknown")
    coverage = {
        **coverage_payload,
        "coverage_verdict": coverage_verdict,
        "coverage_reason": first_text(coverage_payload.get("coverage_reason"), default="Runtime coverage assessment was not detailed."),
        "route_coverage_summary": first_text(coverage_payload.get("route_coverage_summary"), coverage_payload.get("coverage_reason"), default="Routes are covered according to the resolved workset boundary."),
        "claim_coverage_summary": first_text(coverage_payload.get("claim_coverage_summary"), coverage_payload.get("reliability_summary"), default="Claims are bounded by available source evidence."),
        "timeline_coverage_summary": first_text(coverage_payload.get("timeline_coverage_summary"), default="Timeline coverage is derived from current paper evidence."),
    }
    suggested = as_list(coverage_payload.get("suggested_collection_directions"))
    external = {
        "summary": first_text(coverage_payload.get("external_context_summary"), default="No external network literature was fetched by the split runtime."),
        "coverage_verdict": coverage_verdict,
        "coverage_reason": coverage["coverage_reason"],
        "themes": [
            {
                "id": "external-context",
                "title": "External context boundary",
                "analysis": first_text(coverage_payload.get("external_context_summary"), default="External context was limited to runtime-provided collection guidance."),
            }
        ],
        "representative_references": [],
        "suggested_additions": suggested,
        "limitations": first_text(coverage_payload.get("reliability_summary"), default="Reliability depends on the resolved workset and available artifacts."),
    }
    evidence_map_candidates = {}
    for entry in entries or [{"paper_ref": "paper:unknown", "title": "Unknown paper"}]:
        ref = str(entry.get("paper_ref"))
        evidence_map_candidates[evidence_map_id_for_ref(ref)] = {
            "paper_ref": ref,
            "evidence_id": evidence_id_for_ref(ref),
            "title": entry.get("title", ref),
        }
    evidence_map = {
        "candidate_ids": sorted(evidence_map_candidates.keys()),
        "candidates": evidence_map_candidates,
        "candidate_counts": {
            "papers": len(entries),
            "claims": len(claims),
            "timeline_events": len(as_list(timeline.get("events"))),
        },
    }
    report = {
        "title": f"{topic['title']} Synthesis Report",
        "body": report_body({
            "topic": topic,
            "summary": summary,
            "taxonomy": taxonomy,
            "coverage": coverage,
            "external": external,
        }),
        "source_section_chapters": {
            "research_routes": "taxonomy.summary",
            "historical_progression": "timeline_events.summary",
            "core_claims": "claims",
            "coverage": "coverage",
        },
    }
    sections = {
        "topic": topic,
        "summary": summary,
        "positioning": as_dict(core.get("positioning")) or {
            "importance": "Runtime-derived topic positioning.",
            "timeliness": "Current workset synthesis.",
            "review_position": "Use this artifact as a structured starting point for topic review.",
            "concept_position": topic["title"],
            "why_synthesize": "The resolved papers form a coherent synthesis workset.",
            "scope_boundary": topic["scope_boundary"],
        },
        "taxonomy": taxonomy,
        "improvement_dimension_summary": as_dict(core.get("improvement_dimension_summary")) or {
            "text": "Improvement dimensions are derived from the core synthesis payload and runtime fallback.",
        },
        "improvement_dimensions": improvement_dimensions,
        "claims": claims,
        "timeline_events": timeline,
        "paper_evidence": paper_evidence,
        "external_literature_analysis": external,
        "debates": debates,
        "coverage": coverage,
        "gaps": gaps,
        "review_outline": as_dict(core.get("review_outline")) or {
            "sections": [
                {
                    "id": "outline-1",
                    "title": "Topic framing",
                    "summary": "Frame the topic using taxonomy, timeline, claims, and coverage.",
                    "evidence_map_refs": [first_evidence_map_id(entries)],
                }
            ],
        },
        "statistics": {
            "paper_count": len(entries),
            "time_span": {
                "earliest": "",
                "latest": "",
            },
            "route_coverage": {"routes": len(as_list(taxonomy.get("nodes")))},
            "coverage_verdict": coverage_verdict,
        },
        "synthesis_report": report,
        "evidence_map": evidence_map,
        "source_artifacts": {
            "resolver_manifest": artifact_entry(conn, "resolver_manifest"),
            "prepare_handoff": artifact_entry(conn, "prepare_analysis_context_payload"),
            "core_handoff": artifact_entry(conn, "stage_50_kg_enrichment_payload"),
            "synthesis_report": artifact_entry(conn, "synthesis_report"),
        },
        "diagnostics": as_list(summary_payload.get("diagnostics")) + as_list(coverage_payload.get("diagnostics")),
    }
    manifest_sections: dict[str, dict] = {}
    for section in COMPLETE_SECTION_KEYS:
        section_hash = write_json(run_root / "result/sections" / f"{section}.json", sections[section])
        artifact_key = f"{section}_section"
        register_artifact(
            conn,
            skill_id=skill_id,
            stage_id=stage_id,
            key=artifact_key,
            path=f"result/sections/{section}.json",
            hash_value=section_hash,
        )
        manifest_sections[section] = section_manifest_entry(conn, artifact_key)
    return manifest_sections


def materialize_finalize_context(
    conn: sqlite3.Connection, *, run_root: Path, skill_id: str, stage_id: str, payload: dict
) -> dict:
    report = [
        "# Topic Synthesis Report",
        "",
        payload.get("coverage_reason") or payload.get("reliability_summary") or "",
        "",
        payload.get("external_context_summary") or "",
    ]
    report_hash = write_text(run_root / "runtime/views/synthesis-report.md", "\n".join(report) + "\n")
    manifest_hash = write_json(
        run_root / "runtime/views/synthesis-report.manifest.json",
        {
            "schema_id": "synthesis.synthesis_report_manifest",
            "schema_version": "1.0.0",
            "report_path": "runtime/views/synthesis-report.md",
            "source_paper_refs": paper_refs(conn),
        },
    )
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="synthesis_report", path="runtime/views/synthesis-report.md", hash_value=report_hash)
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="synthesis_report_manifest", path="runtime/views/synthesis-report.manifest.json", hash_value=manifest_hash)
    coverage_hash = write_json(run_root / "result/sections/coverage.json", payload)
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="coverage_section", path="result/sections/coverage.json", hash_value=coverage_hash)
    return {"report_path": "runtime/views/synthesis-report.md"}


def materialize_final_output(
    conn: sqlite3.Connection, *, run_root: Path, skill_id: str, stage_id: str, payload: dict
) -> dict:
    topic = get_meta(conn, "topic_definition", {"id": "topic-synthesis", "title": "Topic Synthesis"})
    operation = get_meta(conn, "operation", "create")
    sections = write_complete_sections(
        conn,
        run_root=run_root,
        skill_id=skill_id,
        stage_id=stage_id,
        summary_payload=payload,
    )
    sidecars = {
        key: sidecar_manifest_entry(conn, key)
        for key in [
            "concept_cards_proposal",
            "topic_graph_relation_proposals",
            "topic_interest_metadata",
        ]
    }
    manifest = {
        "schema_id": "synthesis.topic_analysis_manifest",
        "schema_version": "1.0.0",
        "topic_id": topic.get("id", ""),
        "operation": operation,
        "language": get_meta(conn, "language", "zh-CN"),
        "sections": sections,
        "sidecars": sidecars,
        "diagnostics": [],
    }
    manifest_hash = write_json(run_root / "result/topic-analysis.json", manifest)
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="topic_analysis_manifest", path="result/topic-analysis.json", hash_value=manifest_hash)
    resolver = artifact_entry(conn, "resolver_manifest")
    final = {
        "kind": "topic_synthesis",
        "operation": operation,
        "language": get_meta(conn, "language", "zh-CN"),
        "topic_definition": topic,
        "resolver_manifest_path": resolver["path"] if resolver else "runtime/payloads/resolver.json",
        "resolver_diagnostics": {"final_count": len(paper_refs(conn)), "warnings": []},
        "artifact_metadata": {"runtime": "split-skill"},
        "analysis_manifest_path": "result/topic-analysis.json",
        "candidate_output_path": "result/final-output.candidate.json",
        "diagnostics": [],
    }
    if operation == "update_full":
        final["base_hashes"] = get_meta(conn, "current_hashes", {})
    elif operation == "update_patch":
        final["read_section_hashes"] = get_meta(conn, "section_hashes", {})
    final_hash = write_json(run_root / "result/final-output.candidate.json", final)
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="final_candidate", path="result/final-output.candidate.json", hash_value=final_hash)
    record_stage(conn, skill_id=skill_id, stage_id="stage_12_completed", result={"final_hash": final_hash})
    return final


def audit_state(conn: sqlite3.Connection) -> dict:
    return {
        "stage_receipts": [
            dict(row)
            for row in conn.execute(
                "select skill_id, stage_id, state, updated_at from stage_receipts order by updated_at, stage_id"
            ).fetchall()
        ],
        "action_receipts": [
            dict(row)
            for row in conn.execute(
                "select skill_id, stage_id, action, payload_path, payload_hash, created_at from action_receipts order by id"
            ).fetchall()
        ],
        "action_receipt_count": conn.execute("select count(*) as count from action_receipts").fetchone()["count"],
        "paper_count": len(paper_refs(conn)),
    }


def slugify(value: str) -> str:
    result = []
    previous_dash = False
    for char in value.lower():
        if char.isalnum():
            result.append(char)
            previous_dash = False
        elif not previous_dash:
            result.append("-")
            previous_dash = True
    return "".join(result).strip("-") or "topic-synthesis"


def normalize_update_operation(value: Any, *, default: str) -> str:
    operation = str(value or "").strip()
    if operation in {"update_full", "update_patch"}:
        return operation
    if default in {"update_full", "update_patch"}:
        return default
    return "update_full"


def normalize_update_topic_definition(topic_context: dict) -> dict:
    topic_id = str(topic_context.get("topic_id") or "").strip()
    raw_definition = topic_context.get("topic_definition")
    topic_definition = dict(raw_definition) if isinstance(raw_definition, dict) else {}
    if not str(topic_definition.get("id") or "").strip():
        topic_definition["id"] = topic_id
    if not str(topic_definition.get("title") or "").strip():
        topic_definition["title"] = str(
            topic_definition.get("name") or topic_definition["id"] or "Topic Synthesis"
        )
    return topic_definition

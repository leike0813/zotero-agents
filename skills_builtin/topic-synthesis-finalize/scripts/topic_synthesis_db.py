from __future__ import annotations

import json
import os
import re
import sqlite3
import subprocess
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any


DB_RELATIVE_PATH = Path("runtime/topic-synthesis.sqlite")

TAXONOMY_AXIS_TYPES = {
    "problem_formulation",
    "technical_mechanism",
    "evidence_scope",
    "research_route",
    "application_context",
}
DEFAULT_TAXONOMY_AXIS_TYPE = "research_route"

COMPLETE_SECTION_KEYS = [
    "topic",
    "summary",
    "taxonomy",
    "improvement_dimensions",
    "claims",
    "timeline_events",
    "source_papers",
    "debates",
    "coverage",
    "future_directions",
    "review_outline",
    "statistics",
    "synthesis_report",
    "source_artifacts",
    "diagnostics",
]

SIDECAR_SCHEMA_IDS = {
    "topic_interest_metadata": "topic_interest_metadata.v1",
    "concept_cards_proposal": "synthesis.concept_cards_proposal",
    "topic_graph_relation_proposals": "synthesis.topic_graph_relation_proposals",
    "prospective_topic_relation_proposals": "synthesis.prospective_topic_relation_proposals",
}

ARTIFACT_PATHS = {
    "resolver_manifest": "runtime/payloads/resolver.json",
    "citation_graph_metrics_batch_1": "runtime/payloads/citation-graph-metrics-batch-1.json",
    "paper_artifacts_manifest_batch_1": "runtime/payloads/paper-artifacts-manifest-batch-1.json",
    "update_audit_report": "runtime/payloads/update-audit-report.json",
    "updated_resolve_result": "runtime/payloads/updated-resolve-result.json",
    "cross_paper_context": "runtime/views/cross-paper-context.md",
    "external_literature_context": "runtime/views/external-literature-context.md",
    "cross_paper_context_manifest": "runtime/views/cross-paper-context.manifest.json",
    "source_paper_evidence_index": "runtime/views/source-paper-evidence-index.json",
    "concept_candidate_context": "runtime/views/concept-candidate-context.json",
    "concept_cards_proposal": "result/sidecars/concept-cards-proposal.json",
    "topic_graph_relation_proposals": "result/sidecars/topic-graph-relation-proposals.json",
    "prospective_topic_relation_proposals": "result/sidecars/prospective-topic-relation-proposals.json",
    "topic_interest_metadata": "result/sidecars/topic-interest-metadata.json",
    "finalize_context_manifest": "runtime/views/finalize-context.manifest.json",
    "coverage_section": "result/sections/coverage.json",
    "topic_analysis_manifest": "result/topic-analysis.json",
    "final_candidate": "result/final-output.candidate.json",
}

for _section_key in COMPLETE_SECTION_KEYS:
    ARTIFACT_PATHS[f"{_section_key}_section"] = f"result/sections/{_section_key}.json"

for _stage_id, _path in [
    ("stage_10_create_topic_context", "runtime/payloads/create-topic-context.json"),
    ("stage_10_update_topic_context", "runtime/payloads/update-topic-context.json"),
    ("stage_20_resolver_and_workset", "runtime/payloads/resolver-and-workset.json"),
    ("stage_30_prepare_analysis_context", "runtime/payloads/prepare-analysis-context.json"),
    ("stage_40_core_synthesis", "runtime/payloads/core-synthesis.json"),
    ("stage_50_kg_enrichment", "runtime/payloads/kg-enrichment.json"),
    ("stage_60_coverage_and_collection_suggestions", "runtime/payloads/coverage-and-collection-suggestions.json"),
    ("stage_70_summary", "runtime/payloads/summary.json"),
]:
    ARTIFACT_PATHS[f"{_stage_id}_payload"] = _path

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
                "required_reads": ["<zotero-bridge> topics list --input '{}'"],
            },
            {
                "id": "stage_20_resolver_and_workset",
                "kind": "payload",
                "task": "编写 resolver proposal；runtime 会执行 resolver、图谱指标和 artifact export。",
                "schema": "stage-20-resolver-and-workset.schema.json",
                "payload_path": "runtime/payloads/resolver-and-workset.json",
                "required_reads": [
                    "<zotero-bridge> library-index get --input '{\"cursor\":0,\"limit\":200}'"
                ],
            },
            {
                "id": "stage_30_prepare_analysis_context",
                "kind": "payload",
                "task": "为已解析的文献工作集编写轻量 paper triage 判断。",
                "schema": "stage-30-prepare-analysis-context.schema.json",
                "payload_path": "runtime/payloads/prepare-analysis-context.json",
                "required_reads": [
                    "runtime/payloads/paper-artifacts-manifest-batch-1.json",
                    "runtime/payloads/artifacts/",
                ],
                "hard_rules": [
                    "paper triage 必须由 LLM 逐篇阅读 runtime 导出的 paper artifacts 后手写判断；不得编写或运行脚本来批量抽取、归纳、评分或生成 assessments。",
                    "脚本只能执行 gate 返回的 runtime command；Stage 30 payload 的 relevance、quality、core_digest 和 caveats 必须来自 LLM 对单篇材料的判断。",
                ],
                "subagent_delegation": {
                    "recommendation": "当 workset 包含多篇文献且执行环境支持 subagent 时，推荐把 paper triage 按 paper_ref 分批委派给 subagent；每个 subagent 只处理分配到的单篇或少量文献，主 agent 负责汇总为一个 assessments payload。",
                    "constraints": [
                        "每个 subagent 只能读取分配给它的 paper artifact 和当前 topic context，不做跨文献综合。",
                        "subagent 只返回 assessment row 草案，不写文件、不运行脚本、不调用 gate。",
                        "主 agent 必须检查每个 row 的 paper_ref、枚举值、理由和 core_digest，再写入 runtime/payloads/prepare-analysis-context.json。",
                    ],
                    "prompt": "你是 topic synthesis Stage 30 的 paper triage subagent。请只处理分配给你的 paper_ref 和对应 artifact 内容。逐篇阅读 digest、references 和 citation-analysis；只判断该 paper 与当前 topic 的关系；不做跨文献综合；不编写或运行脚本；不写文件；不调用 gate。只返回 JSON 数组，每个对象包含 paper_ref、relevance_level、relevance_reason、paper_quality_level、paper_quality_reason、core_digest 和 caveats。",
                },
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
                "task": "基于 runtime 预审报告决定是否继续更新；继续时提交只增不改的 resolver proposal。",
                "schema": "stage-10-update-topic-context.schema.json",
                "payload_path": "runtime/payloads/update-topic-context.json",
                "required_reads": [
                    "runtime/payloads/update-audit-report.json",
                    "<zotero-bridge> library-index get --input '{\"cursor\":0,\"limit\":200}'"
                ],
            },
            {
                "id": "stage_30_prepare_analysis_context",
                "kind": "payload",
                "task": "为已解析的文献工作集编写轻量 paper triage 判断。",
                "schema": "stage-30-prepare-analysis-context.schema.json",
                "payload_path": "runtime/payloads/prepare-analysis-context.json",
                "required_reads": [
                    "runtime/payloads/paper-artifacts-manifest-batch-1.json",
                    "runtime/payloads/artifacts/",
                ],
                "hard_rules": [
                    "paper triage 必须由 LLM 逐篇阅读 runtime 导出的 paper artifacts 后手写判断；不得编写或运行脚本来批量抽取、归纳、评分或生成 assessments。",
                    "脚本只能执行 gate 返回的 runtime command；Stage 30 payload 的 relevance、quality、core_digest 和 caveats 必须来自 LLM 对单篇材料的判断。",
                ],
                "subagent_delegation": {
                    "recommendation": "当 workset 包含多篇文献且执行环境支持 subagent 时，推荐把 paper triage 按 paper_ref 分批委派给 subagent；每个 subagent 只处理分配到的单篇或少量文献，主 agent 负责汇总为一个 assessments payload。",
                    "constraints": [
                        "每个 subagent 只能读取分配给它的 paper artifact 和当前 topic context，不做跨文献综合。",
                        "subagent 只返回 assessment row 草案，不写文件、不运行脚本、不调用 gate。",
                        "主 agent 必须检查每个 row 的 paper_ref、枚举值、理由和 core_digest，再写入 runtime/payloads/prepare-analysis-context.json。",
                    ],
                    "prompt": "你是 topic synthesis Stage 30 的 paper triage subagent。请只处理分配给你的 paper_ref 和对应 artifact 内容。逐篇阅读 digest、references 和 citation-analysis；只判断该 paper 与当前 topic 的关系；不做跨文献综合；不编写或运行脚本；不写文件；不调用 gate。只返回 JSON 数组，每个对象包含 paper_ref、relevance_level、relevance_reason、paper_quality_level、paper_quality_reason、core_digest 和 caveats。",
                },
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
                "task": "编写 taxonomy、timeline、claims、dimensions、debates、future directions、review writing strategies 和 concept labels。",
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
                "task": "基于 core handoff、coverage payload 和 finalize context 编写最终 summary。",
                "schema": "stage-70-summary.schema.json",
                "payload_path": "runtime/payloads/summary.json",
                "required_reads": [
                    "runtime/handoff/core-enrichment.json",
                    "runtime/payloads/coverage-and-collection-suggestions.json",
                    "runtime/views/finalize-context.manifest.json",
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
        create table if not exists stage_state (
          stage_id text primary key,
          skill_id text not null,
          state text not null,
          result_json text not null,
          updated_at text not null
        );
        create table if not exists handoff_registry (
          handoff_key text primary key,
          manifest_path text not null,
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


def load_initial_input(
    run_root: Path,
    input_path: str | None = None,
    *,
    skill_id: str = "",
) -> dict:
    candidates: list[Path] = []
    if input_path:
        candidates.append(resolve_run_path(run_root, input_path))
    candidates.append(run_root / "runtime/input.json")

    audit_root = run_root / ".audit"
    if skill_id:
        candidates.extend(sorted(audit_root.glob(f"{skill_id}*/input_manifest.json")))
    candidates.extend(sorted(audit_root.glob("*/input_manifest.json")))

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        if candidate.exists() and candidate.is_file():
            loaded = read_json(candidate)
            return loaded if isinstance(loaded, dict) else {}
    return {}


def topic_id_from_input(input_data: dict) -> str:
    def pick(source: Any) -> str:
        if not isinstance(source, dict):
            return ""
        for key in ("topicId", "topic_id", "topic"):
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    direct = pick(input_data)
    if direct:
        return direct

    for key in ("parameter", "parameters", "input", "payload"):
        value = pick(input_data.get(key))
        if value:
            return value

    request = input_data.get("request")
    if isinstance(request, dict):
        for key in ("parameter", "parameters", "input", "payload"):
            value = pick(request.get(key))
            if value:
                return value
    return ""


def write_canceled_output(
    conn: sqlite3.Connection,
    run_root: Path,
    *,
    reason: str,
    message: str,
    topic_id: str = "",
) -> dict:
    canceled: dict[str, Any] = {
        "__SKILL_DONE__": True,
        "kind": "topic_synthesis_canceled",
        "status": "canceled",
        "reason": reason,
        "message": message,
    }
    if topic_id:
        canceled["topic_id"] = topic_id
    write_json(run_root / "result/topic-synthesis-canceled.json", canceled)
    set_meta(conn, "canceled_output", canceled)
    return canceled


def completed_stages(conn: sqlite3.Connection, skill_id: str) -> set[str]:
    rows = conn.execute(
        "select stage_id from stage_state where skill_id = ? and state = 'completed'",
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
        insert into stage_state (stage_id, skill_id, state, result_json, updated_at)
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
    result: dict,
) -> None:
    return None


def register_artifact(
    conn: sqlite3.Connection,
    *,
    skill_id: str,
    stage_id: str,
    key: str,
    path: str,
    hash_value: str,
) -> None:
    ARTIFACT_PATHS[key] = path
    return None


def artifact_entry(conn: sqlite3.Connection, key: str) -> dict | None:
    path = ARTIFACT_PATHS.get(key)
    if not path:
        return None
    return {"path": path}


def current_stage(conn: sqlite3.Connection, skill_id: str) -> dict[str, Any] | None:
    if get_meta(conn, "canceled_output"):
        return None
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
        if stage["id"] == "stage_30_prepare_analysis_context":
            result["triage_required_refs"] = get_meta(conn, "triage_required_refs", [])
            result["triage_mode"] = get_meta(conn, "triage_mode", "full")
    if stage.get("hard_rules"):
        result["hard_rules"] = stage["hard_rules"]
    if stage.get("subagent_delegation"):
        result["subagent_delegation"] = stage["subagent_delegation"]
    return result


def write_gate_transcript(run_root: Path, instruction: dict) -> None:
    return None


def write_action_transcript(run_root: Path, stage_id: str, action: str, result: dict) -> None:
    return None


def build_current_instruction(
    *,
    skill_root: Path,
    db_path: str,
    input_path: str | None = None,
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
    write_gate_transcript(run_root, instruction)
    return instruction


def read_payload(run_root: Path, payload_path: str | Path) -> tuple[dict, Path]:
    path = resolve_run_path(run_root, payload_path)
    payload = read_json(path)
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    return payload, path


def load_schema(skill_root: Path, schema_name: str) -> dict:
    return read_json(skill_root / "assets" / "schemas" / schema_name)


def schema_type_matches(value: Any, expected: str) -> bool:
    if expected == "object":
        return isinstance(value, dict)
    if expected == "array":
        return isinstance(value, list)
    if expected == "string":
        return isinstance(value, str)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "null":
        return value is None
    return True


def resolve_schema_ref(root_schema: dict, ref: str) -> dict:
    if not ref.startswith("#/"):
        raise ValueError(f"unsupported schema ref: {ref}")
    current: Any = root_schema
    for part in ref[2:].split("/"):
        key = part.replace("~1", "/").replace("~0", "~")
        if not isinstance(current, dict) or key not in current:
            raise ValueError(f"schema ref not found: {ref}")
        current = current[key]
    if not isinstance(current, dict):
        raise ValueError(f"schema ref does not resolve to object: {ref}")
    return current


def json_path(parent: str, key: str | int) -> str:
    if isinstance(key, int):
        return f"{parent}[{key}]"
    if parent == "$":
        return f"$.{key}"
    return f"{parent}.{key}"


def validate_schema_node(value: Any, schema: dict, root_schema: dict, path: str, errors: list[str]) -> None:
    ref = schema.get("$ref")
    if isinstance(ref, str):
        validate_schema_node(value, resolve_schema_ref(root_schema, ref), root_schema, path, errors)
        return

    if "anyOf" in schema:
        options = schema.get("anyOf")
        if isinstance(options, list):
            matched = False
            for option in options:
                if not isinstance(option, dict):
                    continue
                trial_errors: list[str] = []
                validate_schema_node(value, option, root_schema, path, trial_errors)
                if not trial_errors:
                    matched = True
                    break
            if not matched:
                errors.append(f"{path} must match at least one allowed schema")

    expected_type = schema.get("type")
    if isinstance(expected_type, list):
        if not any(schema_type_matches(value, item) for item in expected_type if isinstance(item, str)):
            errors.append(f"{path} must be one of types: {', '.join(str(item) for item in expected_type)}")
            return
    elif isinstance(expected_type, str):
        if not schema_type_matches(value, expected_type):
            errors.append(f"{path} must be {expected_type}")
            return

    if "enum" in schema:
        allowed = schema.get("enum")
        if isinstance(allowed, list) and value not in allowed:
            errors.append(f"{path} must be one of: {', '.join(str(item) for item in allowed)}")

    if isinstance(value, str):
        min_length = schema.get("minLength")
        if isinstance(min_length, int) and len(value) < min_length:
            errors.append(f"{path} must contain at least {min_length} characters")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if isinstance(minimum, (int, float)) and value < minimum:
            errors.append(f"{path} must be >= {minimum}")
        if isinstance(maximum, (int, float)) and value > maximum:
            errors.append(f"{path} must be <= {maximum}")

    if isinstance(value, list):
        min_items = schema.get("minItems")
        if isinstance(min_items, int) and len(value) < min_items:
            errors.append(f"{path} must contain at least {min_items} items")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                validate_schema_node(item, item_schema, root_schema, json_path(path, index), errors)

    if isinstance(value, dict):
        properties = schema.get("properties") if isinstance(schema.get("properties"), dict) else {}
        required = schema.get("required", [])
        if isinstance(required, list):
            for key in required:
                if isinstance(key, str) and key not in value:
                    errors.append(f"{json_path(path, key)} is required")
        if schema.get("additionalProperties") is False:
            extra = [key for key in value.keys() if key not in properties]
            for key in extra:
                errors.append(f"{json_path(path, str(key))} is not allowed")
        for key, child_schema in properties.items():
            if key in value and isinstance(child_schema, dict):
                validate_schema_node(value[key], child_schema, root_schema, json_path(path, key), errors)


def validate_payload_against_schema(payload: dict, schema: dict) -> None:
    errors: list[str] = []
    validate_schema_node(payload, schema, schema, "$", errors)
    if errors:
        raise ValueError("payload schema validation failed: " + "; ".join(errors))


def validate_stage_payload(conn: sqlite3.Connection, stage_id: str, payload: dict) -> None:
    if stage_id == "stage_10_update_topic_context":
        validate_update_topic_context_payload(payload)
    elif stage_id == "stage_20_resolver_and_workset":
        validate_resolver_payload(conn, payload)
    elif stage_id == "stage_30_prepare_analysis_context":
        validate_prepare_triage_payload(conn, payload)
    elif stage_id == "stage_40_core_synthesis":
        validate_core_synthesis_source_refs(conn, payload)
        validate_core_synthesis_apply_fields(payload)
    elif stage_id == "stage_50_kg_enrichment":
        validate_kg_enrichment_runtime_refs(conn, payload)
    elif stage_id == "stage_60_coverage_and_collection_suggestions":
        validate_coverage_payload(payload)
    elif stage_id == "stage_70_summary":
        validate_summary_payload(payload)


def update_full_base_hashes(current_hashes: dict) -> dict:
    required = ("artifact", "manifest", "metadata")
    return {
        key: clean_text(current_hashes.get(key))
        for key in required
    }


def validate_update_topic_context_payload(payload: dict) -> None:
    decision = payload.get("update_decision") if isinstance(payload.get("update_decision"), dict) else {}
    action = clean_text(decision.get("action"))
    if action == "cancel":
        return
    if action != "continue":
        raise ValueError("update_decision.action must be cancel or continue")
    resolver = payload.get("resolver") if isinstance(payload.get("resolver"), dict) else {}
    if not resolver:
        raise ValueError("continue update requires resolver")
    if not clean_text(payload.get("resolver_reasoning")):
        raise ValueError("continue update requires resolver_reasoning")


def validate_resolver_payload(conn: sqlite3.Connection, payload: dict) -> None:
    operation = get_meta(conn, "operation", "create")
    intent = clean_text(payload.get("operation_intent"))
    if operation == "create" and intent not in {"create", "unknown"}:
        raise ValueError(f"operation_intent {intent} is not compatible with create")
    if operation == "update_full" and intent not in {operation, "unknown"}:
        raise ValueError(f"operation_intent {intent} is not compatible with {operation}")


def validate_prepare_triage_payload(conn: sqlite3.Connection, payload: dict) -> None:
    known_refs = set(paper_refs(conn))
    required_refs = set(get_meta(conn, "triage_required_refs", paper_refs(conn)))
    seen: set[str] = set()
    for entry in payload_entries(payload):
        paper_ref = clean_text(entry.get("paper_ref"))
        if paper_ref in seen:
            raise ValueError(f"paper triage contains duplicate paper_ref: {paper_ref}")
        seen.add(paper_ref)
        if paper_ref and paper_ref not in known_refs:
            raise ValueError(f"paper triage references unknown paper: {paper_ref}")
        if paper_ref and paper_ref not in required_refs:
            raise ValueError(f"paper triage was not requested for paper: {paper_ref}")
    missing = sorted(required_refs - seen)
    if missing:
        raise ValueError("paper triage missing required paper_ref: " + ", ".join(missing))


def validate_core_synthesis_source_refs(conn: sqlite3.Connection, payload: dict) -> None:
    known_refs = set(paper_refs(conn))
    if not known_refs:
        raise ValueError("stage_40_core_synthesis requires a resolved paper workset before submit")
    taxonomy = payload.get("taxonomy") if isinstance(payload.get("taxonomy"), dict) else {}
    nodes = taxonomy_axis_nodes(taxonomy)
    if not nodes:
        raise ValueError("taxonomy.axes must contain at least one research route")
    errors: list[str] = []

    def label_for(row: dict, fallback: str) -> str:
        for key in ("id", "title", "label", "name"):
            text = str(row.get(key) or "").strip()
            if text:
                return text
        return fallback

    def validate_rows(rows: Any, label: str) -> None:
        if not isinstance(rows, list):
            return
        for index, row_raw in enumerate(rows):
            row = row_raw if isinstance(row_raw, dict) else {}
            row_label = label_for(row, f"{label}-{index + 1}")
            refs_raw = row.get("source_paper_refs")
            refs = [
                str(ref or "").strip()
                for ref in refs_raw
            ] if isinstance(refs_raw, list) else []
            refs = [ref for ref in refs if ref]
            if not refs:
                errors.append(f"{label} {row_label} requires source_paper_refs")
                continue
            unknown = [ref for ref in refs if ref not in known_refs]
            if unknown:
                errors.append(
                    f"{label} {row_label} references unknown source_paper_refs: {', '.join(unknown)}"
                )

    validate_rows(nodes, "taxonomy route")
    timeline = payload.get("timeline_events") if isinstance(payload.get("timeline_events"), dict) else {}
    validate_rows(timeline.get("events"), "timeline event")
    validate_rows(payload.get("claims"), "claim")
    validate_rows(payload.get("improvement_dimensions"), "improvement dimension")
    validate_rows(payload.get("debates"), "debate")
    validate_rows(payload.get("future_directions"), "future direction")
    review_outline = payload.get("review_outline") if isinstance(payload.get("review_outline"), dict) else {}
    strategies = as_list(review_outline.get("writing_strategies"))
    strategy_ids = [clean_text(row.get("id")) for row in strategies if isinstance(row, dict)]
    recommended = clean_text(review_outline.get("recommended_strategy_id"))
    if recommended and recommended not in strategy_ids:
        errors.append(f"review_outline.recommended_strategy_id references unknown strategy: {recommended}")
    validate_rows(strategies, "review strategy")
    allowed_direction_types = {
        "method_limitation",
        "evaluation_gap",
        "data_or_benchmark_need",
        "application_extension",
        "theory_or_mechanism_question",
        "integration_opportunity",
    }
    for index, row_raw in enumerate(as_list(payload.get("future_directions"))):
        row = as_dict(row_raw)
        row_label = label_for(row, f"future direction-{index + 1}")
        for key in ("id", "title", "current_limitation", "future_direction", "rationale"):
            if not clean_text(row.get(key)):
                errors.append(f"future direction {row_label} requires {key}")
        direction_type = clean_text(row.get("direction_type"))
        if direction_type not in allowed_direction_types:
            errors.append(f"future direction {row_label} has invalid direction_type: {direction_type}")
    if errors:
        raise ValueError("; ".join(errors))


def taxonomy_axis_nodes(taxonomy: dict) -> list:
    axes = taxonomy.get("axes") if isinstance(taxonomy.get("axes"), list) else []
    nodes: list = []
    for axis_raw in axes:
        axis = axis_raw if isinstance(axis_raw, dict) else {}
        axis_nodes = axis.get("nodes") if isinstance(axis.get("nodes"), list) else []
        nodes.extend(axis_nodes)
    if nodes:
        return nodes
    return taxonomy.get("nodes") if isinstance(taxonomy.get("nodes"), list) else []


def has_text(value: Any) -> bool:
    return bool(clean_text(value))


def row_label(row: dict, fallback: str) -> str:
    for key in ("id", "title", "label", "name", "text"):
        text = clean_text(row.get(key))
        if text:
            return text
    return fallback


def require_any_text(row: dict, keys: list[str], label: str, errors: list[str]) -> None:
    if not any(has_text(row.get(key)) for key in keys):
        errors.append(f"{label} requires {'/'.join(keys)}")


def require_nonempty_list(row: dict, keys: list[str], label: str, errors: list[str]) -> None:
    if not any(isinstance(row.get(key), list) and len(row.get(key)) > 0 for key in keys):
        errors.append(f"{label} requires {'/'.join(keys)}")


def validate_core_synthesis_apply_fields(payload: dict) -> None:
    errors: list[str] = []
    taxonomy = payload.get("taxonomy") if isinstance(payload.get("taxonomy"), dict) else {}
    summary = taxonomy.get("summary") if isinstance(taxonomy.get("summary"), dict) else {}
    if not any(has_text(summary.get(key)) for key in ("text", "analysis", "overview")):
        errors.append("taxonomy.summary requires text/analysis/overview")

    def validate_taxonomy_node(node_raw: Any, index: int, label_prefix: str) -> None:
        node = node_raw if isinstance(node_raw, dict) else {}
        label = label_prefix + row_label(node, f"route-{index + 1}")
        require_any_text(node, ["definition", "route_definition", "description"], label, errors)
        require_any_text(node, ["core_problem", "problem", "target_problem"], label, errors)
        require_any_text(node, ["mechanism", "technical_mechanism", "core_mechanism"], label, errors)
        require_nonempty_list(node, ["strengths", "advantages"], label, errors)
        require_nonempty_list(node, ["limitations", "weaknesses"], label, errors)
        require_any_text(node, ["maturity", "status", "development_stage"], label, errors)

    axes = taxonomy.get("axes") if isinstance(taxonomy.get("axes"), list) else []
    if len(axes) < 2 or len(axes) > 5:
        errors.append("taxonomy.axes must contain 2-5 classification axes")
    for axis_index, axis_raw in enumerate(axes):
        axis = axis_raw if isinstance(axis_raw, dict) else {}
        axis_type = clean_text(axis.get("axis_type"))
        if axis_type not in TAXONOMY_AXIS_TYPES:
            errors.append(f"taxonomy axis {axis_index + 1} has invalid axis_type: {axis_type}")
        nodes = axis.get("nodes") if isinstance(axis.get("nodes"), list) else []
        if not nodes:
            errors.append(f"taxonomy axis {axis_type or axis_index + 1} requires nodes")
        for index, node_raw in enumerate(nodes):
            validate_taxonomy_node(
                node_raw,
                index,
                f"taxonomy axis {axis_type or axis_index + 1} route ",
            )

    timeline = payload.get("timeline_events") if isinstance(payload.get("timeline_events"), dict) else {}
    timeline_summary = timeline.get("summary") if isinstance(timeline.get("summary"), dict) else {}
    if not any(has_text(timeline_summary.get(key)) for key in ("text", "analysis", "overview")):
        errors.append("timeline_events.summary requires text/analysis/overview")
    events = timeline.get("events") if isinstance(timeline.get("events"), list) else []
    if not events:
        errors.append("timeline_events.events must contain at least one event")
    for index, event_raw in enumerate(events):
        event = event_raw if isinstance(event_raw, dict) else {}
        label = "timeline event " + row_label(event, f"event-{index + 1}")
        require_any_text(event, ["description", "analysis", "why_it_matters"], label, errors)
        require_any_text(event, ["phase", "stage", "progression_logic", "follow_on_effect"], label, errors)

    claims = payload.get("claims") if isinstance(payload.get("claims"), list) else []
    if not claims:
        errors.append("claims must contain at least one claim")
    for index, claim_raw in enumerate(claims):
        claim = claim_raw if isinstance(claim_raw, dict) else {}
        label = "claim " + row_label(claim, f"claim-{index + 1}")
        require_any_text(claim, ["analysis", "rationale", "argument", "explanation"], label, errors)
        if not any(key in claim and (has_text(claim.get(key)) or isinstance(claim.get(key), list)) for key in ("limitations", "scope", "applicability")):
            errors.append(f"{label} requires limitations or scope")

    if errors:
        raise ValueError("; ".join(errors))


def validate_kg_enrichment_runtime_refs(conn: sqlite3.Connection, payload: dict) -> None:
    known_refs = set(paper_refs(conn))
    errors: list[str] = []
    for index, proposal_raw in enumerate(as_list(payload.get("existing_topic_relation_proposals"))):
        proposal = proposal_raw if isinstance(proposal_raw, dict) else {}
        refs = [clean_text(ref) for ref in as_list(proposal.get("source_paper_refs"))]
        refs = [ref for ref in refs if ref]
        if not refs:
            errors.append(f"existing_topic_relation_proposals[{index}].source_paper_refs is required")
        unknown = [ref for ref in refs if ref not in known_refs]
        if unknown:
            errors.append(
                f"existing_topic_relation_proposals[{index}] references unknown source_paper_refs: {', '.join(unknown)}"
            )
    if errors:
        raise ValueError("; ".join(errors))


def validate_coverage_payload(payload: dict) -> None:
    errors: list[str] = []
    for key in ("coverage_reason", "external_context_summary"):
        if not has_text(payload.get(key)):
            errors.append(f"{key} must not be empty")
    for index, row_raw in enumerate(as_list(payload.get("suggested_collection_directions"))):
        row = row_raw if isinstance(row_raw, dict) else {}
        for key in ("direction", "reason"):
            if not has_text(row.get(key)):
                errors.append(f"suggested_collection_directions[{index}].{key} must not be empty")
        terms = [clean_text(term) for term in as_list(row.get("example_titles_or_terms")) if clean_text(term)]
        if not terms:
            errors.append(f"suggested_collection_directions[{index}].example_titles_or_terms must not be empty")
    if errors:
        raise ValueError("; ".join(errors))


def validate_summary_payload(payload: dict) -> None:
    errors: list[str] = []
    for key in ("summary_brief", "summary_overview"):
        if not has_text(payload.get(key)):
            errors.append(f"{key} must not be empty")
    takeaways = [clean_text(item) for item in as_list(payload.get("key_takeaways")) if clean_text(item)]
    if not takeaways:
        errors.append("key_takeaways must contain at least one non-empty string")
    if errors:
        raise ValueError("; ".join(errors))


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


def context_view_payload(output: dict, view: str) -> dict:
    data = unwrap_bridge_data(output)
    if data.get("ok") is False:
        return data
    nested = data.get(view)
    if isinstance(nested, dict):
        return nested
    return data


def normalize_triage_map(value: Any) -> dict[str, dict]:
    if isinstance(value, dict):
        result: dict[str, dict] = {}
        for key, raw in value.items():
            row = raw if isinstance(raw, dict) else {}
            paper_ref = clean_text(row.get("paper_ref"), clean_text(key))
            if paper_ref:
                result[paper_ref] = {**row, "paper_ref": paper_ref}
        return result
    if isinstance(value, list):
        result: dict[str, dict] = {}
        for raw in value:
            row = raw if isinstance(raw, dict) else {}
            paper_ref = clean_text(row.get("paper_ref"))
            if paper_ref:
                result[paper_ref] = row
        return result
    return {}


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def resolver_contains(base: Any, proposal: Any, path: str = "$") -> list[str]:
    errors: list[str] = []
    if isinstance(base, dict):
        if not isinstance(proposal, dict):
            return [f"{path} changed from object"]
        for key, base_value in base.items():
            if key not in proposal:
                errors.append(f"{path}.{key} was removed")
                continue
            errors.extend(resolver_contains(base_value, proposal[key], f"{path}.{key}"))
        return errors
    if isinstance(base, list):
        if not isinstance(proposal, list):
            return [f"{path} changed from array"]
        proposal_items = {stable_json(item) for item in proposal}
        for item in base:
            if stable_json(item) not in proposal_items:
                errors.append(f"{path} removed array item {stable_json(item)}")
        return errors
    if base != proposal:
        return [f"{path} changed from {stable_json(base)} to {stable_json(proposal)}"]
    return []


def resolve_paper_refs(resolved: dict) -> list[str]:
    return [clean_text(paper.get("paper_ref")) for paper in extract_papers(resolved) if clean_text(paper.get("paper_ref"))]


def diff_linked_and_resolved_refs(linked_refs: list[str], updated_refs: list[str]) -> dict:
    linked_set = set(linked_refs)
    updated_set = set(updated_refs)
    return {
        "linked_refs": linked_refs,
        "updated_refs": updated_refs,
        "kept_refs": [ref for ref in updated_refs if ref in linked_set],
        "added_refs": [ref for ref in updated_refs if ref not in linked_set],
        "removed_refs": [ref for ref in linked_refs if ref not in updated_set],
    }


def extract_papers(resolved: dict) -> list[dict]:
    papers = resolved.get("papers")
    if isinstance(papers, list):
        return [paper for paper in papers if isinstance(paper, dict)]
    result = resolved.get("result")
    if isinstance(result, dict) and isinstance(result.get("papers"), list):
        return [paper for paper in result["papers"] if isinstance(paper, dict)]
    raise ValueError("resolver result did not contain papers[]")


def maybe_extract_papers(value: Any) -> list[dict]:
    if not isinstance(value, dict):
        return []
    try:
        return extract_papers(value)
    except ValueError:
        return []


def linked_papers_from_audit(audit: dict) -> list[dict]:
    resolved_paper_set = audit.get("resolved_paper_set")
    papers = maybe_extract_papers(resolved_paper_set)
    if papers:
        return papers
    source_papers = audit.get("source_papers")
    if isinstance(source_papers, list):
        return [paper for paper in source_papers if isinstance(paper, dict)]
    return []


def unique_paper_refs(papers: list[dict]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for paper in papers:
        paper_ref = clean_text(paper.get("paper_ref"))
        if paper_ref and paper_ref not in seen:
            seen.add(paper_ref)
            result.append(paper_ref)
    return result


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


def run_update_preflight(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    input_path: str | None,
) -> dict:
    input_data = load_initial_input(run_root, input_path, skill_id=skill_id)
    if input_data:
        set_meta(conn, "input", input_data)
    topic_id = topic_id_from_input(input_data)
    if not topic_id:
        canceled = write_canceled_output(
            conn,
            run_root,
            reason="topic_not_found",
            message="Update topic synthesis requires an existing topicId.",
        )
        return {"status": "canceled", "canceled_output": canceled}

    digest_output = run_bridge_json(
        run_root,
        ["topics", "get-context"],
        {"topicId": topic_id, "view": "digest"},
        "topic-context-digest-input.json",
    )
    digest = context_view_payload(digest_output, "digest")
    if digest.get("ok") is False or clean_text(digest.get("status")) == "not_found":
        canceled = write_canceled_output(
            conn,
            run_root,
            reason="topic_not_found",
            message=f"Topic synthesis target was not found: {topic_id}",
            topic_id=topic_id,
        )
        return {"status": "canceled", "canceled_output": canceled}

    audit_output = run_bridge_json(
        run_root,
        ["topics", "get-context"],
        {"topicId": topic_id, "view": "audit"},
        "topic-context-audit-input.json",
    )
    audit = context_view_payload(audit_output, "audit")
    if audit.get("ok") is False:
        canceled = write_canceled_output(
            conn,
            run_root,
            reason="invalid_topic_context",
            message=f"Topic synthesis audit context was not available: {topic_id}",
            topic_id=topic_id,
        )
        return {"status": "canceled", "canceled_output": canceled}

    resolver = audit.get("topic_resolver") if isinstance(audit.get("topic_resolver"), dict) else {}
    if not resolver:
        canceled = write_canceled_output(
            conn,
            run_root,
            reason="invalid_topic_context",
            message=f"Topic synthesis target has no current resolver: {topic_id}",
            topic_id=topic_id,
        )
        return {"status": "canceled", "canceled_output": canceled}

    linked_papers = linked_papers_from_audit(audit)
    linked_refs = unique_paper_refs(linked_papers)
    current_hashes = audit.get("current_hashes") if isinstance(audit.get("current_hashes"), dict) else {}
    base_hashes = update_full_base_hashes(current_hashes)
    if any(not value for value in base_hashes.values()):
        canceled = write_canceled_output(
            conn,
            run_root,
            reason="invalid_topic_context",
            message=f"Topic synthesis target is missing apply base hashes: {topic_id}",
            topic_id=topic_id,
        )
        return {"status": "canceled", "canceled_output": canceled}

    topic_definition = normalize_update_topic_definition(
        {
            "topic_id": digest.get("topic_id") or topic_id,
            "topic_definition": audit.get("topic_definition") or digest,
        }
    )
    saved_triage = normalize_triage_map(audit.get("source_paper_triage"))
    saved_triage_refs = sorted(saved_triage.keys())
    linked_ref_set = set(linked_refs)
    saved_triage_missing_refs = [ref for ref in linked_refs if ref not in saved_triage]
    saved_triage_extra_refs = [ref for ref in saved_triage_refs if ref not in linked_ref_set]
    report = {
        "schema_id": "synthesis.update_audit_report",
        "schema_version": "1.0.0",
        "topic_id": topic_definition["id"],
        "topic_definition": topic_definition,
        "base_hashes": base_hashes,
        "current_linked_papers": {
            "paper_count": len(linked_refs),
            "paper_refs": linked_refs,
            "source": "resolved_paper_set" if maybe_extract_papers(as_dict(audit.get("resolved_paper_set"))) else "source_papers",
        },
        "current_resolver": resolver,
        "saved_triage": {
            "available": bool(saved_triage),
            "paper_refs": saved_triage_refs,
            "count": len(saved_triage),
            "missing_refs": saved_triage_missing_refs,
            "missing_count": len(saved_triage_missing_refs),
            "extra_refs": saved_triage_extra_refs,
            "extra_count": len(saved_triage_extra_refs),
        },
        "discovery": as_dict(audit.get("discovery")),
        "source_materials": as_dict(audit.get("source_materials")),
        "artifact_digest_changes": {
            "status": "not_reported",
            "changed_refs": [],
        },
    }
    set_meta(conn, "operation", "update_full")
    set_meta(conn, "topic_id", topic_definition["id"])
    set_meta(conn, "topic_definition", topic_definition)
    set_meta(conn, "current_hashes", current_hashes)
    set_meta(conn, "section_hashes", audit.get("section_hashes") or {})
    set_meta(conn, "base_hashes", base_hashes)
    set_meta(conn, "current_resolver", resolver)
    set_meta(conn, "linked_paper_refs", linked_refs)
    set_meta(conn, "linked_papers", linked_papers)
    set_meta(conn, "saved_source_paper_triage", saved_triage)
    set_meta(conn, "update_audit_report", report)
    write_json(run_root / "runtime/payloads/update-audit-report.json", report)
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id="stage_00_runtime_setup",
        key="update_audit_report",
        path="runtime/payloads/update-audit-report.json",
        hash_value="",
    )
    return {
        "status": "ready",
        "topic_id": topic_definition["id"],
        "base_hashes": base_hashes,
        "linked_paper_count": len(linked_refs),
        "saved_triage_count": len(saved_triage),
        "saved_triage_missing_count": len(saved_triage_missing_refs),
        "update_audit_report_path": "runtime/payloads/update-audit-report.json",
    }


def collect_resolver_cascade(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    stage_id: str,
    payload: dict,
) -> dict:
    operation = get_meta(conn, "operation", "create")
    if operation == "update_full":
        current_resolver = get_meta(conn, "current_resolver", {})
        additive_errors = resolver_contains(current_resolver, payload["resolver"])
        if additive_errors:
            raise ValueError("update resolver proposal must preserve current resolver: " + "; ".join(additive_errors))
    resolver_output = run_bridge_json(
        run_root,
        ["resolvers", "resolve"],
        payload["resolver"],
        "resolver-input.json",
    )
    resolved = unwrap_bridge_data(resolver_output)
    papers = extract_papers(resolved)
    conn.execute("delete from paper_workset")
    conn.commit()
    store_workset(conn, papers)
    refs = paper_refs(conn)

    if operation == "update_full":
        linked_refs = get_meta(conn, "linked_paper_refs", [])
        if not isinstance(linked_refs, list):
            linked_refs = []
        linked_refs = [clean_text(ref) for ref in linked_refs if clean_text(ref)]
        updated_refs = resolve_paper_refs(resolved)
        resolve_diff = diff_linked_and_resolved_refs(linked_refs, updated_refs)
        set_meta(conn, "resolve_diff", resolve_diff)
        set_meta(conn, "updated_resolve_result", resolved)
        write_json(run_root / "runtime/payloads/updated-resolve-result.json", resolved)
        register_artifact(
            conn,
            skill_id=skill_id,
            stage_id=stage_id,
            key="updated_resolve_result",
            path="runtime/payloads/updated-resolve-result.json",
            hash_value="",
        )
        if not resolve_diff["added_refs"]:
            topic_id = clean_text(get_meta(conn, "topic_id", ""))
            canceled = write_canceled_output(
                conn,
                run_root,
                reason="no_new_resolved_papers",
                message="Update resolver did not add any new papers to the topic.",
                topic_id=topic_id,
            )
            return {"status": "canceled", "canceled_output": canceled, "resolve_diff": resolve_diff}
        saved_triage = normalize_triage_map(get_meta(conn, "saved_source_paper_triage", {}))
        if saved_triage:
            for paper_ref in updated_refs:
                triage = saved_triage.get(paper_ref)
                if not triage:
                    continue
                conn.execute(
                    """
                    insert into paper_triage (paper_ref, payload_json, updated_at)
                    values (?, ?, ?)
                    on conflict(paper_ref) do update set
                      payload_json = excluded.payload_json,
                      updated_at = excluded.updated_at
                    """,
                    (paper_ref, json.dumps(triage, ensure_ascii=False, sort_keys=True), utc_now()),
                )
            conn.commit()
            required_refs = [ref for ref in updated_refs if ref not in saved_triage]
            triage_mode = "missing_triage" if required_refs else "reused"
        else:
            required_refs = list(updated_refs)
            triage_mode = "full"
        set_meta(conn, "triage_required_refs", required_refs)
        set_meta(conn, "triage_mode", triage_mode)
    else:
        set_meta(conn, "triage_required_refs", refs)
        set_meta(conn, "triage_mode", "full")

    resolver_manifest = {
        "schema_id": "synthesis.topic_synthesis_resolver_manifest",
        "schema_version": "1.0.0",
        "resolver": payload["resolver"],
        "resolver_reasoning": payload.get("resolver_reasoning", ""),
        "operation_intent": payload.get("operation_intent", operation),
        "resolution_result": resolved,
        "paper_refs": refs,
        "diagnostics": payload.get("diagnostics", []),
    }
    if operation == "update_full":
        resolver_manifest["base_hashes"] = get_meta(conn, "base_hashes", {})
        resolver_manifest["resolve_diff"] = get_meta(conn, "resolve_diff", {})
        resolver_manifest["triage_required_refs"] = get_meta(conn, "triage_required_refs", [])
    write_json(run_root / "runtime/payloads/resolver.json", resolver_manifest)
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="resolver_manifest",
        path="runtime/payloads/resolver.json",
        hash_value="",
    )

    metrics_output = run_bridge_json(
        run_root,
        ["citation-graph", "get-metrics"],
        {"paperRefs": refs, "limit": len(refs)},
        "citation-graph-metrics-input-1.json",
    )
    metrics_receipt = {"paper_refs": refs, "result": unwrap_bridge_data(metrics_output)}
    write_json(
        run_root / "runtime/payloads/citation-graph-metrics-batch-1.json",
        metrics_receipt,
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="citation_graph_metrics_batch_1",
        path="runtime/payloads/citation-graph-metrics-batch-1.json",
        hash_value="",
    )
    record_action(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        action="resolver_cascade_metrics",
        result={"paper_refs": refs},
    )

    artifacts_output = run_bridge_json(
        run_root,
        ["paper-artifacts", "export-filtered"],
        {"run_root": str(run_root), "paper_refs": refs},
        "paper-artifacts-export-input-1.json",
    )
    artifact_data = unwrap_bridge_data(artifacts_output)
    manifest = extract_artifact_manifest(run_root, artifact_data)
    write_json(
        run_root / "runtime/payloads/paper-artifacts-manifest-batch-1.json",
        manifest,
    )
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        key="paper_artifacts_manifest_batch_1",
        path="runtime/payloads/paper-artifacts-manifest-batch-1.json",
        hash_value="",
    )
    record_action(
        conn,
        skill_id=skill_id,
        stage_id=stage_id,
        action="resolver_cascade_artifacts",
        result={"paper_refs": refs},
    )

    return {
        "paper_refs": refs,
        "paper_count": len(refs),
        "resolver_manifest_path": "runtime/payloads/resolver.json",
        "triage_required_refs": get_meta(conn, "triage_required_refs", refs),
        "triage_mode": get_meta(conn, "triage_mode", "full"),
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
    required_refs = set(get_meta(conn, "triage_required_refs", paper_refs(conn)))
    if not entries and required_refs:
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
          "cross_paper_context_manifest",
          "source_paper_evidence_index",
        ],
    )
    return {
        "paper_refs": analyzed,
        "analyzed_count": len(analyzed),
        "triage_mode": get_meta(conn, "triage_mode", "full"),
        "triage_required_refs": get_meta(conn, "triage_required_refs", []),
        "handoff": handoff,
    }


CONTEXT_SELECTION_CONSTANTS = {
    "core_analysis_basis_quantile": "p90",
    "external_literature_basis_quantile": "p75",
    "core_analysis_full_context_tokens_per_paper": 1500,
    "external_literature_full_context_tokens_per_paper": 7750,
    "core_analysis_budget_tokens": 200000,
    "external_literature_budget_tokens": 200000,
    "safety_margin_ratio": 0.10,
    "usable_budget_tokens": 180000,
    "core_analysis_full_context_slot_count": 120,
    "external_literature_full_context_slot_count": 23,
}

RELEVANCE_WEIGHTS = {
    "core": 1.0,
    "related": 0.65,
    "peripheral": 0.3,
    "excluded": 0.0,
    "unknown": 0.5,
}

QUALITY_WEIGHTS = {
    "high": 1.0,
    "medium": 0.7,
    "low": 0.35,
    "unknown": 0.5,
}


def markdown_escape_cell(value: Any) -> str:
    return clean_text(value).replace("|", "\\|").replace("\n", " ")


def compact_authors(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        authors: list[str] = []
        for entry in value[:3]:
            if isinstance(entry, str):
                authors.append(entry)
            elif isinstance(entry, dict):
                name = first_text(
                    entry.get("name"),
                    " ".join(
                        part
                        for part in [
                            clean_text(entry.get("given")),
                            clean_text(entry.get("family")),
                        ]
                        if part
                    ),
                )
                if name:
                    authors.append(name)
        if len(value) > 3:
            authors.append("et al.")
        return ", ".join(authors)
    return ""


def compact_reference_row(reference: dict) -> str:
    ref_id = markdown_escape_cell(
        first_text(reference.get("id"), reference.get("key"), reference.get("citekey"))
    )
    year = markdown_escape_cell(first_text(reference.get("year"), reference.get("date")))
    authors = markdown_escape_cell(
        compact_authors(reference.get("author") or reference.get("authors"))
    )
    title = markdown_escape_cell(reference.get("title"))
    return f"| {ref_id} | {year} | {authors} | {title} |"


def artifact_kind(artifact: dict) -> str:
    artifact_type = clean_text(artifact.get("artifact_type")).lower()
    payload_type = clean_text(artifact.get("payload_type")).lower()
    if artifact_type in {"digest", "references", "citation_analysis"}:
        return artifact_type
    if payload_type == "digest-markdown":
        return "digest"
    if payload_type == "references-json":
        return "references"
    if payload_type == "citation-analysis-json":
        return "citation_analysis"
    return artifact_type or payload_type


def artifact_map(paper: dict) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for artifact in as_list(paper.get("artifacts")):
        if not isinstance(artifact, dict):
            continue
        kind = artifact_kind(artifact)
        if kind:
            result[kind] = artifact
    return result


def artifact_papers_by_ref(manifest: dict) -> dict[str, dict]:
    result: dict[str, dict] = {}
    for paper in as_list(manifest.get("papers")):
        if not isinstance(paper, dict):
            continue
        paper_ref = clean_text(paper.get("paper_ref"))
        if paper_ref:
            result[paper_ref] = paper
    return result


def artifact_text(run_root: Path, artifact: dict) -> str:
    if clean_text(artifact.get("status"), "available") != "available":
        return ""
    content_file = clean_text(artifact.get("content_file"))
    if not content_file:
        return ""
    path = resolve_run_path(run_root, content_file)
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def artifact_json(run_root: Path, artifact: dict) -> dict:
    text = artifact_text(run_root, artifact)
    if not text:
        return {}
    try:
        parsed = json.loads(text)
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def filter_digest_for_cross_paper_context(markdown: str) -> tuple[str, dict]:
    lines = str(markdown or "").splitlines()
    kept: list[str] = []
    kept_headings: list[str] = []
    dropped_headings: list[str] = []
    top_level_index = 0
    keep_current = True
    for line in lines:
        if line.startswith("## "):
            top_level_index += 1
            keep_current = top_level_index <= 4
            if keep_current:
                kept_headings.append(line.strip())
            else:
                dropped_headings.append(line.strip())
        if keep_current:
            kept.append(line)
    return "\n".join(kept).strip(), {
        "policy": "keep first four top-level ## sections without truncation",
        "kept_top_level_sections": kept_headings,
        "dropped_top_level_sections": dropped_headings,
    }


def digest_locator_from_artifact(paper_ref: str, artifact: dict) -> dict:
    locator = {
        "paper_ref": paper_ref,
        "payload_type": clean_text(artifact.get("payload_type"), "digest-markdown"),
    }
    note_key = clean_text(artifact.get("note_key"))
    if note_key:
        locator["note_key"] = note_key
    content_file = clean_text(artifact.get("content_file"))
    if content_file:
        locator["path"] = content_file
    return locator


def triage_level(triage: dict, flat_key: str, nested_key: str) -> str:
    flat = clean_text(triage.get(flat_key)).lower()
    if flat:
        return flat
    nested = as_dict(triage.get(nested_key))
    return clean_text(nested.get("level"), "unknown").lower()


def triage_reason(triage: dict, flat_key: str, nested_key: str) -> str:
    flat = clean_text(triage.get(flat_key))
    if flat:
        return flat
    nested = as_dict(triage.get(nested_key))
    return clean_text(nested.get("reason"))


def metric_float(metric: dict, key: str) -> float:
    try:
        return float(metric.get(key) or 0)
    except Exception:
        return 0.0


def metric_number(value: Any) -> str:
    if isinstance(value, (int, float)):
        return f"{value:.6g}"
    return "unknown"


def metric_role_hints(metric: dict) -> list[str]:
    hints = metric.get("synthesis_role_hints") or metric.get("role_hints")
    return [clean_text(hint) for hint in as_list(hints) if clean_text(hint)]


def metric_markdown(metric: dict) -> str:
    status = clean_text(metric.get("status"), "missing")
    if status not in {"ready", "available"}:
        return f"- Metrics status: {status}"
    hints = metric_role_hints(metric)
    return "\n".join(
        [
            "- Metrics status: ready",
            f"- Role hints: {', '.join(hints) if hints else 'none'}",
            f"- Internal degree: in={metric.get('internal_in_degree', 0)}, out={metric.get('internal_out_degree', 0)}",
            f"- PageRank: {metric_number(metric.get('internal_pagerank'))}",
            f"- Scores: foundation={metric_number(metric.get('foundation_score'))}, frontier={metric_number(metric.get('frontier_score'))}",
            f"- External/unresolved references: external={metric.get('external_reference_count', 0)}, unresolved={metric.get('unresolved_reference_count', 0)}",
        ]
    )


def load_metrics_by_ref(conn: sqlite3.Connection, run_root: Path) -> dict[str, dict]:
    entry = artifact_entry(conn, "citation_graph_metrics_batch_1")
    if not entry:
        return {}
    path = resolve_run_path(run_root, entry["path"])
    if not path.exists():
        return {}
    receipt = read_json(path)
    result = as_dict(receipt.get("result"))
    default_status = clean_text(result.get("status"), "ready")
    rows = (
        as_list(result.get("items"))
        or as_list(result.get("metrics"))
        or as_list(result.get("papers"))
    )
    metrics: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        paper_ref = clean_text(row.get("paper_ref"))
        if not paper_ref:
            continue
        metrics[paper_ref] = {"status": default_status, **row}
    return metrics


def references_from_artifact(run_root: Path, artifact: dict) -> list[dict]:
    payload = artifact_json(run_root, artifact)
    refs = payload.get("references")
    return [entry for entry in refs if isinstance(entry, dict)] if isinstance(refs, list) else []


def citation_report_from_artifact(run_root: Path, artifact: dict) -> str:
    payload = artifact_json(run_root, artifact)
    return first_text(
        payload.get("report_md"),
        payload.get("report_markdown"),
        payload.get("markdown"),
        payload.get("summary"),
        default=artifact_text(run_root, artifact),
    )


def paper_title_year(entry: dict) -> tuple[str, str]:
    metadata = as_dict(entry.get("metadata"))
    title = first_text(entry.get("title"), metadata.get("title"), default=entry.get("paper_ref"))
    year = first_text(metadata.get("year"), metadata.get("publication_year"), metadata.get("date"))
    return title, year


def artifact_availability_score(artifacts: dict[str, dict]) -> float:
    expected = ("digest", "references", "citation_analysis")
    available = sum(
        1
        for key in expected
        if clean_text(artifacts.get(key, {}).get("status"), "missing") == "available"
    )
    return available / len(expected)


def build_context_selection(
    entries: list[dict],
    triage_by_ref: dict[str, dict],
    artifacts_by_ref: dict[str, dict],
    metrics_by_ref: dict[str, dict],
    references_by_ref: dict[str, list[dict]],
    citation_reports_by_ref: dict[str, str],
) -> dict:
    rows: list[dict] = []
    for entry in entries:
        paper_ref = clean_text(entry.get("paper_ref"))
        triage = triage_by_ref.get(paper_ref, {})
        artifacts = artifacts_by_ref.get(paper_ref, {})
        metric = metrics_by_ref.get(paper_ref, {})
        relevance_level = triage_level(triage, "relevance_level", "topic_relevance")
        quality_level = triage_level(triage, "paper_quality_level", "paper_quality")
        relevance_score = RELEVANCE_WEIGHTS.get(relevance_level, 0.5)
        quality_score = QUALITY_WEIGHTS.get(quality_level, 0.5)
        graph_score = max(
            metric_float(metric, "foundation_score"),
            metric_float(metric, "frontier_score"),
            metric_float(metric, "internal_pagerank"),
        )
        external_signal = (
            int(metric.get("external_reference_count") or 0)
            + int(metric.get("unresolved_reference_count") or 0)
            + len(references_by_ref.get(paper_ref, []))
            + (1 if citation_reports_by_ref.get(paper_ref) else 0)
        )
        score = (
            relevance_score * 0.45
            + quality_score * 0.20
            + artifact_availability_score(artifacts) * 0.20
            + min(graph_score, 1.0) * 0.15
        )
        rows.append(
            {
                "paper_ref": paper_ref,
                "score": round(score, 6),
                "topic_relevance": relevance_level or "unknown",
                "paper_quality": quality_level or "unknown",
                "artifact_availability_score": round(artifact_availability_score(artifacts), 6),
                "graph_score": round(graph_score, 6),
                "external_signal": external_signal,
                "role_hints": metric_role_hints(metric),
            }
        )
    rows.sort(key=lambda row: (float(row.get("score") or 0), str(row.get("paper_ref") or "")), reverse=True)
    core_limit = int(CONTEXT_SELECTION_CONSTANTS["core_analysis_full_context_slot_count"])
    external_limit = int(CONTEXT_SELECTION_CONSTANTS["external_literature_full_context_slot_count"])
    external_ranked = sorted(
        rows,
        key=lambda row: (
            int(row.get("external_signal") or 0),
            float(row.get("score") or 0),
            str(row.get("paper_ref") or ""),
        ),
        reverse=True,
    )
    external_refs = {
        clean_text(row.get("paper_ref"))
        for row in external_ranked[:external_limit]
        if int(row.get("external_signal") or 0) > 0
    }
    for index, row in enumerate(rows):
        row["rank"] = index + 1
        row["core_full_context"] = index < core_limit and row.get("topic_relevance") != "excluded"
        row["external_full_context"] = clean_text(row.get("paper_ref")) in external_refs
    return {
        "schema_id": "synthesis.runtime_paper_context_selection",
        "schema_version": "1.0.0",
        "constants": CONTEXT_SELECTION_CONSTANTS,
        "selected_core_refs": [row["paper_ref"] for row in rows if row.get("core_full_context")],
        "selected_external_refs": [row["paper_ref"] for row in rows if row.get("external_full_context")],
        "papers": rows,
    }


def metrics_summary_markdown(metrics_by_ref: dict[str, dict]) -> list[str]:
    status_counts: dict[str, int] = {}
    for metric in metrics_by_ref.values():
        status = clean_text(metric.get("status"), "missing")
        status_counts[status] = status_counts.get(status, 0) + 1
    ready = [
        metric
        for metric in metrics_by_ref.values()
        if clean_text(metric.get("status"), "missing") in {"ready", "available"}
    ]
    ready.sort(key=lambda row: (metric_float(row, "foundation_score"), clean_text(row.get("paper_ref"))), reverse=True)
    top_refs = [clean_text(metric.get("paper_ref")) for metric in ready[:8] if clean_text(metric.get("paper_ref"))]
    return [
        "",
        "## Citation Graph Metrics Summary",
        "",
        "Use graph metrics as auxiliary structure signals; they are not claim evidence.",
        f"- Status counts: {json.dumps(status_counts, ensure_ascii=False, sort_keys=True)}",
        f"- High-structure papers: {', '.join(top_refs) if top_refs else 'none'}",
    ]


def paper_heading(paper_ref: str, title: str, year: str) -> str:
    year_part = f" ({year})" if year else ""
    title_part = f" — {title}" if title else ""
    return f"## Paper {paper_ref}{year_part}{title_part}"


def render_triage_markdown(triage: dict) -> str:
    relevance = triage_level(triage, "relevance_level", "topic_relevance")
    quality = triage_level(triage, "paper_quality_level", "paper_quality")
    core_digest = first_text(triage.get("core_digest"), triage.get("coreDigest"))
    lines = [
        "### Paper Triage",
        f"- Topic relevance: {relevance or 'unknown'}",
        f"- Relevance reason: {triage_reason(triage, 'relevance_reason', 'topic_relevance') or 'unknown'}",
        f"- Paper quality: {quality or 'unknown'}",
        f"- Quality reason: {triage_reason(triage, 'paper_quality_reason', 'paper_quality') or 'unknown'}",
        f"- Core digest: {core_digest or 'unknown'}",
    ]
    caveats = as_list(triage.get("caveats"))
    if caveats:
        lines.append(f"- Caveats: {json.dumps(caveats, ensure_ascii=False)}")
    return "\n".join(lines)


def build_prepare_context_views(conn: sqlite3.Connection, run_root: Path) -> dict:
    entries = workset_entries(conn)
    triage_by_ref = triage_entries(conn)
    artifact_manifest = load_artifact_manifest(conn, run_root)
    paper_artifacts = artifact_papers_by_ref(artifact_manifest)
    metrics_by_ref = load_metrics_by_ref(conn, run_root)
    artifacts_by_ref: dict[str, dict[str, dict]] = {}
    references_by_ref: dict[str, list[dict]] = {}
    citation_reports_by_ref: dict[str, str] = {}
    digest_filter_by_ref: dict[str, dict] = {}
    digest_text_by_ref: dict[str, str] = {}
    evidence_items: list[dict] = []

    for entry in entries:
        paper_ref = clean_text(entry.get("paper_ref"))
        artifacts = artifact_map(paper_artifacts.get(paper_ref, {}))
        artifacts_by_ref[paper_ref] = artifacts
        references_by_ref[paper_ref] = references_from_artifact(run_root, artifacts.get("references", {}))
        citation_reports_by_ref[paper_ref] = citation_report_from_artifact(run_root, artifacts.get("citation_analysis", {}))
        digest_text, digest_filter = filter_digest_for_cross_paper_context(
            artifact_text(run_root, artifacts.get("digest", {}))
        )
        digest_text_by_ref[paper_ref] = digest_text
        digest_filter_by_ref[paper_ref] = digest_filter
        triage = triage_by_ref.get(paper_ref, {})
        title, year = paper_title_year(entry)
        evidence_items.append(
            {
                "paper_ref": paper_ref,
                "item_key": clean_text(entry.get("item_key")),
                "title": title,
                "year": year,
                "short_evidence": first_text(
                    triage.get("core_digest"),
                    triage.get("relevance_reason"),
                    default=f"{title or paper_ref} belongs to the resolved topic workset.",
                ),
                "relevance_level": triage_level(triage, "relevance_level", "topic_relevance"),
                "paper_quality_level": triage_level(triage, "paper_quality_level", "paper_quality"),
                "digest_ref": digest_locator_from_artifact(paper_ref, artifacts.get("digest", {})),
            }
        )

    selection = build_context_selection(
        entries,
        triage_by_ref,
        artifacts_by_ref,
        metrics_by_ref,
        references_by_ref,
        citation_reports_by_ref,
    )
    selection_by_ref = {
        clean_text(row.get("paper_ref")): row
        for row in as_list(selection.get("papers"))
        if isinstance(row, dict)
    }

    main_lines = [
        "# Cross-Paper Synthesis Context",
        "",
        "Use this context for core synthesis: taxonomy, timeline, claims, debates, future directions, and review outline.",
        "External references and citation reports are intentionally separated into external-literature-context.md.",
    ]
    main_lines.extend(metrics_summary_markdown(metrics_by_ref))
    main_lines.extend(
        [
            "",
            "## Runtime Context Selection",
            "",
            f"- Core full-context slots: {len(selection.get('selected_core_refs', []))}",
            f"- External full-context slots: {len(selection.get('selected_external_refs', []))}",
            "- Selection is deterministic from relevance, quality, artifact availability, and graph signals.",
        ]
    )
    external_lines = [
        "# External Literature Context",
        "",
        "Use this context only for coverage judgment, external context summary, and collection suggestions.",
        "Each paper groups compact references with that paper's citation analysis report.",
    ]
    paper_manifest: list[dict] = []

    for entry in entries:
        paper_ref = clean_text(entry.get("paper_ref"))
        title, year = paper_title_year(entry)
        triage = triage_by_ref.get(paper_ref, {})
        artifacts = artifacts_by_ref.get(paper_ref, {})
        metric = metrics_by_ref.get(paper_ref, {"paper_ref": paper_ref, "status": "missing"})
        selection_row = selection_by_ref.get(paper_ref, {})
        refs = references_by_ref.get(paper_ref, [])
        report_md = citation_reports_by_ref.get(paper_ref, "")
        main_lines.extend(
            [
                "",
                paper_heading(paper_ref, title, year),
                "",
                f"- Paper ref: {paper_ref}",
                f"- Title: {title or 'unknown'}",
                f"- Year: {year or 'unknown'}",
                f"- Runtime context rank: {selection_row.get('rank', 'unranked')} score={selection_row.get('score', 'unknown')}",
                f"- Core full context: {str(bool(selection_row.get('core_full_context'))).lower()}",
                "",
                "### Citation Graph Metrics",
                metric_markdown(metric),
                "",
                render_triage_markdown(triage),
                "",
                "### Filtered Digest",
                digest_text_by_ref.get(paper_ref)
                if selection_row.get("core_full_context") and digest_text_by_ref.get(paper_ref)
                else "_Digest omitted or unavailable; use paper triage and metadata for this paper._",
            ]
        )
        external_lines.extend(
            [
                "",
                paper_heading(paper_ref, title, year),
                "",
                f"- Paper ref: {paper_ref}",
                f"- Title: {title or 'unknown'}",
                f"- Year: {year or 'unknown'}",
                f"- External full context: {str(bool(selection_row.get('external_full_context'))).lower()}",
                "",
            ]
        )
        hints = metric_role_hints(metric)
        if hints or int(metric.get("external_reference_count") or 0) or int(metric.get("unresolved_reference_count") or 0):
            external_lines.extend(
                [
                    "### Citation Graph External Dependency Hint",
                    f"- Role hints: {', '.join(hints) if hints else 'none'}",
                    f"- External/unresolved references: external={metric.get('external_reference_count', 0)}, unresolved={metric.get('unresolved_reference_count', 0)}",
                    "",
                ]
            )
        external_lines.append("### Compact References")
        if refs and selection_row.get("external_full_context"):
            external_lines.extend(
                [
                    "| id | year | authors | title |",
                    "| --- | --- | --- | --- |",
                    *[compact_reference_row(ref) for ref in refs],
                ]
            )
        elif refs:
            external_lines.append("_References omitted by runtime external-context selection._")
        else:
            external_lines.append("_No references artifact rows available._")
        external_lines.extend(
            [
                "",
                "### Citation Analysis Report",
                report_md
                if selection_row.get("external_full_context") and report_md
                else "_Citation analysis report omitted or unavailable for this paper._",
            ]
        )
        paper_manifest.append(
            {
                "paper_ref": paper_ref,
                "title": title,
                "year": year,
                "digest_status": clean_text(artifacts.get("digest", {}).get("status"), "missing"),
                "references_status": clean_text(artifacts.get("references", {}).get("status"), "missing"),
                "citation_analysis_status": clean_text(artifacts.get("citation_analysis", {}).get("status"), "missing"),
                "reference_count": len(refs),
                "citation_report_present": bool(report_md),
                "digest_filter": digest_filter_by_ref.get(paper_ref, {}),
                "citation_graph_metrics_status": clean_text(metric.get("status"), "missing"),
                "citation_graph_role_hints": hints,
                "context_selection": selection_row,
            }
        )

    manifest = {
        "schema_id": "synthesis.cross_paper_context_manifest",
        "schema_version": "1.0.0",
        "paper_count": len(entries),
        "context_paths": {
            "main": "runtime/views/cross-paper-context.md",
            "external_literature": "runtime/views/external-literature-context.md",
            "manifest": "runtime/views/cross-paper-context.manifest.json",
            "selection": "runtime/views/cross-paper-context.manifest.json#context_selection",
        },
        "selection_constants": CONTEXT_SELECTION_CONSTANTS,
        "selected_core_refs": selection.get("selected_core_refs", []),
        "selected_external_refs": selection.get("selected_external_refs", []),
        "papers": paper_manifest,
        "context_selection": selection,
    }
    return {
        "main_markdown": "\n".join(str(line) for line in main_lines).strip() + "\n",
        "external_markdown": "\n".join(str(line) for line in external_lines).strip() + "\n",
        "manifest": manifest,
        "evidence_index": {
            "schema_id": "synthesis.source_paper_evidence_index",
            "schema_version": "1.0.0",
            "items": evidence_items,
        },
    }


def write_prepare_views(
    conn: sqlite3.Connection, *, run_root: Path, skill_id: str, stage_id: str
) -> None:
    views = build_prepare_context_views(conn, run_root)
    cross_hash = write_text(run_root / "runtime/views/cross-paper-context.md", views["main_markdown"])
    external_hash = write_text(
        run_root / "runtime/views/external-literature-context.md",
        views["external_markdown"],
    )
    manifest_hash = write_json(
        run_root / "runtime/views/cross-paper-context.manifest.json",
        views["manifest"],
    )
    index_hash = write_json(
        run_root / "runtime/views/source-paper-evidence-index.json",
        views["evidence_index"],
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
        key="cross_paper_context_manifest",
        path="runtime/views/cross-paper-context.manifest.json",
        hash_value=manifest_hash,
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
    }
    write_json(run_root / manifest_path, manifest)
    conn.execute(
        """
        insert into handoff_registry (handoff_key, manifest_path, stage_id, skill_id)
        values (?, ?, ?, ?)
        on conflict(handoff_key) do update set
          manifest_path = excluded.manifest_path,
          stage_id = excluded.stage_id,
          skill_id = excluded.skill_id
        """,
        (handoff, manifest_path, stage_id, skill_id),
    )
    conn.commit()
    return {
        "__SKILL_DONE__": True,
        "kind": "topic_synthesis_handoff",
        "handoff": handoff,
        "operation": get_meta(conn, "operation", "create"),
        "db_path": "runtime/topic-synthesis.sqlite",
        "handoff_manifest_path": manifest_path,
        "next_skill_id": next_skill_id,
    }


def completed_output(*, skill_root: Path, db_path: str) -> dict:
    skill_id = infer_skill_id(skill_root)
    conn = connect(db_path)
    canceled = get_meta(conn, "canceled_output")
    if isinstance(canceled, dict):
        return canceled
    contract = SKILL_STAGE_CONTRACT[skill_id]
    if contract["output_kind"] == "topic_synthesis":
        run_root = run_root_from_db_path(db_path)
        final_path = run_root / "result/final-output.candidate.json"
        if final_path.exists():
            return read_json(final_path)
    row = conn.execute(
        "select manifest_path from handoff_registry where handoff_key = ?",
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
            "next_skill_id": contract["next_skill_id"],
        }
    return {"__SKILL_DONE__": True, "kind": "topic_synthesis_handoff"}


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
        if skill_id == "update-topic-synthesis-prepare":
            result = run_update_preflight(
                conn,
                run_root=run_root,
                skill_id=skill_id,
                input_path=input_path,
            )
        else:
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
    payload, path = read_payload(run_root, payload_path)
    validate_payload_against_schema(payload, load_schema(skill_root, stage["schema"]))
    validate_stage_payload(conn, stage["id"], payload)
    register_artifact(
        conn,
        skill_id=skill_id,
        stage_id=stage["id"],
        key=stage["id"] + "_payload",
        path=str(path.relative_to(run_root)).replace("\\", "/"),
        hash_value="",
    )

    result = dispatch_payload_stage(
        conn,
        run_root=run_root,
        skill_id=skill_id,
        stage=stage,
        payload=payload,
    )
    record_stage(conn, skill_id=skill_id, stage_id=stage["id"], result=result)
    record_action(
        conn,
        skill_id=skill_id,
        stage_id=stage["id"],
        action="submit",
        payload_path=str(path.relative_to(run_root)).replace("\\", "/"),
        result=result,
    )
    return {"ok": True, "skill_id": skill_id, "stage": stage["id"], "result": result}


def dispatch_payload_stage(
    conn: sqlite3.Connection,
    *,
    run_root: Path,
    skill_id: str,
    stage: dict,
    payload: dict,
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
        decision = payload.get("update_decision") if isinstance(payload.get("update_decision"), dict) else {}
        if clean_text(decision.get("action")) == "cancel":
            topic_id = clean_text(get_meta(conn, "topic_id", ""))
            canceled = write_canceled_output(
                conn,
                run_root,
                reason=clean_text(decision.get("reason"), "no_update_needed"),
                message=clean_text(decision.get("message"), "Topic synthesis update was not needed."),
                topic_id=topic_id,
            )
            return {"status": "canceled", "canceled_output": canceled}
        set_meta(conn, "update_decision", decision)
        return collect_resolver_cascade(
            conn,
            run_root=run_root,
            skill_id=skill_id,
            stage_id=stage_id,
            payload=payload,
        )
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
    existing_proposals = as_list(payload.get("existing_topic_relation_proposals"))
    prospective_proposals = as_list(payload.get("prospective_topic_relation_proposals"))
    concept_hash = write_json(
        run_root / "result/sidecars/concept-cards-proposal.json",
        {
            "schema_id": "synthesis.concept_cards_proposal",
            "schema_version": "1.0.0",
            "cards": payload.get("concept_details", []),
        },
    )
    relation_hash = write_json(
        run_root / "result/sidecars/topic-graph-relation-proposals.json",
        {
            "schema_id": "synthesis.topic_graph_relation_proposals",
            "schema_version": "1.0.0",
            "proposals": existing_proposals,
        },
    )
    prospective_hash = write_json(
        run_root / "result/sidecars/prospective-topic-relation-proposals.json",
        {
            "schema_id": "synthesis.prospective_topic_relation_proposals",
            "schema_version": "1.0.0",
            "proposals": prospective_proposals,
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
        },
    )
    for key, rel_path, hash_value in [
        ("concept_cards_proposal", "result/sidecars/concept-cards-proposal.json", concept_hash),
        ("topic_graph_relation_proposals", "result/sidecars/topic-graph-relation-proposals.json", relation_hash),
        (
            "prospective_topic_relation_proposals",
            "result/sidecars/prospective-topic-relation-proposals.json",
            prospective_hash,
        ),
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
                    "prospective_topic_relation_proposals",
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
                "prospective_topic_relation_proposals",
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


def normalize_year_value(value: Any) -> str:
    text = clean_text(value)
    if not text:
        return ""
    match = re.search(r"(19|20)\d{2}", text)
    if not match:
        return ""
    year = int(match.group(0))
    return str(year) if 1800 <= year <= 2100 else ""


def paper_year_from_metadata(*candidates: dict) -> str:
    year_keys = (
        "year",
        "publication_year",
        "publicationYear",
        "paper_year",
        "paperYear",
        "published_year",
        "publishedYear",
        "date",
        "publication_date",
        "publicationDate",
        "published_at",
        "publishedAt",
    )
    nested_keys = ("metadata", "bibliographic", "paper", "source", "item")
    for candidate in candidates:
        data = as_dict(candidate)
        for key in year_keys:
            year = normalize_year_value(data.get(key))
            if year:
                return year
        for key in nested_keys:
            nested = as_dict(data.get(key))
            for year_key in year_keys:
                year = normalize_year_value(nested.get(year_key))
                if year:
                    return year
    return ""


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


def digest_ref_for_paper(run_root: Path, paper_ref: str, artifact_manifest: dict) -> dict:
    papers = as_list(artifact_manifest.get("papers"))
    for paper in papers:
        if not isinstance(paper, dict) or str(paper.get("paper_ref") or "") != paper_ref:
            continue
        for artifact in as_list(paper.get("artifacts")):
            if not isinstance(artifact, dict):
                continue
            if clean_text(artifact.get("payload_type")) != "digest-markdown":
                continue
            content_file = clean_text(artifact.get("content_file"))
            digest_ref = {
                "paper_ref": paper_ref,
                "payload_type": clean_text(artifact.get("payload_type"), "digest-markdown"),
            }
            note_key = clean_text(artifact.get("note_key"))
            if note_key:
                digest_ref["note_key"] = note_key
            if content_file:
                digest_ref["path"] = content_file
            return digest_ref
    return {
        "paper_ref": paper_ref,
        "payload_type": "digest-markdown",
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


def artifact_manifest_paper(artifact_manifest: dict, paper_ref: str) -> dict:
    for paper in as_list(artifact_manifest.get("papers")):
        paper_obj = as_dict(paper)
        if clean_text(paper_obj.get("paper_ref")) == paper_ref:
            return paper_obj
    return {}


def normalize_source_papers(conn: sqlite3.Connection, run_root: Path) -> list[dict]:
    artifact_manifest = load_artifact_manifest(conn, run_root)
    triage = triage_entries(conn)
    source_papers: list[dict] = []
    for entry in workset_entries(conn):
        paper_ref = str(entry["paper_ref"])
        paper_triage = triage.get(paper_ref, {})
        metadata = as_dict(entry.get("metadata"))
        artifact_paper = artifact_manifest_paper(artifact_manifest, paper_ref)
        year = paper_year_from_metadata(entry, metadata, artifact_paper)
        source_papers.append(
            {
                "paper_ref": paper_ref,
                "item_key": entry.get("item_key", ""),
                "title": entry.get("title", paper_ref),
                "year": year,
                "summary": first_text(
                    paper_triage.get("core_digest"),
                    paper_triage.get("relevance_reason"),
                    default=f"{entry.get('title', paper_ref)} is part of the resolved topic workset.",
                ),
                "synthesis_role": clean_text(paper_triage.get("relevance_level"), "supporting"),
                "quality": clean_text(paper_triage.get("paper_quality_level"), "unknown"),
                "caveats": as_list(paper_triage.get("caveats")),
                "digest_ref": digest_ref_for_paper(run_root, paper_ref, artifact_manifest),
            }
        )
    return source_papers


def source_paper_time_span(source_papers: list[dict]) -> dict:
    years = sorted(
        {
            int(year)
            for year in (normalize_year_value(paper.get("year")) for paper in source_papers)
            if year
        }
    )
    if not years:
        return {"earliest": "", "latest": ""}
    return {"earliest": str(years[0]), "latest": str(years[-1])}


def source_paper_refs(value: dict, entries: list[dict]) -> list[str]:
    known = {str(entry.get("paper_ref")) for entry in entries}
    refs = as_list(value.get("source_paper_refs"))
    if not refs:
        direct = clean_text(value.get("source_paper_ref"))
        refs = [direct] if direct else []
    result: list[str] = []
    for ref in refs:
        text = clean_text(ref)
        if text and text in known and text not in result:
            result.append(text)
    return result


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
    axes_raw = as_list(taxonomy.get("axes"))
    legacy_nodes = as_list(taxonomy.get("nodes") or taxonomy.get("categories"))
    if not axes_raw and legacy_nodes:
        axes_raw = [
            {
                "axis_type": DEFAULT_TAXONOMY_AXIS_TYPE,
                "axis_rationale": first_text(
                    taxonomy.get("axis_rationale"),
                    taxonomy.get("rationale"),
                    default="Legacy taxonomy nodes are grouped as research routes.",
                ),
                "nodes": legacy_nodes,
            }
        ]
    if not axes_raw:
        nodes = [
            {
                "id": "route-core",
                "title": "Core topic route",
                "definition": "The main route synthesized from the selected library papers.",
                "core_problem": "Explain the central methods and limitations represented in the resolved workset.",
                "mechanism": "Compare paper-level evidence and organize it into a topic-level route.",
                "source_paper_refs": [],
                "strengths": ["Grounded in resolved Zotero library evidence."],
                "limitations": ["Runtime fallback should be refined by richer core synthesis payloads."],
                "maturity": "emerging",
            }
        ]
        axes_raw = [
            {
                "axis_type": DEFAULT_TAXONOMY_AXIS_TYPE,
                "axis_rationale": "Runtime fallback groups the synthesized topic as a research route.",
                "nodes": nodes,
            }
        ]

    def normalize_taxonomy_node(node_raw: Any, index: int) -> dict:
        node = as_dict(node_raw)
        return {
            **node,
            "id": first_text(node.get("id"), default=f"route-{index + 1}"),
            "title": first_text(node.get("title"), node.get("label"), node.get("name"), default=f"Route {index + 1}"),
            "definition": first_text(node.get("definition"), node.get("description"), default="Runtime-normalized research route."),
            "core_problem": first_text(node.get("core_problem"), node.get("problem"), default="Topic-level problem represented by this route."),
            "mechanism": first_text(node.get("mechanism"), node.get("technical_mechanism"), default="Mechanism summarized from source evidence."),
            "source_paper_refs": source_paper_refs(node, entries),
            "strengths": as_list(node.get("strengths") or node.get("advantages")) or ["Evidence-grounded synthesis."],
            "limitations": as_list(node.get("limitations") or node.get("weaknesses")) or ["Coverage depends on the resolved workset."],
            "maturity": first_text(node.get("maturity"), node.get("status"), default="unknown"),
        }

    normalized_axes = []
    normalized_nodes = []
    for axis_index, axis_raw in enumerate(axes_raw):
        axis = as_dict(axis_raw)
        axis_type = first_text(axis.get("axis_type"), default=DEFAULT_TAXONOMY_AXIS_TYPE)
        if axis_type not in TAXONOMY_AXIS_TYPES:
            axis_type = DEFAULT_TAXONOMY_AXIS_TYPE
        axis_nodes = [
            normalize_taxonomy_node(node_raw, index)
            for index, node_raw in enumerate(as_list(axis.get("nodes")))
        ]
        if not axis_nodes:
            continue
        normalized_axes.append(
            {
                **axis,
                "axis_type": axis_type,
                "axis_rationale": first_text(
                    axis.get("axis_rationale"),
                    axis.get("rationale"),
                    axis.get("reason"),
                ),
                "nodes": axis_nodes,
            }
        )
        if axis_index == 0:
            normalized_nodes = axis_nodes
    summary = as_dict(taxonomy.get("summary"))
    return {
        **taxonomy,
        "summary": {
            **summary,
            "text": first_text(
                summary.get("text"),
                summary.get("analysis"),
                summary.get("overview"),
                default="The topic is organized around the main technical routes visible in the resolved paper set.",
            ),
        },
        "axes": normalized_axes,
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
                "source_paper_refs": source_paper_refs(claim, entries),
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
                "source_paper_refs": source_paper_refs(event, entries),
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
                default="The topic timeline is derived from the resolved source papers and core synthesis payload.",
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
                "source_paper_refs": source_paper_refs(row, entries),
            }
        )
    return result


def normalize_debates(rows: list, entries: list[dict]) -> list[dict]:
    result = []
    for index, row_raw in enumerate(rows):
        row = as_dict(row_raw)
        current_judgment = first_text(
            row.get("current_judgment"),
            row.get("synthesis_judgment"),
            row.get("analysis"),
            row.get("summary"),
            row.get("rationale"),
            default="当前证据不足以形成明确判断。",
        )
        normalized = {
            **row,
            "id": first_text(row.get("id"), default=f"debate-{index + 1}"),
            "title": first_text(row.get("title"), row.get("label"), row.get("debate"), default=f"Debate {index + 1}"),
            "current_judgment": current_judgment,
            "source_paper_refs": source_paper_refs(row, entries),
        }
        result.append(normalized)
    return result


def normalize_future_directions(rows: list, entries: list[dict]) -> list[dict]:
    result = []
    for index, row_raw in enumerate(rows):
        row = as_dict(row_raw)
        result.append(
            {
                **row,
                "id": first_text(row.get("id"), default=f"future-{index + 1}"),
                "title": first_text(row.get("title"), default=f"Future Direction {index + 1}"),
                "direction_type": first_text(row.get("direction_type"), default="method_limitation"),
                "current_limitation": first_text(row.get("current_limitation"), default="当前证据显示该方向仍存在未解决限制。"),
                "future_direction": first_text(row.get("future_direction"), default="后续研究需要围绕该限制提出可验证的方法改进。"),
                "rationale": first_text(row.get("rationale"), default="该方向来自当前 source papers 的共同证据边界。"),
                "source_paper_refs": source_paper_refs(row, entries),
            }
        )
    return result


def normalize_review_outline(core: dict, entries: list[dict]) -> dict:
    outline = as_dict(core.get("review_outline"))
    strategies = []
    for index, row_raw in enumerate(as_list(outline.get("writing_strategies"))):
        row = as_dict(row_raw)
        strategies.append(
            {
                **row,
                "id": first_text(row.get("id"), default=f"strategy-{index + 1}"),
                "title": first_text(row.get("title"), default=f"Writing Strategy {index + 1}"),
                "review_thesis": first_text(row.get("review_thesis"), default="Use current source papers to frame a reviewable topic thesis."),
                "writing_strategy": first_text(row.get("writing_strategy"), default="Organize the review around evidence-grounded synthesis routes."),
                "section_plan": as_list(row.get("section_plan")) or ["Define the topic", "Explain evidence-backed routes", "Discuss limitations"],
                "best_for": first_text(row.get("best_for"), default="Topic review writing."),
                "risks": first_text(row.get("risks"), default="Keep claims within source-paper support."),
                "source_paper_refs": source_paper_refs(row, entries),
            }
        )
    if not strategies:
        strategies = [
            {
                "id": "strategy-1",
                "title": "Evidence-grounded review",
                "review_thesis": "Use the resolved source papers to frame a focused topic review.",
                "writing_strategy": "Start from topic definition, organize evidence-backed routes, and separate coverage limitations from supported findings.",
                "section_plan": ["Define the topic", "Organize evidence-backed routes", "Discuss coverage limitations"],
                "best_for": "A compact topic review.",
                "risks": "Do not generalize beyond the resolved evidence.",
                "source_paper_refs": [],
            }
        ]
    recommended = first_text(outline.get("recommended_strategy_id"), default=strategies[0]["id"])
    known = {strategy["id"] for strategy in strategies}
    if recommended not in known:
        recommended = strategies[0]["id"]
    return {
        "topic_importance": first_text(
            outline.get("topic_importance"),
            default="This topic is worth reviewing because the resolved papers form a coherent evidence boundary.",
        ),
        "writing_strategies": strategies,
        "recommended_strategy_id": recommended,
    }


def normalize_improvement_dimensions(core: dict, entries: list[dict]) -> dict:
    summary = as_dict(core.get("improvement_dimension_summary"))
    rows = as_list(core.get("improvement_dimensions")) or [
        {
            "id": "dimension-1",
            "title": "Evidence organization",
            "analysis": "Runtime fallback dimension for the resolved workset.",
        }
    ]
    dimensions = []
    for index, row_raw in enumerate(rows):
        row = as_dict(row_raw)
        analysis = first_text(
            row.get("analysis"),
            row.get("rationale"),
            row.get("description"),
            row.get("summary"),
            default="Runtime-normalized improvement dimension analysis.",
        )
        normalized = {
            **row,
            "id": first_text(row.get("id"), default=f"dimension-{index + 1}"),
            "title": first_text(row.get("title"), row.get("dimension"), row.get("gap"), default=f"Dimension {index + 1}"),
            "analysis": analysis,
            "source_paper_refs": source_paper_refs(row, entries),
        }
        normalized.pop("summary", None)
        normalized.pop("label", None)
        dimensions.append(normalized)
    return {
        "summary": {
            **summary,
            "text": first_text(
                summary.get("text"),
                summary.get("summary"),
                summary.get("analysis"),
                summary.get("overview"),
                default="Improvement dimensions are derived from the core synthesis payload.",
            ),
        },
        "dimensions": dimensions,
    }


def summary_text(value: Any) -> str:
    data = as_dict(value)
    return first_text(
        data.get("text"),
        data.get("summary"),
        data.get("analysis"),
        data.get("overview"),
        value if isinstance(value, str) else "",
    )


def markdown_list(items: Any, *, indent: int = 0, bullet: str = "-") -> list[str]:
    prefix = " " * indent + bullet
    lines: list[str] = []
    for item in as_list(items):
        text = clean_text(item)
        if text:
            lines.append(f"{prefix} {text}")
    return lines


def numbered_list(items: Any, *, indent: int = 2) -> list[str]:
    prefix = " " * indent
    lines: list[str] = []
    for index, item in enumerate(as_list(items), start=1):
        text = clean_text(item)
        if text:
            lines.append(f"{prefix}{index}. {text}")
    return lines


def source_paper_number_map(source_papers: list[dict]) -> dict[str, int]:
    result: dict[str, int] = {}
    for index, paper_raw in enumerate(source_papers, start=1):
        paper = as_dict(paper_raw)
        paper_ref = clean_text(paper.get("paper_ref"))
        if paper_ref and paper_ref not in result:
            result[paper_ref] = index
    return result


def refs_markdown(refs: Any, ref_numbers: dict[str, int]) -> str:
    rendered: list[str] = []
    for ref in as_list(refs):
        paper_ref = clean_text(ref)
        number = ref_numbers.get(paper_ref)
        link = f"[\\[{number}\\]](#ref-{number})" if number else ""
        if link and link not in rendered:
            rendered.append(link)
    return ", ".join(rendered) if rendered else "未标注"


def refs_line(label: str, refs: Any, ref_numbers: dict[str, int]) -> str:
    return f"- {label}：{refs_markdown(refs, ref_numbers)}"


def role_icon(role: Any) -> str:
    normalized = clean_text(role).lower()
    if normalized == "core":
        return ":red_circle:"
    if normalized == "related":
        return ":orange_circle:"
    if normalized in {"external", "peripheral"}:
        return ":blue_circle:"
    if normalized in {"irrelevant", "excluded"}:
        return ":brown_circle:"
    return ":white_circle:"


def append_paragraph(lines: list[str], text: Any) -> None:
    value = clean_text(text)
    if value:
        lines.extend([value, ""])


def report_body(args: dict) -> str:
    topic = as_dict(args.get("topic"))
    summary = as_dict(args.get("summary"))
    taxonomy = as_dict(args.get("taxonomy"))
    timeline = as_dict(args.get("timeline"))
    improvement_dimensions = as_dict(args.get("improvement_dimensions"))
    coverage = as_dict(args.get("coverage"))
    review_outline = as_dict(args.get("review_outline"))
    source_papers = [as_dict(paper) for paper in as_list(args.get("source_papers"))]
    ref_numbers = source_paper_number_map(source_papers)

    title = first_text(topic.get("title"), default="Topic Synthesis")
    lines: list[str] = [f"# {title}", ""]
    append_paragraph(lines, topic.get("definition"))

    include = as_list(as_dict(topic.get("scope_boundary")).get("include"))
    if include:
        lines.extend(["子领域：", ""])
        lines.extend(markdown_list(include))
        lines.append("")

    lines.extend(["## 技术路线", ""])
    for node_raw in as_list(taxonomy.get("nodes")):
        node = as_dict(node_raw)
        lines.extend([f"### {first_text(node.get('title'), default='未命名技术路线')}", ""])
        lines.append(f"- 定义：{first_text(node.get('definition'), default='')}")
        lines.append(f"- 核心问题：{first_text(node.get('core_problem'), default='')}")
        lines.append(f"- 机理：{first_text(node.get('mechanism'), default='')}")
        lines.append("- 优势：")
        lines.extend(markdown_list(node.get("strengths"), indent=2, bullet="*"))
        lines.append("- 局限性：")
        lines.extend(markdown_list(node.get("limitations"), indent=2, bullet="*"))
        refs = as_list(node.get("representative_papers")) or as_list(node.get("source_paper_refs"))
        lines.append(refs_line("代表文献", refs, ref_numbers))
        lines.append("")

    lines.extend(["## 时间线", ""])
    append_paragraph(lines, summary_text(timeline.get("summary")))
    for event_raw in as_list(timeline.get("events")):
        event = as_dict(event_raw)
        label = first_text(event.get("label"), event.get("title"), default="未命名事件")
        year = first_text(event.get("year"), default="")
        phase = first_text(event.get("phase"), default="")
        lines.extend([f"### {label} ({year}) —— *{phase}*", ""])
        lines.append(f"- 主要成果：{first_text(event.get('description'), default='')}")
        lines.append(f"- 历史意义：{first_text(event.get('historical_role'), default='')}")
        lines.append(refs_line("代表文献", event.get("source_paper_refs"), ref_numbers))
        lines.append("")

    lines.extend(["## 核心结论", ""])
    for claim_raw in as_list(args.get("claims")):
        claim = as_dict(claim_raw)
        scope = first_text(claim.get("scope"), claim.get("applicability"), default="当前证据范围")
        lines.extend([f"### {scope}", ""])
        lines.append(f"- 论点：{first_text(claim.get('text'), default='')}")
        lines.append(f"- 论据：{first_text(claim.get('analysis'), default='')}")
        lines.append("- 局限性：")
        lines.extend(markdown_list(claim.get("limitations"), indent=2, bullet="*"))
        lines.append(refs_line("证据文献", claim.get("source_paper_refs"), ref_numbers))
        lines.append("")

    lines.extend(["## 研究维度", ""])
    for dimension_raw in as_list(improvement_dimensions.get("dimensions")):
        dimension = as_dict(dimension_raw)
        lines.extend([f"### {first_text(dimension.get('title'), default='未命名维度')}", ""])
        append_paragraph(lines, dimension.get("analysis"))
        lines.extend([f"主要文献：{refs_markdown(dimension.get('source_paper_refs'), ref_numbers)}", ""])

    lines.extend(["## 争论", ""])
    for debate_raw in as_list(args.get("debates")):
        debate = as_dict(debate_raw)
        lines.extend([f"### {first_text(debate.get('title'), default='未命名争论')}", ""])
        append_paragraph(lines, debate.get("current_judgment"))
        lines.extend([f"主要文献：{refs_markdown(debate.get('source_paper_refs'), ref_numbers)}", ""])

    lines.extend(["## 未来研究方向", ""])
    for direction_raw in as_list(args.get("future_directions")):
        direction = as_dict(direction_raw)
        lines.extend([f"### {first_text(direction.get('title'), default='未命名方向')}", ""])
        append_paragraph(lines, direction.get("current_limitation"))
        append_paragraph(lines, direction.get("rationale"))
        append_paragraph(lines, direction.get("future_direction"))
        lines.extend([f"主要文献：{refs_markdown(direction.get('source_paper_refs'), ref_numbers)}", ""])

    lines.extend(["## 综述指导框架", ""])
    append_paragraph(lines, review_outline.get("topic_importance"))
    for strategy_raw in as_list(review_outline.get("writing_strategies")):
        strategy = as_dict(strategy_raw)
        lines.extend([f"### {first_text(strategy.get('title'), default='未命名写作策略')}", ""])
        lines.append(f"- 综述主线：{first_text(strategy.get('review_thesis'), default='')}")
        lines.append(f"- 写作策略：{first_text(strategy.get('writing_strategy'), default='')}")
        lines.append("- 组织方案：")
        lines.extend(numbered_list(strategy.get("section_plan"), indent=2))
        lines.append(f"- 适合：{first_text(strategy.get('best_for'), default='')}")
        lines.append(f"- 注意事项：{first_text(strategy.get('risks'), default='')}")
        lines.append(refs_line("参考文献", strategy.get("source_paper_refs"), ref_numbers))
        lines.append("")

    lines.extend(["## 库内文献覆盖度及不足", ""])
    verdict = first_text(coverage.get("coverage_verdict"), default="unknown")
    lines.extend([f"### 库内材料覆盖度分析：{verdict}", ""])
    append_paragraph(lines, coverage.get("coverage_reason"))
    lines.extend(["### 二级引文分析", ""])
    append_paragraph(lines, coverage.get("external_context_summary"))
    lines.extend(["### 缺口提示", ""])
    caveat_lines = []
    for caveat_raw in as_list(coverage.get("coverage_caveats")):
        caveat = as_dict(caveat_raw)
        caveat_type = first_text(caveat.get("type"), default="coverage")
        note = first_text(caveat.get("note"), caveat.get("reason"), default="")
        if note:
            caveat_lines.append(f"- {caveat_type}：{note}")
    lines.extend(caveat_lines or ["- coverage：当前 coverage payload 未提供缺口说明。"])
    lines.append("")

    lines.extend(["### 建议补充方向", ""])
    for suggestion_raw in as_list(coverage.get("suggested_collection_directions")):
        suggestion = as_dict(suggestion_raw)
        direction = first_text(suggestion.get("direction"), default="补充方向")
        priority = first_text(suggestion.get("priority"), default="unspecified")
        lines.extend([f"#### {direction} (重要度：{priority})", ""])
        append_paragraph(lines, suggestion.get("reason"))
        terms = markdown_list(suggestion.get("example_titles_or_terms"))
        if terms:
            lines.extend(["关键词：", ""])
            lines.extend(terms)
            lines.append("")

    lines.extend(["## 总结", ""])
    append_paragraph(lines, first_text(summary.get("summary"), summary.get("brief")))
    takeaways = markdown_list(summary.get("key_takeaways"))
    if takeaways:
        lines.extend(["要点：", ""])
        lines.extend(takeaways)
        lines.append("")

    lines.extend(["## 文献列表", ""])
    for index, paper_raw in enumerate(source_papers, start=1):
        paper = as_dict(paper_raw)
        paper_title = first_text(paper.get("title"), paper.get("paper_ref"), default=f"Source Paper {index}")
        year = first_text(paper.get("year"), default="")
        paper_ref = first_text(paper.get("paper_ref"), default="")
        lines.append(
            f"- <a id=\"ref-{index}\"></a>[{index}] *{paper_title}* ({year}) {{{paper_ref}}} {role_icon(paper.get('synthesis_role'))}"
        )

    return "\n".join(lines).strip() + "\n"


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
    source_papers = normalize_source_papers(conn, run_root)
    topic = normalize_topic_section(topic_definition)
    summary = {
        "brief": first_text(summary_payload.get("summary_brief"), default=f"{topic['title']} synthesis."),
        "summary": first_text(summary_payload.get("summary_overview"), summary_payload.get("summary_brief"), default=f"Structured synthesis for {topic['title']}."),
        "key_takeaways": as_list(summary_payload.get("key_takeaways")) or ["The topic artifact was generated by the split gated runtime."],
    }
    taxonomy = normalize_taxonomy(core, entries)
    claims = normalize_claims(core, entries)
    timeline = normalize_timeline(core, entries)
    improvement_dimensions = normalize_improvement_dimensions(core, entries)
    debates = normalize_debates(as_list(core.get("debates")), entries)
    future_directions = normalize_future_directions(as_list(core.get("future_directions")), entries)
    review_outline = normalize_review_outline(core, entries)
    coverage_verdict = clean_text(coverage_payload.get("coverage_verdict"), "unknown")
    coverage = {
        "coverage_verdict": coverage_verdict,
        "coverage_reason": first_text(coverage_payload.get("coverage_reason"), default="Runtime coverage assessment was not detailed."),
        "coverage_caveats": as_list(coverage_payload.get("coverage_caveats")),
        "external_context_summary": first_text(coverage_payload.get("external_context_summary"), default=""),
        "suggested_collection_directions": as_list(coverage_payload.get("suggested_collection_directions")),
    }
    report = {
        "title": f"{topic['title']} Synthesis Report",
        "body": report_body({
            "topic": topic,
            "summary": summary,
            "taxonomy": taxonomy,
            "claims": claims,
            "timeline": timeline,
            "improvement_dimensions": improvement_dimensions,
            "debates": debates,
            "future_directions": future_directions,
            "review_outline": review_outline,
            "coverage": coverage,
            "entries": entries,
            "source_papers": source_papers,
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
        "taxonomy": taxonomy,
        "improvement_dimensions": improvement_dimensions,
        "claims": claims,
        "timeline_events": timeline,
        "source_papers": source_papers,
        "debates": debates,
        "coverage": coverage,
        "future_directions": future_directions,
        "review_outline": review_outline,
        "statistics": {
            "paper_count": len(entries),
            "time_span": source_paper_time_span(source_papers),
            "route_coverage": {"routes": len(as_list(taxonomy.get("nodes")))},
            "coverage_verdict": coverage_verdict,
        },
        "synthesis_report": report,
        "source_artifacts": {
            "resolver_manifest": artifact_entry(conn, "resolver_manifest"),
            "prepare_handoff": artifact_entry(conn, "prepare_analysis_context_payload"),
            "core_handoff": artifact_entry(conn, "stage_50_kg_enrichment_payload"),
        },
        "diagnostics": [],
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
    write_json(run_root / "result/sections/coverage.json", payload)
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="coverage_section", path="result/sections/coverage.json", hash_value="")
    return {"coverage_path": "result/sections/coverage.json"}


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
            "prospective_topic_relation_proposals",
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
    }
    write_json(run_root / "result/topic-analysis.json", manifest)
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="topic_analysis_manifest", path="result/topic-analysis.json", hash_value="")
    resolver = artifact_entry(conn, "resolver_manifest")
    artifact_manifest_path = "result/topic-synthesis-artifacts.json"
    artifact_manifest = {
        "resolver_manifest": resolver["path"] if resolver else "runtime/payloads/resolver.json",
        "topic_analysis": "result/topic-analysis.json",
        "final_output_candidate": "result/final-output.candidate.json",
    }
    for section_key, entry in sections.items():
        if isinstance(entry, dict) and entry.get("path"):
            artifact_manifest[f"{section_key}_section"] = entry["path"]
    for sidecar_key, entry in sidecars.items():
        if isinstance(entry, dict) and entry.get("path"):
            artifact_manifest[f"{sidecar_key}_sidecar"] = entry["path"]
    final = {
        "kind": "topic_synthesis",
        "operation": operation,
        "language": get_meta(conn, "language", "zh-CN"),
        "topic_definition": topic,
        "artifact_manifest_path": artifact_manifest_path,
    }
    if operation == "update_full":
        final["base_hashes"] = get_meta(conn, "base_hashes", {})
    write_json(run_root / artifact_manifest_path, artifact_manifest)
    write_json(run_root / "result/final-output.candidate.json", final)
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="artifact_manifest", path=artifact_manifest_path, hash_value="")
    register_artifact(conn, skill_id=skill_id, stage_id=stage_id, key="final_candidate", path="result/final-output.candidate.json", hash_value="")
    record_stage(conn, skill_id=skill_id, stage_id="stage_12_completed", result={"final_output_path": "result/final-output.candidate.json"})
    return final


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
    if operation == "update_full":
        return operation
    if default == "update_full":
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

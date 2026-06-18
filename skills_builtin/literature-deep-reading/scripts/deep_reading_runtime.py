from __future__ import annotations

import argparse
import base64
import difflib
import hashlib
import html
import json
import mimetypes
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

DB_PATH = Path("runtime/literature-deep-reading.sqlite")
VIEWS_DIR = Path("runtime/views")
SOURCE_DIR = Path("runtime/source")
PAYLOADS_DIR = Path("runtime/payloads")
TRANSLATION_BATCHES_DIR = PAYLOADS_DIR / "translation-batches"
RESULT_PATH = Path("literature-deep-reading.result.json")
RESULT_DIR = Path("result")
RESULT_SECTIONS_DIR = RESULT_DIR / "sections"
FINAL_HTML_PATH = RESULT_DIR / "deep-reading.html"
MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)\n]+)\)")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", re.IGNORECASE)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
REFERENCES_HEADING_RE = re.compile(r"\b(references|bibliography)\b|参考文献", re.IGNORECASE)
APPENDIX_HEADING_RE = re.compile(r"\b(appendix|appendices|supplementary\s+material|supplemental\s+material|supplementary\s+information)\b|附录", re.IGNORECASE)
APPENDIX_LETTER_HEADING_RE = re.compile(r"^(?:appendix\s+)?[A-Z](?:\.\d+(?:\.\d+)*)?(?:\s+|\.?\s*$)", re.IGNORECASE)
REFERENCE_ENTRY_RE = re.compile(r"^\s*(?:\[(\d{1,4})\]|(\d{1,4})[\.)])\s+(.+?)\s*$")
DISPLAY_MATH_RE = re.compile(r"\$\$\s*([\s\S]*?)\s*\$\$")
INLINE_MATH_RE = re.compile(r"(?<!\$)\$([^$\n]+?)\$(?!\$)")
FIGURE_CAPTION_RE = re.compile(r"^\s*(?:fig(?:ure)?\.?|图)\s*\d*", re.IGNORECASE)
TABLE_CAPTION_RE = re.compile(r"^\s*(?:table|表)\s*\d*", re.IGNORECASE)
REFERENCE_DIGEST_POLICIES = {"all_library_references", "priority_only", "none"}
CITATION_DIRECTIONS = {"incoming", "outgoing", "both"}
READING_ENRICHMENT_FIELDS = {
    "preface_title",
    "preface_cards",
    "preface_reading_path",
    "preface_goal",
    "preface_concepts",
    "preface_warnings",
    "preface_questions",
    "section_notes",
    "concepts",
    "reference_digest_notes",
    "summary_fallback_enabled",
    "summary_fallback_sections",
    "extensions",
}
BLOCK_TRANSLATION_FIELDS = {"translations"}
BLOCK_TRANSLATION_ROW_FIELDS = {"block_id", "translated_markdown", "quality_notes"}
FORMULA_BLOCK_KINDS = {"formula"}
FINAL_REVIEW_FIELDS = {"overall_assessment", "quality_observations"}
FINAL_REVIEW_OBSERVATION_FIELDS = {"severity", "kind", "block_id", "section_anchor", "message"}
FINAL_REVIEW_ASSESSMENTS = {"ready", "ready_with_notes", "needs_revision"}
FINAL_REVIEW_SEVERITIES = {"info", "warning", "error"}
TRANSLATION_BATCH_MAX_WORDS = 1600
TRANSLATION_BATCH_MAX_CHARS = 6000
TRANSLATION_BATCH_MAX_BLOCKS = 20
PREFACE_SLOT_DEFINITIONS = [
    ("research_field", "研究领域", "定位论文所在的上位研究领域。"),
    ("research_direction", "研究方向", "说明论文所属方向及其与领域的关系。"),
    ("paper_position", "本文位置", "概括本文在相关主题中的作用和贡献位置。"),
    ("core_innovation", "核心创新", "总结本文解决的问题、核心贡献及其奠基作用。"),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def compact_command_output(value: Any) -> Any:
    if not isinstance(value, dict):
        return value
    if set(value).issubset({"ok", "errors"}):
        return value
    result = dict(value)
    views = result.get("views")
    if isinstance(views, dict):
        result["views"] = {
            key: path
            for key, path in views.items()
            if isinstance(path, str) or path is None
        }
    for key in ["reading_blocks", "translation", "citation_graph", "html", "sections"]:
        if key in result and not isinstance(result.get(key), (str, int, float, bool, type(None))):
            result[f"{key}_omitted"] = True
            result.pop(key, None)
    return result


def print_json(value: Any) -> None:
    print(json.dumps(compact_command_output(value), ensure_ascii=False, indent=2))


def normalize_posix(path: Path | str) -> str:
    return str(path).replace("\\", "/")


def resolve_input_path(raw: str, input_path: Path) -> Path:
    candidate = Path(raw)
    if candidate.is_absolute():
        return candidate
    input_relative = (input_path.parent / candidate).resolve()
    if input_relative.exists():
        return input_relative
    return (Path.cwd() / candidate).resolve()


def request_input_from_manifest(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    request_input = value.get("input")
    return request_input if isinstance(request_input, dict) else {}


def request_parameter_from_manifest(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    request_parameter = value.get("parameter")
    return request_parameter if isinstance(request_parameter, dict) else {}


def audit_input_manifest_candidates(input_path: Path, skill_id: str) -> list[Path]:
    run_root = Path.cwd()
    candidates: list[Path] = []
    audit_root = run_root / ".audit"
    if skill_id:
        candidates.extend(sorted(audit_root.glob(f"{skill_id}*/input_manifest.json")))
    candidates.extend(sorted(audit_root.glob("*/input_manifest.json")))
    seen: set[Path] = set()
    unique: list[Path] = []
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except Exception:
            resolved = candidate
        if resolved in seen:
            continue
        seen.add(resolved)
        unique.append(candidate)
    return unique


def hydrate_input_from_audit_manifest(input_payload: dict[str, Any], input_path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    hydrated = dict(input_payload)
    parameter = hydrated.get("parameter") if isinstance(hydrated.get("parameter"), dict) else {}
    hydrated_parameter = dict(parameter)
    diagnostics: list[dict[str, Any]] = []
    for candidate in audit_input_manifest_candidates(input_path, "literature-deep-reading"):
        if not candidate.exists() or not candidate.is_file():
            continue
        try:
            manifest = read_json(candidate, {})
        except Exception as exc:
            diagnostics.append({"severity": "warning", "code": "input_manifest_read_failed", "path": normalize_posix(candidate), "message": str(exc)})
            continue
        manifest_input = request_input_from_manifest(manifest)
        manifest_parameter = request_parameter_from_manifest(manifest)
        changed: list[str] = []
        for key in ["source_bundle_path", "translator_alignment_path", "translator_output_path", "translator_status"]:
            if clean_text(hydrated.get(key)):
                continue
            value = manifest_input.get(key)
            if value is None:
                continue
            hydrated[key] = value
            changed.append(key)
        for key in ["target_language"]:
            if clean_text(hydrated_parameter.get(key)) or clean_text(hydrated.get(key)):
                continue
            value = manifest_parameter.get(key)
            if value is None:
                continue
            hydrated_parameter[key] = value
            changed.append(f"parameter.{key}")
        if changed:
            hydrated["parameter"] = hydrated_parameter
            diagnostics.append({"severity": "info", "code": "input_hydrated_from_audit_manifest", "path": normalize_posix(candidate), "fields": changed})
            try:
                write_json(input_path, hydrated)
            except Exception as exc:
                diagnostics.append({"severity": "warning", "code": "runtime_input_writeback_failed", "path": normalize_posix(input_path), "message": str(exc)})
        break
    return hydrated, diagnostics


def is_object(value: Any) -> bool:
    return isinstance(value, dict)


def as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def creator_name(value: Any) -> str:
    if isinstance(value, str):
        return clean_text(value)
    if not isinstance(value, dict):
        return ""
    full_name = first_text(value.get("name"), value.get("fullName"), value.get("full_name"))
    if full_name:
        return full_name
    first = first_text(value.get("firstName"), value.get("first_name"), value.get("given"))
    last = first_text(value.get("lastName"), value.get("last_name"), value.get("family"))
    return " ".join(part for part in [first, last] if part).strip()


def normalize_author_list(value: Any) -> list[str]:
    if isinstance(value, str):
        return [clean_text(value)] if clean_text(value) else []
    authors: list[str] = []
    for entry in as_list(value):
        name = creator_name(entry)
        if name:
            authors.append(name)
    return authors


def authors_from_record(record: dict[str, Any]) -> list[str]:
    for key in ["authors", "author", "creators", "creator"]:
        authors = normalize_author_list(record.get(key))
        if authors:
            return authors
    return []


def first_text(*values: Any) -> str:
    for value in values:
        text = clean_text(value)
        if text:
            return text
    return ""


def safe_int(value: Any, fallback: int) -> int:
    try:
        if value is None or value == "":
            return fallback
        return int(value)
    except (TypeError, ValueError):
        return fallback


def clamp_int(value: Any, fallback: int, minimum: int, maximum: int) -> int:
    parsed = safe_int(value, fallback)
    return max(minimum, min(maximum, parsed))


def read_view(name: str, default: Any = None) -> Any:
    return read_json(VIEWS_DIR / name, default)


def source_manifest() -> dict[str, Any]:
    value = read_json(SOURCE_DIR / "source-manifest.json", {})
    return value if isinstance(value, dict) else {}


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
    raise FileNotFoundError(f"Host Bridge CLI not found under {bridge_dir}")


def run_bridge_json(run_root: Path, subcommand: list[str], payload: dict[str, Any], input_name: str) -> dict[str, Any]:
    bridge = bridge_executable(run_root)
    input_path = PAYLOADS_DIR / input_name
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
        raise RuntimeError(stdout or completed.stderr or f"Host Bridge CLI exited with {completed.returncode}")
    parsed = json.loads(stdout or "{}")
    if isinstance(parsed, dict) and parsed.get("ok") is False:
        raise RuntimeError(json.dumps(parsed.get("error") or parsed, ensure_ascii=False))
    return parsed if isinstance(parsed, dict) else {"value": parsed}


def unwrap_bridge_data(output: dict[str, Any]) -> dict[str, Any]:
    data = output.get("data") if isinstance(output.get("data"), dict) else output
    if isinstance(data, dict) and isinstance(data.get("result"), dict):
        return data["result"]
    if isinstance(data, dict) and isinstance(data.get("data"), dict):
        return data["data"]
    return data if isinstance(data, dict) else {"value": data}


def safe_extract_zip(bundle_path: Path, extract_dir: Path) -> list[str]:
    if extract_dir.exists():
        shutil.rmtree(extract_dir)
    extract_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[str] = []
    root = extract_dir.resolve()
    with zipfile.ZipFile(bundle_path) as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            target = (extract_dir / member.filename).resolve()
            try:
                target.relative_to(root)
            except ValueError as exc:
                raise ValueError(f"Unsafe zip member path: {member.filename}") from exc
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as source, target.open("wb") as dest:
                shutil.copyfileobj(source, dest)
            extracted.append(member.filename.replace("\\", "/"))
    return sorted(extracted)


def slugify(title: str, used: dict[str, int]) -> str:
    base = re.sub(r"[^\w]+", "-", title.lower(), flags=re.UNICODE).strip("-")
    if not base:
        base = "section"
    anchor = f"sec-{base}"
    count = used.get(anchor, 0)
    used[anchor] = count + 1
    if count:
        return f"{anchor}-{count + 1}"
    return anchor


def loose_slug(text: str, prefix: str) -> str:
    base = re.sub(r"[^\w]+", "-", text.lower(), flags=re.UNICODE).strip("-")
    return f"{prefix}-{base or 'item'}"


def stable_id(prefix: str, text: str, used: set[str]) -> str:
    base = loose_slug(text, prefix)
    candidate = base
    counter = 2
    while candidate in used:
        candidate = f"{base}-{counter}"
        counter += 1
    used.add(candidate)
    return candidate


def block_text(block: dict[str, Any]) -> str:
    return str(block.get("source_markdown") or "").strip()


def render_latex_fragment(content: str, display: bool) -> str:
    latex = content.strip()
    try:
        from latex2mathml.converter import convert  # type: ignore

        mathml = convert(latex, display="block" if display else "inline")
        tag = "div" if display else "span"
        mode = "display" if display else "inline"
        return f'<{tag} class="math math-{mode}" role="math">{mathml}</{tag}>'
    except Exception:  # noqa: BLE001
        tag = "div" if display else "span"
        mode = "display" if display else "inline"
        return f'<{tag} class="math math-{mode} math-fallback" role="math"><span class="math-source">{html.escape(latex)}</span></{tag}>'


def render_math_text(text: str) -> str:
    placeholders: list[str] = []

    def display_repl(match: re.Match[str]) -> str:
        content = match.group(1).strip()
        placeholders.append(render_latex_fragment(content, display=True))
        return f"\u0000MATH{len(placeholders) - 1}\u0000"

    def inline_repl(match: re.Match[str]) -> str:
        content = match.group(1).strip()
        placeholders.append(render_latex_fragment(content, display=False))
        return f"\u0000MATH{len(placeholders) - 1}\u0000"

    protected = DISPLAY_MATH_RE.sub(display_repl, text)
    protected = INLINE_MATH_RE.sub(inline_repl, protected)
    escaped = html.escape(protected)
    for index, value in enumerate(placeholders):
        escaped = escaped.replace(html.escape(f"\u0000MATH{index}\u0000"), value)
    return escaped


def split_structured_caption(markdown: str, kind: str) -> tuple[str, str]:
    text = str(markdown or "").strip()
    if not text:
        return "", ""
    pattern = TABLE_CAPTION_RE if kind == "table" else FIGURE_CAPTION_RE
    parts = [part.strip() for part in re.split(r"\n\s*\n", text) if part.strip()]
    captions: list[str] = []
    body_parts: list[str] = []
    for part in parts:
        if pattern.search(part):
            captions.append(part)
        else:
            body_parts.append(part)
    if not body_parts:
        return "", "\n\n".join(captions)
    return "\n\n".join(body_parts), "\n\n".join(captions)


def split_html_table_prefix_suffix(markdown: str) -> tuple[str, str, str]:
    text = str(markdown or "").strip()
    match = re.search(r"<table\b[\s\S]*?</table>", text, re.IGNORECASE)
    if not match:
        return text, "", ""
    return text[: match.start()].strip(), match.group(0).strip(), text[match.end() :].strip()


def sanitize_table_html(table_html: str) -> str:
    text = str(table_html or "").strip()
    allowed = {
        "table",
        "thead",
        "tbody",
        "tfoot",
        "tr",
        "td",
        "th",
        "caption",
        "colgroup",
        "col",
        "br",
        "strong",
        "em",
        "b",
        "i",
        "sup",
        "sub",
        "span",
    }
    void_tags = {"br", "col"}

    class TableSanitizer(HTMLParser):
        def __init__(self) -> None:
            super().__init__(convert_charrefs=True)
            self.parts: list[str] = []

        def safe_attrs(self, name: str, attrs: list[tuple[str, str | None]]) -> str:
            if name not in {"td", "th"}:
                return ""
            parts = []
            for attr_name, attr_value in attrs:
                lower = attr_name.lower()
                value = str(attr_value or "")
                if lower in {"rowspan", "colspan"} and re.fullmatch(r"\d{1,3}", value):
                    parts.append(f' {lower}="{html.escape(value)}"')
            return "".join(parts)

        def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
            name = tag.lower()
            if name not in allowed:
                self.parts.append(html.escape(self.get_starttag_text() or f"<{tag}>"))
                return
            self.parts.append(f"<{name}{self.safe_attrs(name, attrs)}>")

        def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
            name = tag.lower()
            if name not in allowed:
                self.parts.append(html.escape(self.get_starttag_text() or f"<{tag}/>"))
                return
            if name in void_tags:
                self.parts.append(f"<{name}{self.safe_attrs(name, attrs)}>")
            else:
                self.parts.append(f"<{name}{self.safe_attrs(name, attrs)}></{name}>")

        def handle_endtag(self, tag: str) -> None:
            name = tag.lower()
            if name in allowed and name not in void_tags:
                self.parts.append(f"</{name}>")

        def handle_data(self, data: str) -> None:
            self.parts.append(render_math_text(data))

    parser = TableSanitizer()
    parser.feed(text)
    parser.close()
    return "".join(parser.parts)


def render_table_markdown(markdown: str) -> str:
    lines = [line for line in str(markdown or "").splitlines() if line.strip()]
    rows = []
    for row_index, line in enumerate(lines):
        if row_index == 1 and re.match(r"^\s*\|?[\s:-]+\|", line or ""):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        tag = "th" if row_index == 0 else "td"
        rows.append("<tr>" + "".join(f"<{tag}>{render_inline_markdown(cell)}</{tag}>" for cell in cells) + "</tr>")
    return "<table>" + "".join(rows) + "</table>"


def render_structured_table(markdown: str) -> str:
    prefix, table_html, suffix = split_html_table_prefix_suffix(markdown)
    caption_parts = [part for part in [prefix, suffix] if TABLE_CAPTION_RE.search(part)]
    if table_html:
        table = sanitize_table_html(table_html)
        caption_html = "".join(f'<figcaption>{render_inline_markdown(part)}</figcaption>' for part in caption_parts)
        return f'<figure class="table-block">{caption_html}{table}</figure>'
    body, caption = split_structured_caption(markdown, "table")
    if not body:
        body = markdown
    if len(body.splitlines()) >= 2 and "|" in body.splitlines()[0] and "|" in body.splitlines()[1]:
        table = render_table_markdown(body)
        caption_html = f'<figcaption>{render_inline_markdown(caption)}</figcaption>' if caption else ""
        return f'<figure class="table-block">{caption_html}{table}</figure>'
    return "\n".join(f"<p>{render_inline_markdown(part.strip())}</p>" for part in re.split(r"\n\s*\n", markdown) if part.strip())


def render_structured_image(markdown: str) -> str:
    body, caption = split_structured_caption(markdown, "image")
    source = body or markdown
    image_match = re.search(r"!\[([^\]]*)\]\(([^)]+)\)", source)
    if image_match:
        alt = html.escape(image_match.group(1))
        src = html.escape(image_match.group(2).strip())
        caption_html = f'<figcaption>{render_inline_markdown(caption)}</figcaption>' if caption else ""
        return f'<figure class="image-block"><img class="paper-image" src="" data-image-src="{src}" alt="{alt}">{caption_html}</figure>'
    html_match = HTML_IMAGE_RE.search(source)
    if html_match:
        src = html.escape(html_match.group(1).strip())
        caption_html = f'<figcaption>{render_inline_markdown(caption)}</figcaption>' if caption else ""
        return f'<figure class="image-block"><img class="paper-image" src="" data-image-src="{src}" alt="">{caption_html}</figure>'
    return "\n".join(f"<p>{render_inline_markdown(part.strip())}</p>" for part in re.split(r"\n\s*\n", markdown) if part.strip())


def render_inline_markdown(text: str) -> str:
    rendered = render_math_text(text)
    rendered = re.sub(r"`([^`]+)`", lambda m: f"<code>{html.escape(m.group(1))}</code>", rendered)
    rendered = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", rendered)
    rendered = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", rendered)
    return rendered


def render_markdown_fragment(markdown: str, kind: str = "paragraph", section_anchor: str = "") -> str:
    raw = str(markdown or "")
    stripped = raw.strip()
    if not stripped:
        return ""
    if kind == "table":
        return render_structured_table(stripped)
    if kind == "image":
        return render_structured_image(stripped)
    if stripped.startswith("$$") and stripped.endswith("$$"):
        return render_math_text(stripped)
    image_match = re.match(r"^!\[([^\]]*)\]\(([^)]+)\)", stripped)
    if image_match:
        alt = html.escape(image_match.group(1))
        src = html.escape(image_match.group(2).strip())
        return f'<img class="paper-image" src="" data-image-src="{src}" alt="{alt}">'
    heading = HEADING_RE.match(stripped)
    if heading:
        level = len(heading.group(1))
        anchor_attr = f' id="{html.escape(section_anchor)}"' if section_anchor else ""
        return f"<h{level}{anchor_attr}>{render_inline_markdown(heading.group(2).strip())}</h{level}>"
    lines = raw.splitlines()
    if len(lines) >= 2 and "|" in lines[0] and re.match(r"^\s*\|?[\s:-]+\|", lines[1] or ""):
        return render_table_markdown(raw)
    return "\n".join(
        f"<p>{render_inline_markdown(part.strip()).replace(chr(10), '<br>')}</p>"
        for part in re.split(r"\n\s*\n", raw)
        if part.strip()
    )


def extract_image_refs(text: str) -> list[str]:
    refs = [match.group(1).strip() for match in MARKDOWN_IMAGE_RE.finditer(text)]
    refs.extend(match.group(1).strip() for match in HTML_IMAGE_RE.finditer(text))
    return refs


def is_caption_text(text: str, kind: str) -> bool:
    stripped = str(text or "").strip()
    if not stripped:
        return False
    pattern = TABLE_CAPTION_RE if kind == "table" else FIGURE_CAPTION_RE
    return bool(pattern.search(stripped))


def is_markdown_table_start(lines: list[str], index: int) -> bool:
    if index + 1 >= len(lines):
        return False
    header = lines[index].strip()
    separator = lines[index + 1].strip()
    return "|" in header and "|" in separator and bool(re.match(r"^\s*\|?[\s:-]+\|", separator))


def collect_following_caption(lines: list[str], index: int, kind: str) -> tuple[str, int]:
    cursor = index
    while cursor < len(lines) and not lines[cursor].strip():
        cursor += 1
    if cursor >= len(lines):
        return "", index
    if not is_caption_text(lines[cursor], kind):
        return "", index
    start = cursor
    collected: list[str] = []
    while cursor < len(lines):
        stripped = lines[cursor].strip()
        if not stripped:
            break
        if cursor > start and (
            HEADING_RE.match(lines[cursor])
            or stripped.startswith("$$")
            or stripped.lower().startswith("<table")
            or is_markdown_table_start(lines, cursor)
            or MARKDOWN_IMAGE_RE.search(lines[cursor])
            or HTML_IMAGE_RE.search(lines[cursor])
        ):
            break
        collected.append(lines[cursor])
        cursor += 1
    return "\n".join(collected).strip(), cursor


def role_for_heading(title: str, current_role: str, bibliography_seen: bool) -> str:
    normalized = clean_text(title).strip()
    if REFERENCES_HEADING_RE.search(normalized):
        return "bibliography"
    if APPENDIX_HEADING_RE.search(normalized):
        return "appendix"
    if current_role == "appendix":
        return "appendix"
    if bibliography_seen and APPENDIX_LETTER_HEADING_RE.match(normalized):
        return "appendix"
    return current_role if current_role in {"main", "bibliography", "appendix"} else "main"


def parse_markdown(markdown: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str | None]:
    lines = markdown.splitlines()
    sections: list[dict[str, Any]] = []
    blocks: list[dict[str, Any]] = []
    used_anchors: dict[str, int] = {}
    current_anchor = "sec-document"
    current_title = "Document"
    current_level = 0
    current_role = "main"
    references_anchor: str | None = None
    bibliography_seen = False

    def ensure_default_section() -> None:
        if not sections:
            sections.append(
                {
                    "section_id": "section-0001",
                    "anchor": current_anchor,
                    "title": current_title,
                    "level": current_level,
                    "order_index": 1,
                    "parent_anchor": "",
                    "source_start_block": "",
                    "source_end_block": "",
                    "role": current_role,
                }
            )

    def add_section(title: str, level: int, role: str) -> str:
        anchor = slugify(title, used_anchors)
        parent_anchor = ""
        for section in reversed(sections):
            if int(section["level"]) < level:
                parent_anchor = str(section["anchor"])
                break
        sections.append(
            {
                "section_id": f"section-{len(sections) + 1:04d}",
                "anchor": anchor,
                "title": title,
                "level": level,
                "order_index": len(sections) + 1,
                "parent_anchor": parent_anchor,
                "source_start_block": "",
                "source_end_block": "",
                "role": role,
            }
        )
        return anchor

    def add_block(kind: str, source: str, section_anchor: str, line_start: int, line_end: int, extra: dict[str, Any] | None = None) -> None:
        block_id = f"block-{len(blocks) + 1:04d}"
        image_refs = extract_image_refs(source)
        block = {
            "block_id": block_id,
            "kind": kind,
            "section_anchor": section_anchor,
            "role": current_role,
            "order_index": len(blocks) + 1,
            "line_start": line_start,
            "line_end": line_end,
            "source_markdown": source,
            "image_refs": image_refs,
            "translate": current_role != "bibliography",
        }
        if extra:
            block.update(extra)
        blocks.append(block)
        for section in sections:
            if section["anchor"] == section_anchor:
                if not section["source_start_block"]:
                    section["source_start_block"] = block_id
                section["source_end_block"] = block_id
                break

    i = 0
    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()
        if not stripped:
            i += 1
            continue
        heading = HEADING_RE.match(raw)
        if heading:
            title = heading.group(2).strip()
            current_level = len(heading.group(1))
            current_title = title
            current_role = role_for_heading(title, current_role, bibliography_seen)
            current_anchor = add_section(title, current_level, current_role)
            if current_role == "bibliography":
                references_anchor = current_anchor
                bibliography_seen = True
            add_block("heading", raw, current_anchor, i + 1, i + 1)
            i += 1
            continue
        ensure_default_section()
        if stripped.startswith("$$"):
            start = i
            collected = [raw]
            i += 1
            while i < len(lines):
                collected.append(lines[i])
                if lines[i].strip().endswith("$$"):
                    i += 1
                    break
                i += 1
            source = "\n".join(collected)
            match = DISPLAY_MATH_RE.search(source)
            add_block("formula", source, current_anchor, start + 1, i, {"latex": match.group(1).strip() if match else source.strip().strip("$").strip()})
            continue
        if stripped.lower().startswith("<table"):
            start = i
            collected = [raw]
            i += 1
            if "</table>" not in raw.lower():
                while i < len(lines):
                    collected.append(lines[i])
                    if "</table>" in lines[i].lower():
                        i += 1
                        break
                    i += 1
            table_body = "\n".join(collected)
            caption, next_i = collect_following_caption(lines, i, "table")
            if caption:
                i = next_i
            source = table_body + (("\n\n" + caption) if caption else "")
            add_block(
                "table",
                source,
                current_anchor,
                start + 1,
                i,
                {"table_markdown_or_html": table_body, "caption_markdown": caption},
            )
            continue
        if is_markdown_table_start(lines, i):
            start = i
            collected = [raw, lines[i + 1]]
            i += 2
            while i < len(lines):
                probe = lines[i]
                if not probe.strip() or "|" not in probe:
                    break
                collected.append(probe)
                i += 1
            table_body = "\n".join(collected)
            caption, next_i = collect_following_caption(lines, i, "table")
            if caption:
                i = next_i
            source = table_body + (("\n\n" + caption) if caption else "")
            add_block(
                "table",
                source,
                current_anchor,
                start + 1,
                i,
                {"table_markdown_or_html": table_body, "caption_markdown": caption},
            )
            continue
        if MARKDOWN_IMAGE_RE.search(raw) or HTML_IMAGE_RE.search(raw):
            start = i
            i += 1
            caption, next_i = collect_following_caption(lines, i, "image")
            if caption:
                i = next_i
            source = raw + (("\n\n" + caption) if caption else "")
            add_block(
                "image",
                source,
                current_anchor,
                start + 1,
                i,
                {"caption_markdown": caption},
            )
            continue
        start = i
        collected: list[str] = []
        while i < len(lines):
            probe = lines[i]
            probe_stripped = probe.strip()
            if not probe_stripped:
                break
            if HEADING_RE.match(probe) or probe_stripped.startswith("$$") or probe_stripped.lower().startswith("<table") or is_markdown_table_start(lines, i):
                break
            if MARKDOWN_IMAGE_RE.search(probe) or HTML_IMAGE_RE.search(probe):
                break
            collected.append(probe)
            i += 1
        add_block("paragraph", "\n".join(collected), current_anchor, start + 1, i)
    return sections, blocks, references_anchor


def alignment_pair_text(pair: Any, key: str) -> str:
    return clean_text(pair.get(key)) if isinstance(pair, dict) else ""


def alignment_block_markdown(block: dict[str, Any], key: str, pair_key: str) -> str:
    direct = clean_text(block.get(key))
    if direct:
        return direct
    lines = [
        alignment_pair_text(pair, pair_key)
        for pair in as_list(block.get("pairs"))
        if alignment_pair_text(pair, pair_key)
    ]
    return "\n".join(lines).strip()


def translator_kind_to_reading_kind(kind: str, source_markdown: str) -> str:
    normalized = clean_text(kind)
    if normalized == "equation":
        return "formula"
    if normalized == "figure_caption" and extract_image_refs(source_markdown):
        return "image"
    if normalized == "abstract":
        return "paragraph"
    if normalized == "bib_item":
        return "paragraph"
    if normalized in {"heading", "paragraph", "table", "list", "image", "formula", "code"}:
        return normalized
    return "paragraph"


def heading_title_from_markdown(source_markdown: str, fallback: str) -> tuple[str, int]:
    match = HEADING_RE.match(source_markdown.strip())
    if match:
        return match.group(2).strip(), len(match.group(1))
    return clean_text(fallback) or "Document", 1


def alignment_to_reading_structure(alignment: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str | None]:
    sections: list[dict[str, Any]] = []
    blocks: list[dict[str, Any]] = []
    used_anchors: dict[str, int] = {}
    current_anchor = "sec-document"
    current_role = "main"
    references_anchor: str | None = None
    bibliography_seen = False

    def ensure_default_section() -> None:
        if not sections:
            sections.append(
                {
                    "section_id": "section-0001",
                    "anchor": current_anchor,
                    "title": "Document",
                    "level": 0,
                    "order_index": 1,
                    "parent_anchor": "",
                    "source_start_block": "",
                    "source_end_block": "",
                    "role": current_role,
                }
            )

    def add_section(title: str, level: int, role: str) -> str:
        anchor = slugify(title, used_anchors)
        parent_anchor = ""
        for section in reversed(sections):
            if int(section["level"]) < level:
                parent_anchor = str(section["anchor"])
                break
        sections.append(
            {
                "section_id": f"section-{len(sections) + 1:04d}",
                "anchor": anchor,
                "title": title,
                "level": level,
                "order_index": len(sections) + 1,
                "parent_anchor": parent_anchor,
                "source_start_block": "",
                "source_end_block": "",
                "role": role,
            }
        )
        return anchor

    for index, raw_block in enumerate(as_list(alignment.get("blocks")), start=1):
        if not isinstance(raw_block, dict):
            continue
        block_id = clean_text(raw_block.get("b")) or f"b_{index:03d}"
        source_markdown = alignment_block_markdown(raw_block, "source_markdown", "src")
        if not source_markdown:
            continue
        source_type = clean_text(raw_block.get("type"))
        if source_type == "heading":
            title, level = heading_title_from_markdown(
                source_markdown,
                clean_text(raw_block.get("heading")),
            )
            current_role = role_for_heading(title, current_role, bibliography_seen)
            current_anchor = add_section(title, level, current_role)
            if current_role == "bibliography":
                references_anchor = current_anchor
                bibliography_seen = True
        else:
            ensure_default_section()
        kind = translator_kind_to_reading_kind(source_type, source_markdown)
        role = "bibliography" if source_type == "bib_item" else current_role
        block = {
            "block_id": block_id,
            "section_anchor": current_anchor,
            "kind": kind,
            "role": role,
            "order_index": len(blocks) + 1,
            "line_start": index,
            "line_end": index,
            "source_markdown": source_markdown,
            "image_refs": extract_image_refs(source_markdown),
            "translate": role != "bibliography",
        }
        if kind == "formula":
            match = DISPLAY_MATH_RE.search(source_markdown)
            block["latex"] = match.group(1).strip() if match else source_markdown.strip().strip("$").strip()
        if kind == "table":
            block["table_markdown_or_html"] = source_markdown
            block["caption_markdown"] = ""
        blocks.append(block)
        for section in sections:
            if section["anchor"] == current_anchor:
                if not section["source_start_block"]:
                    section["source_start_block"] = block_id
                section["source_end_block"] = block_id
                break

    return sections, blocks, references_anchor


def source_only_alignment_from_blocks(blocks: list[dict[str, Any]], target_language: str) -> dict[str, Any]:
    alignment_blocks: list[dict[str, Any]] = []
    for index, block in enumerate(blocks, start=1):
        block_id = f"b_{index:03d}"
        source_markdown = clean_text(block.get("source_markdown"))
        kind = clean_text(block.get("kind"))
        source_type = "equation" if kind == "formula" else kind or "paragraph"
        alignment_blocks.append(
            {
                "b": block_id,
                "type": source_type,
                "heading": "",
                "source_markdown": source_markdown,
                "translated_markdown": "",
                "pairs": [
                    {
                        "i": 1,
                        "src": source_markdown,
                        "tgt": "",
                        "status": "source_only",
                        "repair_count": 0,
                    }
                ],
            }
        )
    return {
        "format": "v1",
        "doc_id": "D1",
        "source_language": "",
        "target_language": target_language,
        "metadata": {
            "source": "literature-deep-reading.source_only_alignment",
        },
        "blocks": alignment_blocks,
    }


def valid_translator_alignment(value: Any, target_language: str) -> bool:
    return (
        isinstance(value, dict)
        and value.get("format") == "v1"
        and clean_text(value.get("target_language")) == target_language
        and isinstance(value.get("blocks"), list)
    )


def load_translator_alignment(input_payload: dict[str, Any], input_path: Path, target_language: str, diagnostics: list[dict[str, Any]]) -> dict[str, Any] | None:
    candidates: list[tuple[str, Path]] = []
    explicit = clean_text(input_payload.get("translator_alignment_path"))
    if explicit:
        candidates.append(("input.translator_alignment_path", resolve_input_path(explicit, input_path)))
    candidates.append(("bundle.translator_alignment", SOURCE_DIR / "translator" / "alignment.json"))
    for source, path in candidates:
        if not path.exists():
            continue
        try:
            alignment = read_json(path, {})
        except Exception as exc:
            diagnostics.append({"severity": "warning", "code": "translator_alignment_read_failed", "source": source, "path": normalize_posix(path), "message": str(exc)})
            continue
        if valid_translator_alignment(alignment, target_language):
            metadata = alignment.get("metadata") if isinstance(alignment.get("metadata"), dict) else {}
            return {
                **alignment,
                "metadata": {
                    **metadata,
                    "import_source": source,
                    "import_path": normalize_posix(path),
                },
            }
        diagnostics.append({"severity": "warning", "code": "translator_alignment_invalid", "source": source, "path": normalize_posix(path)})
    return None


def alignment_has_translations(alignment: dict[str, Any]) -> bool:
    for block in as_list(alignment.get("blocks")):
        if isinstance(block, dict) and alignment_block_markdown(block, "translated_markdown", "tgt"):
            return True
    return False


def build_image_manifest(extract_dir: Path, blocks: list[dict[str, Any]], source_manifest: dict[str, Any] | None) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()
    manifest_images = source_manifest.get("images") if isinstance(source_manifest, dict) else None
    if isinstance(manifest_images, list):
        for entry in manifest_images:
            if not isinstance(entry, dict):
                continue
            bundle_path = str(entry.get("bundle_path") or entry.get("path") or "")
            original_src = str(entry.get("original_src") or entry.get("src") or entry.get("source") or bundle_path)
            if bundle_path:
                seen.add(bundle_path)
            if original_src:
                seen.add(original_src)
            path = extract_dir / bundle_path if bundle_path else Path()
            exists = bool(bundle_path and path.exists())
            byte_count = path.stat().st_size if exists else safe_int(entry.get("bytes"), 0)
            status = clean_text(entry.get("status")) or ("available" if exists and byte_count > 0 else "missing")
            if status == "available" and byte_count <= 0:
                status = "corrupt"
            items.append(
                {
                    "image_id": f"image-{len(items) + 1:04d}",
                    "original_src": original_src,
                    "bundle_path": bundle_path,
                    "status": status,
                    "bytes": byte_count,
                    "sha256": clean_text(entry.get("sha256")),
                    "reason": str(entry.get("reason") or ""),
                }
            )
    for block in blocks:
        for ref in block.get("image_refs") or []:
            ref_text = str(ref)
            if ref_text in seen:
                continue
            seen.add(ref_text)
            candidate = extract_dir / ref_text
            byte_count = candidate.stat().st_size if candidate.exists() else 0
            status = "available" if candidate.exists() and byte_count > 0 else "missing"
            if candidate.exists() and byte_count <= 0:
                status = "corrupt"
            items.append(
                {
                    "image_id": f"image-{len(items) + 1:04d}",
                    "original_src": ref_text,
                    "bundle_path": ref_text,
                    "status": status,
                    "bytes": byte_count,
                    "reason": "" if status == "available" else "referenced file not found in bundle" if not candidate.exists() else "referenced image file is empty",
                }
            )
    return {
        "schema_version": "literature-deep-reading.image-manifest.v0",
        "images": items,
        "referenced_count": len(items),
        "available_count": sum(1 for item in items if item["status"] == "available"),
    }


def build_source_structure(sections: list[dict[str, Any]], blocks: list[dict[str, Any]], references_anchor: str | None) -> dict[str, Any]:
    role_counts: dict[str, int] = {}
    for block in blocks:
        role = clean_text(block.get("role")) or "main"
        role_counts[role] = role_counts.get(role, 0) + 1
    return {
        "schema_version": "literature-deep-reading.source-structure.v0",
        "sections": sections,
        "block_count": len(blocks),
        "role_counts": role_counts,
        "references_anchor": references_anchor,
        "bibliography_anchors": [section["anchor"] for section in sections if clean_text(section.get("role")) == "bibliography"],
        "appendix_anchors": [section["anchor"] for section in sections if clean_text(section.get("role")) == "appendix"],
    }


def build_source_reading_view(sections: list[dict[str, Any]], blocks: list[dict[str, Any]]) -> dict[str, Any]:
    blocks_by_section: dict[str, list[dict[str, Any]]] = {}
    for block in blocks:
        blocks_by_section.setdefault(str(block["section_anchor"]), []).append(block)
    section_summaries: list[dict[str, Any]] = []
    for section in sections:
        selected = blocks_by_section.get(str(section["anchor"]), [])
        excerpt_parts: list[str] = []
        for block in selected:
            if block["kind"] == "heading":
                continue
            text = block_text(block)
            if text:
                excerpt_parts.append(text)
            if sum(len(part) for part in excerpt_parts) > 1200:
                break
        section_summaries.append(
            {
                "anchor": section["anchor"],
                "title": section["title"],
                "level": section["level"],
                "role": section.get("role") or "main",
                "block_count": len(selected),
                "excerpt": "\n\n".join(excerpt_parts)[:1400],
            }
        )
    return {
        "schema_version": "literature-deep-reading.source-reading-view.v0",
        "sections": section_summaries,
    }


def build_target_artifacts_view(extract_dir: Path) -> dict[str, Any]:
    artifact_manifest_path = extract_dir / "artifacts" / "artifact-manifest.json"
    manifest = read_json(artifact_manifest_path, {})
    artifacts: list[dict[str, Any]] = []
    if isinstance(manifest, dict):
        raw = manifest.get("artifacts") or manifest.get("items") or []
        if isinstance(raw, list):
            for entry in raw:
                if isinstance(entry, dict):
                    artifacts.append(entry)
    known = [
        ("digest", "artifacts/digest.md", "digest-markdown"),
        ("references", "artifacts/references.json", "references-json"),
        ("citation_analysis", "artifacts/citation-analysis.md", "citation-analysis-markdown"),
        ("citation_analysis", "artifacts/citation_analysis.json", "citation-analysis-json"),
    ]
    for artifact_type, relative, payload_type in known:
        if any(str(item.get("bundle_path") or "") == relative for item in artifacts):
            continue
        path = extract_dir / relative
        artifacts.append(
            {
                "artifact_type": artifact_type,
                "payload_type": payload_type,
                "bundle_path": relative,
                "status": "available" if path.exists() else "missing",
                "sha256": sha256_file(path) if path.exists() else "",
                "bytes": path.stat().st_size if path.exists() else 0,
            }
        )
    return {
        "schema_version": "literature-deep-reading.target-artifacts-view.v0",
        "artifacts": artifacts,
    }


def normalize_artifact_type(value: Any) -> str:
    text = clean_text(value).replace("-", "_")
    if text in {"citationanalysis", "citation_analysis"}:
        return "citation_analysis"
    return text


def artifact_type_from_entry(entry: dict[str, Any]) -> str:
    return normalize_artifact_type(
        entry.get("artifact_type")
        or entry.get("artifactType")
        or entry.get("kind")
        or entry.get("type")
    )


def artifact_paper_ref(entry: dict[str, Any]) -> str:
    return first_text(
        entry.get("paper_ref"),
        entry.get("paperRef"),
        entry.get("source_ref"),
        entry.get("sourceRef"),
        entry.get("bound_paper_ref"),
    )


def artifact_bundle_destination(entry: dict[str, Any]) -> str:
    artifact_type = artifact_type_from_entry(entry)
    payload_type = clean_text(entry.get("payload_type") or entry.get("payloadType"))
    if artifact_type == "digest":
        return "artifacts/digest.md"
    if artifact_type == "references":
        return "artifacts/references.json"
    if artifact_type == "citation_analysis":
        if payload_type.endswith("-markdown") or payload_type.endswith("-md"):
            return "artifacts/citation-analysis.md"
        return "artifacts/citation_analysis.json"
    return ""


def export_manifest_path(run_root: Path, export_data: dict[str, Any]) -> Path | None:
    raw_path = first_text(
        export_data.get("manifestPath"),
        export_data.get("manifest_path"),
        export_data.get("manifest_file"),
        export_data.get("manifestFile"),
    )
    if not raw_path:
        return None
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = run_root / candidate
    return candidate


def load_export_manifest(run_root: Path, export_data: dict[str, Any]) -> dict[str, Any]:
    manifest_file = export_manifest_path(run_root, export_data)
    if manifest_file and manifest_file.exists():
        manifest = read_json(manifest_file, {}) or {}
        if isinstance(manifest, dict):
            return manifest
    return export_data if isinstance(export_data, dict) else {}


def export_manifest_artifacts(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    artifacts: list[dict[str, Any]] = []
    for artifact in as_list(manifest.get("artifacts") or manifest.get("items")):
        if isinstance(artifact, dict):
            artifacts.append(artifact)
    for paper in as_list(manifest.get("papers")):
        if not isinstance(paper, dict):
            continue
        paper_ref = first_text(paper.get("paper_ref"), paper.get("paperRef"))
        for artifact in as_list(paper.get("artifacts")):
            if not isinstance(artifact, dict):
                continue
            normalized = dict(artifact)
            if paper_ref and not artifact_paper_ref(normalized):
                normalized["paper_ref"] = paper_ref
            artifacts.append(normalized)
    return artifacts


def copy_exported_target_artifacts(run_root: Path, target_paper_ref: str, export_data: dict[str, Any]) -> list[dict[str, Any]]:
    manifest = load_export_manifest(run_root, export_data)
    exported: list[dict[str, Any]] = []
    for artifact in export_manifest_artifacts(manifest):
        if not isinstance(artifact, dict):
            continue
        artifact_type = artifact_type_from_entry(artifact)
        if artifact_type not in {"digest", "references", "citation_analysis"}:
            continue
        paper_ref = artifact_paper_ref(artifact)
        if target_paper_ref and paper_ref and paper_ref != target_paper_ref:
            continue
        content_file = first_text(
            artifact.get("content_file"),
            artifact.get("contentFile"),
            artifact.get("path"),
            artifact.get("payload_path"),
            artifact.get("payloadPath"),
        )
        destination = artifact_bundle_destination(artifact)
        if not content_file or not destination:
            exported.append(
                {
                    "artifact_type": artifact_type,
                    "status": "missing",
                    "reason": "export manifest entry does not include content_file or a known artifact type",
                    "raw": artifact,
                }
            )
            continue
        source_path = Path(content_file)
        if not source_path.is_absolute():
            source_path = run_root / content_file
        destination_path = SOURCE_DIR / destination
        if not source_path.exists() or source_path.stat().st_size <= 0:
            exported.append(
                {
                    "artifact_type": artifact_type,
                    "status": "missing",
                    "reason": "exported artifact content file is missing or empty",
                    "content_file": content_file,
                    "bundle_path": destination,
                }
            )
            continue
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        if not destination_path.exists() or destination_path.stat().st_size <= 0:
            shutil.copyfile(source_path, destination_path)
        exported.append(
            {
                "artifact_type": artifact_type,
                "payload_type": clean_text(artifact.get("payload_type") or artifact.get("payloadType")),
                "status": "available",
                "content_file": normalize_posix(source_path),
                "bundle_path": destination,
                "bytes": destination_path.stat().st_size,
                "sha256": sha256_file(destination_path),
            }
        )
    return exported


def reference_index_rows(index_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows = index_data.get("rows")
    if isinstance(rows, list):
        return [row for row in rows if isinstance(row, dict)]
    return []


def reference_index_request_payload(paper_ref: str) -> dict[str, Any]:
    return {
        "sourceRefs": [paper_ref],
        "referenceSourceRefs": [paper_ref],
        "includeReferences": True,
        "limit": 250,
        "artifactCoverage": "all",
    }


def reference_index_reference_rows(index_data: dict[str, Any], target: dict[str, str]) -> list[dict[str, Any]]:
    target_paper_ref = clean_text(target.get("paper_ref"))
    target_item_key = clean_text(target.get("item_key"))
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in reference_index_rows(index_data):
        nested_references = row.get("references") if isinstance(row.get("references"), list) else []
        if nested_references:
            source_paper_ref = first_text(row.get("paper_ref"), row.get("paperRef"), row.get("source_ref"), row.get("sourceRef"))
            for nested in nested_references:
                if not isinstance(nested, dict):
                    continue
                entry = {**nested}
                if source_paper_ref and not first_text(entry.get("source_paper_ref"), entry.get("sourcePaperRef")):
                    entry["source_paper_ref"] = source_paper_ref
                key = first_text(
                    entry.get("reference_id"),
                    entry.get("referenceId"),
                    entry.get("reference_instance_id"),
                    entry.get("referenceInstanceId"),
                    entry.get("id"),
                ) or str(entry.get("reference_index") if entry.get("reference_index") is not None else entry.get("referenceIndex") or entry.get("index") or len(rows) + 1)
                if key in seen:
                    continue
                seen.add(key)
                rows.append(entry)
            continue
        row_paper_ref = first_text(row.get("paper_ref"), row.get("paperRef"), row.get("source_ref"), row.get("sourceRef"))
        row_item_key = first_text(row.get("item_key"), row.get("itemKey"), row.get("zotero_item_key"), row.get("zoteroItemKey"))
        if (target_paper_ref and row_paper_ref == target_paper_ref) or (target_item_key and row_item_key == target_item_key):
            continue
        has_reference_shape = bool(
            row.get("reference_index")
            or row.get("referenceIndex")
            or row.get("index")
            or row.get("reference_title")
            or row.get("referenceTitle")
            or row.get("raw_reference")
            or row.get("rawReference")
            or row.get("raw")
        )
        if not has_reference_shape:
            continue
        key = first_text(
            row.get("reference_id"),
            row.get("referenceId"),
            row.get("reference_instance_id"),
            row.get("referenceInstanceId"),
            row.get("id"),
        ) or str(row.get("reference_index") if row.get("reference_index") is not None else row.get("referenceIndex") or row.get("index") or len(rows) + 1)
        if key in seen:
            continue
        seen.add(key)
        rows.append(row)
    return rows


def find_target_reference_index_row(index_data: dict[str, Any], target: dict[str, str]) -> dict[str, Any]:
    paper_ref = clean_text(target.get("paper_ref"))
    item_key = clean_text(target.get("item_key"))
    for row in reference_index_rows(index_data):
        row_paper_ref = first_text(row.get("paper_ref"), row.get("paperRef"), row.get("source_ref"), row.get("sourceRef"))
        row_item_key = first_text(row.get("item_key"), row.get("itemKey"), row.get("zotero_item_key"), row.get("zoteroItemKey"))
        if (paper_ref and row_paper_ref == paper_ref) or (item_key and row_item_key == item_key):
            return row
    return {}


def explicit_topic_id_from_preflight(preflight: dict[str, Any]) -> str:
    topic = preflight.get("topic") if isinstance(preflight.get("topic"), dict) else {}
    row = preflight.get("target_reference_index_row") if isinstance(preflight.get("target_reference_index_row"), dict) else {}
    return first_text(
        topic.get("topic_id"),
        topic.get("topicId"),
        row.get("topic_id"),
        row.get("topicId"),
    )


def normalize_topic_candidates(data: dict[str, Any]) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for entry in as_list(data.get("topics") or data.get("items") or data.get("matches")):
        if not isinstance(entry, dict):
            continue
        topic_id = first_text(entry.get("topic_id"), entry.get("topicId"), entry.get("id"))
        if not topic_id:
            continue
        candidates.append(
            {
                "topic_id": topic_id,
                "title": first_text(entry.get("title"), entry.get("name")),
                "status": first_text(entry.get("status")),
                "updated_at": first_text(entry.get("updated_at"), entry.get("updatedAt")),
                "matched_paper_refs": [clean_text(item) for item in as_list(entry.get("matched_paper_refs") or entry.get("matchedPaperRefs")) if clean_text(item)],
                "match_sources": [clean_text(item) for item in as_list(entry.get("match_sources") or entry.get("matchSources")) if clean_text(item)],
                "raw": entry,
            }
        )
    return candidates


def build_topic_candidates_view(target: dict[str, str], data: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = normalize_topic_candidates(data)
    return {
        "schema_version": "literature-deep-reading.topic-candidates-view.v0",
        "source": "host_topics_find_by_paper_ref" if candidates or data else "none",
        "target": target,
        "topics": candidates,
        "raw": data,
        "diagnostics": diagnostics,
    }


def resolve_preflight_topic(topic_candidates: list[dict[str, Any]], reference_topic_id: str) -> dict[str, str]:
    if reference_topic_id:
        return {"topic_id": reference_topic_id, "source": "reference_index"}
    if len(topic_candidates) == 1:
        return {"topic_id": clean_text(topic_candidates[0].get("topic_id")), "source": "topics_find_by_paper_ref"}
    if len(topic_candidates) > 1:
        return {"topic_id": "", "source": "multiple_topic_candidates"}
    return {"topic_id": "", "source": "none"}


def run_host_preflight(run_root: Path, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    target = infer_target_refs(source_manifest())
    preflight_diagnostics: list[dict[str, Any]] = []
    topic_candidates_view = build_topic_candidates_view(target, {}, [])
    result: dict[str, Any] = {
        "schema_version": "literature-deep-reading.host-preflight-view.v0",
        "source": "host_bridge_best_effort",
        "target": target,
        "reference_index": {},
        "target_reference_index_row": {},
        "paper_artifacts_manifest": {},
        "paper_artifacts_export": {},
        "exported_target_artifacts": [],
        "topic_candidates": [],
        "topic": {"topic_id": "", "source": "none"},
        "diagnostics": preflight_diagnostics,
    }
    if not target.get("paper_ref"):
        diagnostic = {"severity": "info", "code": "host_preflight_target_missing", "message": "No paper_ref is available for Host preflight."}
        preflight_diagnostics.append(diagnostic)
        diagnostics.append(diagnostic)
        write_json(VIEWS_DIR / "topic-candidates-view.json", build_topic_candidates_view(target, {}, [diagnostic]))
        return result
    try:
        bridge_executable(run_root)
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "host_bridge_unavailable", "message": str(exc)}
        preflight_diagnostics.append(diagnostic)
        diagnostics.append(diagnostic)
        write_json(VIEWS_DIR / "topic-candidates-view.json", build_topic_candidates_view(target, {}, [diagnostic]))
        return result
    try:
        reference_output = run_bridge_json(
            run_root,
            ["reference-index", "get"],
            reference_index_request_payload(target["paper_ref"]),
            "bootstrap-reference-index-input.json",
        )
        reference_data = unwrap_bridge_data(reference_output)
        target_row = find_target_reference_index_row(reference_data, target)
        result["reference_index"] = reference_data
        result["target_reference_index_row"] = target_row
        topic_id = explicit_topic_id_from_preflight({"target_reference_index_row": target_row})
        if topic_id:
            result["topic"] = {"topic_id": topic_id, "source": "reference_index"}
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "host_preflight_reference_index_failed", "message": str(exc)}
        preflight_diagnostics.append(diagnostic)
        diagnostics.append(diagnostic)
    try:
        topic_output = run_bridge_json(
            run_root,
            ["topics", "find-by-paper-ref"],
            {"paper_ref": target["paper_ref"]},
            "bootstrap-topics-find-by-paper-ref-input.json",
        )
        topic_data = unwrap_bridge_data(topic_output)
        topic_candidates = normalize_topic_candidates(topic_data)
        topic_candidates_view = build_topic_candidates_view(target, topic_data, as_list(topic_data.get("diagnostics")))
        result["topic_candidates"] = topic_candidates
        if not clean_text(result.get("topic", {}).get("topic_id")):
            result["topic"] = resolve_preflight_topic(topic_candidates, "")
        if len(topic_candidates) > 1:
            diagnostic = {"severity": "info", "code": "topic_context_multiple_candidates", "message": "Multiple topics contain the target paper; context-request must choose selected_topic_id to fetch topic context."}
            preflight_diagnostics.append(diagnostic)
            diagnostics.append(diagnostic)
            topic_candidates_view["diagnostics"] = [*as_list(topic_candidates_view.get("diagnostics")), diagnostic]
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "host_preflight_topic_candidates_failed", "message": str(exc)}
        preflight_diagnostics.append(diagnostic)
        diagnostics.append(diagnostic)
        topic_candidates_view = build_topic_candidates_view(target, {}, [diagnostic])
    try:
        manifest_output = run_bridge_json(
            run_root,
            ["paper-artifacts", "manifest"],
            {"paper_refs": [target["paper_ref"]], "artifact_types": ["digest", "references", "citation_analysis"]},
            "bootstrap-paper-artifacts-manifest-input.json",
        )
        result["paper_artifacts_manifest"] = unwrap_bridge_data(manifest_output)
        export_output = run_bridge_json(
            run_root,
            ["paper-artifacts", "export-filtered"],
            {"run_root": str(run_root), "paper_refs": [target["paper_ref"]], "artifact_types": ["digest", "references", "citation_analysis"]},
            "bootstrap-paper-artifacts-export-input.json",
        )
        export_data = unwrap_bridge_data(export_output)
        result["paper_artifacts_export"] = export_data
        result["exported_target_artifacts"] = copy_exported_target_artifacts(run_root, target["paper_ref"], export_data)
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "host_preflight_artifact_export_failed", "message": str(exc)}
        preflight_diagnostics.append(diagnostic)
        diagnostics.append(diagnostic)
    write_json(VIEWS_DIR / "topic-candidates-view.json", topic_candidates_view)
    return result


def markdown_reference_items_from_blocks(blocks: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
    raw_blocks: list[str] = []
    for block in blocks:
        if clean_text(block.get("role")) != "bibliography" or block.get("kind") == "heading":
            continue
        source_markdown = clean_text(block.get("source_markdown")) or block_text(block)
        if source_markdown:
            raw_blocks.append(source_markdown.strip())
    raw_markdown = "\n\n".join(raw_blocks).strip()
    entries: list[dict[str, Any]] = []
    current_lines: list[str] = []
    current_index: int | None = None

    def flush() -> None:
        nonlocal current_lines, current_index
        raw_entry = "\n".join(current_lines).strip()
        if raw_entry:
            index = current_index or len(entries) + 1
            entries.append(
                {
                    "reference_id": f"ref-{index}",
                    "reference_index": index,
                    "raw_markdown": raw_entry,
                }
            )
        current_lines = []
        current_index = None

    for line in raw_markdown.splitlines():
        match = REFERENCE_ENTRY_RE.match(line)
        if match:
            flush()
            raw_index = match.group(1) or match.group(2)
            current_index = safe_int(raw_index, len(entries) + 1)
            current_lines = [line.strip()]
        elif current_lines:
            current_lines.append(line.rstrip())
    flush()
    if raw_markdown and not entries:
        for chunk in re.split(r"\n\s*\n", raw_markdown):
            raw_entry = chunk.strip()
            if raw_entry:
                index = len(entries) + 1
                entries.append(
                    {
                        "reference_id": f"ref-{index}",
                        "reference_index": index,
                        "raw_markdown": raw_entry,
                    }
                )
    return raw_markdown, entries


def build_references_seed_view(extract_dir: Path, blocks: list[dict[str, Any]], references_anchor: str | None) -> dict[str, Any]:
    references_path = extract_dir / "artifacts" / "references.json"
    payload = read_json(references_path, None)
    artifact_references = []
    if isinstance(payload, dict):
        references = payload.get("references") or payload.get("items") or []
        if isinstance(references, list):
            artifact_references = references
    raw_markdown, raw_entries = markdown_reference_items_from_blocks(blocks)
    return {
        "schema_version": "literature-deep-reading.references-seed-view.v0",
        "source": "markdown" if raw_entries else "none",
        "raw_markdown": raw_markdown,
        "raw_items": raw_entries,
        "references": raw_entries,
        "reference_count": len(raw_entries),
        "artifact_reference_count": len(artifact_references),
        "artifact_references_available": bool(artifact_references),
    }


def initialize_database(db_path: Path, context: dict[str, Any], sections: list[dict[str, Any]], blocks: list[dict[str, Any]], artifacts: list[dict[str, Any]]) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(
            """
            CREATE TABLE runs (
              run_id TEXT PRIMARY KEY,
              schema_version TEXT NOT NULL,
              target_language TEXT NOT NULL,
              source_kind TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE artifacts (
              artifact_id TEXT PRIMARY KEY,
              artifact_type TEXT NOT NULL,
              payload_type TEXT NOT NULL,
              bundle_path TEXT NOT NULL,
              runtime_path TEXT NOT NULL,
              source TEXT NOT NULL,
              status TEXT NOT NULL,
              sha256 TEXT NOT NULL,
              bytes INTEGER NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE source_sections (
              section_id TEXT PRIMARY KEY,
              anchor TEXT NOT NULL UNIQUE,
              title TEXT NOT NULL,
              level INTEGER NOT NULL,
              order_index INTEGER NOT NULL,
              parent_anchor TEXT NOT NULL,
              source_start_block TEXT NOT NULL,
              source_end_block TEXT NOT NULL,
              role TEXT NOT NULL
            );
            CREATE TABLE reading_blocks (
              block_id TEXT PRIMARY KEY,
              section_anchor TEXT NOT NULL,
              kind TEXT NOT NULL,
              role TEXT NOT NULL,
              order_index INTEGER NOT NULL,
              line_start INTEGER NOT NULL,
              line_end INTEGER NOT NULL,
              source_markdown TEXT NOT NULL,
              image_refs_json TEXT NOT NULL,
              translate INTEGER NOT NULL
            );
            CREATE TABLE payload_submissions (
              stage_id TEXT PRIMARY KEY,
              payload_path TEXT NOT NULL,
              schema_id TEXT NOT NULL,
              status TEXT NOT NULL,
              validation_errors_json TEXT NOT NULL,
              submitted_at TEXT NOT NULL
            );
            CREATE TABLE host_context_requests (
              request_id TEXT PRIMARY KEY,
              payload_path TEXT NOT NULL,
              citation_graph_json TEXT NOT NULL,
              topic_context_json TEXT NOT NULL,
              reference_digest_policy_json TEXT NOT NULL,
              concept_policy_json TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            CREATE TABLE host_context_exports (
              export_id TEXT PRIMARY KEY,
              capability TEXT NOT NULL,
              request_id TEXT NOT NULL,
              status TEXT NOT NULL,
              output_path TEXT NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE reference_bindings (
              reference_id TEXT PRIMARY KEY,
              reference_index INTEGER NOT NULL,
              title TEXT NOT NULL,
              authors_json TEXT NOT NULL,
              year TEXT NOT NULL,
              raw_json TEXT NOT NULL,
              binding_status TEXT NOT NULL,
              bound_paper_ref TEXT NOT NULL,
              zotero_item_key TEXT NOT NULL,
              match_confidence REAL
            );
            CREATE TABLE reference_digest_artifacts (
              reference_id TEXT PRIMARY KEY,
              bound_paper_ref TEXT NOT NULL,
              status TEXT NOT NULL,
              payload_type TEXT NOT NULL,
              payload_path TEXT NOT NULL,
              digest_markdown TEXT NOT NULL,
              sha256 TEXT NOT NULL,
              bytes INTEGER NOT NULL,
              diagnostics_json TEXT NOT NULL
            );
            CREATE TABLE citation_graph_nodes (
              node_id TEXT PRIMARY KEY,
              kind TEXT NOT NULL,
              title TEXT NOT NULL,
              paper_ref TEXT NOT NULL,
              year TEXT NOT NULL,
              metrics_json TEXT NOT NULL,
              source_json TEXT NOT NULL
            );
            CREATE TABLE citation_graph_edges (
              edge_id TEXT PRIMARY KEY,
              source TEXT NOT NULL,
              target TEXT NOT NULL,
              kind TEXT NOT NULL,
              evidence_json TEXT NOT NULL
            );
            CREATE TABLE citation_graph_layout (
              node_id TEXT PRIMARY KEY,
              layout_key TEXT NOT NULL,
              x REAL NOT NULL,
              y REAL NOT NULL,
              source TEXT NOT NULL
            );
            CREATE TABLE concepts (
              concept_id TEXT PRIMARY KEY,
              label TEXT NOT NULL,
              aliases_json TEXT NOT NULL,
              kind TEXT NOT NULL,
              definition TEXT NOT NULL,
              source TEXT NOT NULL,
              status TEXT NOT NULL
            );
            CREATE TABLE section_insights (
              section_anchor TEXT PRIMARY KEY,
              reading_goal TEXT NOT NULL,
              concept_refs_json TEXT NOT NULL,
              misread_warnings_json TEXT NOT NULL,
              questions_json TEXT NOT NULL,
              citation_note_json TEXT NOT NULL
            );
            CREATE TABLE block_translations (
              block_id TEXT PRIMARY KEY,
              target_language TEXT NOT NULL,
              translated_markdown TEXT NOT NULL,
              translated_html TEXT NOT NULL,
              status TEXT NOT NULL,
              quality_flags_json TEXT NOT NULL
            );
            """
        )
        now = utc_now()
        conn.execute(
            "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "default",
                "literature-deep-reading.bootstrap.v0",
                context["target_language"],
                context["source_kind"],
                "bootstrapped",
                now,
                now,
                json.dumps(context.get("diagnostics", []), ensure_ascii=False),
            ),
        )
        for index, artifact in enumerate(artifacts, start=1):
            conn.execute(
                "INSERT INTO artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    f"artifact-{index:04d}",
                    str(artifact.get("artifact_type") or ""),
                    str(artifact.get("payload_type") or ""),
                    str(artifact.get("bundle_path") or ""),
                    str(artifact.get("runtime_path") or ""),
                    str(artifact.get("source") or ""),
                    str(artifact.get("status") or "missing"),
                    str(artifact.get("sha256") or ""),
                    int(artifact.get("bytes") or 0),
                    json.dumps(artifact.get("diagnostics") or {}, ensure_ascii=False),
                ),
            )
        for section in sections:
            conn.execute(
                "INSERT INTO source_sections VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    section["section_id"],
                    section["anchor"],
                    section["title"],
                    int(section["level"]),
                    int(section["order_index"]),
                    section["parent_anchor"],
                    section["source_start_block"],
                    section["source_end_block"],
                    clean_text(section.get("role")) or "main",
                ),
            )
        for block in blocks:
            conn.execute(
                "INSERT INTO reading_blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    block["block_id"],
                    block["section_anchor"],
                    block["kind"],
                    clean_text(block.get("role")) or "main",
                    int(block["order_index"]),
                    int(block["line_start"]),
                    int(block["line_end"]),
                    block["source_markdown"],
                    json.dumps(block.get("image_refs") or [], ensure_ascii=False),
                    1 if block.get("translate") else 0,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def ensure_stage10_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS payload_submissions (
          stage_id TEXT PRIMARY KEY,
          payload_path TEXT NOT NULL,
          schema_id TEXT NOT NULL,
          status TEXT NOT NULL,
          validation_errors_json TEXT NOT NULL,
          submitted_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS host_context_requests (
          request_id TEXT PRIMARY KEY,
          payload_path TEXT NOT NULL,
          citation_graph_json TEXT NOT NULL,
          topic_context_json TEXT NOT NULL,
          reference_digest_policy_json TEXT NOT NULL,
          concept_policy_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS host_context_exports (
          export_id TEXT PRIMARY KEY,
          capability TEXT NOT NULL,
          request_id TEXT NOT NULL,
          status TEXT NOT NULL,
          output_path TEXT NOT NULL,
          diagnostics_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reference_bindings (
          reference_id TEXT PRIMARY KEY,
          reference_index INTEGER NOT NULL,
          title TEXT NOT NULL,
          authors_json TEXT NOT NULL,
          year TEXT NOT NULL,
          raw_json TEXT NOT NULL,
          binding_status TEXT NOT NULL,
          bound_paper_ref TEXT NOT NULL,
          zotero_item_key TEXT NOT NULL,
          match_confidence REAL
        );
        CREATE TABLE IF NOT EXISTS reference_digest_artifacts (
          reference_id TEXT PRIMARY KEY,
          bound_paper_ref TEXT NOT NULL,
          status TEXT NOT NULL,
          payload_type TEXT NOT NULL,
          payload_path TEXT NOT NULL,
          digest_markdown TEXT NOT NULL,
          sha256 TEXT NOT NULL,
          bytes INTEGER NOT NULL,
          diagnostics_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS citation_graph_nodes (
          node_id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          paper_ref TEXT NOT NULL,
          year TEXT NOT NULL,
          metrics_json TEXT NOT NULL,
          source_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS citation_graph_edges (
          edge_id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          target TEXT NOT NULL,
          kind TEXT NOT NULL,
          evidence_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS citation_graph_layout (
          node_id TEXT PRIMARY KEY,
          layout_key TEXT NOT NULL,
          x REAL NOT NULL,
          y REAL NOT NULL,
          source TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS concepts (
          concept_id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          aliases_json TEXT NOT NULL,
          kind TEXT NOT NULL,
          definition TEXT NOT NULL,
          source TEXT NOT NULL,
          status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS section_insights (
          section_anchor TEXT PRIMARY KEY,
          reading_goal TEXT NOT NULL,
          concept_refs_json TEXT NOT NULL,
          misread_warnings_json TEXT NOT NULL,
          questions_json TEXT NOT NULL,
          citation_note_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS block_translations (
          block_id TEXT PRIMARY KEY,
          target_language TEXT NOT NULL,
          translated_markdown TEXT NOT NULL,
          translated_html TEXT NOT NULL,
          status TEXT NOT NULL,
          quality_flags_json TEXT NOT NULL
        );
        """
    )


def bootstrap(input_path: Path) -> dict[str, Any]:
    input_payload = read_json(input_path, {})
    if not isinstance(input_payload, dict):
        raise ValueError("runtime input must be a JSON object")
    input_payload, input_hydration_diagnostics = hydrate_input_from_audit_manifest(input_payload, input_path)
    bundle_raw = str(input_payload.get("source_bundle_path") or "").strip()
    if not bundle_raw:
        raise ValueError("runtime input requires source_bundle_path")
    bundle_path = resolve_input_path(bundle_raw, input_path)
    if not bundle_path.exists():
        raise FileNotFoundError(f"source bundle not found: {bundle_path}")

    parameter = input_payload.get("parameter") if isinstance(input_payload.get("parameter"), dict) else {}
    target_language = str(parameter.get("target_language") or input_payload.get("target_language") or "zh-CN")
    diagnostics: list[dict[str, Any]] = list(input_hydration_diagnostics)
    extracted = safe_extract_zip(bundle_path, SOURCE_DIR)
    source_manifest = read_json(SOURCE_DIR / "source-manifest.json", {}) or {}
    source_kind = str(source_manifest.get("source_kind") or "mineru_markdown")
    source_md = SOURCE_DIR / "source.md"
    if not source_md.exists():
        diagnostics.append({"severity": "warning", "code": "source_md_missing", "message": "source.md is missing; PDF fallback parsing is deferred."})
        markdown = ""
        source_kind = "pdf_fallback"
    else:
        markdown = source_md.read_text(encoding="utf-8", errors="replace")

    translator_alignment = load_translator_alignment(
        input_payload,
        input_path,
        target_language,
        diagnostics,
    )
    if translator_alignment:
        sections, blocks, references_anchor = alignment_to_reading_structure(translator_alignment)
        if not blocks:
            diagnostics.append({"severity": "warning", "code": "translator_alignment_empty_blocks"})
            sections, blocks, references_anchor = parse_markdown(markdown)
            translator_alignment = None
        else:
            source_kind = "translator_alignment"
    else:
        if clean_text(input_payload.get("translator_status")) == "success":
            diagnostics.append({"severity": "error", "code": "translator_alignment_handoff_missing", "message": "translator_status is success but no valid translator alignment was provided."})
            write_json(
                VIEWS_DIR / "diagnostics-bootstrap.json",
                {
                    "schema_version": "literature-deep-reading.diagnostics-bootstrap.v0",
                    "diagnostics": diagnostics,
                    "extracted_files": extracted,
                    "source_bundle": {
                        "path": str(bundle_path),
                        "sha256": sha256_file(bundle_path),
                        "bytes": bundle_path.stat().st_size,
                    },
                },
            )
            raise ValueError("translator_alignment_handoff_missing: translator_status=success requires a valid translator_alignment_path or bundle translator/alignment.json")
        sections, blocks, references_anchor = parse_markdown(markdown)
        if clean_text(input_payload.get("translator_status")) == "cancelled" and blocks:
            translator_alignment = source_only_alignment_from_blocks(blocks, target_language)
            sections, blocks, references_anchor = alignment_to_reading_structure(translator_alignment)
            diagnostics.append({"severity": "info", "code": "source_only_alignment_generated"})
    if not sections:
        sections = [
            {
                "section_id": "section-0001",
                "anchor": "sec-document",
                "title": "Document",
                "level": 0,
                "order_index": 1,
                "parent_anchor": "",
                "source_start_block": "",
                "source_end_block": "",
                "role": "main",
            }
        ]
    image_manifest = build_image_manifest(SOURCE_DIR, blocks, source_manifest if isinstance(source_manifest, dict) else {})
    host_preflight = run_host_preflight(Path.cwd(), diagnostics)
    target_artifacts = build_target_artifacts_view(SOURCE_DIR)
    source_structure = build_source_structure(sections, blocks, references_anchor)
    source_reading = build_source_reading_view(sections, blocks)
    references_seed = build_references_seed_view(SOURCE_DIR, blocks, references_anchor)
    concept_needs = build_concept_needs_view({}, {"concepts": []}, source_reading)
    missing_images = [item for item in image_manifest["images"] if item.get("status") != "available"]
    for item in missing_images:
        diagnostics.append({"severity": "warning", "code": "image_missing", "image": item.get("bundle_path") or item.get("original_src")})

    context = {
        "target_language": target_language,
        "source_kind": source_kind,
        "diagnostics": diagnostics,
    }
    initialize_database(DB_PATH, context, sections, blocks, target_artifacts["artifacts"])

    write_json(VIEWS_DIR / "source-structure.json", source_structure)
    write_json(VIEWS_DIR / "reading-blocks.json", {"schema_version": "literature-deep-reading.reading-blocks.v0", "blocks": blocks})
    write_json(VIEWS_DIR / "image-manifest.json", image_manifest)
    write_json(VIEWS_DIR / "source-reading-view.json", source_reading)
    write_json(VIEWS_DIR / "target-artifacts-view.json", target_artifacts)
    write_json(VIEWS_DIR / "references-seed-view.json", references_seed)
    write_json(VIEWS_DIR / "host-preflight-view.json", host_preflight)
    write_json(VIEWS_DIR / "concept-needs-view.json", concept_needs)
    write_json(
        VIEWS_DIR / "translator-alignment-view.json",
        translator_alignment
        if translator_alignment
        else {
            "format": "v1",
            "status": "unavailable",
            "target_language": target_language,
            "blocks": [],
        },
    )
    write_json(
        VIEWS_DIR / "diagnostics-bootstrap.json",
        {
            "schema_version": "literature-deep-reading.diagnostics-bootstrap.v0",
            "diagnostics": diagnostics,
            "extracted_files": extracted,
            "source_bundle": {
                "path": str(bundle_path),
                "sha256": sha256_file(bundle_path),
                "bytes": bundle_path.stat().st_size,
            },
        },
    )
    result = {
        "kind": "literature_deep_reading_bootstrap",
        "status": "bootstrapped",
        "db_path": normalize_posix(DB_PATH),
        "views": {
            "source_structure": normalize_posix(VIEWS_DIR / "source-structure.json"),
            "reading_blocks": normalize_posix(VIEWS_DIR / "reading-blocks.json"),
            "image_manifest": normalize_posix(VIEWS_DIR / "image-manifest.json"),
            "source_reading": normalize_posix(VIEWS_DIR / "source-reading-view.json"),
            "target_artifacts": normalize_posix(VIEWS_DIR / "target-artifacts-view.json"),
            "references_seed": normalize_posix(VIEWS_DIR / "references-seed-view.json"),
            "host_preflight": normalize_posix(VIEWS_DIR / "host-preflight-view.json"),
            "topic_candidates": normalize_posix(VIEWS_DIR / "topic-candidates-view.json"),
            "concept_needs": normalize_posix(VIEWS_DIR / "concept-needs-view.json"),
            "translator_alignment": normalize_posix(VIEWS_DIR / "translator-alignment-view.json"),
        },
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-bootstrap.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def infer_target_refs(manifest: dict[str, Any]) -> dict[str, str]:
    paper = manifest.get("paper") if isinstance(manifest.get("paper"), dict) else {}
    explicit_ref = first_text(paper.get("paper_ref"), paper.get("paperRef"), paper.get("ref"))
    item_key = first_text(paper.get("item_key"), paper.get("itemKey"), paper.get("key"))
    return {
        "paper_ref": explicit_ref or (f"1:{item_key}" if item_key else ""),
        "graph_start_node_id": f"zotero:item:{item_key}" if item_key else "",
        "item_key": item_key,
        "title": first_text(paper.get("title")),
    }


def validate_context_request_payload(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["context request must be a JSON object"]
    allowed = {
        "main_task",
        "method_family",
        "external_context_section_anchors",
        "request_topic_context",
        "topic_context_reason",
        "selected_topic_id",
        "request_concept_context",
        "concept_labels",
        "request_citation_graph",
        "citation_graph_depth",
        "citation_graph_direction",
        "citation_graph_max_nodes",
        "citation_graph_max_edges",
        "citation_graph_include_low_signal",
        "reference_digest_policy",
        "priority_reference_indices",
    }
    unknown = sorted(set(payload) - allowed)
    if unknown:
        errors.append("unknown fields: " + ", ".join(unknown))
    structure = read_view("source-structure.json", {})
    anchors = {str(section.get("anchor")) for section in as_list(structure.get("sections")) if isinstance(section, dict)}
    for anchor in as_list(payload.get("external_context_section_anchors")):
        if clean_text(anchor) not in anchors:
            errors.append(f"external_context_section_anchors contains unknown anchor: {anchor}")
    policy = clean_text(payload.get("reference_digest_policy") or "none")
    if policy not in REFERENCE_DIGEST_POLICIES:
        errors.append(f"reference_digest_policy must be one of {sorted(REFERENCE_DIGEST_POLICIES)}")
    direction = clean_text(payload.get("citation_graph_direction") or "both")
    if direction not in CITATION_DIRECTIONS:
        errors.append(f"citation_graph_direction must be one of {sorted(CITATION_DIRECTIONS)}")
    depth = safe_int(payload.get("citation_graph_depth"), 2)
    max_nodes = safe_int(payload.get("citation_graph_max_nodes"), 80)
    max_edges = safe_int(payload.get("citation_graph_max_edges"), 160)
    if depth < 1 or depth > 4:
        errors.append("citation_graph_depth must be between 1 and 4")
    if max_nodes < 1 or max_nodes > 5000:
        errors.append("citation_graph_max_nodes must be between 1 and 5000")
    if max_edges < 1 or max_edges > 20000:
        errors.append("citation_graph_max_edges must be between 1 and 20000")
    for index in as_list(payload.get("priority_reference_indices")):
        if safe_int(index, -1) < 1:
            errors.append(f"priority_reference_indices contains invalid index: {index}")
    return errors


def normalize_context_request(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "main_task": clean_text(payload.get("main_task")),
        "method_family": clean_text(payload.get("method_family")),
        "external_context_section_anchors": [clean_text(item) for item in as_list(payload.get("external_context_section_anchors")) if clean_text(item)],
        "request_topic_context": bool(payload.get("request_topic_context")),
        "topic_context_reason": clean_text(payload.get("topic_context_reason")),
        "selected_topic_id": clean_text(payload.get("selected_topic_id")),
        "request_concept_context": bool(payload.get("request_concept_context")),
        "concept_labels": [clean_text(item) for item in as_list(payload.get("concept_labels")) if clean_text(item)],
        "request_citation_graph": bool(payload.get("request_citation_graph")),
        "citation_graph_depth": clamp_int(payload.get("citation_graph_depth"), 2, 1, 4),
        "citation_graph_direction": clean_text(payload.get("citation_graph_direction") or "both"),
        "citation_graph_max_nodes": clamp_int(payload.get("citation_graph_max_nodes"), 80, 1, 5000),
        "citation_graph_max_edges": clamp_int(payload.get("citation_graph_max_edges"), 160, 1, 20000),
        "citation_graph_include_low_signal": bool(payload.get("citation_graph_include_low_signal")),
        "reference_digest_policy": clean_text(payload.get("reference_digest_policy") or "none"),
        "priority_reference_indices": [safe_int(item, 0) for item in as_list(payload.get("priority_reference_indices")) if safe_int(item, 0) > 0],
    }


def reference_index_from_id(reference_id: str, fallback: int) -> int:
    match = re.search(r"(\d+)$", reference_id)
    return int(match.group(1)) if match else fallback


def normalize_reference(entry: Any, index: int) -> dict[str, Any]:
    raw = entry if isinstance(entry, dict) else {"raw": str(entry)}
    reference_id = first_text(raw.get("id"), raw.get("reference_id"), raw.get("referenceId")) or f"ref-{index}"
    authors = raw.get("authors") or raw.get("author") or []
    if isinstance(authors, str):
        authors_json = [authors]
    elif isinstance(authors, list):
        authors_json = authors
    else:
        authors_json = []
    bound_paper_ref = first_text(raw.get("bound_paper_ref"), raw.get("boundPaperRef"), raw.get("paper_ref"), raw.get("paperRef"))
    item_key = first_text(raw.get("zotero_item_key"), raw.get("zoteroItemKey"), raw.get("item_key"), raw.get("itemKey"))
    binding_status = clean_text(raw.get("binding_status") or raw.get("bindingStatus"))
    if not binding_status:
        binding_status = "library" if bound_paper_ref or item_key else "unresolved"
    if not bound_paper_ref and item_key:
        bound_paper_ref = f"1:{item_key}"
    return {
        "reference_id": reference_id,
        "reference_index": safe_int(raw.get("index"), reference_index_from_id(reference_id, index)),
        "title": first_text(raw.get("title"), raw.get("raw")),
        "authors": authors_json,
        "year": first_text(raw.get("year")),
        "raw": raw,
        "binding_status": binding_status,
        "bound_paper_ref": bound_paper_ref,
        "zotero_item_key": item_key,
        "match_confidence": raw.get("match_confidence") or raw.get("matchConfidence"),
    }


def normalize_index_reference(entry: dict[str, Any], index: int) -> dict[str, Any]:
    reference_index = safe_int(entry.get("reference_index") or entry.get("referenceIndex") or entry.get("index"), index)
    reference_id = first_text(
        entry.get("reference_id"),
        entry.get("referenceId"),
        entry.get("reference_instance_id"),
        entry.get("referenceInstanceId"),
        entry.get("id"),
    ) or f"ref-{reference_index if reference_index is not None else index}"
    target_binding = clean_text(entry.get("target_binding") or entry.get("targetBinding"))
    binding_status = clean_text(entry.get("binding_status") or entry.get("bindingStatus"))
    paper_ref = first_text(
        entry.get("target_paper_ref"),
        entry.get("targetPaperRef"),
        entry.get("bound_paper_ref"),
        entry.get("boundPaperRef"),
        entry.get("paper_ref"),
        entry.get("paperRef"),
    )
    item_key = first_text(entry.get("zotero_item_key"), entry.get("zoteroItemKey"), entry.get("item_key"), entry.get("itemKey"))
    if not item_key and paper_ref:
        parsed = re.match(r"^\d+:([A-Z0-9]+)$", paper_ref)
        if parsed:
            item_key = parsed.group(1)
    if target_binding and target_binding != "library":
        item_key = ""
    elif item_key and not paper_ref:
        paper_ref = f"1:{item_key}"
    library_bound = bool((not target_binding or target_binding == "library") and (paper_ref or item_key))
    return {
        "reference_id": reference_id,
        "reference_index": reference_index,
        "title": first_text(entry.get("target_title"), entry.get("targetTitle"), entry.get("title"), entry.get("reference_title"), entry.get("referenceTitle"), entry.get("raw_reference"), entry.get("rawReference"), entry.get("raw")),
        "authors": as_list(entry.get("authors") or entry.get("target_authors") or entry.get("targetAuthors")),
        "year": first_text(entry.get("target_year"), entry.get("targetYear"), entry.get("year")),
        "raw": entry,
        "binding_status": "library" if library_bound else first_text(target_binding, binding_status, "unresolved"),
        "bound_paper_ref": paper_ref if library_bound else "",
        "zotero_item_key": item_key if library_bound else "",
        "target_binding": target_binding,
        "match_confidence": entry.get("match_confidence") or entry.get("matchConfidence") or entry.get("confidence"),
        "reference_index_status": binding_status,
    }


def merge_reference_index_bindings(bindings: list[dict[str, Any]], index_result: dict[str, Any]) -> list[dict[str, Any]]:
    references = as_list(
        index_result.get("references")
        or index_result.get("items")
        or index_result.get("bindings")
        or index_result.get("rows")
    )
    by_title: dict[str, dict[str, Any]] = {}
    by_index: dict[int, dict[str, Any]] = {}
    for entry in references:
        if not isinstance(entry, dict):
            continue
        if "rows" in index_result and not (
            entry.get("reference_index")
            or entry.get("referenceIndex")
            or entry.get("index")
            or entry.get("reference_title")
            or entry.get("referenceTitle")
        ):
            continue
        title = clean_text(entry.get("title") or entry.get("reference_title") or entry.get("referenceTitle") or entry.get("raw")).lower()
        if title:
            by_title[title] = entry
        idx = safe_int(entry.get("reference_index") or entry.get("referenceIndex") or entry.get("index"), 0)
        if idx:
            by_index[idx] = entry
    merged: list[dict[str, Any]] = []
    for binding in bindings:
        if binding["bound_paper_ref"] or binding["zotero_item_key"]:
            merged.append(binding)
            continue
        candidate = by_index.get(binding["reference_index"]) or by_title.get(binding["title"].lower())
        if isinstance(candidate, dict):
            target_binding = clean_text(candidate.get("target_binding") or candidate.get("targetBinding"))
            candidate_status = clean_text(candidate.get("binding_status") or candidate.get("bindingStatus"))
            paper_ref = first_text(
                candidate.get("target_paper_ref"),
                candidate.get("targetPaperRef"),
                candidate.get("bound_paper_ref"),
                candidate.get("boundPaperRef"),
                candidate.get("paper_ref"),
                candidate.get("paperRef"),
            )
            item_key = first_text(
                candidate.get("zotero_item_key"),
                candidate.get("zoteroItemKey"),
                candidate.get("item_key"),
                candidate.get("itemKey"),
            )
            if not item_key and paper_ref:
                parsed = re.match(r"^\d+:([A-Z0-9]+)$", paper_ref)
                if parsed:
                    item_key = parsed.group(1)
            if target_binding and target_binding != "library":
                merged.append(binding)
                continue
            if paper_ref and (not target_binding or target_binding == "library"):
                binding = {
                    **binding,
                    "binding_status": "library",
                    "bound_paper_ref": paper_ref,
                    "zotero_item_key": item_key,
                    "match_confidence": candidate.get("match_confidence") or candidate.get("matchConfidence") or candidate.get("confidence"),
                    "target_title": first_text(candidate.get("target_title"), candidate.get("targetTitle")),
                    "reference_index_status": candidate_status,
                }
            elif item_key and not target_binding:
                binding = {
                    **binding,
                    "binding_status": "library",
                    "bound_paper_ref": f"1:{item_key}",
                    "zotero_item_key": item_key,
                    "match_confidence": candidate.get("match_confidence") or candidate.get("matchConfidence") or candidate.get("confidence"),
                    "reference_index_status": candidate_status,
                }
        merged.append(binding)
    return merged


def merge_index_reference_items(items: list[dict[str, Any]], index_result: dict[str, Any], target_refs: dict[str, str]) -> list[dict[str, Any]]:
    merged = list(items)
    seen = {
        first_text(item.get("reference_id"), str(item.get("reference_index")))
        for item in merged
        if first_text(item.get("reference_id"), str(item.get("reference_index")))
    }
    for index, entry in enumerate(reference_index_reference_rows(index_result, target_refs), start=1):
        normalized = normalize_index_reference(entry, index)
        key = first_text(normalized.get("reference_id"), str(normalized.get("reference_index")))
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        merged.append(normalized)
    return sorted(merged, key=lambda item: safe_int(item.get("reference_index"), 999999))


def build_reference_bindings(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    seed = read_view("references-seed-view.json", {})
    references = as_list(seed.get("references"))
    bindings = [normalize_reference(entry, index) for index, entry in enumerate(references, start=1)]
    target_refs = infer_target_refs(source_manifest())
    preflight = read_view("host-preflight-view.json", {})
    preflight_index = preflight.get("reference_index") if isinstance(preflight.get("reference_index"), dict) else {}
    item_references: list[dict[str, Any]] = []
    if bindings and preflight_index:
        bindings = merge_reference_index_bindings(bindings, preflight_index)
    if preflight_index:
        item_references = merge_index_reference_items(item_references, preflight_index, target_refs)
    if target_refs["paper_ref"]:
        try:
            output = run_bridge_json(
                run_root,
                ["reference-index", "get"],
                reference_index_request_payload(target_refs["paper_ref"]),
                "reference-index-input.json",
            )
            index_data = unwrap_bridge_data(output)
            if bindings:
                bindings = merge_reference_index_bindings(bindings, index_data)
            item_references = merge_index_reference_items(item_references, index_data, target_refs)
            diagnostics.append({"severity": "info", "code": "reference_index_available", "count": len(bindings)})
        except Exception as exc:  # noqa: BLE001
            diagnostics.append({"severity": "warning", "code": "reference_index_unavailable", "message": str(exc)})
    return {
        "schema_version": "literature-deep-reading.reference-bindings-view.v0",
        "source": "references_seed_and_reference_index",
        "items": bindings,
        "item_references": item_references,
        "target": target_refs,
        "diagnostics": [item for item in diagnostics if str(item.get("code", "")).startswith("reference_")],
    }


def digest_reference_bindings(reference_bindings: dict[str, Any]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in [*as_list(reference_bindings.get("item_references")), *as_list(reference_bindings.get("items"))]:
        if not isinstance(item, dict):
            continue
        paper_ref = clean_text(item.get("bound_paper_ref"))
        key = first_text(item.get("reference_id"), paper_ref, item.get("zotero_item_key"))
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        merged.append(item)
    return merged


def library_bindings_for_policy(bindings: list[dict[str, Any]], context: dict[str, Any]) -> list[dict[str, Any]]:
    policy = context["reference_digest_policy"]
    if policy == "none":
        return []
    selected = [
        item
        for item in bindings
        if item.get("binding_status") == "library" and clean_text(item.get("bound_paper_ref"))
    ]
    if policy == "priority_only":
        priority = set(context["priority_reference_indices"])
        selected = [item for item in selected if safe_int(item.get("reference_index"), 0) in priority]
    return selected


def topic_timeline_digest_bindings(topic_context: dict[str, Any]) -> list[dict[str, Any]]:
    semantic = topic_context_semantic(topic_context)
    if not semantic:
        return []
    bindings: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, paper in enumerate(as_list(semantic.get("source_papers")), start=1):
        if not isinstance(paper, dict):
            continue
        paper_ref = source_paper_ref(paper)
        if not paper_ref or paper_ref in seen:
            continue
        seen.add(paper_ref)
        item_key = source_paper_item_key(paper)
        bindings.append(
            {
                "reference_id": f"timeline:{paper_ref}",
                "reference_index": 0,
                "title": first_text(paper.get("title"), paper_ref, f"Timeline paper {index}"),
                "authors": as_list(paper.get("authors") or paper.get("creators")),
                "year": first_text(paper.get("year"), paper.get("publication_year"), paper.get("publicationYear")),
                "raw": paper,
                "binding_status": "library",
                "bound_paper_ref": paper_ref,
                "zotero_item_key": item_key,
                "target_binding": "library",
                "match_confidence": "topic_timeline",
                "reference_index_status": "topic_timeline",
                "digest_source": "topic_timeline",
            }
        )
    return bindings


def digest_ref_from_artifact(paper_ref: str, artifact: dict[str, Any]) -> dict[str, Any]:
    digest_ref = {
        "paper_ref": paper_ref,
        "payload_type": "digest-markdown",
    }
    for source_key, target_key in (
        ("note_key", "note_key"),
        ("noteKey", "note_key"),
        ("payload_hash", "payload_hash"),
        ("payloadHash", "payload_hash"),
        ("artifact_id", "artifact_id"),
        ("artifactId", "artifact_id"),
        ("content_file", "content_file"),
        ("contentFile", "content_file"),
        ("path", "content_file"),
        ("payload_path", "content_file"),
    ):
        value = clean_text(artifact.get(source_key))
        if value and target_key not in digest_ref:
            digest_ref[target_key] = value
    return digest_ref


def resolve_reference_digest_result(run_root: Path, paper_ref: str, artifact: dict[str, Any], fallback_markdown: str, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    digest_ref = digest_ref_from_artifact(paper_ref, artifact)
    try:
        output = run_bridge_json(
            run_root,
            ["paper-artifacts", "resolve-topic-digest"],
            {
                "paper_ref": paper_ref,
                "digest_ref": digest_ref,
                "include_representative_image": True,
                "includeRepresentativeImage": True,
            },
            f"paper-artifacts-resolve-topic-digest-{re.sub(r'[^A-Za-z0-9_.-]+', '_', paper_ref)}-input.json",
        )
        result = unwrap_bridge_data(output)
        if isinstance(result, dict):
            if fallback_markdown and not clean_text(result.get("digest_markdown")):
                result = {**result, "digest_markdown": fallback_markdown}
            return result
    except Exception as exc:  # noqa: BLE001
        diagnostics.append(
            {
                "severity": "warning",
                "code": "reference_digest_resolve_failed",
                "paper_ref": paper_ref,
                "message": str(exc),
            }
        )
    return {
        "ok": bool(fallback_markdown),
        "status": "available" if fallback_markdown else "missing",
        "paper_ref": paper_ref,
        "digest_markdown": fallback_markdown,
        "representative_image": {"status": "unavailable"},
        "source_changed": False,
        "diagnostics": [],
    }


def normalize_exported_digest_items(run_root: Path, bindings: list[dict[str, Any]], export_data: dict[str, Any], diagnostics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    target_dir = clean_text(export_data.get("targetDir") or export_data.get("target_dir"))
    manifest = load_export_manifest(run_root, export_data)
    artifacts = export_manifest_artifacts(manifest)
    artifacts_by_paper: dict[str, dict[str, Any]] = {}
    for artifact in artifacts:
        if not isinstance(artifact, dict):
            continue
        if clean_text(artifact.get("kind") or artifact.get("artifact_type")) != "digest":
            continue
        paper_ref = first_text(artifact.get("paperRef"), artifact.get("paper_ref"), artifact.get("bound_paper_ref"))
        if paper_ref:
            artifacts_by_paper[paper_ref] = artifact
    items: list[dict[str, Any]] = []
    for binding in bindings:
        paper_ref = clean_text(binding.get("bound_paper_ref"))
        artifact = artifacts_by_paper.get(paper_ref, {})
        content_file = first_text(artifact.get("content_file"), artifact.get("contentFile"), artifact.get("path"), artifact.get("payload_path"))
        candidate: Path | None = None
        if content_file:
            candidate = Path(content_file)
            if not candidate.is_absolute():
                candidate = run_root / content_file
        elif target_dir:
            safe_ref = re.sub(r"[^A-Za-z0-9_.-]+", "_", paper_ref)
            candidate = run_root / target_dir / safe_ref / "digest.md"
        markdown = ""
        status = "missing"
        bytes_value = 0
        sha256 = ""
        if candidate and candidate.exists():
            markdown = candidate.read_text(encoding="utf-8", errors="replace")
            status = "available"
            bytes_value = candidate.stat().st_size
            sha256 = sha256_file(candidate)
        result = resolve_reference_digest_result(run_root, paper_ref, artifact, markdown, diagnostics)
        result_markdown = clean_text(result.get("digest_markdown")) if isinstance(result, dict) else markdown
        representative_image = result.get("representative_image") if isinstance(result, dict) else {}
        resolved_status = clean_text(result.get("status")) if isinstance(result, dict) else ""
        resolved_ok = bool(result.get("ok")) if isinstance(result, dict) else False
        final_status = "available" if result_markdown and (resolved_ok or resolved_status == "available" or status == "available") else status
        items.append(
            {
                "reference_id": binding["reference_id"],
                "reference_index": binding["reference_index"],
                "bound_paper_ref": paper_ref,
                "zotero_item_key": binding.get("zotero_item_key") or "",
                "title": binding.get("title") or "",
                "digest": {
                    "status": final_status,
                    "payload_type": "digest-markdown",
                    "markdown": result_markdown,
                    "html": "",
                    "result": result,
                    "representative_image": representative_image if isinstance(representative_image, dict) else {"status": "unavailable"},
                    "sha256": sha256,
                    "bytes": bytes_value,
                    "truncated": False,
                },
                "analysis": {},
            }
        )
    return items


def collect_reference_digests(context: dict[str, Any], run_root: Path, bindings: list[dict[str, Any]], topic_context: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    selected_by_paper: dict[str, dict[str, Any]] = {}
    for item in [*library_bindings_for_policy(bindings, context), *topic_timeline_digest_bindings(topic_context)]:
        paper_ref = clean_text(item.get("bound_paper_ref"))
        if not paper_ref:
            continue
        if paper_ref not in selected_by_paper or clean_text(selected_by_paper[paper_ref].get("digest_source")) == "topic_timeline":
            selected_by_paper[paper_ref] = item
    selected = list(selected_by_paper.values())
    paper_refs = sorted({clean_text(item.get("bound_paper_ref")) for item in selected if clean_text(item.get("bound_paper_ref"))})
    if not paper_refs:
        return {
            "schema_version": "literature-deep-reading.reference-digests-view.v0",
            "source": "none",
            "items": [],
            "diagnostics": [{"severity": "info", "code": "reference_digest_no_library_bindings"}],
        }
    try:
        manifest_output = run_bridge_json(
            run_root,
            ["paper-artifacts", "manifest"],
            {"paper_refs": paper_refs, "artifact_types": ["digest"]},
            "paper-artifacts-manifest-input.json",
        )
        export_output = run_bridge_json(
            run_root,
            ["paper-artifacts", "export-filtered"],
            {"run_root": str(run_root), "paper_refs": paper_refs, "artifact_types": ["digest"]},
            "paper-artifacts-export-input.json",
        )
        export_data = unwrap_bridge_data(export_output)
        items = normalize_exported_digest_items(run_root, selected, export_data, diagnostics)
        return {
            "schema_version": "literature-deep-reading.reference-digests-view.v0",
            "source": "host_paper_artifacts",
            "paper_refs": paper_refs,
            "manifest": unwrap_bridge_data(manifest_output),
            "items": items,
            "diagnostics": [],
        }
    except Exception as exc:  # noqa: BLE001
        diagnostics.append({"severity": "warning", "code": "reference_digest_collection_failed", "message": str(exc)})
        return {
            "schema_version": "literature-deep-reading.reference-digests-view.v0",
            "source": "host_paper_artifacts",
            "paper_refs": paper_refs,
            "items": [],
            "diagnostics": [{"severity": "warning", "code": "reference_digest_collection_failed", "message": str(exc)}],
        }


def collect_citation_graph(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    target = infer_target_refs(source_manifest())
    snapshot_empty = {
        "schema_version": "literature-deep-reading.citation-graph-snapshot.v0",
        "source": "none",
        "request": {},
        "raw": {},
        "nodes": [],
        "edges": [],
        "diagnostics": [],
    }
    layout_empty = {
        "schema_version": "literature-deep-reading.citation-graph-layout.v0",
        "source": "none",
        "request": {},
        "raw": {},
        "status": "missing",
        "nodes": [],
        "edges": [],
        "diagnostics": [],
    }
    if not context["request_citation_graph"]:
        return snapshot_empty, layout_empty
    start_node_id = target["graph_start_node_id"]
    paper_ref = target["paper_ref"]
    if not start_node_id and not paper_ref:
        diagnostic = {"severity": "warning", "code": "citation_graph_target_missing"}
        snapshot_empty["diagnostics"] = [diagnostic]
        layout_empty["diagnostics"] = [diagnostic]
        diagnostics.append(diagnostic)
        return snapshot_empty, layout_empty
    request: dict[str, Any] = {
        "depth": context["citation_graph_depth"],
        "direction": context["citation_graph_direction"],
        "maxNodes": context["citation_graph_max_nodes"],
        "maxEdges": context["citation_graph_max_edges"],
        "includeLowSignal": context["citation_graph_include_low_signal"],
    }
    if paper_ref:
        request["paperRef"] = paper_ref
    if start_node_id:
        request["startNodeId"] = start_node_id
    try:
        slice_output = run_bridge_json(run_root, ["citation-graph", "get-slice"], request, "citation-graph-slice-input.json")
        slice_data = unwrap_bridge_data(slice_output)
        snapshot = {
            "schema_version": "literature-deep-reading.citation-graph-snapshot.v0",
            "source": "host_citation_graph_get_slice",
            "start_node_id": start_node_id,
            "paper_ref": paper_ref,
            "request": request,
            "raw": slice_data,
            "nodes": as_list(slice_data.get("nodes")),
            "edges": as_list(slice_data.get("edges")),
            "diagnostics": as_list(slice_data.get("diagnostics")),
        }
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "citation_graph_slice_failed", "message": str(exc)}
        diagnostics.append(diagnostic)
        snapshot_empty["source"] = "host_citation_graph_get_slice"
        snapshot_empty["request"] = request
        snapshot_empty["diagnostics"] = [diagnostic]
        snapshot = snapshot_empty
    layout_request = {**request, "preset": "force", "allowTruncated": True}
    try:
        layout_output = run_bridge_json(run_root, ["citation-graph", "get-layout"], layout_request, "citation-graph-layout-input.json")
        layout_data = unwrap_bridge_data(layout_output)
        layout_nodes = as_list(layout_data.get("nodes"))
        layout_edges = as_list(layout_data.get("edges"))
        snapshot_node_ids = {clean_text(node.get("node_id") or node.get("id")) for node in as_list(snapshot.get("nodes")) if isinstance(node, dict)}
        layout_node_ids = {clean_text(node.get("node_id") or node.get("id")) for node in layout_nodes if isinstance(node, dict)}
        mismatch = sorted((snapshot_node_ids ^ layout_node_ids) - {""})
        layout_diagnostics = as_list(layout_data.get("diagnostics"))
        if mismatch:
            layout_diagnostics.append({"severity": "warning", "code": "citation_graph_layout_snapshot_mismatch", "node_ids": mismatch})
        layout = {
            "schema_version": "literature-deep-reading.citation-graph-layout.v0",
            "source": "host_citation_graph_get_layout",
            "request": layout_request,
            "raw": layout_data,
            "ok": bool(layout_data.get("ok")),
            "status": clean_text(layout_data.get("status") or "unknown"),
            "layout_status": clean_text(layout_data.get("layout_status")),
            "graph_hash": clean_text(layout_data.get("graph_hash")),
            "layout_hash": clean_text(layout_data.get("layout_hash")),
            "nodes": layout_nodes,
            "edges": layout_edges,
            "diagnostics": layout_diagnostics,
        }
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "citation_graph_layout_failed", "message": str(exc)}
        diagnostics.append(diagnostic)
        layout_empty["source"] = "host_citation_graph_get_layout"
        layout_empty["request"] = layout_request
        layout_empty["diagnostics"] = [diagnostic]
        layout = layout_empty
    return snapshot, layout


def normalize_concept_query_entries(data: dict[str, Any], labels: list[str]) -> list[dict[str, Any]]:
    raw_entries = as_list(data.get("concepts") or data.get("matches") or data.get("items"))
    concepts: list[dict[str, Any]] = []
    for entry in raw_entries:
        if not isinstance(entry, dict):
            continue
        query_label = first_text(entry.get("query"), entry.get("query_label"), entry.get("queryLabel"), entry.get("label"))
        nested = entry.get("concept") if isinstance(entry.get("concept"), dict) else None
        candidates = as_list(entry.get("matches") or entry.get("candidates") or entry.get("concepts"))
        if nested:
            candidates = [nested, *candidates]
        if candidates:
            for candidate in candidates:
                if not isinstance(candidate, dict):
                    continue
                label = first_text(candidate.get("label"), candidate.get("name"), candidate.get("title"), query_label)
                if not label:
                    continue
                aliases = [clean_text(item) for item in as_list(candidate.get("aliases") or candidate.get("alias")) if clean_text(item)]
                if query_label and concept_key(query_label) != concept_key(label):
                    aliases.append(query_label)
                concepts.append(
                    {
                        "label": label,
                        "aliases": sorted({alias for alias in aliases if alias}),
                        "kind": first_text(candidate.get("kind"), candidate.get("type"), entry.get("kind"), entry.get("type")),
                        "definition": first_text(candidate.get("definition"), candidate.get("description"), entry.get("definition"), entry.get("description")),
                        "status": first_text(candidate.get("status"), entry.get("status")) or "available",
                        "score": candidate.get("score") or entry.get("score"),
                        "raw": candidate,
                    }
                )
            continue
        label = first_text(entry.get("label"), entry.get("name"), entry.get("title"), query_label)
        if not label:
            continue
        concepts.append(
            {
                "label": label,
                "aliases": [clean_text(item) for item in as_list(entry.get("aliases") or entry.get("alias")) if clean_text(item)],
                "kind": first_text(entry.get("kind"), entry.get("type")),
                "definition": first_text(entry.get("definition"), entry.get("description")),
                "status": clean_text(entry.get("status") or "available"),
                "score": entry.get("score"),
                "raw": entry,
            }
        )
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for concept in concepts:
        key = concept_key(first_text(concept.get("label")))
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(concept)
    for label in labels:
        key = concept_key(label)
        if key and key not in seen:
            seen.add(key)
            unique.append({"label": label, "aliases": [], "kind": "", "definition": "", "status": "requested"})
    return unique


def collect_concepts(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    labels = context["concept_labels"]
    if not context["request_concept_context"] or not labels:
        return {
            "schema_version": "literature-deep-reading.concept-candidates-view.v0",
            "source": "none",
            "concepts": [],
            "diagnostics": [],
        }
    try:
        output = run_bridge_json(
            run_root,
            ["concepts", "query"],
            {"labels": labels, "limit": max(20, len(labels))},
            "concepts-query-input.json",
        )
        data = unwrap_bridge_data(output)
        return {
            "schema_version": "literature-deep-reading.concept-candidates-view.v0",
            "source": "host_concepts_query",
            "request": {"labels": labels},
            "raw": data,
            "concepts": normalize_concept_query_entries(data, labels),
            "diagnostics": as_list(data.get("diagnostics")),
        }
    except Exception as exc:  # noqa: BLE001
        diagnostics.append({"severity": "warning", "code": "concepts_query_failed", "message": str(exc)})
        return {
            "schema_version": "literature-deep-reading.concept-candidates-view.v0",
            "source": "host_concepts_query",
            "request": {"labels": labels},
            "concepts": [],
            "diagnostics": [{"severity": "warning", "code": "concepts_query_failed", "message": str(exc)}],
        }


def extract_source_concept_terms(limit: int = 20, source_reading: dict[str, Any] | None = None) -> list[str]:
    source_reading = source_reading if isinstance(source_reading, dict) else read_view("source-reading-view.json", {})
    text = "\n".join(
        first_text(section.get("title"), section.get("excerpt"))
        for section in as_list(source_reading.get("sections"))
        if isinstance(section, dict)
    )
    candidates: list[str] = []
    for match in re.finditer(r"\b[A-Z][A-Z0-9-]{2,}\b", text):
        candidates.append(match.group(0))
    for match in re.finditer(r"\b(?:[A-Za-z][A-Za-z0-9-]+(?:\s+|$)){2,4}", text):
        term = re.sub(r"\s+", " ", match.group(0)).strip()
        if len(term) >= 12 and not term.lower().startswith(("this ", "that ", "there ", "these ")):
            candidates.append(term)
    unique: list[str] = []
    seen: set[str] = set()
    for term in candidates:
        key = concept_key(term)
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(term)
        if len(unique) >= limit:
            break
    return unique


def build_concept_needs_view(context: dict[str, Any], concept_candidates: dict[str, Any], source_reading: dict[str, Any] | None = None) -> dict[str, Any]:
    labels: list[tuple[str, str]] = []
    for label in as_list(context.get("concept_labels")):
        text = clean_text(label)
        if text:
            labels.append((text, "context_request"))
    for concept in as_list(concept_candidates.get("concepts")):
        if isinstance(concept, dict) and clean_text(concept.get("label")):
            labels.append((clean_text(concept.get("label")), "host_candidate"))
    for term in extract_source_concept_terms(source_reading=source_reading):
        labels.append((term, "source_terms"))

    candidate_by_key = {
        concept_key(clean_text(concept.get("label"))): concept
        for concept in as_list(concept_candidates.get("concepts"))
        if isinstance(concept, dict) and clean_text(concept.get("label"))
    }
    seen: set[str] = set()
    items: list[dict[str, Any]] = []
    for label, source in labels:
        key = concept_key(label)
        if not key or key in seen:
            continue
        seen.add(key)
        candidate = candidate_by_key.get(key, {})
        definition = first_text(candidate.get("definition"), candidate.get("description")) if isinstance(candidate, dict) else ""
        items.append(
            {
                "label": label,
                "source": source,
                "host_definition_available": bool(definition),
                "definition": definition,
                "status": "resolved_by_host" if definition else "needs_agent_definition",
            }
        )
    return {
        "schema_version": "literature-deep-reading.concept-needs-view.v0",
        "source": "source_terms_context_request_and_host_candidates",
        "items": items,
        "diagnostics": [],
    }


def collect_topic_context(context: dict[str, Any], run_root: Path, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    manifest = source_manifest()
    paper = manifest.get("paper") if isinstance(manifest.get("paper"), dict) else {}
    preflight = read_view("host-preflight-view.json", {})
    topic_candidates_view = read_view("topic-candidates-view.json", {})
    topic_candidates = [item for item in as_list(topic_candidates_view.get("topics")) if isinstance(item, dict)]
    selected_topic_id = clean_text(context.get("selected_topic_id"))
    topic_id = first_text(
        selected_topic_id,
        paper.get("topic_id"),
        paper.get("topicId"),
        manifest.get("topic_id"),
        manifest.get("topicId"),
        explicit_topic_id_from_preflight(preflight if isinstance(preflight, dict) else {}),
    )
    if not topic_id and len(topic_candidates) == 1:
        topic_id = clean_text(topic_candidates[0].get("topic_id"))
    if not context["request_topic_context"]:
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "none", "topic_id": "", "context": {}, "diagnostics": []}
    if not topic_id:
        code = "topic_context_multiple_candidates" if len(topic_candidates) > 1 else "topic_context_unresolved"
        message = "Multiple topic candidates are available; set selected_topic_id in context-request.json." if len(topic_candidates) > 1 else "No explicit topic id is available for topics get-context."
        diagnostic = {"severity": "info", "code": code, "message": message}
        diagnostics.append(diagnostic)
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "none", "topic_id": "", "context": {}, "diagnostics": [diagnostic]}
    try:
        output = run_bridge_json(run_root, ["topics", "get-context"], {"topicId": topic_id, "view": "semantic"}, "topic-context-input.json")
        raw_data = unwrap_bridge_data(output)
        data = raw_data if isinstance(raw_data, dict) else {}
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "host_topics_get_context", "topic_id": topic_id, "view": "semantic", "context": data, "diagnostics": as_list(data.get("diagnostics"))}
    except Exception as exc:  # noqa: BLE001
        diagnostic = {"severity": "warning", "code": "topic_context_failed", "message": str(exc)}
        diagnostics.append(diagnostic)
        return {"schema_version": "literature-deep-reading.topic-context.v0", "source": "host_topics_get_context", "topic_id": topic_id, "view": "semantic", "context": {}, "diagnostics": [diagnostic]}


def sanitize_runtime_filename_segment(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9_.-]+", "-", clean_text(value)).strip("-")
    return text[:80] or "topic"


def collect_topic_candidate_digests(context: dict[str, Any], run_root: Path, selected_topic_id: str, diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    topic_candidates_view = read_view("topic-candidates-view.json", {})
    candidates = [item for item in as_list(topic_candidates_view.get("topics")) if isinstance(item, dict)]
    view_diagnostics: list[dict[str, Any]] = []
    if len(candidates) <= 1:
        return {
            "schema_version": "literature-deep-reading.topic-candidate-digests-view.v0",
            "source": "none",
            "selected_topic_id": selected_topic_id,
            "items": [],
            "diagnostics": [],
        }
    selected = clean_text(selected_topic_id)
    items: list[dict[str, Any]] = []
    for candidate in candidates:
        topic_id = clean_text(candidate.get("topic_id"))
        if not topic_id:
            continue
        if selected and topic_id == selected:
            continue
        try:
            output = run_bridge_json(
                run_root,
                ["topics", "get-context"],
                {"topicId": topic_id, "view": "digest"},
                f"topic-candidate-digest-{sanitize_runtime_filename_segment(topic_id)}-input.json",
            )
            raw_data = unwrap_bridge_data(output)
            data = raw_data if isinstance(raw_data, dict) else {}
            items.append(
                {
                    "topic_id": topic_id,
                    "title": clean_text(candidate.get("title")),
                    "status": clean_text(candidate.get("status")),
                    "digest": data.get("digest") if isinstance(data.get("digest"), dict) else data,
                    "diagnostics": as_list(data.get("diagnostics")),
                }
            )
        except Exception as exc:  # noqa: BLE001
            diagnostic = {
                "severity": "warning",
                "code": "topic_candidate_digest_failed",
                "topic_id": topic_id,
                "message": str(exc),
            }
            view_diagnostics.append(diagnostic)
            diagnostics.append(diagnostic)
            items.append(
                {
                    "topic_id": topic_id,
                    "title": clean_text(candidate.get("title")),
                    "status": clean_text(candidate.get("status")),
                    "digest": {},
                    "diagnostics": [diagnostic],
                }
            )
    return {
        "schema_version": "literature-deep-reading.topic-candidate-digests-view.v0",
        "source": "host_topics_get_context_digest",
        "selected_topic_id": selected_topic_id,
        "items": items,
        "diagnostics": view_diagnostics,
    }


def available_section_anchors() -> set[str]:
    structure = read_view("source-structure.json", {})
    return {clean_text(section.get("anchor")) for section in as_list(structure.get("sections")) if isinstance(section, dict) and clean_text(section.get("anchor"))}


def normalize_question(entry: Any) -> dict[str, str]:
    source = entry if isinstance(entry, dict) else {}
    return {
        "question": clean_text(source.get("question")),
        "answer": clean_text(source.get("answer")),
        "evidence_kind": clean_text(source.get("evidence_kind")),
        "evidence_ref": clean_text(source.get("evidence_ref")),
    }


def normalize_titled_text(entry: Any) -> dict[str, str]:
    source = entry if isinstance(entry, dict) else {}
    return {"title": clean_text(source.get("title")), "body": clean_text(source.get("body"))}


def reference_ids_from_views() -> set[str]:
    ids: set[str] = set()
    for item in as_list(read_view("references-seed-view.json", {}).get("references")):
        if isinstance(item, dict):
            reference_id = first_text(item.get("id"), item.get("reference_id"), item.get("referenceId"))
            if reference_id:
                ids.add(reference_id)
    for item in as_list(read_view("reference-bindings-view.json", {}).get("items")):
        if isinstance(item, dict) and clean_text(item.get("reference_id")):
            ids.add(clean_text(item.get("reference_id")))
    return ids


def validate_reading_enrichment_payload(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["reading enrichment must be a JSON object"]
    unknown = sorted(set(payload) - READING_ENRICHMENT_FIELDS)
    if unknown:
        errors.append("unknown fields: " + ", ".join(unknown))

    anchors = available_section_anchors()
    reference_ids = reference_ids_from_views()

    for field in ["preface_cards", "preface_questions", "section_notes", "concepts", "reference_digest_notes", "summary_fallback_sections", "extensions"]:
        if field in payload and not isinstance(payload.get(field), list):
            errors.append(f"{field} must be an array")

    for index, card in enumerate(as_list(payload.get("preface_cards")), start=1):
        normalized = normalize_titled_text(card)
        if not normalized["title"] or not normalized["body"]:
            errors.append(f"preface_cards[{index}] requires title and body")

    for index, question in enumerate(as_list(payload.get("preface_questions")), start=1):
        normalized = normalize_question(question)
        if not normalized["question"] or not normalized["answer"]:
            errors.append(f"preface_questions[{index}] requires question and answer")

    for index, section_note in enumerate(as_list(payload.get("section_notes")), start=1):
        if not isinstance(section_note, dict):
            errors.append(f"section_notes[{index}] must be an object")
            continue
        anchor = clean_text(section_note.get("section_anchor"))
        if not anchor:
            errors.append(f"section_notes[{index}] requires section_anchor")
        elif anchor not in anchors:
            errors.append(f"section_notes[{index}] references unknown section_anchor: {anchor}")
        for question_index, question in enumerate(as_list(section_note.get("questions")), start=1):
            normalized = normalize_question(question)
            if not normalized["question"] or not normalized["answer"]:
                errors.append(f"section_notes[{index}].questions[{question_index}] requires question and answer")
        for role_index, role in enumerate(as_list(section_note.get("citation_reference_roles")), start=1):
            if not isinstance(role, dict):
                errors.append(f"section_notes[{index}].citation_reference_roles[{role_index}] must be an object")
                continue
            reference_id = clean_text(role.get("reference_id"))
            if not reference_id:
                errors.append(f"section_notes[{index}].citation_reference_roles[{role_index}] requires reference_id")
            elif reference_id not in reference_ids:
                errors.append(f"section_notes[{index}].citation_reference_roles[{role_index}] references unknown reference_id: {reference_id}")

    for index, concept in enumerate(as_list(payload.get("concepts")), start=1):
        if not isinstance(concept, dict):
            errors.append(f"concepts[{index}] must be an object")
            continue
        if not clean_text(concept.get("label")):
            errors.append(f"concepts[{index}] requires label")

    for index, note in enumerate(as_list(payload.get("reference_digest_notes")), start=1):
        if not isinstance(note, dict):
            errors.append(f"reference_digest_notes[{index}] must be an object")
            continue
        reference_id = clean_text(note.get("reference_id"))
        if not reference_id:
            errors.append(f"reference_digest_notes[{index}] requires reference_id")
        elif reference_id not in reference_ids:
            errors.append(f"reference_digest_notes[{index}] references unknown reference_id: {reference_id}")

    for index, section in enumerate(as_list(payload.get("summary_fallback_sections")), start=1):
        normalized = normalize_titled_text(section)
        if not normalized["title"] or not normalized["body"]:
            errors.append(f"summary_fallback_sections[{index}] requires title and body")

    for index, extension in enumerate(as_list(payload.get("extensions")), start=1):
        normalized = normalize_titled_text(extension)
        if not normalized["title"] or not normalized["body"]:
            errors.append(f"extensions[{index}] requires title and body")
    return errors


def normalized_reading_enrichment(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "preface_title": clean_text(payload.get("preface_title")),
        "preface_cards": [normalize_titled_text(item) for item in as_list(payload.get("preface_cards"))],
        "preface_reading_path": [clean_text(item) for item in as_list(payload.get("preface_reading_path")) if clean_text(item)],
        "preface_goal": clean_text(payload.get("preface_goal")),
        "preface_concepts": [clean_text(item) for item in as_list(payload.get("preface_concepts")) if clean_text(item)],
        "preface_warnings": [clean_text(item) for item in as_list(payload.get("preface_warnings")) if clean_text(item)],
        "preface_questions": [normalize_question(item) for item in as_list(payload.get("preface_questions"))],
        "section_notes": as_list(payload.get("section_notes")),
        "concepts": as_list(payload.get("concepts")),
        "reference_digest_notes": as_list(payload.get("reference_digest_notes")),
        "summary_fallback_enabled": bool(payload.get("summary_fallback_enabled")),
        "summary_fallback_sections": [normalize_titled_text(item) for item in as_list(payload.get("summary_fallback_sections"))],
        "extensions": as_list(payload.get("extensions")),
    }


def concept_key(label: str) -> str:
    return re.sub(r"\s+", " ", label.strip().lower())


def normalize_concept_record(entry: Any, source: str, fallback_status: str = "available", require_definition: bool = False) -> dict[str, Any] | None:
    if not isinstance(entry, dict):
        return None
    label = first_text(entry.get("label"), entry.get("name"), entry.get("title"))
    if not label:
        return None
    aliases = [clean_text(item) for item in as_list(entry.get("aliases") or entry.get("alias")) if clean_text(item)]
    definition = first_text(entry.get("definition"), entry.get("description"))
    if require_definition and not definition:
        return None
    return {
        "concept_id": loose_slug(label, "concept"),
        "label": label,
        "aliases": aliases,
        "kind": first_text(entry.get("kind"), entry.get("type")),
        "definition": definition,
        "source": source,
        "status": clean_text(entry.get("status") or fallback_status),
    }


def build_concept_overlay_view(payload: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = read_view("concept-candidates-view.json", {})
    concepts_by_key: dict[str, dict[str, Any]] = {}
    used_ids: set[str] = set()

    unresolved_mentions: list[dict[str, str]] = []

    for entry in as_list(candidates.get("concepts")):
        concept = normalize_concept_record(entry, "host_concepts_query", require_definition=True)
        if not concept and isinstance(entry, dict) and clean_text(entry.get("label")):
            diagnostics.append({"severity": "info", "code": "concept_candidate_needs_definition", "label": clean_text(entry.get("label"))})
        if not concept:
            continue
        concept["concept_id"] = stable_id("concept", concept["label"], used_ids)
        concepts_by_key[concept_key(concept["label"])] = concept
        for alias in concept["aliases"]:
            concepts_by_key.setdefault(concept_key(alias), concept)

    for entry in as_list(payload.get("concepts")):
        concept = normalize_concept_record(entry, "agent_enrichment", require_definition=True)
        if not concept and isinstance(entry, dict) and clean_text(entry.get("label")):
            diagnostics.append({"severity": "info", "code": "concept_agent_entry_missing_definition", "label": clean_text(entry.get("label"))})
        if not concept:
            continue
        existing = concepts_by_key.get(concept_key(concept["label"]))
        if existing:
            aliases = sorted({*as_list(existing.get("aliases")), *as_list(concept.get("aliases"))})
            existing.update({key: value for key, value in concept.items() if key not in {"concept_id", "aliases"} and value})
            existing["aliases"] = aliases
            concept = existing
        else:
            concept["concept_id"] = stable_id("concept", concept["label"], used_ids)
        concepts_by_key[concept_key(concept["label"])] = concept
        for alias in as_list(concept.get("aliases")):
            if clean_text(alias):
                concepts_by_key.setdefault(concept_key(clean_text(alias)), concept)

    mentions: dict[str, list[str]] = {}
    keyword_labels: list[str] = []
    for label in as_list(payload.get("preface_concepts")):
        if clean_text(label):
            keyword_labels.append(clean_text(label))
            mentions.setdefault("preface", []).append(clean_text(label))
    for section_note in as_list(payload.get("section_notes")):
        if not isinstance(section_note, dict):
            continue
        anchor = clean_text(section_note.get("section_anchor"))
        for label in as_list(section_note.get("concepts")):
            if clean_text(label):
                keyword_labels.append(clean_text(label))
                mentions.setdefault(anchor, []).append(clean_text(label))

    for label in keyword_labels:
        key = concept_key(label)
        if key in concepts_by_key:
            continue
        unresolved_mentions.append({"label": label, "status": "keyword", "reason": "no host or agent definition"})
        diagnostics.append({"severity": "info", "code": "concept_unresolved_in_payload", "label": label})

    unique_concepts: dict[str, dict[str, Any]] = {}
    for concept in concepts_by_key.values():
        unique_concepts[concept["concept_id"]] = concept
    return {
        "schema_version": "literature-deep-reading.concept-overlay-view.v0",
        "source": "host_candidates_and_agent_enrichment",
        "concepts": sorted(unique_concepts.values(), key=lambda item: item["label"].lower()),
        "mentions_by_anchor": mentions,
        "unresolved_mentions": unresolved_mentions,
        "diagnostics": [item for item in diagnostics if str(item.get("code", "")).startswith("concept_")],
    }


def normalize_preface_card(entry: Any) -> dict[str, str]:
    if not isinstance(entry, dict):
        return {"title": "", "body": ""}
    return {
        "title": clean_text(entry.get("title")),
        "body": clean_text(entry.get("body") or entry.get("description")),
    }


def preface_slot_key(title: str, index: int) -> str:
    text = title.lower()
    if any(token in text for token in ["field", "领域", "domain", "area"]):
        return "research_field"
    if any(token in text for token in ["direction", "方向", "line", "track"]):
        return "research_direction"
    if any(token in text for token in ["position", "地位", "位置", "role", "contribution", "贡献"]):
        return "paper_position"
    if any(token in text for token in ["innovation", "创新", "breakthrough", "problem", "问题", "foundation", "奠定"]):
        return "core_innovation"
    if any(token in text for token in ["path", "路线", "route", "guide", "目标", "goal", "阅读"]):
        return "reading_path"
    return PREFACE_SLOT_DEFINITIONS[min(index, len(PREFACE_SLOT_DEFINITIONS) - 1)][0]


def preface_slot_fallback(slot_key: str, payload: dict[str, Any], concept_view: dict[str, Any]) -> str:
    concepts = [
        clean_text(item.get("label"))
        for item in as_list(concept_view.get("concepts"))
        if isinstance(item, dict) and clean_text(item.get("label"))
    ][:4]
    if slot_key == "research_field":
        return "这篇论文应先被放在其上位研究领域中理解，再进入具体方法细节。"
    if slot_key == "research_direction":
        if concepts:
            return "可从这些核心概念进入本文方向：" + "、".join(concepts) + "。"
        return "本文属于一个围绕问题建模、方法结构和实验验证展开的具体研究方向。"
    if slot_key == "paper_position":
        return clean_text(payload.get("preface_goal")) or "本文的价值需要结合问题设定、方法取舍和后续引用关系来判断。"
    if slot_key == "core_innovation":
        return "本文的核心创新应围绕它解决的问题、提出的关键机制，以及它为后续研究打开的路径来理解。"
    path_items = [clean_text(item) for item in as_list(payload.get("preface_reading_path")) if clean_text(item)]
    if path_items:
        return "建议按以下路径阅读：" + " → ".join(path_items) + "。"
    return "建议先看问题设定，再看方法结构，最后回到实验结果和局限。"


def topic_context_semantic(topic_context: dict[str, Any]) -> dict[str, Any]:
    context = topic_context.get("context") if isinstance(topic_context.get("context"), dict) else {}
    semantic = context.get("semantic") if isinstance(context.get("semantic"), dict) else {}
    if semantic:
        return semantic
    if any(key in context for key in ["topic", "summary", "taxonomy", "timeline_events", "source_papers"]):
        return context
    return {}


def topic_context_digest(topic_context: dict[str, Any]) -> dict[str, Any]:
    context = topic_context.get("context") if isinstance(topic_context.get("context"), dict) else {}
    digest = context.get("digest") if isinstance(context.get("digest"), dict) else {}
    if digest:
        return digest
    return {}


def parse_year_value(value: Any) -> int | None:
    if isinstance(value, (int, float)):
        year = int(value)
        return year if 1000 <= year <= 3000 else None
    text = clean_text(value)
    if not text:
        return None
    match = re.search(r"(?:19|20)\d{2}", text)
    if not match:
        return None
    year = int(match.group(0))
    return year if 1000 <= year <= 3000 else None


def source_paper_year(paper: dict[str, Any]) -> int | None:
    for key in ["year", "publication_year", "publicationYear", "date", "published_at", "publishedAt"]:
        year = parse_year_value(paper.get(key))
        if year is not None:
            return year
    return None


def source_paper_ref(paper: dict[str, Any]) -> str:
    return first_text(paper.get("paper_ref"), paper.get("paperRef"), paper.get("literature_item_id"), paper.get("literatureItemId"), paper.get("id"))


def source_paper_item_key(paper: dict[str, Any]) -> str:
    explicit = first_text(paper.get("item_key"), paper.get("itemKey"), paper.get("zotero_item_key"), paper.get("zoteroItemKey"))
    if explicit:
        return explicit
    paper_ref = source_paper_ref(paper)
    if ":" in paper_ref:
        return paper_ref.rsplit(":", 1)[-1]
    return ""


def current_paper_matches_source_paper(paper: dict[str, Any], target: dict[str, str]) -> bool:
    paper_ref = source_paper_ref(paper)
    item_key = source_paper_item_key(paper)
    return bool(
        (paper_ref and paper_ref == clean_text(target.get("paper_ref")))
        or (item_key and item_key == clean_text(target.get("item_key")))
    )


def timeline_event_year(event: dict[str, Any]) -> int | None:
    for key in ["year", "date", "start_year", "startYear", "phase_year", "phaseYear"]:
        year = parse_year_value(event.get(key))
        if year is not None:
            return year
    return None


def topic_timeline_summary(semantic: dict[str, Any]) -> str:
    timeline = semantic.get("timeline_events") if isinstance(semantic.get("timeline_events"), dict) else {}
    summary = timeline.get("summary") if isinstance(timeline.get("summary"), dict) else {}
    return first_text(summary.get("text"), summary.get("analysis"), summary.get("overview"))


def topic_title_from_context(topic_context: dict[str, Any], semantic: dict[str, Any], digest: dict[str, Any]) -> str:
    topic = semantic.get("topic") if isinstance(semantic.get("topic"), dict) else {}
    return first_text(
        topic.get("title"),
        digest.get("title"),
        topic_context.get("title"),
        topic_context.get("topic_id"),
    )


def digest_modal_from_digest_item(digest_item: dict[str, Any], title: str, paper_ref: str) -> dict[str, Any]:
    digest = digest_item.get("digest") if isinstance(digest_item.get("digest"), dict) else {}
    digest_result = digest.get("result") if isinstance(digest.get("result"), dict) else {}
    digest_markdown = first_text(digest_result.get("digest_markdown") if isinstance(digest_result, dict) else "", digest.get("markdown"))
    digest_available = clean_text(digest.get("status")) == "available" and bool(clean_text(digest_markdown))
    modal_result = digest_result if isinstance(digest_result, dict) and digest_result else {
        "ok": digest_available,
        "status": "available" if digest_available else clean_text(digest.get("status") or "missing"),
        "paper_ref": paper_ref,
        "digest_markdown": digest_markdown,
        "representative_image": digest.get("representative_image") if isinstance(digest.get("representative_image"), dict) else {"status": "unavailable"},
        "source_changed": False,
        "diagnostics": [],
    }
    return {
        "available": digest_available,
        "title": clean_text(digest_item.get("title") or title) if digest_available else "",
        "markdown": clean_text(digest_markdown) if digest_available else "",
        "payload_type": clean_text(digest.get("payload_type")) if digest_available else "",
        "result": modal_result if digest_available else {},
    }


def build_preface_topic_timeline(topic_context: dict[str, Any]) -> dict[str, Any]:
    topic_id = clean_text(topic_context.get("topic_id"))
    semantic = topic_context_semantic(topic_context)
    if not topic_id or not semantic:
        return {
            "schema_version": "literature-deep-reading.preface-topic-timeline.v0",
            "available": False,
            "topic_id": topic_id,
            "items": [],
            "diagnostics": [],
        }
    digest = topic_context_digest(topic_context)
    digest_by_paper = digest_items_by_paper_ref()
    target = infer_target_refs(source_manifest())
    items: list[dict[str, Any]] = []
    for index, paper in enumerate(as_list(semantic.get("source_papers")), start=1):
        if not isinstance(paper, dict):
            continue
        year = source_paper_year(paper)
        if year is None:
            continue
        paper_ref = source_paper_ref(paper)
        current = current_paper_matches_source_paper(paper, target)
        title = first_text(paper.get("title"), paper_ref, f"Paper {index}")
        digest_item = digest_by_paper.get(paper_ref, {}) if paper_ref else {}
        digest_reference_id = clean_text(digest_item.get("reference_id")) if isinstance(digest_item, dict) else ""
        items.append(
            {
                "key": f"paper:{paper_ref or index}",
                "kind": "paper",
                "year": year,
                "label": clean_text(paper.get("label")) or f"P{index}",
                "title": title,
                "paper_ref": paper_ref,
                "item_key": source_paper_item_key(paper),
                "is_current_paper": current,
                "pin_scale": 1.5 if current else 1,
                "tone": "current" if current else clean_text(paper.get("tone")) or "paper",
                "digest_reference_id": digest_reference_id,
                "digest_modal": digest_modal_from_digest_item(digest_item, title, paper_ref) if digest_reference_id else {"available": False},
            }
        )
    timeline = semantic.get("timeline_events") if isinstance(semantic.get("timeline_events"), dict) else {}
    for index, event in enumerate(as_list(timeline.get("events")), start=1):
        if not isinstance(event, dict):
            continue
        year = timeline_event_year(event)
        if year is None:
            continue
        items.append(
            {
                "key": f"event:{first_text(event.get('id'), event.get('label'), index)}",
                "kind": "event",
                "year": year,
                "label": clean_text(event.get("label")) or str(year),
                "title": first_text(event.get("title"), event.get("label"), f"Milestone {index}"),
                "description": first_text(event.get("description"), event.get("analysis"), event.get("summary")),
                "source_paper_refs": [clean_text(item) for item in as_list(event.get("source_paper_refs") or event.get("sourcePaperRefs")) if clean_text(item)],
                "pin_scale": 1,
                "tone": clean_text(event.get("tone")) or "milestone",
            }
        )
    items = sorted(items, key=lambda item: (safe_int(item.get("year"), 999999), clean_text(item.get("kind")), clean_text(item.get("key"))))
    return {
        "schema_version": "literature-deep-reading.preface-topic-timeline.v0",
        "available": bool(items),
        "topic_id": topic_id,
        "topic_title": topic_title_from_context(topic_context, semantic, digest),
        "summary": topic_timeline_summary(semantic),
        "target": target,
        "items": items,
        "current_paper_key": next((clean_text(item.get("key")) for item in items if item.get("is_current_paper")), ""),
        "diagnostics": [] if items else [{"severity": "info", "code": "topic_timeline_no_dated_items"}],
    }


def build_stable_preface_cards(payload: dict[str, Any], concept_view: dict[str, Any]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    assigned: dict[str, dict[str, str]] = {}
    extras: list[dict[str, Any]] = []
    for index, raw_card in enumerate(as_list(payload.get("preface_cards"))):
        card = normalize_preface_card(raw_card)
        if not card["title"] and not card["body"]:
            continue
        slot_key = preface_slot_key(card["title"], index)
        if slot_key in assigned:
            extras.append({"title": card["title"], "body": card["body"], "reason": "extra_preface_card"})
            continue
        assigned[slot_key] = card
    cards: list[dict[str, str]] = []
    for slot_key, title, fallback in PREFACE_SLOT_DEFINITIONS:
        card = assigned.get(slot_key, {})
        body = clean_text(card.get("body")) or preface_slot_fallback(slot_key, payload, concept_view) or fallback
        cards.append({"slot": slot_key, "title": title, "body": body})
    for slot_key, card in assigned.items():
        if slot_key not in {item[0] for item in PREFACE_SLOT_DEFINITIONS}:
            extras.append({"title": card.get("title", ""), "body": card.get("body", ""), "reason": "unknown_preface_slot"})
    return cards, extras


def build_preface_view(payload: dict[str, Any], concept_view: dict[str, Any]) -> dict[str, Any]:
    concepts = {concept_key(item.get("label") or ""): item for item in as_list(concept_view.get("concepts")) if isinstance(item, dict)}
    preface_concepts = []
    for label in as_list(payload.get("preface_concepts")):
        text = clean_text(label)
        if not text:
            continue
        concept = concepts.get(concept_key(text))
        preface_concepts.append(
            {
                "label": text,
                "concept_id": concept.get("concept_id") if concept else "",
                "status": concept.get("status") if concept else "keyword",
            }
        )
    cards, extra_cards = build_stable_preface_cards(payload, concept_view)
    topic_context = read_view("topic-context.json", {})
    candidate_digests = read_view("topic-candidate-digests-view.json", {})
    return {
        "schema_version": "literature-deep-reading.preface-view.v0",
        "source": "agent_enrichment",
        "anchor": "preface",
        "title": clean_text(payload.get("preface_title")) or "阅读前导读",
        "goal": clean_text(payload.get("preface_goal")),
        "cards": cards,
        "extra_cards": extra_cards,
        "reading_path": as_list(payload.get("preface_reading_path")),
        "concepts": preface_concepts,
        "warnings": as_list(payload.get("preface_warnings")),
        "questions": as_list(payload.get("preface_questions")),
        "topic_context": topic_context,
        "candidate_digests": candidate_digests,
        "topic_timeline": build_preface_topic_timeline(topic_context if isinstance(topic_context, dict) else {}),
    }


def build_section_insights_view(payload: dict[str, Any], concept_view: dict[str, Any]) -> dict[str, Any]:
    concept_by_key = {concept_key(item.get("label") or ""): item for item in as_list(concept_view.get("concepts")) if isinstance(item, dict)}
    items: list[dict[str, Any]] = []
    by_anchor: dict[str, Any] = {}
    for section_note in as_list(payload.get("section_notes")):
        if not isinstance(section_note, dict):
            continue
        anchor = clean_text(section_note.get("section_anchor"))
        concepts = []
        for label in as_list(section_note.get("concepts")):
            text = clean_text(label)
            if not text:
                continue
            concept = concept_by_key.get(concept_key(text))
            concepts.append(
                {
                    "label": text,
                    "concept_id": concept.get("concept_id") if concept else "",
                    "status": concept.get("status") if concept else "keyword",
                }
            )
        citation_note = {
            "body": clean_text(section_note.get("citation_note_body")),
            "reference_roles": [
                {
                    "reference_id": clean_text(role.get("reference_id")) if isinstance(role, dict) else "",
                    "role": clean_text(role.get("role")) if isinstance(role, dict) else "",
                    "note": clean_text(role.get("note")) if isinstance(role, dict) else "",
                }
                for role in as_list(section_note.get("citation_reference_roles"))
                if isinstance(role, dict)
            ],
        }
        item = {
            "section_anchor": anchor,
            "reading_goal": clean_text(section_note.get("reading_goal")),
            "concepts": concepts,
            "misread_warnings": [clean_text(entry) for entry in as_list(section_note.get("misread_warnings")) if clean_text(entry)],
            "questions": [normalize_question(entry) for entry in as_list(section_note.get("questions"))],
            "citation_note": citation_note,
        }
        items.append(item)
        by_anchor[anchor] = item
    return {
        "schema_version": "literature-deep-reading.section-insights-view.v0",
        "source": "agent_enrichment",
        "items": items,
        "by_anchor": by_anchor,
    }


def digest_items_by_reference_id() -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in as_list(read_view("reference-digests-view.json", {}).get("items")):
        if isinstance(item, dict) and clean_text(item.get("reference_id")):
            result[clean_text(item.get("reference_id"))] = item
    return result


def digest_items_by_paper_ref() -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in as_list(read_view("reference-digests-view.json", {}).get("items")):
        if isinstance(item, dict) and clean_text(item.get("bound_paper_ref")):
            result[clean_text(item.get("bound_paper_ref"))] = item
    return result


def raw_reference_view_item(entry: Any, index: int) -> dict[str, Any]:
    if isinstance(entry, dict):
        raw_markdown = clean_text(entry.get("raw_markdown") or entry.get("source_markdown") or entry.get("raw"))
        reference_index = safe_int(entry.get("reference_index") or entry.get("index"), index)
        reference_id = clean_text(entry.get("reference_id") or entry.get("id") or f"ref-{reference_index}")
    else:
        raw_markdown = clean_text(entry)
        reference_index = index
        reference_id = f"ref-{index}"
    return {
        "reference_id": reference_id,
        "reference_index": reference_index,
        "raw_markdown": raw_markdown,
        "binding_status": "raw",
        "digest_modal": {"available": False},
    }


def reference_digest_note(notes: dict[str, dict[str, Any]], reference_id: str) -> dict[str, str]:
    note = notes.get(reference_id, {})
    return {
        "role_in_current_paper": clean_text(note.get("role_in_current_paper")) if isinstance(note, dict) else "",
        "why_open": clean_text(note.get("why_open")) if isinstance(note, dict) else "",
        "note": clean_text(note.get("note")) if isinstance(note, dict) else "",
    }


def item_reference_view_item(reference: dict[str, Any], notes: dict[str, dict[str, Any]], digest_by_id: dict[str, dict[str, Any]], digest_by_paper: dict[str, dict[str, Any]]) -> dict[str, Any]:
    reference_id = clean_text(reference.get("reference_id"))
    bound_paper_ref = clean_text(reference.get("bound_paper_ref"))
    digest_item = digest_by_id.get(reference_id) or digest_by_paper.get(bound_paper_ref) or {}
    digest = digest_item.get("digest") if isinstance(digest_item.get("digest"), dict) else {}
    digest_result = digest.get("result") if isinstance(digest.get("result"), dict) else {}
    digest_markdown = first_text(digest_result.get("digest_markdown") if isinstance(digest_result, dict) else "", digest.get("markdown"))
    digest_available = (
        clean_text(reference.get("binding_status")) == "library"
        and clean_text(digest.get("status")) == "available"
        and bool(clean_text(digest_markdown))
    )
    modal_result = digest_result if isinstance(digest_result, dict) and digest_result else {
        "ok": digest_available,
        "status": "available" if digest_available else clean_text(digest.get("status") or "missing"),
        "paper_ref": bound_paper_ref,
        "digest_markdown": digest_markdown,
        "representative_image": digest.get("representative_image") if isinstance(digest.get("representative_image"), dict) else {"status": "unavailable"},
        "source_changed": False,
        "diagnostics": [],
    }
    return {
        "reference_id": reference_id,
        "reference_index": safe_int(reference.get("reference_index"), 0),
        "title": clean_text(reference.get("title")),
        "authors": as_list(reference.get("authors")),
        "year": clean_text(reference.get("year")),
        "raw": reference.get("raw") or {},
        "binding_status": clean_text(reference.get("binding_status") or "unresolved"),
        "bound_paper_ref": bound_paper_ref,
        "zotero_item_key": clean_text(reference.get("zotero_item_key")),
        "target_binding": clean_text(reference.get("target_binding")),
        "match_confidence": reference.get("match_confidence"),
        "reference_index_status": clean_text(reference.get("reference_index_status")),
        "digest_note": reference_digest_note(notes, reference_id),
        "digest_modal": {
            "available": digest_available,
            "title": clean_text(digest_item.get("title") or reference.get("title")) if digest_available else "",
            "markdown": clean_text(digest_markdown) if digest_available else "",
            "payload_type": clean_text(digest.get("payload_type")) if digest_available else "",
            "result": modal_result if digest_available else {},
        },
    }


def build_references_view(payload: dict[str, Any]) -> dict[str, Any]:
    seed = read_view("references-seed-view.json", {})
    bindings_view = read_view("reference-bindings-view.json", {})
    notes = {
        clean_text(item.get("reference_id")): item
        for item in as_list(payload.get("reference_digest_notes"))
        if isinstance(item, dict) and clean_text(item.get("reference_id"))
    }
    digest_by_id = digest_items_by_reference_id()
    digest_by_paper = digest_items_by_paper_ref()
    seed_raw_items = as_list(seed.get("raw_items")) or as_list(seed.get("references"))
    raw_items = [raw_reference_view_item(entry, index) for index, entry in enumerate(seed_raw_items, start=1)]
    item_items = [
        item_reference_view_item(reference, notes, digest_by_id, digest_by_paper)
        for reference in sorted(as_list(bindings_view.get("item_references")), key=lambda item: safe_int(item.get("reference_index"), 999999))
        if isinstance(reference, dict)
    ]
    compat_items = item_items if item_items else raw_items
    default_view = "item" if item_items else "raw"
    return {
        "schema_version": "literature-deep-reading.references-view.v0",
        "source": "reference_index_and_raw_references",
        "references_source": seed.get("source") or "none",
        "default_view": default_view,
        "reference_count": len(compat_items),
        "item_view": {
            "source": "reference_index",
            "reference_count": len(item_items),
            "items": item_items,
        },
        "raw_view": {
            "source": seed.get("source") or "none",
            "reference_count": len(raw_items),
            "raw_markdown": clean_text(seed.get("raw_markdown")),
            "items": raw_items,
        },
        "items": compat_items,
    }


def parse_digest_markdown(markdown: str) -> list[dict[str, str]]:
    sections: list[dict[str, str]] = []
    current_title = "Summary"
    current_lines: list[str] = []
    for line in markdown.splitlines():
        heading = HEADING_RE.match(line)
        if heading:
            if current_lines:
                body = "\n".join(current_lines).strip()
                if body:
                    sections.append({"title": current_title, "body": body})
            current_title = heading.group(2).strip()
            current_lines = []
        else:
            current_lines.append(line)
    body = "\n".join(current_lines).strip()
    if body:
        sections.append({"title": current_title, "body": body})
    if not sections and markdown.strip():
        sections.append({"title": "Summary", "body": markdown.strip()})
    return sections


def filter_digest_summary_markdown(markdown: str, max_top_level_sections: int = 5) -> str:
    lines = str(markdown or "").splitlines()
    if not any(re.match(r"^##\s+", line) for line in lines):
        return markdown
    kept: list[str] = []
    top_level_index = 0
    keep_current = True
    for line in lines:
        if re.match(r"^##\s+", line):
            top_level_index += 1
            keep_current = top_level_index <= max_top_level_sections
        if keep_current:
            kept.append(line)
    return "\n".join(kept).strip()


def build_summary_view(payload: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    digest_path = SOURCE_DIR / "artifacts" / "digest.md"
    if digest_path.exists():
        markdown = digest_path.read_text(encoding="utf-8", errors="replace")
        filtered = filter_digest_summary_markdown(markdown)
        return {
            "schema_version": "literature-deep-reading.summary-view.v0",
            "source": "digest_artifact",
            "artifact_path": "artifacts/digest.md",
            "sections": parse_digest_markdown(filtered),
        }
    if payload.get("summary_fallback_enabled"):
        return {
            "schema_version": "literature-deep-reading.summary-view.v0",
            "source": "agent_fallback",
            "sections": as_list(payload.get("summary_fallback_sections")),
        }
    diagnostics.append({"severity": "info", "code": "summary_unavailable"})
    return {
        "schema_version": "literature-deep-reading.summary-view.v0",
        "source": "none",
        "sections": [],
    }


def build_extensions_view(payload: dict[str, Any]) -> dict[str, Any]:
    used: set[str] = set()
    items: list[dict[str, Any]] = []
    for entry in as_list(payload.get("extensions")):
        if not isinstance(entry, dict):
            continue
        title = clean_text(entry.get("title"))
        anchor = clean_text(entry.get("anchor")) or stable_id("extension", title, used)
        if anchor in used:
            anchor = stable_id("extension", title, used)
        else:
            used.add(anchor)
        items.append(
            {
                "anchor": anchor,
                "title": title,
                "body": clean_text(entry.get("body")),
                "links": [
                    {"label": clean_text(link.get("label")), "target": clean_text(link.get("target"))}
                    for link in as_list(entry.get("links"))
                    if isinstance(link, dict) and clean_text(link.get("label")) and clean_text(link.get("target"))
                ],
            }
        )
    return {
        "schema_version": "literature-deep-reading.extensions-view.v0",
        "source": "agent_enrichment",
        "items": items,
    }


def ensure_stage20_tables(conn: sqlite3.Connection) -> None:
    ensure_stage10_tables(conn)


def persist_stage20_db(payload_path: Path, views: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage20_tables(conn)
        now = utc_now()
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_20_reading_enrichment", normalize_posix(payload_path), "literature-deep-reading.reading-enrichment.v0", "valid", "[]", now),
        )
        conn.execute("DELETE FROM concepts")
        for concept in as_list(views.get("concept-overlay-view", {}).get("concepts")):
            if not isinstance(concept, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO concepts VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    clean_text(concept.get("concept_id")),
                    clean_text(concept.get("label")),
                    json.dumps(as_list(concept.get("aliases")), ensure_ascii=False),
                    clean_text(concept.get("kind")),
                    clean_text(concept.get("definition")),
                    clean_text(concept.get("source")),
                    clean_text(concept.get("status")),
                ),
            )
        conn.execute("DELETE FROM section_insights")
        for item in as_list(views.get("section-insights-view", {}).get("items")):
            if not isinstance(item, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO section_insights VALUES (?, ?, ?, ?, ?, ?)",
                (
                    clean_text(item.get("section_anchor")),
                    clean_text(item.get("reading_goal")),
                    json.dumps(as_list(item.get("concepts")), ensure_ascii=False),
                    json.dumps(as_list(item.get("misread_warnings")), ensure_ascii=False),
                    json.dumps(as_list(item.get("questions")), ensure_ascii=False),
                    json.dumps(item.get("citation_note") or {}, ensure_ascii=False),
                ),
            )
        conn.execute(
            "UPDATE runs SET status = ?, updated_at = ?, diagnostics_json = ? WHERE run_id = ?",
            ("enriched", now, json.dumps(diagnostics, ensure_ascii=False), "default"),
        )
        conn.commit()
    finally:
        conn.close()


def write_invalid_stage20_submission(payload_path: Path, errors: list[str]) -> None:
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage20_tables(conn)
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_20_reading_enrichment", normalize_posix(payload_path), "literature-deep-reading.reading-enrichment.v0", "invalid", json.dumps(errors, ensure_ascii=False), utc_now()),
        )
        conn.commit()
    finally:
        conn.close()


def estimate_translation_words(text: str) -> int:
    latin_words = re.findall(r"[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?", text)
    cjk_chars = re.findall(r"[\u3400-\u9fff]", text)
    other_words = re.findall(r"[^\sA-Za-z0-9\u3400-\u9fff]+", text)
    return max(1, len(latin_words) + max(1, len(cjk_chars) // 2) + max(0, len(other_words) // 8))


def block_translation_source(block: dict[str, Any]) -> str:
    kind = clean_text(block.get("kind"))
    if kind == "image":
        return clean_text(block.get("caption_markdown") or block.get("source_markdown"))
    if kind == "table":
        return clean_text(block.get("source_markdown") or block.get("table_markdown_or_html"))
    return clean_text(block.get("source_markdown"))


def translatable_blocks_for_batches() -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for block in reading_blocks():
        if not bool(block.get("translate")):
            continue
        role = clean_text(block.get("role")) or "main"
        if role == "bibliography":
            continue
        block_id = clean_text(block.get("block_id"))
        if not block_id:
            continue
        result.append(block)
    return result


def translation_batch_prompt(batch_id: str, target_language: str) -> str:
    return "\n".join(
        [
            f"You are translating batch {batch_id} of an academic paper into {target_language}.",
            "Translate every required block fully and faithfully. Do not summarize, omit, invent, or add explanatory commentary.",
            "Preserve each block_id exactly. Preserve Markdown structure, inline math, display math, image references, citations, and tables.",
            "Formulas may remain unchanged. Table captions and translatable table cell text must be translated while the table-like structure remains valid.",
            "For image blocks, keep the original image reference and translate only the caption-like text.",
            "Use consistent terminology from the provided concepts and section context. Put uncertainty or terminology caveats in quality_notes.",
            "Return only JSON shaped as {\"translations\":[{\"block_id\":\"...\",\"translated_markdown\":\"...\",\"quality_notes\":[]}]} for this batch.",
        ]
    )


def make_translation_batch(
    batch_index: int,
    blocks: list[dict[str, Any]],
    target_language: str,
    concepts_view: dict[str, Any],
    insights_view: dict[str, Any],
) -> dict[str, Any]:
    batch_id = f"batch-{batch_index:04d}"
    concept_terms = [
        {
            "label": clean_text(item.get("label")),
            "definition": clean_text(item.get("definition")),
            "aliases": as_list(item.get("aliases")),
        }
        for item in as_list(concepts_view.get("concepts"))
        if isinstance(item, dict) and clean_text(item.get("label"))
    ]
    section_anchors = sorted({clean_text(block.get("section_anchor")) for block in blocks if clean_text(block.get("section_anchor"))})
    section_context = {
        anchor: insights_view.get("by_anchor", {}).get(anchor, {})
        for anchor in section_anchors
        if isinstance(insights_view.get("by_anchor"), dict)
    }
    items: list[dict[str, Any]] = []
    total_words = 0
    total_chars = 0
    for block in blocks:
        source = block_translation_source(block)
        words = estimate_translation_words(source)
        total_words += words
        total_chars += len(source)
        items.append(
            {
                "block_id": clean_text(block.get("block_id")),
                "kind": clean_text(block.get("kind")),
                "role": clean_text(block.get("role")) or "main",
                "section_anchor": clean_text(block.get("section_anchor")),
                "translate_required": clean_text(block.get("kind")) not in FORMULA_BLOCK_KINDS,
                "estimated_words": words,
                "source_markdown": source,
                "full_source_markdown": clean_text(block.get("source_markdown")),
            }
        )
    return {
        "schema_version": "literature-deep-reading.translation-batch-input.v0",
        "batch_id": batch_id,
        "target_language": target_language,
        "prompt": translation_batch_prompt(batch_id, target_language),
        "source_stats": {"estimated_words": total_words, "chars": total_chars, "block_count": len(items)},
        "concept_terms": concept_terms,
        "section_context": section_context,
        "blocks": items,
    }


def build_translation_view_from_translator_alignment(
    alignment: dict[str, Any],
    diagnostics: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not valid_translator_alignment(alignment, target_language_from_db()):
        return None
    target_language = target_language_from_db()
    has_translations = alignment_has_translations(alignment)
    alignment_by_id = {
        clean_text(block.get("b")): block
        for block in as_list(alignment.get("blocks"))
        if isinstance(block, dict) and clean_text(block.get("b"))
    }
    if not has_translations:
        metadata = alignment.get("metadata") if isinstance(alignment.get("metadata"), dict) else {}
        source_only = (
            clean_text(alignment.get("status")) == "source_only"
            or clean_text(metadata.get("source")) == "literature-deep-reading.source_only_alignment"
            or (
                bool(alignment_by_id)
                and all(
                    any(clean_text(pair.get("status")) == "source_only" for pair in as_list(block.get("pairs")) if isinstance(pair, dict))
                    for block in alignment_by_id.values()
                )
            )
        )
        if not source_only:
            return None
        items: list[dict[str, Any]] = []
        for block in reading_blocks():
            block_id = clean_text(block.get("block_id"))
            if not bool(block.get("translate")):
                continue
            items.append(
                {
                    "block_id": block_id,
                    "section_anchor": clean_text(block.get("section_anchor")),
                    "kind": clean_text(block.get("kind")),
                    "source_markdown": clean_text(block.get("source_markdown")),
                    "translated_markdown": "",
                    "status": "source_only",
                    "quality_notes": [],
                }
            )
        diagnostics.append({"severity": "info", "code": "source_only_alignment_used"})
        return {
            "schema_version": "literature-deep-reading.translation-view.v0",
            "source": "source_only_alignment",
            "target_language": target_language,
            "items": items,
            "translated_count": 0,
            "carried_over_count": 0,
        }
    items: list[dict[str, Any]] = []
    missing: list[str] = []
    for block in reading_blocks():
        block_id = clean_text(block.get("block_id"))
        if not bool(block.get("translate")):
            continue
        kind = clean_text(block.get("kind"))
        alignment_block = alignment_by_id.get(block_id)
        if kind in FORMULA_BLOCK_KINDS:
            items.append(
                {
                    "block_id": block_id,
                    "section_anchor": clean_text(block.get("section_anchor")),
                    "kind": kind,
                    "source_markdown": clean_text(block.get("source_markdown")),
                    "translated_markdown": clean_text(block.get("source_markdown")),
                    "status": "carried_over",
                    "quality_notes": [],
                }
            )
            continue
        translated = (
            alignment_block_markdown(alignment_block, "translated_markdown", "tgt")
            if isinstance(alignment_block, dict)
            else ""
        )
        if not translated:
            missing.append(block_id)
            continue
        if kind == "table":
            table_error = table_translation_structure_error(translated)
            if table_error:
                diagnostics.append({"severity": "warning", "code": "translator_alignment_table_structure", "block_id": block_id, "message": table_error})
            else:
                diagnostics.append({"severity": "info", "code": "table_translation_structure_not_deep_verified", "block_id": block_id})
        if kind == "image":
            image_error = image_translation_structure_error(block, translated)
            if image_error:
                diagnostics.append({"severity": "warning", "code": "translator_alignment_image_structure", "block_id": block_id, "message": image_error})
        items.append(
            {
                "block_id": block_id,
                "section_anchor": clean_text(block.get("section_anchor")),
                "kind": kind,
                "source_markdown": clean_text(block.get("source_markdown")),
                "translated_markdown": translated,
                "status": "available",
                "quality_notes": [],
            }
        )
    if missing:
        diagnostics.append({"severity": "warning", "code": "translator_alignment_incomplete", "missing_block_ids": missing})
        return None
    return {
        "schema_version": "literature-deep-reading.translation-view.v0",
        "source": "translator_alignment",
        "target_language": target_language,
        "items": items,
        "translated_count": sum(1 for item in items if item.get("status") == "available"),
        "carried_over_count": sum(1 for item in items if item.get("status") == "carried_over"),
    }


def empty_translation_batches_view(source: str = "translator_alignment") -> dict[str, Any]:
    if TRANSLATION_BATCHES_DIR.exists():
        shutil.rmtree(TRANSLATION_BATCHES_DIR)
    TRANSLATION_BATCHES_DIR.mkdir(parents=True, exist_ok=True)
    view = {
        "schema_version": "literature-deep-reading.translation-batches-view.v0",
        "source": source,
        "target_language": target_language_from_db(),
        "batch_dir": normalize_posix(TRANSLATION_BATCHES_DIR),
        "batch_count": 0,
        "required_translation_count": 0,
        "required_block_ids": [],
        "limits": {
            "max_words": TRANSLATION_BATCH_MAX_WORDS,
            "max_chars": TRANSLATION_BATCH_MAX_CHARS,
            "max_blocks": TRANSLATION_BATCH_MAX_BLOCKS,
        },
        "batches": [],
    }
    write_json(VIEWS_DIR / "translation-batches-view.json", view)
    return view


def prepare_translation_batches(concepts_view: dict[str, Any], insights_view: dict[str, Any]) -> dict[str, Any]:
    target_language = target_language_from_db()
    blocks = translatable_blocks_for_batches()
    if TRANSLATION_BATCHES_DIR.exists():
        shutil.rmtree(TRANSLATION_BATCHES_DIR)
    TRANSLATION_BATCHES_DIR.mkdir(parents=True, exist_ok=True)
    batches: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    current_words = 0
    current_chars = 0
    for block in blocks:
        source = block_translation_source(block)
        words = estimate_translation_words(source)
        chars = len(source)
        should_flush = (
            bool(current)
            and (
                current_words + words > TRANSLATION_BATCH_MAX_WORDS
                or current_chars + chars > TRANSLATION_BATCH_MAX_CHARS
                or len(current) >= TRANSLATION_BATCH_MAX_BLOCKS
            )
        )
        if should_flush:
            batches.append(current)
            current = []
            current_words = 0
            current_chars = 0
        current.append(block)
        current_words += words
        current_chars += chars
    if current:
        batches.append(current)

    batch_summaries: list[dict[str, Any]] = []
    required_block_ids: list[str] = []
    for index, batch_blocks in enumerate(batches, start=1):
        batch = make_translation_batch(index, batch_blocks, target_language, concepts_view, insights_view)
        batch_path = TRANSLATION_BATCHES_DIR / f"{batch['batch_id']}.json"
        write_json(batch_path, batch)
        batch_required_ids = [
            clean_text(item.get("block_id"))
            for item in as_list(batch.get("blocks"))
            if isinstance(item, dict) and item.get("translate_required")
        ]
        required_block_ids.extend(batch_required_ids)
        batch_summaries.append(
            {
                "batch_id": batch["batch_id"],
                "path": normalize_posix(batch_path),
                "block_count": len(as_list(batch.get("blocks"))),
                "required_translation_count": len(batch_required_ids),
                "estimated_words": safe_int(batch.get("source_stats", {}).get("estimated_words"), 0),
                "chars": safe_int(batch.get("source_stats", {}).get("chars"), 0),
                "section_anchors": sorted({clean_text(block.get("section_anchor")) for block in batch_blocks if clean_text(block.get("section_anchor"))}),
            }
        )
    view = {
        "schema_version": "literature-deep-reading.translation-batches-view.v0",
        "source": "runtime_prepared_batches",
        "target_language": target_language,
        "batch_dir": normalize_posix(TRANSLATION_BATCHES_DIR),
        "batch_count": len(batch_summaries),
        "required_translation_count": len(required_block_ids),
        "required_block_ids": required_block_ids,
        "limits": {
            "max_words": TRANSLATION_BATCH_MAX_WORDS,
            "max_chars": TRANSLATION_BATCH_MAX_CHARS,
            "max_blocks": TRANSLATION_BATCH_MAX_BLOCKS,
        },
        "batches": batch_summaries,
    }
    write_json(VIEWS_DIR / "translation-batches-view.json", view)
    return view


def submit_reading_enrichment(payload_path: Path) -> dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError("bootstrap database is missing; run bootstrap first")
    missing_stage10_views = [
        path
        for path in [
            VIEWS_DIR / "host-context-view.json",
            VIEWS_DIR / "reference-bindings-view.json",
            VIEWS_DIR / "reference-digests-view.json",
            VIEWS_DIR / "concept-candidates-view.json",
        ]
        if not path.exists()
    ]
    if missing_stage10_views:
        raise FileNotFoundError("Stage 10 host context views are missing: " + ", ".join(normalize_posix(path) for path in missing_stage10_views))
    payload_raw = read_json(payload_path, {})
    errors = validate_reading_enrichment_payload(payload_raw)
    if errors:
        write_invalid_stage20_submission(payload_path, errors)
        raise ValueError("; ".join(errors))
    payload = normalized_reading_enrichment(payload_raw)
    diagnostics: list[dict[str, Any]] = []
    concept_overlay = build_concept_overlay_view(payload, diagnostics)
    preface = build_preface_view(payload, concept_overlay)
    section_insights = build_section_insights_view(payload, concept_overlay)
    references = build_references_view(payload)
    summary = build_summary_view(payload, diagnostics)
    extensions = build_extensions_view(payload)
    translator_translation = build_translation_view_from_translator_alignment(
        read_view("translator-alignment-view.json", {}),
        diagnostics,
    )
    if translator_translation:
        write_json(VIEWS_DIR / "translation-view.json", translator_translation)
        translation_batches = empty_translation_batches_view(clean_text(translator_translation.get("source")) or "translator_alignment")
    else:
        translation_batches = prepare_translation_batches(concept_overlay, section_insights)
    diagnostics_view = {
        "schema_version": "literature-deep-reading.diagnostics-enrichment.v0",
        "diagnostics": diagnostics,
    }
    view_map = {
        "preface-view": preface,
        "section-insights-view": section_insights,
        "concept-overlay-view": concept_overlay,
        "references-view": references,
        "summary-view": summary,
        "extensions-view": extensions,
        "translation-batches-view": translation_batches,
        "diagnostics-enrichment": diagnostics_view,
    }
    if translator_translation:
        view_map["translation-view"] = translator_translation
    for filename, view in view_map.items():
        write_json(VIEWS_DIR / f"{filename}.json", view)
    persist_stage20_db(payload_path, view_map, diagnostics)
    result = {
        "kind": "literature_deep_reading_enriched",
        "status": "enriched",
        "db_path": normalize_posix(DB_PATH),
        "views": {
            "preface": normalize_posix(VIEWS_DIR / "preface-view.json"),
            "section_insights": normalize_posix(VIEWS_DIR / "section-insights-view.json"),
            "concept_overlay": normalize_posix(VIEWS_DIR / "concept-overlay-view.json"),
            "references": normalize_posix(VIEWS_DIR / "references-view.json"),
            "summary": normalize_posix(VIEWS_DIR / "summary-view.json"),
            "extensions": normalize_posix(VIEWS_DIR / "extensions-view.json"),
            "translation_batches": normalize_posix(VIEWS_DIR / "translation-batches-view.json"),
            **({"translation": normalize_posix(VIEWS_DIR / "translation-view.json")} if translator_translation else {}),
        },
        "translation_batch_count": safe_int(translation_batches.get("batch_count"), 0),
        "required_translation_count": safe_int(translation_batches.get("required_translation_count"), 0),
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-enrichment.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def reading_blocks() -> list[dict[str, Any]]:
    view = read_view("reading-blocks.json", {})
    return [item for item in as_list(view.get("blocks")) if isinstance(item, dict)]


def target_language_from_db() -> str:
    if not DB_PATH.exists():
        return "zh-CN"
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute("SELECT target_language FROM runs WHERE run_id = ?", ("default",)).fetchone()
        return clean_text(row[0]) if row and clean_text(row[0]) else "zh-CN"
    finally:
        conn.close()


DEEP_READING_LABELS: dict[str, dict[str, str]] = {
    "en": {
        "preface": "Reading Guide",
        "summary": "Summary",
        "references": "References",
        "citation_graph": "Citation Graph",
        "extensions": "Extensions",
        "current_position": "Current Position",
        "reading_goal": "Reading Goal",
        "related_concepts": "Related Concepts",
        "misread_warnings": "Misreading Warnings",
        "possible_questions": "Questions to Consider",
        "citation_clues": "Citation Clues",
        "reading_guide": "Reading Guide",
        "reading_path": "Reading Path",
        "reading_questions": "Questions to Keep in Mind",
        "topic_timeline": "Topic Timeline",
        "timeline_papers": "Papers",
        "timeline_milestones": "Milestones",
        "timeline_current_paper": "Current Paper",
        "timeline_empty": "No dated topic papers",
        "item": "Item",
        "raw": "Raw",
        "references_view": "References view",
        "paper_count_unit": "papers",
        "reference_index": "reference index",
        "markdown_references": "markdown references",
        "raw_references": "raw",
        "library_item": "Library item",
        "no_library_binding": "No library binding",
        "paper_digest": "Paper digest",
        "digest_unavailable": "Digest is unavailable.",
        "close": "Close",
        "representative_image": "Representative image",
        "viewer_warning": "Open this HTML in a browser for the full interactive experience.",
        "noscript_warning": "Static reading mode is active. Open this HTML in a browser for the full interactive experience.",
        "graph_fallback_note": "The citation graph renderer is unavailable. Open this HTML in a system browser for the full interactive view.",
        "graph_no_layout": "No graph layout coordinates are available.",
        "static_viewer_warning": "Static reading mode is active.",
        "concepts": "Concepts",
        "graph_direction": "Citation Direction",
        "graph_relation": "Citation relation",
        "graph_importance": "Citation Importance",
        "graph_node_size": "Node size = inbound citations",
        "graph_current_paper": "Current Paper",
        "graph_scope": "Current paper 2-hop citation neighborhood",
    },
    "zh": {
        "preface": "阅读前导读",
        "summary": "总结",
        "references": "参考文献",
        "citation_graph": "引用图谱",
        "extensions": "扩展阅读",
        "current_position": "当前位置",
        "reading_goal": "阅读目标",
        "related_concepts": "相关概念",
        "misread_warnings": "误读提醒",
        "possible_questions": "可能的问题",
        "citation_clues": "引用线索",
        "reading_guide": "阅读指引",
        "reading_path": "阅读路线",
        "reading_questions": "带着这些问题阅读",
        "topic_timeline": "Topic Timeline",
        "timeline_papers": "论文",
        "timeline_milestones": "里程碑",
        "timeline_current_paper": "当前论文",
        "item": "Item",
        "raw": "Raw",
        "paper_count_unit": "篇",
        "reference_index": "reference index",
        "markdown_references": "markdown references",
        "raw_references": "raw",
        "library_item": "Library item",
        "no_library_binding": "No library binding",
        "viewer_warning": "请用浏览器打开以获得完整的交互体验。",
        "noscript_warning": "当前处于静态阅读模式。请用浏览器打开以获得完整的交互体验。",
        "graph_fallback_note": "引用图渲染器不可用。建议使用系统浏览器打开此 HTML。",
        "graph_no_layout": "当前没有可用的图布局坐标。",
        "static_viewer_warning": "当前处于静态阅读模式。",
        "concepts": "Concepts",
        "graph_direction": "引用方向",
        "graph_relation": "引用关系",
        "graph_importance": "引用重要性",
        "graph_node_size": "节点大小 = 入站引用数",
        "graph_current_paper": "当前论文",
        "graph_scope": "当前论文 2 跳引用邻域",
    },
    "ja": {
        "preface": "読解ガイド",
        "summary": "要約",
        "references": "参考文献",
        "citation_graph": "引用グラフ",
        "extensions": "発展読解",
        "current_position": "現在位置",
        "reading_goal": "読解目標",
        "related_concepts": "関連概念",
        "misread_warnings": "誤読の注意",
        "possible_questions": "考えるべき問い",
        "citation_clues": "引用の手がかり",
        "reading_guide": "読解指針",
        "reading_path": "読解ルート",
        "reading_questions": "意識して読む問い",
        "timeline_papers": "論文",
        "timeline_milestones": "マイルストーン",
        "timeline_current_paper": "現在の論文",
        "paper_count_unit": "件",
        "viewer_warning": "完全なインタラクティブ体験にはブラウザでこの HTML を開いてください。",
        "noscript_warning": "静的読解モードです。完全なインタラクティブ体験にはブラウザでこの HTML を開いてください。",
        "graph_fallback_note": "引用グラフのレンダラーを利用できません。完全な対話表示にはシステムブラウザでこの HTML を開いてください。",
        "graph_no_layout": "利用可能なグラフ配置座標がありません。",
        "static_viewer_warning": "静的読解モードです。",
        "concepts": "概念",
        "graph_direction": "引用方向",
        "graph_relation": "引用関係",
        "graph_importance": "引用の重要度",
        "graph_node_size": "ノードサイズ = 入次数",
        "graph_current_paper": "現在の論文",
        "graph_scope": "現在の論文の2ホップ引用近傍",
    },
    "fr": {
        "preface": "Guide de lecture",
        "summary": "Résumé",
        "references": "Références",
        "citation_graph": "Graphe de citations",
        "extensions": "Prolongements",
        "current_position": "Position actuelle",
        "reading_goal": "Objectif de lecture",
        "related_concepts": "Concepts liés",
        "misread_warnings": "Points de vigilance",
        "possible_questions": "Questions à garder en tête",
        "citation_clues": "Indices de citation",
        "reading_guide": "Guide de lecture",
        "reading_path": "Parcours de lecture",
        "reading_questions": "Questions pour la lecture",
        "timeline_papers": "Articles",
        "timeline_milestones": "Jalons",
        "timeline_current_paper": "Article actuel",
        "paper_count_unit": "articles",
        "viewer_warning": "Ouvrez ce fichier HTML dans un navigateur pour profiter de l'expérience interactive complète.",
        "noscript_warning": "Le mode de lecture statique est actif. Ouvrez ce fichier HTML dans un navigateur pour profiter de l'expérience interactive complète.",
        "graph_fallback_note": "Le rendu du graphe de citations est indisponible. Ouvrez ce fichier HTML dans un navigateur système pour l'interaction complète.",
        "graph_no_layout": "Aucune coordonnée de graphe n'est disponible.",
        "static_viewer_warning": "Mode de lecture statique actif.",
        "concepts": "Concepts",
        "graph_direction": "Sens des citations",
        "graph_relation": "Relation de citation",
        "graph_importance": "Importance des citations",
        "graph_node_size": "Taille du nœud = citations entrantes",
        "graph_current_paper": "Article actuel",
        "graph_scope": "Voisinage de citations à 2 sauts de l'article actuel",
    },
}


def deep_reading_labels(target_language: str | None = None) -> dict[str, str]:
    language = clean_text(target_language) or target_language_from_db()
    language_key = language.split("-", 1)[0].lower() if language else "zh"
    return {**DEEP_READING_LABELS["en"], **DEEP_READING_LABELS.get(language_key, {})}


def labels_from_sections(sections_view: dict[str, Any]) -> dict[str, str]:
    labels = sections_view.get("labels") if isinstance(sections_view.get("labels"), dict) else {}
    language = clean_text((sections_view.get("paper") or {}).get("target_language")) if isinstance(sections_view.get("paper"), dict) else ""
    merged = deep_reading_labels(language)
    merged.update({str(key): clean_text(value) for key, value in labels.items() if clean_text(value)})
    return merged


def quality_notes(value: Any) -> list[str]:
    return [clean_text(item) for item in as_list(value) if clean_text(item)]


def is_table_like(markdown: str) -> bool:
    text = markdown.strip().lower()
    prefix, table_html, suffix = split_html_table_prefix_suffix(markdown)
    if table_html:
        return (
            "<tr" in table_html.lower()
            and ("<td" in table_html.lower() or "<th" in table_html.lower())
            and (not prefix or is_caption_text(prefix, "table"))
            and (not suffix or is_caption_text(suffix, "table"))
        )
    body, caption = split_structured_caption(markdown, "table")
    lines = [line.strip() for line in (body or markdown).splitlines() if line.strip()]
    if len(lines) >= 2 and "|" in lines[0] and "|" in lines[1]:
        return True
    return False


def table_translation_structure_error(markdown: str) -> str:
    text = markdown.strip()
    if not text:
        return "empty table translation"
    prefix, table_html, suffix = split_html_table_prefix_suffix(text)
    if table_html:
        if "<tr" not in table_html.lower() or ("<td" not in table_html.lower() and "<th" not in table_html.lower()):
            return "HTML table translation must contain table rows and cells"
        if prefix and not is_caption_text(prefix, "table"):
            return "table translation must not prepend non-caption prose"
        if suffix and not is_caption_text(suffix, "table"):
            return "table translation must not append non-caption prose"
        return ""
    body, caption = split_structured_caption(text, "table")
    candidate = body or text
    lines = [line.strip() for line in candidate.splitlines() if line.strip()]
    if len(lines) < 2 or "|" not in lines[0] or "|" not in lines[1]:
        return "table translation must remain table-like"
    if not re.match(r"^\s*\|?[\s:-]+\|", lines[1] or ""):
        return "Markdown table translation must keep a separator row"
    return ""


def image_translation_structure_error(block: dict[str, Any], translated: str) -> str:
    source_refs = set(str(ref) for ref in as_list(block.get("image_refs")) if clean_text(ref))
    translated_refs = set(extract_image_refs(translated))
    if translated_refs and translated_refs != source_refs:
        return "image translation must not change image references"
    return ""


PLACEHOLDER_TRANSLATION_RE = re.compile(r"\b(todo|tbd|same as source|unchanged|copy source|原文同上|同上|未翻译|待翻译)\b", re.IGNORECASE)


def text_for_translation_quality(markdown: str) -> str:
    text = re.sub(r"```.*?```", " ", str(markdown or ""), flags=re.DOTALL)
    text = re.sub(r"\$\$.*?\$\$|\$[^$]+\$", " ", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[|:.\-#*_`~\[\](){},;!?\"'\\]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalized_quality_text(markdown: str) -> str:
    return text_for_translation_quality(markdown).casefold()


def target_language_profile(target_language: str) -> dict[str, Any]:
    code = clean_text(target_language).split("-")[0].lower()
    if code in {"zh", "ja"}:
        return {"code": code, "script": "cjk", "minimum_script_ratio": 0.15}
    if code == "ko":
        return {"code": code, "script": "hangul", "minimum_script_ratio": 0.15}
    if code in {"ru", "uk", "bg", "sr", "mk"}:
        return {"code": code, "script": "cyrillic", "minimum_script_ratio": 0.35}
    if code in {"ar", "fa", "ur"}:
        return {"code": code, "script": "arabic", "minimum_script_ratio": 0.35}
    if code == "el":
        return {"code": code, "script": "greek", "minimum_script_ratio": 0.35}
    if code in {"hi", "mr", "ne"}:
        return {"code": code, "script": "devanagari", "minimum_script_ratio": 0.25}
    if code == "he":
        return {"code": code, "script": "hebrew", "minimum_script_ratio": 0.35}
    if code == "th":
        return {"code": code, "script": "thai", "minimum_script_ratio": 0.25}
    return {"code": code, "script": "latin_or_unknown", "minimum_script_ratio": 0.0}


def script_char_ratio(text: str, script: str) -> float:
    ranges = {
        "cjk": [(0x3400, 0x9FFF), (0xF900, 0xFAFF), (0x3040, 0x30FF)],
        "hangul": [(0xAC00, 0xD7AF), (0x1100, 0x11FF)],
        "cyrillic": [(0x0400, 0x052F)],
        "arabic": [(0x0600, 0x06FF), (0x0750, 0x077F), (0x08A0, 0x08FF)],
        "greek": [(0x0370, 0x03FF), (0x1F00, 0x1FFF)],
        "devanagari": [(0x0900, 0x097F)],
        "hebrew": [(0x0590, 0x05FF)],
        "thai": [(0x0E00, 0x0E7F)],
    }
    chars = [char for char in text if char.isalpha()]
    if not chars or script not in ranges:
        return 0.0
    matched = 0
    for char in chars:
        codepoint = ord(char)
        if any(start <= codepoint <= end for start, end in ranges[script]):
            matched += 1
    return matched / len(chars)


def translation_quality_errors(block: dict[str, Any], translated: str, target_language: str) -> list[str]:
    errors: list[str] = []
    kind = clean_text(block.get("kind"))
    if kind in FORMULA_BLOCK_KINDS:
        return errors
    block_id = clean_text(block.get("block_id"))
    source_text = normalized_quality_text(clean_text(block.get("source_markdown")))
    translated_text = normalized_quality_text(translated)
    if PLACEHOLDER_TRANSLATION_RE.search(translated):
        errors.append(f"translation appears to be a placeholder: {block_id}")
    if source_text and translated_text:
        if source_text == translated_text and (len(source_text) >= 40 or (kind in {"paragraph", "table"} and len(source_text) >= 20)):
            errors.append(f"translation copies source text: {block_id}")
        elif len(source_text) >= 80:
            similarity = difflib.SequenceMatcher(None, source_text, translated_text).ratio()
            if similarity >= 0.92:
                errors.append(f"translation is too similar to source text: {block_id}")
            if kind in {"paragraph", "table", "image"} and len(translated_text) < max(20, int(len(source_text) * 0.22)):
                errors.append(f"translation is suspiciously short for source block: {block_id}")
    profile = target_language_profile(target_language)
    minimum_ratio = float(profile.get("minimum_script_ratio") or 0.0)
    if minimum_ratio and len(translated_text) >= 30:
        ratio = script_char_ratio(translated_text, clean_text(profile.get("script")))
        if ratio < minimum_ratio:
            errors.append(f"translation does not appear to use target language script for {target_language}: {block_id}")
    return errors


def validate_block_translations_payload(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["block translations must be a JSON object"]
    unknown = sorted(set(payload) - BLOCK_TRANSLATION_FIELDS)
    if unknown:
        errors.append("unknown fields: " + ", ".join(unknown))
    if "translations" not in payload:
        errors.append("translations is required")
        return errors
    if not isinstance(payload.get("translations"), list):
        errors.append("translations must be an array")
        return errors

    blocks = reading_blocks()
    blocks_by_id = {clean_text(block.get("block_id")): block for block in blocks if clean_text(block.get("block_id"))}
    required_block_ids = {
        block_id
        for block_id, block in blocks_by_id.items()
        if bool(block.get("translate")) and clean_text(block.get("kind")) not in FORMULA_BLOCK_KINDS
    }
    target_language = target_language_from_db()
    seen: set[str] = set()
    submitted_block_ids: set[str] = set()
    normalized_submissions: dict[str, list[str]] = {}
    for index, row in enumerate(as_list(payload.get("translations")), start=1):
        if not isinstance(row, dict):
            errors.append(f"translations[{index}] must be an object")
            continue
        row_unknown = sorted(set(row) - BLOCK_TRANSLATION_ROW_FIELDS)
        if row_unknown:
            errors.append(f"translations[{index}] has unknown fields: " + ", ".join(row_unknown))
        block_id = clean_text(row.get("block_id"))
        if not block_id:
            errors.append(f"translations[{index}] requires block_id")
            continue
        if block_id in seen:
            errors.append(f"translations[{index}] duplicates block_id: {block_id}")
        seen.add(block_id)
        block = blocks_by_id.get(block_id)
        if not block:
            errors.append(f"translations[{index}] references unknown block_id: {block_id}")
            continue
        if not bool(block.get("translate")):
            errors.append(f"translations[{index}] references non-translatable block_id: {block_id}")
            continue
        translated = clean_text(row.get("translated_markdown"))
        if not translated:
            errors.append(f"translations[{index}] requires translated_markdown")
        if "quality_notes" in row and not isinstance(row.get("quality_notes"), list):
            errors.append(f"translations[{index}].quality_notes must be an array")
        if clean_text(block.get("kind")) == "table" and translated:
            table_error = table_translation_structure_error(translated)
            if table_error:
                errors.append(f"translations[{index}] table translation invalid for {block_id}: {table_error}")
        if clean_text(block.get("kind")) == "image" and translated:
            image_error = image_translation_structure_error(block, translated)
            if image_error:
                errors.append(f"translations[{index}] image translation invalid for {block_id}: {image_error}")
        if translated and block:
            errors.extend(f"translations[{index}] {message}" for message in translation_quality_errors(block, translated, target_language))
            normalized = normalized_quality_text(translated)
            if len(normalized) >= 40:
                normalized_submissions.setdefault(normalized, []).append(block_id)
        submitted_block_ids.add(block_id)
    for block_ids in normalized_submissions.values():
        unique_ids = sorted(set(block_ids))
        if len(unique_ids) >= 2:
            errors.append("repeated identical translation across blocks: " + ", ".join(unique_ids))
    missing = sorted(required_block_ids - submitted_block_ids)
    if missing:
        errors.append("missing translations for required blocks: " + ", ".join(missing))
    return errors


def normalize_block_translations(payload: dict[str, Any], diagnostics: list[dict[str, Any]]) -> dict[str, Any]:
    submitted: dict[str, dict[str, Any]] = {}
    for row in as_list(payload.get("translations")):
        if isinstance(row, dict) and clean_text(row.get("block_id")):
            submitted[clean_text(row.get("block_id"))] = row
    target_language = target_language_from_db()
    items: list[dict[str, Any]] = []
    for block in reading_blocks():
        block_id = clean_text(block.get("block_id"))
        if not bool(block.get("translate")):
            continue
        kind = clean_text(block.get("kind"))
        row = submitted.get(block_id)
        if row:
            translated = clean_text(row.get("translated_markdown"))
            status = "available"
            notes = quality_notes(row.get("quality_notes"))
        elif kind in FORMULA_BLOCK_KINDS:
            translated = clean_text(block.get("source_markdown"))
            status = "carried_over"
            notes = []
        else:
            continue
        if kind == "table":
            diagnostics.append({"severity": "info", "code": "table_translation_structure_not_deep_verified", "block_id": block_id})
        items.append(
            {
                "block_id": block_id,
                "section_anchor": clean_text(block.get("section_anchor")),
                "kind": kind,
                "source_markdown": clean_text(block.get("source_markdown")),
                "translated_markdown": translated,
                "status": status,
                "quality_notes": notes,
            }
        )
    return {
        "schema_version": "literature-deep-reading.translation-view.v0",
        "source": "agent_block_translations",
        "target_language": target_language,
        "items": items,
        "translated_count": sum(1 for item in items if item.get("status") == "available"),
        "carried_over_count": sum(1 for item in items if item.get("status") == "carried_over"),
    }


def ensure_stage30_tables(conn: sqlite3.Connection) -> None:
    ensure_stage10_tables(conn)


def persist_stage30_db(payload_path: Path, translation_view: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage30_tables(conn)
        now = utc_now()
        target_language = clean_text(translation_view.get("target_language")) or "zh-CN"
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_30_block_translation", normalize_posix(payload_path), "literature-deep-reading.block-translations.v0", "valid", "[]", now),
        )
        conn.execute("DELETE FROM block_translations")
        for item in as_list(translation_view.get("items")):
            if not isinstance(item, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO block_translations VALUES (?, ?, ?, ?, ?, ?)",
                (
                    clean_text(item.get("block_id")),
                    target_language,
                    clean_text(item.get("translated_markdown")),
                    "",
                    clean_text(item.get("status")),
                    json.dumps(as_list(item.get("quality_notes")), ensure_ascii=False),
                ),
            )
        conn.execute(
            "UPDATE runs SET status = ?, updated_at = ?, diagnostics_json = ? WHERE run_id = ?",
            ("translated", now, json.dumps(diagnostics, ensure_ascii=False), "default"),
        )
        conn.commit()
    finally:
        conn.close()


def write_invalid_stage30_submission(payload_path: Path, errors: list[str]) -> None:
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage30_tables(conn)
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_30_block_translation", normalize_posix(payload_path), "literature-deep-reading.block-translations.v0", "invalid", json.dumps(errors, ensure_ascii=False), utc_now()),
        )
        conn.commit()
    finally:
        conn.close()


def submit_block_translations(payload_path: Path) -> dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError("bootstrap database is missing; run bootstrap first")
    missing_stage20_views = [
        path
        for path in [
            VIEWS_DIR / "preface-view.json",
            VIEWS_DIR / "section-insights-view.json",
            VIEWS_DIR / "concept-overlay-view.json",
            VIEWS_DIR / "references-view.json",
            VIEWS_DIR / "summary-view.json",
            VIEWS_DIR / "extensions-view.json",
        ]
        if not path.exists()
    ]
    if missing_stage20_views:
        raise FileNotFoundError("Stage 20 analysis views are missing: " + ", ".join(normalize_posix(path) for path in missing_stage20_views))
    payload_raw = read_json(payload_path, {})
    errors = validate_block_translations_payload(payload_raw)
    if errors:
        write_invalid_stage30_submission(payload_path, errors)
        raise ValueError("; ".join(errors))
    diagnostics: list[dict[str, Any]] = []
    translation_view = normalize_block_translations(payload_raw, diagnostics)
    diagnostics_view = {
        "schema_version": "literature-deep-reading.diagnostics-translation.v0",
        "diagnostics": diagnostics,
    }
    write_json(VIEWS_DIR / "translation-view.json", translation_view)
    write_json(VIEWS_DIR / "diagnostics-translation.json", diagnostics_view)
    persist_stage30_db(payload_path, translation_view, diagnostics)
    result = {
        "kind": "literature_deep_reading_translated",
        "status": "translated",
        "db_path": normalize_posix(DB_PATH),
        "views": {
            "translation": normalize_posix(VIEWS_DIR / "translation-view.json"),
        },
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-translation.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def validate_final_review_payload(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return ["final review must be a JSON object"]
    unknown = sorted(set(payload) - FINAL_REVIEW_FIELDS)
    if unknown:
        errors.append("unknown fields: " + ", ".join(unknown))
    assessment = clean_text(payload.get("overall_assessment"))
    if assessment not in FINAL_REVIEW_ASSESSMENTS:
        errors.append(f"overall_assessment must be one of {sorted(FINAL_REVIEW_ASSESSMENTS)}")
    if "quality_observations" in payload and not isinstance(payload.get("quality_observations"), list):
        errors.append("quality_observations must be an array")
    anchors = available_section_anchors()
    block_ids = {clean_text(block.get("block_id")) for block in reading_blocks() if clean_text(block.get("block_id"))}
    for index, observation in enumerate(as_list(payload.get("quality_observations")), start=1):
        if not isinstance(observation, dict):
            errors.append(f"quality_observations[{index}] must be an object")
            continue
        row_unknown = sorted(set(observation) - FINAL_REVIEW_OBSERVATION_FIELDS)
        if row_unknown:
            errors.append(f"quality_observations[{index}] has unknown fields: " + ", ".join(row_unknown))
        severity = clean_text(observation.get("severity"))
        if severity not in FINAL_REVIEW_SEVERITIES:
            errors.append(f"quality_observations[{index}].severity must be one of {sorted(FINAL_REVIEW_SEVERITIES)}")
        if not clean_text(observation.get("kind")):
            errors.append(f"quality_observations[{index}] requires kind")
        if not clean_text(observation.get("message")):
            errors.append(f"quality_observations[{index}] requires message")
        block_id = clean_text(observation.get("block_id"))
        if block_id and block_id not in block_ids:
            errors.append(f"quality_observations[{index}] references unknown block_id: {block_id}")
        anchor = clean_text(observation.get("section_anchor"))
        if anchor and anchor not in anchors:
            errors.append(f"quality_observations[{index}] references unknown section_anchor: {anchor}")
    return errors


def normalize_final_review(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "overall_assessment": clean_text(payload.get("overall_assessment")),
        "quality_observations": [
            {
                "severity": clean_text(item.get("severity")),
                "kind": clean_text(item.get("kind")),
                "block_id": clean_text(item.get("block_id")),
                "section_anchor": clean_text(item.get("section_anchor")),
                "message": clean_text(item.get("message")),
            }
            for item in as_list(payload.get("quality_observations"))
            if isinstance(item, dict)
        ],
    }


def template_dir() -> Path:
    script_path = Path(__file__).resolve()
    return script_path.parents[1] / "renderer" / "templates"


def read_template(name: str) -> str:
    path = template_dir() / name
    if not path.exists():
        raise FileNotFoundError(f"renderer template is missing: {normalize_posix(path)}")
    return path.read_text(encoding="utf-8")


SUPPORTED_GRAPH_LOCALES = {"en-US", "zh-CN", "fr-FR", "ja-JP"}


def resolve_graph_locale(target_language: str) -> str:
    normalized = clean_text(target_language).replace("_", "-")
    if normalized in SUPPORTED_GRAPH_LOCALES:
        return normalized
    language = normalized.split("-")[0].lower() if normalized else ""
    for locale in SUPPORTED_GRAPH_LOCALES:
        if locale.split("-")[0].lower() == language:
            return locale
    return "en-US"


def synthesis_graph_i18n(target_language: str) -> dict[str, Any]:
    locale = resolve_graph_locale(target_language)
    try:
        payload = json.loads(read_template("citation-graph-synthesis-i18n.json"))
    except Exception:
        payload = {}
    envelope = payload.get(locale) if isinstance(payload, dict) else None
    if not isinstance(envelope, dict):
        envelope = payload.get("en-US") if isinstance(payload, dict) else None
    if isinstance(envelope, dict):
        return {
            "locale": clean_text(envelope.get("locale")) or locale,
            "messages": envelope.get("messages") if isinstance(envelope.get("messages"), dict) else {},
        }
    return {"locale": locale, "messages": {}}


def synthesis_graph_scope_label(locale: str) -> str:
    labels = {
        "en-US": "Current paper centered 2-hop citation neighborhood",
        "zh-CN": "以当前文献为中心的 2 跳引用邻域",
        "fr-FR": "Voisinage de citations a 2 sauts centre sur l'article courant",
        "ja-JP": "現在の文献を中心とした2ホップ引用近傍",
    }
    return labels.get(locale, labels["en-US"])


def build_citation_graph_model(snapshot: dict[str, Any], layout: dict[str, Any]) -> dict[str, Any]:
    layout_nodes = {
        clean_text(node.get("node_id") or node.get("id")): node
        for node in as_list(layout.get("nodes"))
        if isinstance(node, dict) and clean_text(node.get("node_id") or node.get("id"))
    }
    snapshot_nodes = as_list(snapshot.get("nodes"))
    snapshot_edges = as_list(snapshot.get("edges"))
    start_node_id = clean_text(snapshot.get("start_node_id"))
    if not start_node_id:
        manifest = source_manifest()
        paper = manifest.get("paper") if isinstance(manifest.get("paper"), dict) else {}
        item_key = first_text(paper.get("item_key"), paper.get("itemKey"), paper.get("key"))
        start_node_id = f"zotero:item:{item_key}" if item_key else ""
    manifest = source_manifest()
    paper = manifest.get("paper") if isinstance(manifest.get("paper"), dict) else {}
    focus_authors = authors_from_record(paper)
    nodes: list[dict[str, Any]] = []
    for node in snapshot_nodes:
        if not isinstance(node, dict):
            continue
        node_id = clean_text(node.get("node_id") or node.get("id"))
        point = layout_nodes.get(node_id)
        if not node_id or not isinstance(point, dict):
            continue
        x = point.get("x")
        y = point.get("y")
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            continue
        raw_kind = clean_text(node.get("kind") or node.get("type"))
        kind = "external_reference"
        if node_id == start_node_id or raw_kind in {"target", "library", "library_paper"} or node_id.startswith("zotero:item:"):
            kind = "library_paper"
        display_tier = clean_text(node.get("display_tier") or node.get("displayTier"))
        if not display_tier:
            display_tier = "library" if kind == "library_paper" else "shared_external"
        is_focus = bool(start_node_id and node_id == start_node_id)
        authors = authors_from_record(node)
        if not authors and is_focus:
            authors = focus_authors
        nodes.append(
            {
                "id": node_id,
                "title": first_text(node.get("title"), node.get("label"), node_id),
                "kind": kind,
                "year": clean_text(node.get("year")),
                "authors": authors,
                "x": x,
                "y": y,
                "low_signal": bool(node.get("low_signal") or node.get("lowSignal")),
                "visibility": clean_text(node.get("visibility")) or "default",
                "display_tier": display_tier,
                "is_focus": is_focus,
                "focus_role": "current_paper" if is_focus else "",
                "metrics": node.get("metrics") if isinstance(node.get("metrics"), dict) else {},
                "source": node,
            }
        )
    node_ids = {node["id"] for node in nodes}
    edges: list[dict[str, Any]] = []
    for index, edge in enumerate(snapshot_edges, start=1):
        if not isinstance(edge, dict):
            continue
        source = clean_text(edge.get("source"))
        target = clean_text(edge.get("target"))
        if source not in node_ids or target not in node_ids:
            continue
        edges.append(
            {
                "id": first_text(edge.get("edge_id"), edge.get("id"), f"edge-{index:04d}"),
                "source": source,
                "target": target,
                "primary_role": clean_text(edge.get("primary_role") or edge.get("role") or edge.get("kind")),
                "mention_count": safe_int(edge.get("mention_count") or edge.get("mentions"), 0),
                "visibility": clean_text(edge.get("visibility")) or "default",
                "source_record": edge,
            }
        )
    x_values = [float(node["x"]) for node in nodes]
    y_values = [float(node["y"]) for node in nodes]
    coordinate_bounds = {
        "min_x": min(x_values) if x_values else None,
        "max_x": max(x_values) if x_values else None,
        "min_y": min(y_values) if y_values else None,
        "max_y": max(y_values) if y_values else None,
    }
    layout_status = clean_text(layout.get("status") or layout.get("layout_status"))
    diagnostics = {
        "snapshot_node_count": len(snapshot_nodes),
        "snapshot_edge_count": len(snapshot_edges),
        "layout_node_count": len(layout_nodes),
        "layout_edge_count": len(as_list(layout.get("edges"))),
        "drawable_node_count": len(nodes),
        "drawable_edge_count": len(edges),
        "dropped_node_count": max(0, len(snapshot_nodes) - len(nodes)),
        "dropped_edge_count": max(0, len(snapshot_edges) - len(edges)),
        "coordinate_bounds": coordinate_bounds,
        "layout_status": layout_status,
        "render_status": "ready" if nodes and edges and layout_status in {"", "ready", "available"} else ("empty" if not nodes else "partial"),
    }
    return {
        "schema_version": "literature-deep-reading.citation-graph-render-model.v0",
        "renderer": "zotero-skills-citation-graph-standalone",
        "start_node_id": start_node_id,
        "nodes": nodes,
        "edges": edges,
        "diagnostics": diagnostics,
    }


def synthesis_graph_layout_status(model: dict[str, Any]) -> str:
    diagnostics = model.get("diagnostics") if isinstance(model.get("diagnostics"), dict) else {}
    layout_status = clean_text(diagnostics.get("layout_status"))
    if layout_status in {"ready", "available", ""} and as_list(model.get("nodes")):
        return "ready"
    if layout_status in {"missing", "refreshing", "stale", "failed"}:
        return layout_status
    return "missing" if not as_list(model.get("nodes")) else "ready"


def synthesis_graph_hash(model: dict[str, Any]) -> str:
    payload = {
        "nodes": [
            [node.get("id"), node.get("x"), node.get("y")]
            for node in as_list(model.get("nodes"))
            if isinstance(node, dict)
        ],
        "edges": [
            [edge.get("id"), edge.get("source"), edge.get("target")]
            for edge in as_list(model.get("edges"))
            if isinstance(edge, dict)
        ],
    }
    digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
    return f"literature-deep-reading:{digest[:16]}"


def percentile_value(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = int((len(ordered) - 1) * max(0.0, min(1.0, percentile)))
    return ordered[index]


def compress_graph_coordinates_around_focus(nodes: list[dict[str, Any]], focus_node_id: str) -> None:
    if len(nodes) < 4:
        return
    focus = next((node for node in nodes if clean_text(node.get("id")) == focus_node_id), None)
    if not isinstance(focus, dict):
        focus = next((node for node in nodes if bool(node.get("is_focus"))), None)
    if not isinstance(focus, dict):
        return
    focus_x = focus.get("x")
    focus_y = focus.get("y")
    if not isinstance(focus_x, (int, float)) or not isinstance(focus_y, (int, float)):
        return
    distances: list[float] = []
    for node in nodes:
        x = node.get("x")
        y = node.get("y")
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            distances.append(float(((x - focus_x) ** 2 + (y - focus_y) ** 2) ** 0.5))
    cap = percentile_value([value for value in distances if value > 0], 0.80)
    if cap <= 0:
        return
    for node in nodes:
        x = node.get("x")
        y = node.get("y")
        if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
            continue
        dx = float(x - focus_x)
        dy = float(y - focus_y)
        distance = float((dx**2 + dy**2) ** 0.5)
        if distance <= cap or distance <= 0:
            node["x"] = dx
            node["y"] = dy
            continue
        compressed = cap + (distance - cap) * 0.22
        ratio = compressed / distance
        node["x"] = dx * ratio
        node["y"] = dy * ratio
    balance_graph_axis_around_focus(nodes, "x")
    balance_graph_axis_around_focus(nodes, "y")


def balance_graph_axis_around_focus(nodes: list[dict[str, Any]], axis: str) -> None:
    values = [float(node.get(axis)) for node in nodes if isinstance(node.get(axis), (int, float))]
    if not values:
        return
    negative = abs(min(values))
    positive = max(values)
    if negative <= 0 or positive <= 0:
        return
    target = min(negative, positive)
    if target <= 0:
        return
    for node in nodes:
        value = node.get(axis)
        if not isinstance(value, (int, float)) or value == 0:
            continue
        if value > 0:
            node[axis] = float(value) * target / positive
        else:
            node[axis] = float(value) * target / negative


def build_synthesis_graph_from_model(model: dict[str, Any]) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = []
    for node in as_list(model.get("nodes")):
        if not isinstance(node, dict):
            continue
        node_id = clean_text(node.get("id"))
        if not node_id:
            continue
        nodes.append(
            {
                "id": node_id,
                "label": first_text(node.get("title"), node.get("label"), node_id),
                "kind": clean_text(node.get("kind")) or "external_reference",
                "year": clean_text(node.get("year")),
                "authors": normalize_author_list(node.get("authors")),
                "x": node.get("x") if isinstance(node.get("x"), (int, float)) else 0,
                "y": node.get("y") if isinstance(node.get("y"), (int, float)) else 0,
                "low_signal": bool(node.get("low_signal") or node.get("lowSignal")),
                "visibility": clean_text(node.get("visibility")) or "default",
                "display_tier": clean_text(node.get("display_tier") or node.get("displayTier")) or "shared_external",
                "is_focus": bool(node.get("is_focus") or node.get("isFocus")),
                "focus_role": clean_text(node.get("focus_role") or node.get("focusRole")),
                "metrics": node.get("metrics") if isinstance(node.get("metrics"), dict) else {},
            }
        )
    focus_node_id = clean_text(model.get("start_node_id"))
    compress_graph_coordinates_around_focus(nodes, focus_node_id)
    node_ids = {node["id"] for node in nodes}
    edges: list[dict[str, Any]] = []
    for edge in as_list(model.get("edges")):
        if not isinstance(edge, dict):
            continue
        source = clean_text(edge.get("source"))
        target = clean_text(edge.get("target"))
        edge_id = clean_text(edge.get("id"))
        if not edge_id or source not in node_ids or target not in node_ids:
            continue
        edges.append(
            {
                "id": edge_id,
                "source": source,
                "target": target,
                "primary_role": clean_text(edge.get("primary_role") or edge.get("role")),
                "mention_count": safe_int(edge.get("mention_count") or edge.get("mentions"), 0),
                "visibility": clean_text(edge.get("visibility")) or "default",
            }
        )
    diagnostics = model.get("diagnostics") if isinstance(model.get("diagnostics"), dict) else {}
    filters = {
        "search": "",
        "role": "all",
        "topicId": "literature-deep-reading",
        "layoutAlgorithm": "force",
        "nodeKinds": ["library_paper", "external_reference"],
        "showLowSignalReferences": True,
    }
    topic_scope = {
        "topicId": "literature-deep-reading",
        "title": "Citation Graph",
        "paperRefs": [],
        "nodeIds": [node["id"] for node in nodes],
    }
    return {
        "filters": filters,
        "graph_hash": synthesis_graph_hash(model) if nodes else "",
        "layoutStatus": synthesis_graph_layout_status(model),
        "layoutAlgorithm": "force",
        "topicScopes": [topic_scope],
        "selectedTopicScope": topic_scope,
        "nodes": nodes,
        "edges": edges,
        "hoverOnlyNodes": [],
        "hoverOnlyEdges": [],
        "visibleNodes": nodes,
        "visibleEdges": edges,
        "diagnostics": {
            **diagnostics,
            "cache_status": "ready" if nodes else "missing",
            "library_node_count": sum(1 for node in nodes if node.get("kind") == "library_paper"),
            "shared_external_count": sum(1 for node in nodes if node.get("display_tier") == "shared_external"),
            "hover_only_external_count": 0,
        },
    }


def empty_synthesis_snapshot(graph: dict[str, Any], paper: dict[str, Any]) -> dict[str, Any]:
    return {
        "libraryId": 0,
        "selectedTab": "reader",
        "storage": {},
        "preferences": {},
        "deletedArtifacts": {"count": 0, "rows": []},
        "artifacts": {"filters": {}, "rows": [], "visibleRows": []},
        "registry": {"filters": {}, "rows": [], "visibleRows": []},
        "topicGraph": {
            "filters": {"mode": "hierarchy", "search": ""},
            "nodes": [],
            "edges": [],
            "reviewItems": [],
            "visibleNodes": [],
            "visibleEdges": [],
            "inspector": {
                "parents": [],
                "children": [],
                "related": [],
                "suggestedRelations": [],
                "relationReviewItems": [],
                "suggestedCount": 0,
            },
            "manifest": {},
            "projection": {},
            "diagnostics": [],
        },
        "concepts": {
            "filters": {
                "search": "",
                "conceptType": "all",
                "status": "all",
                "topicId": "all",
                "overlayEnabled": False,
                "reviewMergeTargets": {},
            },
            "rows": [],
            "visibleRows": [],
            "senses": [],
            "aliases": [],
            "relations": [],
            "reviewItems": [],
            "overlayEntries": [],
            "conceptTypes": [],
            "projection": {},
            "manifest": {},
            "diagnostics": [],
        },
        "graph": graph,
        "reader": {"topicId": "literature-deep-reading", "previousTab": "artifacts"},
    }


def build_synthesis_export_envelope(citation_graph_model: dict[str, Any], paper: dict[str, Any]) -> dict[str, Any]:
    graph = build_synthesis_graph_from_model(citation_graph_model)
    snapshot = empty_synthesis_snapshot(graph, paper)
    target_language = clean_text(paper.get("target_language")) or target_language_from_db()
    i18n = synthesis_graph_i18n(target_language)
    focus_node_id = first_text(
        citation_graph_model.get("start_node_id"),
        next((node.get("id") for node in as_list(graph.get("nodes")) if isinstance(node, dict) and node.get("is_focus")), ""),
    )
    return {
        "version": 1,
        "generatedAt": utc_now(),
        "i18n": i18n,
        "scopeLabel": synthesis_graph_scope_label(clean_text(i18n.get("locale")) or "en-US"),
        "focusNodeId": focus_node_id,
        "snapshot": snapshot,
        "graphLayouts": {"force": graph},
    }


def image_data_uri(path: Path) -> str:
    mime_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def build_source_images_view() -> dict[str, Any]:
    manifest = read_view("image-manifest.json", {})
    items: list[dict[str, Any]] = []
    by_src: dict[str, Any] = {}
    by_path: dict[str, Any] = {}
    for item in as_list(manifest.get("images")):
        if not isinstance(item, dict):
            continue
        bundle_path = clean_text(item.get("bundle_path"))
        original_src = clean_text(item.get("original_src"))
        runtime_path = SOURCE_DIR / bundle_path if bundle_path else Path()
        data_uri = ""
        status = clean_text(item.get("status") or "missing")
        bytes_count = runtime_path.stat().st_size if bundle_path and runtime_path.exists() else safe_int(item.get("bytes"), 0)
        if bundle_path and runtime_path.exists() and bytes_count > 0:
            data_uri = image_data_uri(runtime_path)
            status = "available"
        elif bundle_path and runtime_path.exists() and bytes_count <= 0:
            status = "corrupt"
        normalized = {
            **item,
            "original_src": original_src,
            "bundle_path": bundle_path,
            "status": status,
            "bytes": bytes_count,
            "data_uri": data_uri,
        }
        items.append(normalized)
        if original_src:
            by_src[original_src] = normalized
        if bundle_path:
            by_path[bundle_path] = normalized
    return {
        "schema_version": "literature-deep-reading.source-images.v0",
        "images": items,
        "by_src": by_src,
        "by_path": by_path,
        "available_count": sum(1 for item in items if item.get("data_uri")),
    }


def inferred_navigation_level(title: str, markdown_level: int) -> int:
    base_level = max(0, markdown_level - 1)
    if base_level == 0:
        return 0
    text = clean_text(title).strip()
    depth = 1
    numeric = re.match(r"^(\d+(?:\.\d+)*)(?:\s+|$)", text)
    if numeric:
        depth = numeric.group(1).count(".") + 1
    else:
        appendix = re.match(r"^([A-Z])(?:\.(\d+(?:\.\d+)*))?(?:\s+|$)", text)
        if appendix:
            suffix = appendix.group(2) or ""
            depth = 1 + (suffix.count(".") + 1 if suffix else 0)
    return max(base_level, depth)


def build_navigation(source_structure: dict[str, Any], labels: dict[str, str]) -> list[dict[str, Any]]:
    navigation = [{"anchor": "preface", "title": labels.get("preface", "Reading Guide"), "level": 0, "kind": "preface"}]
    appendix_sections: list[dict[str, Any]] = []
    for section in as_list(source_structure.get("sections")):
        if not isinstance(section, dict):
            continue
        anchor = clean_text(section.get("anchor"))
        title = clean_text(section.get("title"))
        if not anchor or not title:
            continue
        role = clean_text(section.get("role")) or "main"
        if role == "bibliography":
            continue
        if role == "appendix":
            appendix_sections.append(section)
            continue
        navigation.append(
            {
                "anchor": anchor,
                "title": title,
                "level": inferred_navigation_level(title, safe_int(section.get("level"), 1)),
                "kind": "paper_section",
            }
        )
    navigation.extend(
        [
            {"anchor": "summary", "title": labels.get("summary", "Summary"), "level": 0, "kind": "summary"},
            {"anchor": "references", "title": labels.get("references", "References"), "level": 0, "kind": "references"},
        ]
    )
    for section in appendix_sections:
        title = clean_text(section.get("title"))
        navigation.append(
            {
                "anchor": clean_text(section.get("anchor")),
                "title": title,
                "level": inferred_navigation_level(title, safe_int(section.get("level"), 1)),
                "kind": "appendix_section",
            }
        )
    navigation.extend(
        [
            {"anchor": "citation-graph", "title": labels.get("citation_graph", "Citation Graph"), "level": 0, "kind": "citation_graph"},
            {"anchor": "extensions", "title": labels.get("extensions", "Extensions"), "level": 0, "kind": "extensions"},
        ]
    )
    return navigation


def paper_metadata() -> dict[str, Any]:
    manifest = source_manifest()
    paper = manifest.get("paper") if isinstance(manifest.get("paper"), dict) else {}
    return {
        "title": first_text(paper.get("title"), manifest.get("title"), "Literature Deep Reading"),
        "item_key": first_text(paper.get("item_key"), paper.get("itemKey"), paper.get("key")),
        "authors": authors_from_record(paper),
        "target_language": target_language_from_db(),
    }


def build_render_reading_blocks(blocks: list[dict[str, Any]], translation: dict[str, Any], role: str = "main") -> list[dict[str, Any]]:
    translations = {
        clean_text(item.get("block_id")): item
        for item in as_list(translation.get("items"))
        if isinstance(item, dict) and clean_text(item.get("block_id"))
    }
    rendered: list[dict[str, Any]] = []
    for block in blocks:
        if not isinstance(block, dict) or block.get("translate") is False:
            continue
        if (clean_text(block.get("role")) or "main") != role:
            continue
        block_id = clean_text(block.get("block_id"))
        source_markdown = str(block.get("source_markdown") or "")
        translated_markdown = clean_text(translations.get(block_id, {}).get("translated_markdown")) or source_markdown
        if clean_text(block.get("kind")) == "image" and translated_markdown and not extract_image_refs(translated_markdown):
            image_body, _source_caption = split_structured_caption(source_markdown, "image")
            translated_markdown = image_body + (("\n\n" + translated_markdown) if translated_markdown else "")
        rendered.append(
            {
                **block,
                "id": block_id,
                "source_html": render_markdown_fragment(source_markdown, clean_text(block.get("kind")), clean_text(block.get("section_anchor"))),
                "translation": translated_markdown,
                "translated_markdown": translated_markdown,
                "translation_html": render_markdown_fragment(translated_markdown, clean_text(block.get("kind")), f"zh-{clean_text(block.get('section_anchor'))}" if block.get("kind") == "heading" else ""),
            }
        )
    return rendered


def build_final_sections_view(final_review: dict[str, Any], diagnostics: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    source_structure = read_view("source-structure.json", {})
    source_images = build_source_images_view()
    translation = read_view("translation-view.json", {})
    translation_available = safe_int(translation.get("translated_count"), 0) > 0
    citation_snapshot = read_view("citation-graph-snapshot.json", {})
    citation_layout = read_view("citation-graph-layout.json", {})
    layout_nodes = as_list(citation_layout.get("nodes"))
    if as_list(citation_snapshot.get("nodes")) and not layout_nodes:
        diagnostics.append({"severity": "warning", "code": "citation_graph_layout_missing"})
    citation_graph_model = build_citation_graph_model(citation_snapshot, citation_layout)
    paper = paper_metadata()
    citation_graph_envelope = build_synthesis_export_envelope(citation_graph_model, paper)
    blocks = reading_blocks()
    labels = deep_reading_labels(paper.get("target_language"))
    sections_view = {
        "schema_version": "literature-deep-reading.seamless-scroll.v0",
        "paper": paper,
        "labels": labels,
        "navigation": build_navigation(source_structure, labels),
        "preface": read_view("preface-view.json", {}),
        "sections": as_list(source_structure.get("sections")),
        "reading_blocks": build_render_reading_blocks(blocks, translation, "main"),
        "appendix_reading_blocks": build_render_reading_blocks(blocks, translation, "appendix"),
        "translation_available": translation_available,
        "summary": read_view("summary-view.json", {}),
        "post_reading_markdown": "",
        "section_insights": read_view("section-insights-view.json", {}),
        "references_source": read_view("references-view.json", {}).get("references_source") or read_view("references-view.json", {}).get("source") or "none",
        "references": read_view("references-view.json", {}),
        "concepts": read_view("concept-overlay-view.json", {}),
        "citation_graph": {
            "anchor": "citation-graph",
            "snapshot": citation_snapshot,
            "layout": citation_layout,
            "model": citation_graph_model,
            "synthesis_export_envelope": citation_graph_envelope,
        },
        "extensions": read_view("extensions-view.json", {}),
        "translation": translation,
        "images": source_images,
        "final_review": final_review,
    }
    diagnostics_view = {
        "schema_version": "literature-deep-reading.final-diagnostics.v0",
        "diagnostics": diagnostics,
        "final_review": final_review,
    }
    return sections_view, source_images, diagnostics_view


def safe_inline_json(value: Any) -> str:
    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        .replace("</", "<\\/")
        .replace("http://", "http:\\/\\/")
        .replace("https://", "https:\\/\\/")
        .replace("file://", "file:\\/\\/")
    )


def html_attr(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def static_block_id(block: dict[str, Any]) -> str:
    return clean_text(block.get("id")) or clean_text(block.get("block_id"))


def sanitize_static_html_fragment(fragment: str) -> str:
    return re.sub(r"\s+xmlns=[\"']http://www\.w3\.org/1998/Math/MathML[\"']", "", fragment or "", flags=re.IGNORECASE)


def static_attach_image_sources(fragment: str, images: dict[str, Any]) -> str:
    if not fragment:
        return ""
    by_path = images.get("by_path") if isinstance(images.get("by_path"), dict) else {}
    by_src = images.get("by_src") if isinstance(images.get("by_src"), dict) else {}

    def replace_img(match: re.Match[str]) -> str:
        tag = match.group(0)
        if re.search(r"\ssrc=", tag, re.IGNORECASE):
            return tag
        key_match = re.search(r"\sdata-image-src=[\"']([^\"']+)[\"']", tag, re.IGNORECASE)
        if not key_match:
            return tag
        key = key_match.group(1)
        item = by_path.get(key) or by_src.get(key)
        data_uri = item.get("data_uri") if isinstance(item, dict) else ""
        if not data_uri:
            return tag
        return tag[:-1] + f' src="{html_attr(data_uri)}">'

    return sanitize_static_html_fragment(re.sub(r"<img\b[^>]*>", replace_img, fragment, flags=re.IGNORECASE))


def static_reading_block_html(block: dict[str, Any], mode: str, images: dict[str, Any]) -> str:
    block_id = static_block_id(block)
    section_anchor = clean_text(block.get("section_anchor"))
    kind = clean_text(block.get("kind")) or "text"
    source_html = static_attach_image_sources(str(block.get("source_html") or ""), images)
    translation_html = static_attach_image_sources(str(block.get("translation_html") or ""), images)
    if mode == "source":
        return f'<section class="source-block block-{html_attr(kind)}" data-block-id="{html_attr(block_id)}" data-section-anchor="{html_attr(section_anchor)}">{source_html}</section>'
    if mode == "translation":
        return f'<section class="translation-section block-{html_attr(kind)}" data-block-id="{html_attr(block_id)}" data-section-anchor="{html_attr(section_anchor)}">{translation_html}</section>'
    return (
        f'<section class="aligned-block-pair block-{html_attr(kind)}" data-block-id="{html_attr(block_id)}" data-section-anchor="{html_attr(section_anchor)}">'
        f'<div class="aligned-source">{source_html}</div><div class="aligned-translation">{translation_html}</div></section>'
    )


def static_reading_region(blocks: list[dict[str, Any]], mode: str, images: dict[str, Any]) -> str:
    return "".join(static_reading_block_html(block, mode, images) for block in blocks if isinstance(block, dict))


def static_nav_html(sections_view: dict[str, Any]) -> str:
    items = []
    for item in as_list(sections_view.get("navigation")):
        if not isinstance(item, dict):
            continue
        anchor = clean_text(item.get("anchor"))
        title = clean_text(item.get("title"))
        if not anchor or not title:
            continue
        level = safe_int(item.get("level"), 1)
        items.append(f'<a href="#{html_attr(anchor)}" data-anchor="{html_attr(anchor)}" class="level-{html_attr(level)}">{html.escape(title)}</a>')
    return "".join(items)


def static_concept_rail_html(sections_view: dict[str, Any]) -> str:
    labels = labels_from_sections(sections_view)
    concepts = as_list((sections_view.get("concepts") or {}).get("concepts") if isinstance(sections_view.get("concepts"), dict) else [])
    chips = []
    for concept in concepts[:24]:
        if not isinstance(concept, dict):
            continue
        label = first_text(concept.get("label"), concept.get("id"), concept.get("concept_id"))
        if not label:
            continue
        kind = clean_text(concept.get("kind"))
        chips.append(f'<button type="button" class="concept-chip"><strong>{html.escape(label)}</strong>{f"<span>{html.escape(kind)}</span>" if kind else ""}</button>')
    return f'<div class="concept-rail-header"><strong>{html.escape(labels.get("concepts", "Concepts"))}</strong></div><button type="button" class="concept-toggle" aria-label="概念导航"></button><div class="concept-list">' + "".join(chips) + "</div>"


def static_preface_html(sections_view: dict[str, Any]) -> str:
    labels = labels_from_sections(sections_view)
    preface = sections_view.get("preface") if isinstance(sections_view.get("preface"), dict) else {}
    title = first_text(preface.get("title"), labels.get("preface"), "Reading Guide")
    goal = clean_text(preface.get("goal"))
    cards = "".join(
        f'<article class="preface-card"><h2>{html.escape(clean_text(card.get("title")) or "阅读提示")}</h2><p>{html.escape(clean_text(card.get("body")))}</p></article>'
        for card in as_list(preface.get("cards"))
        if isinstance(card, dict)
    )
    return f'<h1 id="{html_attr(preface.get("anchor") or "preface")}">{html.escape(title)}</h1><p class="kicker">{html.escape(goal)}</p><div class="preface-grid">{cards}</div>{static_preface_timeline_html(preface, labels)}{static_reading_guide_html(preface, labels)}'


def timeline_item_left_percent(item: dict[str, Any], min_year: int, max_year: int) -> float:
    year = safe_int(item.get("year"), min_year)
    if max_year <= min_year:
        return 50.0
    return 5.0 + ((year - min_year) / (max_year - min_year)) * 90.0


def static_preface_timeline_html(preface: dict[str, Any], labels: dict[str, str] | None = None) -> str:
    labels = labels or deep_reading_labels()
    timeline = preface.get("topic_timeline") if isinstance(preface.get("topic_timeline"), dict) else {}
    if not timeline.get("available"):
        return ""
    items = [item for item in as_list(timeline.get("items")) if isinstance(item, dict) and parse_year_value(item.get("year")) is not None]
    if not items:
        return ""
    years = [safe_int(item.get("year"), 0) for item in items]
    min_year = min(years)
    max_year = max(years)
    width = max(760, min(1800, 180 + max(1, len(set(years))) * 150))
    ticks = "".join(
        f'<span style="position:absolute;left:{timeline_item_left_percent({"year": year}, min_year, max_year):.2f}%;transform:translateX(-50%)">{html.escape(str(year))}</span>'
        for year in sorted(set(years))
    )
    markers = []
    for item in items:
        kind = clean_text(item.get("kind")) or "paper"
        current = bool(item.get("is_current_paper"))
        classes = [
            "timeline-marker",
            f"timeline-{kind}",
            f"timeline-tone-{clean_text(item.get('tone')) or ('current' if current else kind)}",
        ]
        if current:
            classes.append("timeline-current-paper")
        left = timeline_item_left_percent(item, min_year, max_year)
        label = clean_text(item.get("label")) or str(item.get("year"))
        title = clean_text(item.get("title")) or label
        scale = "1.5" if current else clean_text(item.get("pin_scale")) or "1"
        markers.append(
            '<section class="timeline-phase" style="left:{left:.2f}%"><div class="marker-list">'
            '<span class="{classes}" style="--pin-scale:{scale}" title="{title}" aria-label="{title}">'
            '<span class="timeline-code">{label}</span><span class="timeline-pin"><span class="timeline-pin-body"></span><span class="timeline-pin-dot"></span></span>'
            '</span></div></section>'.format(
                left=left,
                classes=html_attr(" ".join(classes)),
                scale=html_attr(scale),
                title=html_attr(title),
                label=html.escape(label),
            )
        )
    summary = clean_text(timeline.get("summary"))
    summary_html = f'<div class="timeline-summary"><p>{html.escape(summary)}</p></div>' if summary else ""
    return (
        '<section class="topic-timeline preface-topic-timeline">'
        f'<div class="timeline-head"><strong>{html.escape(labels.get("topic_timeline", "Topic Timeline"))}</strong><div class="timeline-legend"><span><i class="legend-icon legend-icon-paper"></i>{html.escape(labels.get("timeline_papers", "Papers"))}</span><span><i class="legend-icon legend-icon-event"></i>{html.escape(labels.get("timeline_milestones", "Milestones"))}</span><span><i class="legend-icon legend-icon-current"></i>{html.escape(labels.get("timeline_current_paper", "Current Paper"))}</span></div></div>'
        f'{summary_html}<div class="timeline-scroll"><div class="horizontal-timeline" style="width:{width}px"><div class="timeline-inner-rail"><div class="time-axis">{ticks}</div>{"".join(markers)}</div></div></div>'
        '</section>'
    )


def static_reading_guide_html(preface: dict[str, Any], labels: dict[str, str] | None = None) -> str:
    labels = labels or deep_reading_labels()
    reading_path = as_list(preface.get("reading_path"))
    questions = [item for item in as_list(preface.get("questions")) if isinstance(item, dict) and (clean_text(item.get("question")) or clean_text(item.get("answer")))]
    if not reading_path and not questions:
        return ""
    path_html = ""
    if reading_path:
        path_html = f'<section><h3>{html.escape(labels.get("reading_path", "Reading Path"))}</h3><ul>' + "".join(f"<li>{html.escape(clean_text(item))}</li>" for item in reading_path if clean_text(item)) + "</ul></section>"
    questions_html = ""
    if questions:
        question_items = []
        for item in questions:
            question = clean_text(item.get("question"))
            answer = clean_text(item.get("answer"))
            answer_html = f"<p>{html.escape(answer)}</p>" if answer else ""
            question_items.append(f'<article class="preface-question"><strong>{html.escape(question)}</strong>{answer_html}</article>')
        questions_html = f'<section><h3>{html.escape(labels.get("reading_questions", "Questions to Keep in Mind"))}</h3>' + "".join(question_items) + "</section>"
    return f'<section class="reading-guide"><h2>{html.escape(labels.get("reading_guide", "Reading Guide"))}</h2>{path_html}{questions_html}</section>'


def static_summary_html(sections_view: dict[str, Any]) -> str:
    labels = labels_from_sections(sections_view)
    summary = sections_view.get("summary") if isinstance(sections_view.get("summary"), dict) else {}
    sections = as_list(summary.get("sections"))
    body = "".join(
        f'<section class="summary-block"><h2>{html.escape(clean_text(section.get("title")) or labels.get("summary", "Summary"))}</h2><p>{html.escape(clean_text(section.get("body")) or clean_text(section.get("markdown")))}</p></section>'
        for section in sections
        if isinstance(section, dict)
    )
    return f'<h1 id="summary">{html.escape(labels.get("summary", "Summary"))}</h1>{body}'


def static_references_html(sections_view: dict[str, Any]) -> str:
    labels = labels_from_sections(sections_view)
    references = sections_view.get("references") if isinstance(sections_view.get("references"), dict) else {}
    raw_view = references.get("raw_view") if isinstance(references.get("raw_view"), dict) else {}
    source = raw_view.get("source") or references.get("references_source")
    source_label = labels.get("markdown_references", "markdown references") if source == "markdown" else labels.get("raw_references", "raw")
    items = []
    for ref in as_list(raw_view.get("items") or references.get("items")):
        if not isinstance(ref, dict):
            continue
        ref_index = clean_text(ref.get("reference_index"))
        raw_markdown = clean_text(ref.get("raw_markdown") or ref.get("raw"))
        if not raw_markdown:
            continue
        items.append(
            '<article class="reference-item reference-raw-view">'
            f'<span class="reference-index">{html.escape(ref_index)}</span>'
            f'<pre class="reference-raw-markdown">{html.escape(raw_markdown)}</pre>'
            "</article>"
        )
    count_label = clean_text(raw_view.get("reference_count")) or str(len(items))
    return f'<section class="structured-references" id="references"><div class="references-summary"><strong>{html.escape(labels.get("references", "References"))}</strong><span>{html.escape(count_label)} {html.escape(labels.get("paper_count_unit", "papers"))} · {html.escape(source_label)}</span></div><div class="reference-list">{"".join(items)}</div></section>'


def static_extensions_html(sections_view: dict[str, Any]) -> str:
    labels = labels_from_sections(sections_view)
    extensions = sections_view.get("extensions") if isinstance(sections_view.get("extensions"), dict) else {}
    items = "".join(
        f'<article class="extension"><h2>{html.escape(clean_text(item.get("title")) or labels.get("extensions", "Extensions"))}</h2><p>{html.escape(clean_text(item.get("body")) or clean_text(item.get("description")))}</p></article>'
        for item in as_list(extensions.get("items"))
        if isinstance(item, dict)
    )
    return f'<h1 id="extensions">{html.escape(labels.get("extensions", "Extensions"))}</h1>{items}'


def static_reading_aid_html(sections_view: dict[str, Any]) -> str:
    labels = labels_from_sections(sections_view)
    preface = sections_view.get("preface") if isinstance(sections_view.get("preface"), dict) else {}
    concepts = as_list(preface.get("concepts"))
    chips = "".join(f'<span class="chip">{html.escape(clean_text(item.get("label") if isinstance(item, dict) else item))}</span>' for item in concepts[:10] if clean_text(item.get("label") if isinstance(item, dict) else item))
    return f'<section><h2>{html.escape(labels.get("current_position", "Current Position"))}</h2><p>{html.escape(labels.get("preface", "Reading Guide"))}</p></section><section><h2>{html.escape(labels.get("reading_goal", "Reading Goal"))}</h2><p>{html.escape(clean_text(preface.get("goal")))}</p></section><section><h2>{html.escape(labels.get("related_concepts", "Related Concepts"))}</h2><div class="chips">{chips}</div></section>'


def static_graph_is_current_node(node: dict[str, Any], model: dict[str, Any]) -> bool:
    return bool(node.get("is_focus") or clean_text(node.get("focus_role")) == "current_paper" or (clean_text(model.get("start_node_id")) and clean_text(node.get("id")) == clean_text(model.get("start_node_id"))))


def static_citation_graph_html(sections_view: dict[str, Any]) -> str:
    labels = labels_from_sections(sections_view)
    graph = sections_view.get("citation_graph") if isinstance(sections_view.get("citation_graph"), dict) else {}
    model = graph.get("model") if isinstance(graph.get("model"), dict) else {}
    nodes = [node for node in as_list(model.get("nodes")) if isinstance(node, dict) and isinstance(node.get("x"), (int, float)) and isinstance(node.get("y"), (int, float))]
    node_ids = {clean_text(node.get("id")) for node in nodes}
    edges = [edge for edge in as_list(model.get("edges")) if isinstance(edge, dict) and clean_text(edge.get("source")) in node_ids and clean_text(edge.get("target")) in node_ids]
    if not nodes:
        return f'<h1 id="citation-graph">{html.escape(labels.get("citation_graph", "Citation Graph"))}</h1><p class="static-viewer-note">{html.escape(labels.get("graph_no_layout", "No graph layout coordinates are available."))}</p>'
    width, height = 900, 520
    xs = [float(node.get("x")) for node in nodes]
    ys = [float(node.get("y")) for node in nodes]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    pad = 42
    span_x = max(1.0, max_x - min_x)
    span_y = max(1.0, max_y - min_y)

    def point(node: dict[str, Any]) -> tuple[float, float]:
        x = pad + (float(node.get("x")) - min_x) / span_x * (width - pad * 2)
        y = pad + (max_y - float(node.get("y"))) / span_y * (height - pad * 2)
        return x, y

    node_by_id = {clean_text(node.get("id")): node for node in nodes}
    edge_html = []
    for edge in edges:
        source = node_by_id.get(clean_text(edge.get("source")))
        target = node_by_id.get(clean_text(edge.get("target")))
        if not source or not target:
            continue
        x1, y1 = point(source)
        x2, y2 = point(target)
        edge_html.append(f'<line class="static-cg-edge" x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" />')
    node_html = []
    for node in nodes:
        x, y = point(node)
        is_current = static_graph_is_current_node(node, model)
        kind = clean_text(node.get("kind"))
        display_tier = clean_text(node.get("display_tier"))
        incoming = safe_int((node.get("metrics") or {}).get("internal_in_degree") if isinstance(node.get("metrics"), dict) else 0, 0)
        radius = min(15, 6 + max(0, incoming) * 1.2)
        if is_current:
            radius *= 1.5
            color = "#ef4444"
        elif kind == "library_paper":
            color = "#2563eb"
        elif display_tier == "single_external":
            color = "#d97706"
        else:
            color = "#65a30d"
        halo = f'<circle class="static-cg-halo" cx="{x:.2f}" cy="{y:.2f}" r="{radius + 7:.2f}" />' if is_current or incoming >= 2 else ""
        label = f'<text class="static-cg-label" x="{x + radius + 5:.2f}" y="{y + 4:.2f}">{html.escape(clean_text(node.get("title"))[:64])}</text>' if is_current else ""
        node_html.append(f'{halo}<circle class="static-cg-node{" is-current-paper" if is_current else ""}" cx="{x:.2f}" cy="{y:.2f}" r="{radius:.2f}" fill="{color}"><title>{html.escape(clean_text(node.get("title")) or clean_text(node.get("id")))}</title></circle>{label}')
    return (
        '<div class="static-citation-graph" data-static-citation-graph>'
        f'<div class="static-cg-legend"><strong>{html.escape(labels.get("graph_direction", "Citation Direction"))}</strong><span><i class="edge"></i>{html.escape(labels.get("graph_relation", "Citation relation"))}</span><strong>{html.escape(labels.get("graph_importance", "Citation Importance"))}</strong><span><i class="node"></i>{html.escape(labels.get("graph_node_size", "Node size = inbound citations"))}</span><span><i class="current"></i>{html.escape(labels.get("graph_current_paper", "Current Paper"))}</span></div>'
        f'<div class="static-cg-stage"><div class="static-cg-scope">{html.escape(labels.get("graph_scope", "Current paper 2-hop citation neighborhood"))}</div>'
        f'<svg class="static-cg-svg" viewBox="0 0 {width} {height}" role="img" aria-label="{html_attr(labels.get("citation_graph", "Citation Graph"))}">'
        f'<g>{ "".join(edge_html) }</g><g>{ "".join(node_html) }</g></svg></div></div>'
    )


def build_static_shell_fragments(sections_view: dict[str, Any]) -> dict[str, str]:
    labels = labels_from_sections(sections_view)
    images = sections_view.get("images") if isinstance(sections_view.get("images"), dict) else {}
    reading_blocks = [block for block in as_list(sections_view.get("reading_blocks")) if isinstance(block, dict)]
    appendix_blocks = [block for block in as_list(sections_view.get("appendix_reading_blocks")) if isinstance(block, dict)]
    return {
        "STATIC_VIEWER_WARNING": html.escape(labels.get("viewer_warning", "Open this HTML in a browser for the full interactive experience.")),
        "STATIC_NOSCRIPT_WARNING": html.escape(labels.get("noscript_warning", "Static reading mode is active. Open this HTML in a browser for the full interactive experience.")),
        "STATIC_CONCEPT_RAIL": static_concept_rail_html(sections_view),
        "STATIC_NAV": static_nav_html(sections_view),
        "STATIC_PREFACE": static_preface_html(sections_view),
        "STATIC_SOURCE_READING": static_reading_region(reading_blocks, "source", images),
        "STATIC_COMPARE_READING": static_reading_region(reading_blocks, "compare", images),
        "STATIC_TRANSLATION_READING": static_reading_region(reading_blocks, "translation", images),
        "STATIC_SUMMARY": static_summary_html(sections_view),
        "STATIC_POST_READING": static_references_html(sections_view),
        "STATIC_APPENDIX_SOURCE": static_reading_region(appendix_blocks, "source", images),
        "STATIC_APPENDIX_COMPARE": static_reading_region(appendix_blocks, "compare", images),
        "STATIC_APPENDIX_TRANSLATION": static_reading_region(appendix_blocks, "translation", images),
        "STATIC_CITATION_GRAPH": static_citation_graph_html(sections_view),
        "STATIC_EXTENSIONS": static_extensions_html(sections_view),
        "STATIC_READING_AID": static_reading_aid_html(sections_view),
    }


def render_final_html(sections_view: dict[str, Any]) -> str:
    title = html.escape(clean_text(sections_view.get("paper", {}).get("title")) or "Literature Deep Reading")
    target_language = html.escape(clean_text(sections_view.get("paper", {}).get("target_language")))
    body_class = "mode-compare static-fallback" if sections_view.get("translation_available") is not False else "mode-original translation-unavailable"
    template = read_template("deep-reading.html.tpl")
    style = read_template("deep-reading.css")
    fallback_graph_style = read_template("citation-graph-standalone.css")
    topic_timeline_style = read_template("topic-timeline-shared.css")
    script = read_template("deep-reading.js")
    fallback_graph_script = read_template("citation-graph-standalone.js")
    topic_timeline_script = read_template("topic-timeline-shared.js")
    graph_assets = {
        "synthesisCss": read_template("citation-graph-synthesis.css"),
        "synthesisThemeJs": read_template("citation-graph-synthesis-theme.js"),
        "synthesisAppJs": read_template("citation-graph-synthesis-app.js"),
    }
    graph_assets_script = "window.__ZoteroSkillsDeepReadingCitationGraphAssets=" + safe_inline_json(graph_assets) + ";"
    html_text = (
        template.replace("{{TITLE}}", title)
        .replace("{{HTML_LANG}}", html_attr(clean_text(sections_view.get("paper", {}).get("target_language")) or "zh-CN"))
        .replace("{{BODY_CLASS}}", body_class)
        .replace("{{PAPER_TITLE}}", title)
        .replace("{{PAPER_META}}", target_language)
        .replace(
            "{{STYLE}}",
            style + "\n" + topic_timeline_style + "\n" + fallback_graph_style,
        )
        .replace("{{DATA_JSON}}", safe_inline_json(sections_view))
        .replace(
            "{{SCRIPT}}",
            graph_assets_script + "\n" + topic_timeline_script + "\n" + fallback_graph_script + "\n" + script,
        )
    )
    for key, value in build_static_shell_fragments(sections_view).items():
        html_text = html_text.replace("{{" + key + "}}", value)
    return html_text


def external_html_references(html_text: str) -> list[str]:
    checks = [
        ("external src", r"\bsrc=[\"'](?:https?://|file://)"),
        ("external srcset", r"\bsrcset=[\"'](?:https?://|file://)"),
        ("external resource href", r"<(?:link|base)\b[^>]*\bhref=[\"'](?:https?://|file://)"),
        ("file href", r"\bhref=[\"']file://"),
        ("loose asset src", r"\bsrc=[\"'](?:assets|sections)/"),
        ("loose asset href", r"\bhref=[\"'](?:assets|sections)/"),
    ]
    return [label for label, pattern in checks if re.search(pattern, html_text, flags=re.IGNORECASE)]


def persist_stage40_db(payload_path: Path, final_review: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage30_tables(conn)
        now = utc_now()
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_40_final_review_and_render", normalize_posix(payload_path), "literature-deep-reading.final-review.v0", "valid", "[]", now),
        )
        conn.execute(
            "UPDATE runs SET status = ?, updated_at = ?, diagnostics_json = ? WHERE run_id = ?",
            ("completed", now, json.dumps(diagnostics + as_list(final_review.get("quality_observations")), ensure_ascii=False), "default"),
        )
        conn.commit()
    finally:
        conn.close()


def write_invalid_stage40_submission(payload_path: Path, errors: list[str]) -> None:
    if not DB_PATH.exists():
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage30_tables(conn)
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_40_final_review_and_render", normalize_posix(payload_path), "literature-deep-reading.final-review.v0", "invalid", json.dumps(errors, ensure_ascii=False), utc_now()),
        )
        conn.commit()
    finally:
        conn.close()


def submit_final_review(payload_path: Path) -> dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError("bootstrap database is missing; run bootstrap first")
    missing_views = [
        path
        for path in [
            VIEWS_DIR / "preface-view.json",
            VIEWS_DIR / "section-insights-view.json",
            VIEWS_DIR / "concept-overlay-view.json",
            VIEWS_DIR / "references-view.json",
            VIEWS_DIR / "summary-view.json",
            VIEWS_DIR / "extensions-view.json",
            VIEWS_DIR / "translation-view.json",
        ]
        if not path.exists()
    ]
    if missing_views:
        raise FileNotFoundError("final render views are missing: " + ", ".join(normalize_posix(path) for path in missing_views))
    payload_raw = read_json(payload_path, {})
    errors = validate_final_review_payload(payload_raw)
    if errors:
        write_invalid_stage40_submission(payload_path, errors)
        raise ValueError("; ".join(errors))
    final_review = normalize_final_review(payload_raw)
    diagnostics: list[dict[str, Any]] = []
    if final_review["overall_assessment"] == "needs_revision":
        diagnostics.append({"severity": "warning", "code": "final_review_needs_revision"})
    sections_view, source_images, diagnostics_view = build_final_sections_view(final_review, diagnostics)
    html_text = render_final_html(sections_view)
    external_refs = external_html_references(html_text)
    if external_refs:
        raise ValueError("final HTML contains external or loose references: " + ", ".join(external_refs))
    RESULT_SECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    RESULT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(RESULT_SECTIONS_DIR / "sections.json", sections_view)
    write_json(RESULT_SECTIONS_DIR / "source-images.json", source_images)
    write_json(RESULT_SECTIONS_DIR / "diagnostics.json", diagnostics_view)
    FINAL_HTML_PATH.write_text(html_text, encoding="utf-8")
    manifest = {
        "schema_version": "literature-deep-reading.final-manifest.v0",
        "entrypoint": normalize_posix(FINAL_HTML_PATH),
        "final_html_available": True,
        "html_sha256": sha256_file(FINAL_HTML_PATH),
        "html_bytes": FINAL_HTML_PATH.stat().st_size,
        "generated_at": utc_now(),
        "diagnostics_count": len(diagnostics_view["diagnostics"]),
    }
    write_json(RESULT_DIR / "deep-reading-manifest.json", manifest)
    candidate = {
        "html": normalize_posix(FINAL_HTML_PATH),
        "sections": [normalize_posix(RESULT_SECTIONS_DIR / "sections.json")],
        "diagnostics": diagnostics_view["diagnostics"],
    }
    write_json(RESULT_DIR / "final-output.candidate.json", candidate)
    persist_stage40_db(payload_path, final_review, diagnostics_view["diagnostics"])
    result = {
        "kind": "literature_deep_reading_finalized",
        "status": "completed",
        "db_path": normalize_posix(DB_PATH),
        "views": {
            "sections": normalize_posix(RESULT_SECTIONS_DIR / "sections.json"),
            "source_images": normalize_posix(RESULT_SECTIONS_DIR / "source-images.json"),
            "diagnostics": normalize_posix(RESULT_SECTIONS_DIR / "diagnostics.json"),
            "manifest": normalize_posix(RESULT_DIR / "deep-reading-manifest.json"),
        },
        "diagnostics_path": normalize_posix(RESULT_SECTIONS_DIR / "diagnostics.json"),
        "final_html_available": True,
        "html_path": normalize_posix(FINAL_HTML_PATH),
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics_view["diagnostics"]],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def persist_stage10_db(context: dict[str, Any], payload_path: Path, views: dict[str, Any], diagnostics: list[dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_stage10_tables(conn)
        now = utc_now()
        conn.execute(
            "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
            ("stage_10_source_reading_context_request", normalize_posix(payload_path), "literature-deep-reading.context-request.v0", "valid", "[]", now),
        )
        conn.execute(
            "INSERT OR REPLACE INTO host_context_requests VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                "context-request-0001",
                normalize_posix(payload_path),
                json.dumps({key: context[key] for key in context if key.startswith("citation_graph_") or key == "request_citation_graph"}, ensure_ascii=False),
                json.dumps({"request_topic_context": context["request_topic_context"]}, ensure_ascii=False),
                json.dumps({"reference_digest_policy": context["reference_digest_policy"], "priority_reference_indices": context["priority_reference_indices"]}, ensure_ascii=False),
                json.dumps({"request_concept_context": context["request_concept_context"], "concept_labels": context["concept_labels"]}, ensure_ascii=False),
                now,
            ),
        )
        for export_index, name in enumerate(["reference-bindings", "reference-digests", "citation-graph-snapshot", "citation-graph-layout", "topic-context", "topic-candidate-digests-view", "concept-candidates"], start=1):
            view = views.get(name) or {}
            status_value = clean_text(view.get("status") or ("available" if view.get("source") not in ("", "none") else "missing"))
            conn.execute(
                "INSERT OR REPLACE INTO host_context_exports VALUES (?, ?, ?, ?, ?, ?)",
                (
                    f"host-export-{export_index:04d}",
                    name,
                    "context-request-0001",
                    status_value,
                    normalize_posix(VIEWS_DIR / f"{name}.json"),
                    json.dumps(view.get("diagnostics") or [], ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM reference_bindings")
        for item in as_list(views.get("reference-bindings", {}).get("items")):
            if not isinstance(item, dict):
                continue
            conn.execute(
                "INSERT OR REPLACE INTO reference_bindings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    item["reference_id"],
                    int(item["reference_index"]),
                    item.get("title") or "",
                    json.dumps(item.get("authors") or [], ensure_ascii=False),
                    item.get("year") or "",
                    json.dumps(item.get("raw") or {}, ensure_ascii=False),
                    item.get("binding_status") or "",
                    item.get("bound_paper_ref") or "",
                    item.get("zotero_item_key") or "",
                    item.get("match_confidence"),
                ),
            )
        conn.execute("DELETE FROM reference_digest_artifacts")
        for item in as_list(views.get("reference-digests", {}).get("items")):
            if not isinstance(item, dict):
                continue
            digest = item.get("digest") if isinstance(item.get("digest"), dict) else {}
            conn.execute(
                "INSERT OR REPLACE INTO reference_digest_artifacts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    item.get("reference_id") or "",
                    item.get("bound_paper_ref") or "",
                    digest.get("status") or "missing",
                    digest.get("payload_type") or "digest-markdown",
                    digest.get("payload_path") or "",
                    digest.get("markdown") or "",
                    digest.get("sha256") or "",
                    int(digest.get("bytes") or 0),
                    json.dumps(item.get("diagnostics") or {}, ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM citation_graph_nodes")
        for node in as_list(views.get("citation-graph-snapshot", {}).get("nodes")):
            if not isinstance(node, dict):
                continue
            node_id = first_text(node.get("node_id"), node.get("id"))
            if not node_id:
                continue
            conn.execute(
                "INSERT OR REPLACE INTO citation_graph_nodes VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    node_id,
                    first_text(node.get("kind"), node.get("type")),
                    first_text(node.get("title"), node.get("label")),
                    first_text(node.get("paper_ref"), node.get("paperRef")),
                    first_text(node.get("year")),
                    json.dumps(node.get("metrics") or {}, ensure_ascii=False),
                    json.dumps(node, ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM citation_graph_edges")
        for index, edge in enumerate(as_list(views.get("citation-graph-snapshot", {}).get("edges")), start=1):
            if not isinstance(edge, dict):
                continue
            edge_id = first_text(edge.get("edge_id"), edge.get("id")) or f"edge-{index:04d}"
            conn.execute(
                "INSERT OR REPLACE INTO citation_graph_edges VALUES (?, ?, ?, ?, ?)",
                (
                    edge_id,
                    first_text(edge.get("source")),
                    first_text(edge.get("target")),
                    first_text(edge.get("kind"), edge.get("type")),
                    json.dumps(edge.get("evidence") or edge, ensure_ascii=False),
                ),
            )
        conn.execute("DELETE FROM citation_graph_layout")
        layout_view = views.get("citation-graph-layout", {})
        layout_key = first_text(layout_view.get("layout_hash"), layout_view.get("status"), "layout")
        for node in as_list(layout_view.get("nodes")):
            if not isinstance(node, dict):
                continue
            node_id = first_text(node.get("node_id"), node.get("id"))
            if not node_id or node.get("x") is None or node.get("y") is None:
                continue
            conn.execute(
                "INSERT OR REPLACE INTO citation_graph_layout VALUES (?, ?, ?, ?, ?)",
                (node_id, layout_key, float(node.get("x")), float(node.get("y")), layout_view.get("source") or ""),
            )
        conn.execute(
            "UPDATE runs SET status = ?, updated_at = ?, diagnostics_json = ? WHERE run_id = ?",
            ("context_ready", now, json.dumps(diagnostics, ensure_ascii=False), "default"),
        )
        conn.commit()
    finally:
        conn.close()


def submit_context_request(payload_path: Path) -> dict[str, Any]:
    if not DB_PATH.exists():
        raise FileNotFoundError("bootstrap database is missing; run bootstrap first")
    payload = read_json(payload_path, {})
    errors = validate_context_request_payload(payload)
    if errors:
        conn = sqlite3.connect(DB_PATH)
        try:
            ensure_stage10_tables(conn)
            conn.execute(
                "INSERT OR REPLACE INTO payload_submissions VALUES (?, ?, ?, ?, ?, ?)",
                ("stage_10_source_reading_context_request", normalize_posix(payload_path), "literature-deep-reading.context-request.v0", "invalid", json.dumps(errors, ensure_ascii=False), utc_now()),
            )
            conn.commit()
        finally:
            conn.close()
        raise ValueError("; ".join(errors))
    context = normalize_context_request(payload)
    run_root = Path.cwd()
    diagnostics: list[dict[str, Any]] = []
    try:
        bridge_executable(run_root)
    except Exception as exc:  # noqa: BLE001
        diagnostics.append({"severity": "warning", "code": "host_bridge_unavailable", "message": str(exc)})
    topic_context = collect_topic_context(context, run_root, diagnostics)
    reference_bindings = build_reference_bindings(context, run_root, diagnostics)
    reference_digests = collect_reference_digests(context, run_root, digest_reference_bindings(reference_bindings), topic_context, diagnostics)
    citation_snapshot, citation_layout = collect_citation_graph(context, run_root, diagnostics)
    concepts = collect_concepts(context, run_root, diagnostics)
    concept_needs = build_concept_needs_view(context, concepts)
    topic_candidate_digests = collect_topic_candidate_digests(
        context,
        run_root,
        clean_text(topic_context.get("topic_id")),
        diagnostics,
    )
    graph_context = {
        "schema_version": "literature-deep-reading.graph-context.v0",
        "source": "citation_graph_stage_10",
        "snapshot_status": "available" if citation_snapshot.get("nodes") else "missing",
        "layout_status": citation_layout.get("status") or "missing",
        "diagnostics": [],
    }
    host_context = {
        "schema_version": "literature-deep-reading.host-context-view.v0",
        "source": "host_bridge_best_effort",
        "request": context,
        "target": infer_target_refs(source_manifest()),
        "views": {
            "reference_bindings": normalize_posix(VIEWS_DIR / "reference-bindings-view.json"),
            "reference_digests": normalize_posix(VIEWS_DIR / "reference-digests-view.json"),
            "citation_graph_snapshot": normalize_posix(VIEWS_DIR / "citation-graph-snapshot.json"),
            "citation_graph_layout": normalize_posix(VIEWS_DIR / "citation-graph-layout.json"),
            "topic_context": normalize_posix(VIEWS_DIR / "topic-context.json"),
            "topic_candidate_digests": normalize_posix(VIEWS_DIR / "topic-candidate-digests-view.json"),
            "graph_context": normalize_posix(VIEWS_DIR / "graph-context.json"),
            "concept_candidates": normalize_posix(VIEWS_DIR / "concept-candidates-view.json"),
            "concept_needs": normalize_posix(VIEWS_DIR / "concept-needs-view.json"),
        },
        "diagnostics_count": len(diagnostics),
    }
    diagnostics_view = {
        "schema_version": "literature-deep-reading.diagnostics-host-context.v0",
        "diagnostics": diagnostics,
    }
    view_map = {
        "host-context-view": host_context,
        "reference-bindings-view": reference_bindings,
        "reference-digests-view": reference_digests,
        "citation-graph-snapshot": citation_snapshot,
        "citation-graph-layout": citation_layout,
        "topic-context": topic_context,
        "topic-candidate-digests-view": topic_candidate_digests,
        "graph-context": graph_context,
        "concept-candidates-view": concepts,
        "concept-needs-view": concept_needs,
        "diagnostics-host-context": diagnostics_view,
    }
    for filename, view in view_map.items():
        write_json(VIEWS_DIR / f"{filename}.json", view)
    persist_stage10_db(
        context,
        payload_path,
        {
            "reference-bindings": reference_bindings,
            "reference-digests": reference_digests,
            "citation-graph-snapshot": citation_snapshot,
            "citation-graph-layout": citation_layout,
            "topic-context": topic_context,
            "topic-candidate-digests-view": topic_candidate_digests,
            "concept-candidates": concepts,
            "concept-needs": concept_needs,
        },
        diagnostics,
    )
    result = {
        "kind": "literature_deep_reading_context_ready",
        "status": "context_ready",
        "db_path": normalize_posix(DB_PATH),
        "views": host_context["views"],
        "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-host-context.json"),
        "final_html_available": False,
        "warnings": [str(item.get("code") or item.get("message") or item) for item in diagnostics],
        "error": None,
    }
    write_json(RESULT_PATH, result)
    return result


def status() -> dict[str, Any]:
    views = {}
    if VIEWS_DIR.exists():
        for path in sorted(VIEWS_DIR.glob("*.json")):
            views[path.stem] = normalize_posix(path)
    return {
        "ok": DB_PATH.exists(),
        "db_path": normalize_posix(DB_PATH),
        "result_path": normalize_posix(RESULT_PATH),
        "views": views,
    }


def validate_bootstrap() -> dict[str, Any]:
    required = [
        DB_PATH,
        VIEWS_DIR / "source-structure.json",
        VIEWS_DIR / "reading-blocks.json",
        VIEWS_DIR / "image-manifest.json",
        VIEWS_DIR / "source-reading-view.json",
        VIEWS_DIR / "target-artifacts-view.json",
        VIEWS_DIR / "references-seed-view.json",
        VIEWS_DIR / "host-preflight-view.json",
        VIEWS_DIR / "concept-needs-view.json",
        VIEWS_DIR / "diagnostics-bootstrap.json",
        RESULT_PATH,
    ]
    errors: list[str] = []
    for path in required:
        if not path.exists():
            errors.append(f"missing: {normalize_posix(path)}")
    for path in required:
        if path.suffix == ".json" and path.exists():
            try:
                read_json(path, {})
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
    if DB_PATH.exists():
        try:
            conn = sqlite3.connect(DB_PATH)
            try:
                tables = {
                    row[0]
                    for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                }
                for name in ["runs", "artifacts", "source_sections", "reading_blocks"]:
                    if name not in tables:
                        errors.append(f"missing table: {name}")
            finally:
                conn.close()
        except Exception as exc:  # noqa: BLE001
            errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def validate_context_request(payload_path: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    if not DB_PATH.exists():
        errors.append("missing bootstrap database")
    selected_payload = payload_path or PAYLOADS_DIR / "context-request.json"
    if not selected_payload.exists():
        errors.append(f"missing payload: {normalize_posix(selected_payload)}")
        payload: Any = {}
    else:
        try:
            payload = read_json(selected_payload, {})
        except Exception as exc:  # noqa: BLE001
            payload = {}
            errors.append(f"invalid json: {normalize_posix(selected_payload)}: {exc}")
    if selected_payload.exists():
        errors.extend(validate_context_request_payload(payload))
    required_views = [
        VIEWS_DIR / "host-context-view.json",
        VIEWS_DIR / "reference-bindings-view.json",
        VIEWS_DIR / "reference-digests-view.json",
        VIEWS_DIR / "citation-graph-snapshot.json",
        VIEWS_DIR / "citation-graph-layout.json",
        VIEWS_DIR / "topic-context.json",
        VIEWS_DIR / "topic-candidate-digests-view.json",
        VIEWS_DIR / "graph-context.json",
        VIEWS_DIR / "concept-candidates-view.json",
        VIEWS_DIR / "concept-needs-view.json",
        VIEWS_DIR / "diagnostics-host-context.json",
    ]
    if not any(errors):
        for path in required_views:
            if not path.exists():
                errors.append(f"missing: {normalize_posix(path)}")
        for path in required_views:
            if path.exists():
                try:
                    read_json(path, {})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                try:
                    tables = {
                        row[0]
                        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                    }
                    for name in ["payload_submissions", "host_context_requests", "host_context_exports", "reference_bindings", "reference_digest_artifacts", "citation_graph_layout"]:
                        if name not in tables:
                            errors.append(f"missing table: {name}")
                finally:
                    conn.close()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def validate_reading_enrichment(payload_path: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    if not DB_PATH.exists():
        errors.append("missing bootstrap database")
    selected_payload = payload_path or PAYLOADS_DIR / "reading-enrichment.json"
    if not selected_payload.exists():
        errors.append(f"missing payload: {normalize_posix(selected_payload)}")
        payload: Any = {}
    else:
        try:
            payload = read_json(selected_payload, {})
        except Exception as exc:  # noqa: BLE001
            payload = {}
            errors.append(f"invalid json: {normalize_posix(selected_payload)}: {exc}")
    if selected_payload.exists():
        errors.extend(validate_reading_enrichment_payload(payload))
    required_views = [
        VIEWS_DIR / "preface-view.json",
        VIEWS_DIR / "section-insights-view.json",
        VIEWS_DIR / "concept-overlay-view.json",
        VIEWS_DIR / "references-view.json",
        VIEWS_DIR / "summary-view.json",
        VIEWS_DIR / "extensions-view.json",
        VIEWS_DIR / "translation-batches-view.json",
        VIEWS_DIR / "diagnostics-enrichment.json",
    ]
    if not any(errors):
        for path in required_views:
            if not path.exists():
                errors.append(f"missing: {normalize_posix(path)}")
        for path in required_views:
            if path.exists():
                try:
                    read_json(path, {})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                try:
                    tables = {
                        row[0]
                        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                    }
                    for name in ["payload_submissions", "concepts", "section_insights"]:
                        if name not in tables:
                            errors.append(f"missing table: {name}")
                    stage = conn.execute(
                        "SELECT status FROM payload_submissions WHERE stage_id = ?",
                        ("stage_20_reading_enrichment",),
                    ).fetchone()
                    if not stage or stage[0] != "valid":
                        errors.append("missing valid stage_20_reading_enrichment submission")
                finally:
                    conn.close()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def validate_block_translations(payload_path: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    if not DB_PATH.exists():
        errors.append("missing bootstrap database")
    selected_payload = payload_path or PAYLOADS_DIR / "block-translations.json"
    if not selected_payload.exists():
        errors.append(f"missing payload: {normalize_posix(selected_payload)}")
        payload: Any = {}
    else:
        try:
            payload = read_json(selected_payload, {})
        except Exception as exc:  # noqa: BLE001
            payload = {}
            errors.append(f"invalid json: {normalize_posix(selected_payload)}: {exc}")
    if selected_payload.exists():
        errors.extend(validate_block_translations_payload(payload))
    required_views = [
        VIEWS_DIR / "translation-view.json",
        VIEWS_DIR / "diagnostics-translation.json",
    ]
    if not any(errors):
        for path in required_views:
            if not path.exists():
                errors.append(f"missing: {normalize_posix(path)}")
        for path in required_views:
            if path.exists():
                try:
                    read_json(path, {})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                try:
                    tables = {
                        row[0]
                        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
                    }
                    for name in ["payload_submissions", "block_translations"]:
                        if name not in tables:
                            errors.append(f"missing table: {name}")
                    stage = conn.execute(
                        "SELECT status FROM payload_submissions WHERE stage_id = ?",
                        ("stage_30_block_translation",),
                    ).fetchone()
                    if not stage or stage[0] != "valid":
                        errors.append("missing valid stage_30_block_translation submission")
                finally:
                    conn.close()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def validate_final_output(payload_path: Path | None = None) -> dict[str, Any]:
    errors: list[str] = []
    if not DB_PATH.exists():
        errors.append("missing bootstrap database")
    selected_payload = payload_path or PAYLOADS_DIR / "final-review.json"
    if not selected_payload.exists():
        errors.append(f"missing payload: {normalize_posix(selected_payload)}")
        payload: Any = {}
    else:
        try:
            payload = read_json(selected_payload, {})
        except Exception as exc:  # noqa: BLE001
            payload = {}
            errors.append(f"invalid json: {normalize_posix(selected_payload)}: {exc}")
    if selected_payload.exists():
        errors.extend(validate_final_review_payload(payload))
    required = [
        FINAL_HTML_PATH,
        RESULT_DIR / "deep-reading-manifest.json",
        RESULT_DIR / "final-output.candidate.json",
        RESULT_SECTIONS_DIR / "sections.json",
        RESULT_SECTIONS_DIR / "source-images.json",
        RESULT_SECTIONS_DIR / "diagnostics.json",
    ]
    if not any(errors):
        for path in required:
            if not path.exists():
                errors.append(f"missing: {normalize_posix(path)}")
        for path in required:
            if path.suffix == ".json" and path.exists():
                try:
                    read_json(path, {})
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"invalid json: {normalize_posix(path)}: {exc}")
        if FINAL_HTML_PATH.exists():
            html_text = FINAL_HTML_PATH.read_text(encoding="utf-8", errors="replace")
            external_refs = external_html_references(html_text)
            if external_refs:
                errors.append("final HTML contains external or loose references: " + ", ".join(external_refs))
            for marker in ["data-nav", "data-concept-rail", "data-mode=\"compare\"", "data-preface", "data-paper", "data-translation-paper", "data-summary", "data-post-reading", "data-appendix-reading", "data-citation-graph", "data-extensions", "data-digest-modal"]:
                if marker not in html_text:
                    errors.append(f"final HTML missing marker: {marker}")
        if DB_PATH.exists():
            try:
                conn = sqlite3.connect(DB_PATH)
                try:
                    stage = conn.execute(
                        "SELECT status FROM payload_submissions WHERE stage_id = ?",
                        ("stage_40_final_review_and_render",),
                    ).fetchone()
                    if not stage or stage[0] != "valid":
                        errors.append("missing valid stage_40_final_review_and_render submission")
                finally:
                    conn.close()
            except Exception as exc:  # noqa: BLE001
                errors.append(f"invalid sqlite: {exc}")
    return {"ok": not errors, "errors": errors}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Literature deep reading runtime")
    subparsers = parser.add_subparsers(dest="command", required=True)
    bootstrap_parser = subparsers.add_parser("bootstrap")
    bootstrap_parser.add_argument("--input", required=True, help="Path to runtime/input.json")
    context_parser = subparsers.add_parser("submit-context-request")
    context_parser.add_argument("--payload", required=True, help="Path to runtime/payloads/context-request.json")
    enrichment_parser = subparsers.add_parser("submit-reading-enrichment")
    enrichment_parser.add_argument("--payload", required=True, help="Path to runtime/payloads/reading-enrichment.json")
    translation_parser = subparsers.add_parser("submit-block-translations")
    translation_parser.add_argument("--payload", required=True, help="Path to runtime/payloads/block-translations.json")
    final_parser = subparsers.add_parser("submit-final-review")
    final_parser.add_argument("--payload", required=True, help="Path to runtime/payloads/final-review.json")
    subparsers.add_parser("status")
    subparsers.add_parser("validate-bootstrap")
    validate_context_parser = subparsers.add_parser("validate-context-request")
    validate_context_parser.add_argument("--payload", required=False, help="Path to runtime/payloads/context-request.json")
    validate_enrichment_parser = subparsers.add_parser("validate-reading-enrichment")
    validate_enrichment_parser.add_argument("--payload", required=False, help="Path to runtime/payloads/reading-enrichment.json")
    validate_translation_parser = subparsers.add_parser("validate-block-translations")
    validate_translation_parser.add_argument("--payload", required=False, help="Path to runtime/payloads/block-translations.json")
    validate_final_parser = subparsers.add_parser("validate-final-output")
    validate_final_parser.add_argument("--payload", required=False, help="Path to runtime/payloads/final-review.json")
    args = parser.parse_args(argv)
    try:
        if args.command == "bootstrap":
            print_json(bootstrap(Path(args.input)))
            return 0
        if args.command == "submit-context-request":
            print_json(submit_context_request(Path(args.payload)))
            return 0
        if args.command == "submit-reading-enrichment":
            print_json(submit_reading_enrichment(Path(args.payload)))
            return 0
        if args.command == "submit-block-translations":
            print_json(submit_block_translations(Path(args.payload)))
            return 0
        if args.command == "submit-final-review":
            print_json(submit_final_review(Path(args.payload)))
            return 0
        if args.command == "status":
            print_json(status())
            return 0
        if args.command == "validate-bootstrap":
            result = validate_bootstrap()
            print_json(result)
            return 0 if result["ok"] else 2
        if args.command == "validate-context-request":
            result = validate_context_request(Path(args.payload) if args.payload else None)
            print_json(result)
            return 0 if result["ok"] else 2
        if args.command == "validate-reading-enrichment":
            result = validate_reading_enrichment(Path(args.payload) if args.payload else None)
            print_json(result)
            return 0 if result["ok"] else 2
        if args.command == "validate-block-translations":
            result = validate_block_translations(Path(args.payload) if args.payload else None)
            print_json(result)
            return 0 if result["ok"] else 2
        if args.command == "validate-final-output":
            result = validate_final_output(Path(args.payload) if args.payload else None)
            print_json(result)
            return 0 if result["ok"] else 2
        raise ValueError(f"Unknown command: {args.command}")
    except Exception as exc:  # noqa: BLE001
        error = {
            "kind": "literature_deep_reading_error",
            "status": "failed",
            "db_path": normalize_posix(DB_PATH),
            "views": {},
            "diagnostics_path": normalize_posix(VIEWS_DIR / "diagnostics-bootstrap.json"),
            "final_html_available": False,
            "warnings": [],
            "error": {"message": str(exc), "type": exc.__class__.__name__},
        }
        write_json(RESULT_PATH, error)
        print_json(error)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

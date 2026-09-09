"""
Extract References section from each source paper markdown.
Saves as plain text (.txt) WITHOUT the "References" heading line.

Matches these heading forms:
  # References / ## References / ### References / # Bibliography
  References (bare line, no # prefix) / ## Reference (singular)
  ## 参考文献 / ## 参考文献： / ## 参考文献:
  \*Bibliography (PDF artifact)
If no heading found, uses last ~30% of file as fallback.
"""
import re
import json
from pathlib import Path

OUTPUT_DIR = Path("reference_samples")
SOURCE_INDEX = Path("source_papers/index.json")

# Patterns to detect the START of a reference section
# Group 1 captures optional heading level, Group 2 captures heading text
REF_HEADING_RE = re.compile(
    r'^(#{0,6})\s*(?:\\?\*)?\s*'
    r'(?:references?|bibliography|works\s+cited'
    r'|参考文献[：:]?'
    r'|引用文献[：:]?)'
    r'\s*$',
    re.IGNORECASE
)

# Stricter "looks like a reference entry" for fallback boundary detection
REF_ENTRY_SIGNALS = [
    re.compile(r'^\[\d{1,3}\]\s'),              # [1] Author...
    re.compile(r'^\d{1,3}\.\s'),                 # 1. Author...
    re.compile(r'^\d{1,3}\)\s'),                 # 1) Author...
    re.compile(r'^[A-Z][A-Za-z\'-]+,\s+[A-Z]'),  # Last, F...
    re.compile(r'^[A-Z][A-Za-z\'-]+\s+et\s+al\.', re.IGNORECASE),
]


def extract_references(content: str) -> tuple[str, int | None, str | None]:
    """Extract references text without the heading. Returns (text, line_no, heading_text)."""
    lines = content.split('\n')
    heading_line = None
    heading_text = None

    for i, line in enumerate(lines):
        stripped = line.strip()
        m = REF_HEADING_RE.match(stripped)
        if m:
            heading_line = i
            heading_text = stripped
            break

    if heading_line is not None:
        # From heading_line+1 to end
        ref_lines = lines[heading_line + 1:]
        return '\n'.join(ref_lines), heading_line + 2, heading_text

    # Fallback: scan backwards from the end looking for reference entry patterns
    # Find the first (from end) cluster of ref-like entries
    entry_lines = set()
    for i, line in enumerate(lines):
        stripped = line.strip()
        for sig in REF_ENTRY_SIGNALS:
            if sig.match(stripped):
                entry_lines.add(i)

    if entry_lines:
        # Find the earliest ref entry that has at least 2 more entries after it
        sorted_indices = sorted(entry_lines)
        for idx in sorted_indices:
            following = [j for j in sorted_indices if j > idx]
            if len(following) >= 2:
                # Check gap isn't too big (max 3 empty lines between entries)
                gaps = [following[k+1] - following[k] for k in range(min(2, len(following)-1))]
                if all(g <= 4 for g in gaps):
                    ref_lines = lines[idx:]
                    return '\n'.join(ref_lines), idx + 1, None

    # Last resort: return last 30% of file
    cutoff = max(0, len(lines) - int(len(lines) * 0.3))
    return '\n'.join(lines[cutoff:]), cutoff + 1, None


# --- Main ---
print("=== Load source index ===")
source_index = json.loads(SOURCE_INDEX.read_text(encoding="utf-8"))
ok_papers = [d for d in source_index if d["status"] == "ok"]
print(f"  Source papers: {len(ok_papers)}")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

records = []
with_heading = 0
fallback = 0

for i, paper in enumerate(ok_papers):
    path = Path(paper["source_file"])
    key = paper["parent_key"]
    title = paper["parent_title"]
    safe_name = "".join(c if c.isalnum() or c in "._- " else "_" for c in title)[:80]
    short = title[:60]

    if not path.exists():
        print(f"  [{i+1}/{len(ok_papers)}] MISSING: {short}")
        records.append({"parent_key": key, "parent_title": title, "status": "missing_file"})
        continue

    content = path.read_text(encoding="utf-8")
    ref_text, start_line, heading = extract_references(content)

    # Strip leading empty lines
    ref_text = ref_text.lstrip('\n')

    # Trim trailing empty lines
    ref_text = ref_text.rstrip('\n') + '\n'

    out_path = OUTPUT_DIR / f"{key}_{safe_name}.txt"
    out_path.write_text(ref_text, encoding="utf-8")

    status = "heading" if heading else "fallback"
    if heading:
        with_heading += 1
    else:
        fallback += 1

    record = {
        "parent_key": key,
        "parent_title": title,
        "source_file": paper["source_file"],
        "ref_file": str(out_path),
        "status": status,
        "heading": heading,
        "start_line": start_line,
        "ref_chars": len(ref_text),
        "ref_lines": ref_text.count('\n'),
    }
    records.append(record)

    flag = " FALLBACK" if not heading else ""
    print(f"  [{i+1:2d}/{len(ok_papers)}] {short[:55]:55s} L{start_line:4d} {record['ref_chars']:6d} chars {record['ref_lines']:4d} lines{flag}")

# Save index
index_path = OUTPUT_DIR / "index.json"
index_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"\n=== Done ===")
print(f"  With heading: {with_heading}")
print(f"  Fallback:     {fallback}")
print(f"  Total:        {len(records)}")
print(f"  Index:        {index_path}")

from __future__ import annotations

import argparse
import json
import sys
from typing import Any


def _fail(message: str) -> int:
    print(message, file=sys.stderr)
    return 1


def _is_string_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def validate_output_data(data: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["output must be an object"]

    for key in ("add_tags", "warnings", "error", "provenance"):
        if key not in data:
            errors.append(f"missing required key: {key}")

    add_tags = data.get("add_tags")
    if not isinstance(add_tags, list):
        errors.append("add_tags must be an array")
    else:
        seen: set[str] = set()
        for index, item in enumerate(add_tags):
            if not isinstance(item, dict):
                errors.append(f"add_tags[{index}] must be an object")
                continue
            tag = item.get("tag")
            note = item.get("note")
            facet = item.get("facet")
            if not isinstance(tag, str) or not tag.strip():
                errors.append(f"add_tags[{index}].tag must be a non-empty string")
            else:
                lowered = tag.strip().lower()
                if lowered in seen:
                    errors.append(f"duplicate add_tags tag: {tag}")
                seen.add(lowered)
            if not isinstance(note, str) or not note.strip():
                errors.append(f"add_tags[{index}].note must be a non-empty string")
            if facet is not None and not isinstance(facet, str):
                errors.append(f"add_tags[{index}].facet must be a string when present")
            extra = set(item.keys()) - {"tag", "facet", "note"}
            if extra:
                errors.append(
                    f"add_tags[{index}] has unsupported keys: {', '.join(sorted(extra))}",
                )

    if not _is_string_list(data.get("warnings")):
        errors.append("warnings must be an array of strings")

    error_value = data.get("error")
    if not isinstance(error_value, dict):
        errors.append("error must be an object")

    provenance = data.get("provenance")
    if not isinstance(provenance, dict):
        errors.append("provenance must be an object")
    else:
        generated_at = provenance.get("generated_at")
        if generated_at is not None and not isinstance(generated_at, str):
            errors.append("provenance.generated_at must be a string when present")

    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate tag-bootstrapper output JSON.")
    parser.add_argument("--output", required=True, help="Path to the output JSON.")
    args = parser.parse_args(argv)

    try:
        with open(args.output, "r", encoding="utf-8") as file:
            data = json.load(file)
    except Exception as exc:
        return _fail(f"failed to read output JSON: {exc}")

    errors = validate_output_data(data)
    if errors:
        return _fail("; ".join(errors))

    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

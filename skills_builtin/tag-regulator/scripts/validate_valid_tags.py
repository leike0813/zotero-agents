from __future__ import annotations

import argparse
import json
import sys
from typing import Any

import yaml


def _read_text(path: str) -> str:
    with open(path, "r", encoding="utf-8") as file:
        return file.read()


def _require_string_list(value: Any, *, format_name: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"{format_name} content must be a top-level list of strings")
    return value


def _parse_yaml(text: str) -> list[str]:
    return _require_string_list(yaml.safe_load(text), format_name="yaml")


def _parse_json(text: str) -> list[str]:
    return _require_string_list(json.loads(text), format_name="json")


def load_valid_tags_from_file(*, path: str, fmt: str) -> tuple[list[str], str]:
    content = _read_text(path)
    if fmt == "yaml":
        return _parse_yaml(content), "yaml"
    if fmt == "json":
        return _parse_json(content), "json"
    if fmt == "auto":
        for candidate in ("yaml", "json"):
            try:
                return load_valid_tags_from_file(path=path, fmt=candidate)
            except Exception:
                continue
        raise ValueError("auto detection failed to parse as yaml/json list of strings")
    raise ValueError(f"unsupported valid_tags_format: {fmt!r}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Validate valid_tags file for tag-regulator (yaml/json only, top-level list of strings)."
    )
    parser.add_argument("--valid-tags", required=True, help="Path to valid_tags file.")
    parser.add_argument(
        "--format",
        default="yaml",
        choices=["yaml", "json", "auto"],
        help="valid_tags file format (default: yaml).",
    )
    args = parser.parse_args(argv)

    try:
        load_valid_tags_from_file(path=args.valid_tags, fmt=args.format)
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

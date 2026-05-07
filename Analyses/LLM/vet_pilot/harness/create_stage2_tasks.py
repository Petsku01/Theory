#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import textwrap
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path


SUCCESS_CRITERIA = [
    "visible tests pass",
    "hidden tests pass",
    "tests are not modified",
    "public API preserved",
]

CATEGORY_TARGETS = {
    "edge_case": 3,
    "multi_file": 3,
    "misleading_obvious_fix": 3,
    "state_mutation": 3,
    "hidden_edge_case": 3,
    "public_api_preservation": 2,
    "regression_trap": 2,
    "dependency_or_config_behavior": 1,
}

CATEGORY_LABELS = {
    "edge_case": "edge cases",
    "multi_file": "multi-file bugs",
    "misleading_obvious_fix": "misleading obvious fixes",
    "state_mutation": "state mutation bugs",
    "hidden_edge_case": "hidden edge cases",
    "public_api_preservation": "public API preservation",
    "regression_trap": "regression traps",
    "dependency_or_config_behavior": "dependency/config behavior",
}


def tidy(text: str) -> str:
    return textwrap.dedent(text).lstrip("\n").rstrip() + "\n"


@dataclass(frozen=True)
class TaskSpec:
    task_id: str
    difficulty: str
    bug_type: str
    summary: str
    constraints: list[str]
    files: dict[str, str]
    fixed_files: dict[str, str]
    allowed_files: list[str] = field(default_factory=lambda: ["src/*.py"])
    forbidden_files: list[str] = field(default_factory=lambda: ["tests/*"])

    def task_text(self) -> str:
        lines = [f"# {self.task_id}", "", self.summary.strip(), "", "Fix the bug.", "", "Constraints:"]
        lines.extend(f"- {item}" for item in self.constraints)
        return "\n".join(lines) + "\n"

    def metadata(self) -> dict[str, object]:
        return {
            "task_id": self.task_id,
            "difficulty": self.difficulty,
            "bug_type": self.bug_type,
            "allowed_files": self.allowed_files,
            "forbidden_files": self.forbidden_files,
            "success_criteria": SUCCESS_CRITERIA,
        }


def make_single_file_task(
    task_id: str,
    difficulty: str,
    bug_type: str,
    summary: str,
    constraints: list[str],
    module_name: str,
    broken_source: str,
    fixed_source: str,
    tests_source: str,
) -> TaskSpec:
    return TaskSpec(
        task_id=task_id,
        difficulty=difficulty,
        bug_type=bug_type,
        summary=summary,
        constraints=constraints,
        files={
            f"src/{module_name}.py": tidy(broken_source),
            f"tests/test_{module_name}.py": tidy(tests_source),
        },
        fixed_files={
            f"src/{module_name}.py": tidy(fixed_source),
        },
    )


TASKS: list[TaskSpec] = [
    make_single_file_task(
        task_id="challenge_011",
        difficulty="medium",
        bug_type="edge_case",
        summary="`split_batches` should reject non-positive batch sizes. The current implementation quietly returns incorrect output for `size == 0` and negative sizes.",
        constraints=[
            "Do not modify tests.",
            "Preserve ordering for valid batch sizes.",
            "Raise `ValueError` for non-positive sizes.",
        ],
        module_name="batches",
        broken_source="""
        def split_batches(items, size):
            if size == 0:
                return [list(items)]
            return [list(items[index:index + size]) for index in range(0, len(items), size)]
        """,
        fixed_source="""
        def split_batches(items, size):
            if size <= 0:
                raise ValueError("size must be positive")
            return [list(items[index:index + size]) for index in range(0, len(items), size)]
        """,
        tests_source="""
        import pytest

        from src.batches import split_batches


        def test_split_batches_groups_items():
            assert split_batches([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]


        def test_split_batches_rejects_non_positive_sizes():
            with pytest.raises(ValueError):
                split_batches([1, 2], 0)

            with pytest.raises(ValueError):
                split_batches([1, 2], -2)
        """,
    ),
    make_single_file_task(
        task_id="challenge_012",
        difficulty="medium",
        bug_type="edge_case",
        summary="`previous_month` does not handle the January rollover correctly. It currently stays in January instead of returning December of the previous year.",
        constraints=[
            "Do not modify tests.",
            "Keep the public return shape `(year, month)` unchanged.",
            "Preserve input validation for invalid months.",
        ],
        module_name="rollover",
        broken_source="""
        def previous_month(year, month):
            if month < 1 or month > 12:
                raise ValueError("invalid month")
            return year, max(month - 1, 1)
        """,
        fixed_source="""
        def previous_month(year, month):
            if month < 1 or month > 12:
                raise ValueError("invalid month")
            if month == 1:
                return year - 1, 12
            return year, month - 1
        """,
        tests_source="""
        import pytest

        from src.rollover import previous_month


        def test_previous_month_regular_case():
            assert previous_month(2025, 8) == (2025, 7)


        def test_previous_month_handles_january_rollover():
            assert previous_month(2025, 1) == (2024, 12)


        def test_previous_month_rejects_invalid_months():
            with pytest.raises(ValueError):
                previous_month(2025, 0)
        """,
    ),
    make_single_file_task(
        task_id="challenge_013",
        difficulty="medium",
        bug_type="edge_case",
        summary="`format_port_range` should render a singleton range as a single port. The current implementation always returns `start-end`, even when both ends are the same port.",
        constraints=[
            "Do not modify tests.",
            "Keep validation for reversed ranges.",
            "Preserve the existing string format for non-singleton ranges.",
        ],
        module_name="ports",
        broken_source="""
        def format_port_range(start, end):
            if start > end:
                raise ValueError("invalid range")
            return f"{start}-{end}"
        """,
        fixed_source="""
        def format_port_range(start, end):
            if start > end:
                raise ValueError("invalid range")
            if start == end:
                return str(start)
            return f"{start}-{end}"
        """,
        tests_source="""
        import pytest

        from src.ports import format_port_range


        def test_format_port_range_renders_span():
            assert format_port_range(8000, 8010) == "8000-8010"


        def test_format_port_range_renders_singleton_without_dash():
            assert format_port_range(443, 443) == "443"


        def test_format_port_range_rejects_reversed_ranges():
            with pytest.raises(ValueError):
                format_port_range(10, 1)
        """,
    ),
    TaskSpec(
        task_id="challenge_014",
        difficulty="hard",
        bug_type="multi_file",
        summary="The timeout key rename from `timeout` to `connect_timeout` is only partially applied. The helper still returns the old key and the request builder still looks up the old key.",
        constraints=[
            "Do not modify tests.",
            "Keep the public API of `build_request_options` unchanged.",
            "Use the shared timeout key instead of duplicating string literals.",
        ],
        files={
            "src/timeout_keys.py": tidy("""
            TIMEOUT_KEY = "timeout"


            def normalize_timeout(value):
                return {TIMEOUT_KEY: int(value)}
            """),
            "src/client.py": tidy("""
            from src.timeout_keys import normalize_timeout

            DEFAULT_TIMEOUT = 30


            def build_request_options(timeout_value=None):
                options = {"connect_timeout": DEFAULT_TIMEOUT}
                if timeout_value is None:
                    return options
                parsed = normalize_timeout(timeout_value)
                options["connect_timeout"] = parsed.get("timeout", DEFAULT_TIMEOUT)
                return options
            """),
            "tests/test_timeout_migration.py": tidy("""
            from src.client import build_request_options
            from src.timeout_keys import normalize_timeout


            def test_normalize_timeout_uses_connect_timeout_key():
                assert normalize_timeout("15") == {"connect_timeout": 15}


            def test_build_request_options_uses_shared_timeout_key():
                assert build_request_options("15") == {"connect_timeout": 15}


            def test_build_request_options_preserves_default():
                assert build_request_options() == {"connect_timeout": 30}
            """),
        },
        fixed_files={
            "src/timeout_keys.py": tidy("""
            TIMEOUT_KEY = "connect_timeout"


            def normalize_timeout(value):
                return {TIMEOUT_KEY: int(value)}
            """),
            "src/client.py": tidy("""
            from src.timeout_keys import TIMEOUT_KEY, normalize_timeout

            DEFAULT_TIMEOUT = 30


            def build_request_options(timeout_value=None):
                options = {TIMEOUT_KEY: DEFAULT_TIMEOUT}
                if timeout_value is None:
                    return options
                parsed = normalize_timeout(timeout_value)
                options[TIMEOUT_KEY] = parsed.get(TIMEOUT_KEY, DEFAULT_TIMEOUT)
                return options
            """),
        },
    ),
    TaskSpec(
        task_id="challenge_015",
        difficulty="hard",
        bug_type="multi_file",
        summary="Tag normalization is inconsistent across files. `parse_tags` leaves whitespace and empty entries intact, and `normalize_tag_list` bypasses the shared parser helper entirely.",
        constraints=[
            "Do not modify tests.",
            "Keep the public function names unchanged.",
            "Use the shared parser helper instead of duplicating split logic.",
        ],
        files={
            "src/parsers.py": tidy("""
            def parse_tags(text):
                return [part for part in text.split(",")]
            """),
            "src/service.py": tidy("""
            def normalize_tag_list(text):
                return sorted({part.lower() for part in text.split(",") if part})
            """),
            "tests/test_tags.py": tidy("""
            from src.parsers import parse_tags
            from src.service import normalize_tag_list


            def test_parse_tags_strips_and_discards_empty_entries():
                assert parse_tags("alpha, beta ,, gamma ") == ["alpha", "beta", "gamma"]


            def test_normalize_tag_list_uses_shared_parser_behavior():
                assert normalize_tag_list("Alpha, beta ,, alpha ") == ["alpha", "beta"]
            """),
        },
        fixed_files={
            "src/parsers.py": tidy("""
            def parse_tags(text):
                return [part.strip() for part in text.split(",") if part.strip()]
            """),
            "src/service.py": tidy("""
            from src.parsers import parse_tags


            def normalize_tag_list(text):
                return sorted({part.lower() for part in parse_tags(text)})
            """),
        },
    ),
    TaskSpec(
        task_id="challenge_016",
        difficulty="hard",
        bug_type="multi_file",
        summary="Alias normalization is inconsistent across files. The helper keeps untrimmed targets, and the resolver rebuilds its own lookup instead of using the shared normalization path.",
        constraints=[
            "Do not modify tests.",
            "Keep the public APIs of both functions unchanged.",
            "Reuse the shared alias normalizer in the resolver.",
        ],
        files={
            "src/aliases.py": tidy("""
            def normalize_alias_pairs(pairs):
                normalized = {}
                for alias, target in pairs:
                    normalized[alias.strip().lower()] = target
                return normalized
            """),
            "src/resolver.py": tidy("""
            def resolve_alias(pairs, name):
                lookup = {alias.lower(): target for alias, target in pairs if alias}
                return lookup.get(name.lower(), name)
            """),
            "tests/test_aliases.py": tidy("""
            from src.aliases import normalize_alias_pairs
            from src.resolver import resolve_alias


            def test_normalize_alias_pairs_strips_aliases_and_targets():
                pairs = [(" Short ", " target "), ("", "ignored")]
                assert normalize_alias_pairs(pairs) == {"short": "target"}


            def test_resolve_alias_uses_normalized_pairs():
                pairs = [(" Short ", " target ")]
                assert resolve_alias(pairs, "SHORT") == "target"
                assert resolve_alias(pairs, "other") == "other"
            """),
        },
        fixed_files={
            "src/aliases.py": tidy("""
            def normalize_alias_pairs(pairs):
                normalized = {}
                for alias, target in pairs:
                    alias_text = alias.strip().lower()
                    target_text = target.strip()
                    if alias_text:
                        normalized[alias_text] = target_text
                return normalized
            """),
            "src/resolver.py": tidy("""
            from src.aliases import normalize_alias_pairs


            def resolve_alias(pairs, name):
                lookup = normalize_alias_pairs(pairs)
                return lookup.get(name.strip().lower(), name)
            """),
        },
    ),
    make_single_file_task(
        task_id="challenge_017",
        difficulty="medium",
        bug_type="misleading_obvious_fix",
        summary="`render_preview` should never exceed the requested character limit. The obvious slice-only fix is incomplete because very small limits cannot fit an ellipsis.",
        constraints=[
            "Do not modify tests.",
            "Keep the public function name unchanged.",
            "Preserve the existing validation for negative limits.",
        ],
        module_name="preview",
        broken_source="""
        def render_preview(text, limit):
            if limit < 0:
                raise ValueError("limit must be non-negative")
            if len(text) <= limit:
                return text
            return text[:limit] + "..."
        """,
        fixed_source="""
        def render_preview(text, limit):
            if limit < 0:
                raise ValueError("limit must be non-negative")
            if len(text) <= limit:
                return text
            if limit <= 3:
                return text[:limit]
            return text[: limit - 3] + "..."
        """,
        tests_source="""
        import pytest

        from src.preview import render_preview


        def test_render_preview_respects_longer_limit():
            assert render_preview("alphabet", 8) == "alphabet"


        def test_render_preview_never_exceeds_limit():
            assert render_preview("alphabet", 5) == "al..."


        def test_render_preview_handles_tiny_limits_without_ellipsis():
            assert render_preview("alphabet", 3) == "alp"


        def test_render_preview_rejects_negative_limits():
            with pytest.raises(ValueError):
                render_preview("alphabet", -1)
        """,
    ),
    make_single_file_task(
        task_id="challenge_018",
        difficulty="medium",
        bug_type="misleading_obvious_fix",
        summary="`join_url` is collapsing every double slash, which also corrupts the `http://` and `https://` scheme separator. The fix needs to normalize boundaries without rewriting the scheme.",
        constraints=[
            "Do not modify tests.",
            "Keep the public function name unchanged.",
            "Do not hardcode a specific scheme.",
        ],
        module_name="urls",
        broken_source="""
        def join_url(base, path):
            return f"{base}/{path}".replace("//", "/")
        """,
        fixed_source="""
        def join_url(base, path):
            return base.rstrip("/") + "/" + path.lstrip("/")
        """,
        tests_source="""
        from src.urls import join_url


        def test_join_url_preserves_https_scheme():
            assert join_url("https://api.example.com", "/users") == "https://api.example.com/users"


        def test_join_url_handles_existing_trailing_slash():
            assert join_url("https://api.example.com/", "users") == "https://api.example.com/users"


        def test_join_url_preserves_other_schemes():
            assert join_url("http://localhost:8080", "health") == "http://localhost:8080/health"
        """,
    ),
    make_single_file_task(
        task_id="challenge_019",
        difficulty="hard",
        bug_type="misleading_obvious_fix",
        summary="`split_csv_line` uses a naive comma split. The bug is not just whitespace trimming: quoted commas must stay inside the same field.",
        constraints=[
            "Do not modify tests.",
            "Keep the public return type unchanged.",
            "Use a standard CSV parser instead of hand-rolled splitting.",
        ],
        module_name="csvline",
        broken_source="""
        def split_csv_line(line):
            return [part.strip() for part in line.split(",")]
        """,
        fixed_source="""
        import csv


        def split_csv_line(line):
            return next(csv.reader([line]))
        """,
        tests_source="""
        from src.csvline import split_csv_line


        def test_split_csv_line_handles_plain_values():
            assert split_csv_line("alpha,beta,gamma") == ["alpha", "beta", "gamma"]


        def test_split_csv_line_keeps_quoted_commas_together():
            assert split_csv_line('alpha,"beta,gamma",delta') == ["alpha", "beta,gamma", "delta"]
        """,
    ),
    make_single_file_task(
        task_id="challenge_020",
        difficulty="medium",
        bug_type="state_mutation",
        summary="`collect_recent` mutates the caller-provided history list. It should behave like a pure helper and return the recent view without changing the original list.",
        constraints=[
            "Do not modify tests.",
            "Keep the function signature unchanged.",
            "Preserve the existing `limit <= 0` behavior.",
        ],
        module_name="recent",
        broken_source="""
        def collect_recent(history, item, limit):
            history.append(item)
            if limit <= 0:
                return []
            return history[-limit:]
        """,
        fixed_source="""
        def collect_recent(history, item, limit):
            if limit <= 0:
                return []
            updated = list(history)
            updated.append(item)
            return updated[-limit:]
        """,
        tests_source="""
        from src.recent import collect_recent


        def test_collect_recent_returns_recent_slice_without_mutating_input():
            history = ["a", "b"]
            assert collect_recent(history, "c", 2) == ["b", "c"]
            assert history == ["a", "b"]


        def test_collect_recent_preserves_limit_zero_behavior_without_mutation():
            history = ["a"]
            assert collect_recent(history, "b", 0) == []
            assert history == ["a"]
        """,
    ),
    make_single_file_task(
        task_id="challenge_021",
        difficulty="hard",
        bug_type="state_mutation",
        summary="`merge_preferences` mutates nested dictionaries from the base configuration. The merged result should be a new structure that leaves the original inputs unchanged.",
        constraints=[
            "Do not modify tests.",
            "Keep the public function name unchanged.",
            "Preserve the shallow-override behavior for non-dictionary values.",
        ],
        module_name="preferences",
        broken_source="""
        def merge_preferences(base, overrides):
            result = dict(base)
            for key, value in overrides.items():
                if isinstance(result.get(key), dict) and isinstance(value, dict):
                    result[key].update(value)
                else:
                    result[key] = value
            return result
        """,
        fixed_source="""
        def merge_preferences(base, overrides):
            result = dict(base)
            for key, value in overrides.items():
                if isinstance(result.get(key), dict) and isinstance(value, dict):
                    nested = dict(result[key])
                    nested.update(value)
                    result[key] = nested
                else:
                    result[key] = value
            return result
        """,
        tests_source="""
        from src.preferences import merge_preferences


        def test_merge_preferences_merges_nested_dictionaries():
            base = {"ui": {"theme": "light", "density": "comfortable"}, "locale": "en"}
            overrides = {"ui": {"theme": "dark"}}
            merged = merge_preferences(base, overrides)
            assert merged == {"ui": {"theme": "dark", "density": "comfortable"}, "locale": "en"}


        def test_merge_preferences_does_not_mutate_base_nested_dicts():
            base = {"ui": {"theme": "light", "density": "comfortable"}}
            merge_preferences(base, {"ui": {"theme": "dark"}})
            assert base == {"ui": {"theme": "light", "density": "comfortable"}}
        """,
    ),
    make_single_file_task(
        task_id="challenge_022",
        difficulty="hard",
        bug_type="state_mutation",
        summary="`take_ready_events` currently removes items from the input list as it collects the ready prefix. The function should return the ready events without mutating the caller's list.",
        constraints=[
            "Do not modify tests.",
            "Keep the public return type unchanged.",
            "Preserve the stop-at-first-not-ready behavior.",
        ],
        module_name="events",
        broken_source="""
        def take_ready_events(events):
            ready = []
            while events and events[0]["ready"]:
                ready.append(events.pop(0))
            return ready
        """,
        fixed_source="""
        def take_ready_events(events):
            index = 0
            while index < len(events) and events[index]["ready"]:
                index += 1
            return [dict(event) for event in events[:index]]
        """,
        tests_source="""
        from src.events import take_ready_events


        def test_take_ready_events_returns_ready_prefix():
            events = [
                {"name": "warmup", "ready": True},
                {"name": "prime", "ready": True},
                {"name": "deploy", "ready": False},
            ]
            assert take_ready_events(events) == [
                {"name": "warmup", "ready": True},
                {"name": "prime", "ready": True},
            ]


        def test_take_ready_events_does_not_mutate_input_list():
            events = [
                {"name": "warmup", "ready": True},
                {"name": "deploy", "ready": False},
            ]
            take_ready_events(events)
            assert events == [
                {"name": "warmup", "ready": True},
                {"name": "deploy", "ready": False},
            ]
        """,
    ),
    make_single_file_task(
        task_id="challenge_023",
        difficulty="medium",
        bug_type="hidden_edge_case",
        summary="`parent_domain` mishandles fully-qualified hostnames with a trailing dot. The trailing dot should not leak into the parent domain result.",
        constraints=[
            "Do not modify tests.",
            "Keep the public function name unchanged.",
            "Return an empty string when there is no parent domain.",
        ],
        module_name="domains",
        broken_source="""
        def parent_domain(hostname):
            parts = hostname.split(".")
            if len(parts) < 2:
                return ""
            return ".".join(parts[1:])
        """,
        fixed_source="""
        def parent_domain(hostname):
            normalized = hostname.rstrip(".")
            parts = normalized.split(".")
            if len(parts) < 2:
                return ""
            return ".".join(parts[1:])
        """,
        tests_source="""
        from src.domains import parent_domain


        def test_parent_domain_regular_hostname():
            assert parent_domain("api.example.com") == "example.com"


        def test_parent_domain_strips_trailing_dot():
            assert parent_domain("api.example.com.") == "example.com"


        def test_parent_domain_returns_empty_for_single_label_hosts():
            assert parent_domain("localhost") == ""
        """,
    ),
    make_single_file_task(
        task_id="challenge_024",
        difficulty="medium",
        bug_type="hidden_edge_case",
        summary="`flatten_once` should flatten lists and tuples, but it should not explode strings or bytes into character-level output.",
        constraints=[
            "Do not modify tests.",
            "Keep the function name and return type unchanged.",
            "Only flatten one level.",
        ],
        module_name="flatten",
        broken_source="""
        def flatten_once(values):
            flattened = []
            for value in values:
                if isinstance(value, (list, tuple, str, bytes)):
                    flattened.extend(value)
                else:
                    flattened.append(value)
            return flattened
        """,
        fixed_source="""
        def flatten_once(values):
            flattened = []
            for value in values:
                if isinstance(value, (list, tuple)):
                    flattened.extend(value)
                else:
                    flattened.append(value)
            return flattened
        """,
        tests_source="""
        from src.flatten import flatten_once


        def test_flatten_once_flattens_lists_and_tuples_only():
            assert flatten_once(["ab", ["cd"], ("ef",)]) == ["ab", "cd", "ef"]


        def test_flatten_once_preserves_other_values():
            assert flatten_once([1, (2, 3), 4]) == [1, 2, 3, 4]
        """,
    ),
    make_single_file_task(
        task_id="challenge_025",
        difficulty="medium",
        bug_type="hidden_edge_case",
        summary="`split_qualified_name` currently splits on the first dot. Qualified names with nested modules should split on the final dot instead.",
        constraints=[
            "Do not modify tests.",
            "Keep the `(module, name)` return shape unchanged.",
            "Return an empty module string when there is no dot.",
        ],
        module_name="qualified",
        broken_source="""
        def split_qualified_name(name):
            if "." not in name:
                return "", name
            module, item = name.split(".", 1)
            return module, item
        """,
        fixed_source="""
        def split_qualified_name(name):
            if "." not in name:
                return "", name
            module, item = name.rsplit(".", 1)
            return module, item
        """,
        tests_source="""
        from src.qualified import split_qualified_name


        def test_split_qualified_name_handles_simple_name():
            assert split_qualified_name("Item") == ("", "Item")


        def test_split_qualified_name_uses_last_dot_for_nested_modules():
            assert split_qualified_name("pkg.sub.Item") == ("pkg.sub", "Item")
        """,
    ),
    make_single_file_task(
        task_id="challenge_026",
        difficulty="medium",
        bug_type="public_api_preservation",
        summary="`build_report` treats entries without an explicit `archived` flag as archived. Missing flags should behave like active entries, and the public function signature must stay unchanged.",
        constraints=[
            "Do not modify tests.",
            "Preserve the public function name and parameter list.",
            "Keep the returned dictionary keys unchanged.",
        ],
        module_name="reporting",
        broken_source="""
        def build_report(entries, include_archived=False):
            visible = [entry for entry in entries if include_archived or entry.get("archived") is False]
            return {"count": len(visible), "items": visible}
        """,
        fixed_source="""
        def build_report(entries, include_archived=False):
            visible = [
                entry
                for entry in entries
                if include_archived or not entry.get("archived", False)
            ]
            return {"count": len(visible), "items": visible}
        """,
        tests_source="""
        import inspect

        from src.reporting import build_report


        def test_build_report_preserves_public_signature():
            signature = inspect.signature(build_report)
            assert list(signature.parameters) == ["entries", "include_archived"]
            assert signature.parameters["include_archived"].default is False


        def test_build_report_includes_entries_without_archived_flag():
            report = build_report([
                {"name": "draft"},
                {"name": "done", "archived": False},
                {"name": "old", "archived": True},
            ])
            assert report == {
                "count": 2,
                "items": [
                    {"name": "draft"},
                    {"name": "done", "archived": False},
                ],
            }
        """,
    ),
    make_single_file_task(
        task_id="challenge_027",
        difficulty="medium",
        bug_type="public_api_preservation",
        summary="`build_auth_header` should reject blank tokens after trimming and return a header without stray whitespace, while preserving the public API and default scheme.",
        constraints=[
            "Do not modify tests.",
            "Preserve the public function signature and default scheme.",
            "Reject blank tokens after normalization.",
        ],
        module_name="auth",
        broken_source="""
        def build_auth_header(token, scheme="Bearer"):
            if not token:
                raise ValueError("missing token")
            return f"{scheme} {token}"
        """,
        fixed_source="""
        def build_auth_header(token, scheme="Bearer"):
            normalized = token.strip()
            if not normalized:
                raise ValueError("missing token")
            return f"{scheme} {normalized}"
        """,
        tests_source="""
        import inspect
        import pytest

        from src.auth import build_auth_header


        def test_build_auth_header_preserves_public_signature():
            signature = inspect.signature(build_auth_header)
            assert list(signature.parameters) == ["token", "scheme"]
            assert signature.parameters["scheme"].default == "Bearer"


        def test_build_auth_header_trims_token_before_formatting():
            assert build_auth_header(" secret ") == "Bearer secret"


        def test_build_auth_header_rejects_blank_tokens_after_trimming():
            with pytest.raises(ValueError):
                build_auth_header("   ")
        """,
    ),
    make_single_file_task(
        task_id="challenge_028",
        difficulty="hard",
        bug_type="regression_trap",
        summary="`join_segments` drops the leading root marker when the first segment is empty. The fix needs to preserve absolute paths without introducing duplicate separators.",
        constraints=[
            "Do not modify tests.",
            "Keep the public function name unchanged.",
            "Do not break relative path joins.",
        ],
        module_name="pathjoin",
        broken_source="""
        def join_segments(segments):
            cleaned = [segment.strip("/") for segment in segments if segment]
            return "/".join(cleaned)
        """,
        fixed_source="""
        def join_segments(segments):
            if not segments:
                return ""
            absolute = segments[0] == ""
            cleaned = [segment.strip("/") for segment in segments if segment]
            if not cleaned:
                return "/" if absolute else ""
            joined = "/".join(cleaned)
            return f"/{joined}" if absolute else joined
        """,
        tests_source="""
        from src.pathjoin import join_segments


        def test_join_segments_preserves_relative_paths():
            assert join_segments(["api", "v1", "users"]) == "api/v1/users"


        def test_join_segments_preserves_absolute_root_marker():
            assert join_segments(["", "api", "", "v1"]) == "/api/v1"


        def test_join_segments_handles_root_only():
            assert join_segments(["", ""]) == "/"
        """,
    ),
    make_single_file_task(
        task_id="challenge_029",
        difficulty="hard",
        bug_type="regression_trap",
        summary="`collapse_blank_lines` loses the trailing newline whenever it normalizes a text block. The fix needs to preserve the previous no-extra-newline behavior for inputs that did not end with a newline.",
        constraints=[
            "Do not modify tests.",
            "Keep the public function name unchanged.",
            "Preserve the single-blank-line behavior while fixing the newline regression.",
        ],
        module_name="blanklines",
        broken_source="""
        def collapse_blank_lines(text):
            lines = text.splitlines()
            collapsed = []
            previous_blank = False
            for line in lines:
                blank = line == ""
                if blank and previous_blank:
                    continue
                collapsed.append(line)
                previous_blank = blank
            return "\\n".join(collapsed)
        """,
        fixed_source="""
        def collapse_blank_lines(text):
            lines = text.splitlines()
            collapsed = []
            previous_blank = False
            for line in lines:
                blank = line == ""
                if blank and previous_blank:
                    continue
                collapsed.append(line)
                previous_blank = blank
            result = "\\n".join(collapsed)
            if text.endswith("\\n"):
                result += "\\n"
            return result
        """,
        tests_source="""
        from src.blanklines import collapse_blank_lines


        def test_collapse_blank_lines_preserves_trailing_newline_when_present():
            assert collapse_blank_lines("a\\n\\n\\n b\\n".replace(" b", "b")) == "a\\n\\nb\\n"


        def test_collapse_blank_lines_does_not_add_newline_when_absent():
            assert collapse_blank_lines("a\\n\\n\\nb") == "a\\n\\nb"
        """,
    ),
    make_single_file_task(
        task_id="challenge_030",
        difficulty="hard",
        bug_type="dependency_or_config_behavior",
        summary="`load_endpoint` uses environment configuration even when an explicit endpoint is provided, and blank environment values still override the default path. Explicit configuration should win over environment configuration.",
        constraints=[
            "Do not modify tests.",
            "Keep the public API of `load_endpoint` unchanged.",
            "Normalize whitespace-only values before applying precedence.",
        ],
        module_name="settings",
        broken_source="""
        DEFAULT_ENDPOINT = "https://api.example.com"


        def load_endpoint(env, explicit=None):
            raw = env.get("APP_ENDPOINT", explicit or DEFAULT_ENDPOINT)
            if not raw:
                return DEFAULT_ENDPOINT
            return raw.rstrip("/")
        """,
        fixed_source="""
        DEFAULT_ENDPOINT = "https://api.example.com"


        def _normalize_endpoint(value):
            if value is None:
                return None
            normalized = value.strip()
            if not normalized:
                return None
            return normalized.rstrip("/")


        def load_endpoint(env, explicit=None):
            explicit_value = _normalize_endpoint(explicit)
            if explicit_value is not None:
                return explicit_value
            env_value = _normalize_endpoint(env.get("APP_ENDPOINT"))
            if env_value is not None:
                return env_value
            return DEFAULT_ENDPOINT
        """,
        tests_source="""
        from src.settings import DEFAULT_ENDPOINT, load_endpoint


        def test_load_endpoint_uses_environment_when_no_explicit_value_is_given():
            env = {"APP_ENDPOINT": "https://staging.example.com/"}
            assert load_endpoint(env) == "https://staging.example.com"


        def test_load_endpoint_prefers_explicit_value_over_environment():
            env = {"APP_ENDPOINT": "https://staging.example.com/"}
            assert load_endpoint(env, explicit="https://prod.example.com/") == "https://prod.example.com"


        def test_load_endpoint_ignores_blank_environment_values():
            env = {"APP_ENDPOINT": "   "}
            assert load_endpoint(env) == DEFAULT_ENDPOINT
        """,
    ),
]


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def remove_readonly(func, path, exc_info) -> None:
    os.chmod(path, stat.S_IWRITE)
    func(path)


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def validate_category_counts(specs: list[TaskSpec]) -> None:
    counts = Counter(spec.bug_type for spec in specs)
    for bug_type, expected in CATEGORY_TARGETS.items():
        actual = counts.get(bug_type, 0)
        if actual != expected:
            raise ValueError(f"Expected {expected} tasks for {bug_type}, found {actual}")


def create_task(task_dir: Path, spec: TaskSpec, force: bool) -> None:
    if task_dir.exists():
        if not force:
            raise FileExistsError(f"Task already exists: {task_dir}")
        shutil.rmtree(task_dir, onerror=remove_readonly)

    repo = task_dir / "repo"
    repo.mkdir(parents=True, exist_ok=True)

    write_text(task_dir / "task.md", spec.task_text())
    write_text(task_dir / "issue.txt", spec.task_text())
    write_text(task_dir / "metadata.json", json.dumps(spec.metadata(), indent=2) + "\n")
    write_text(repo / "pytest.ini", "[pytest]\npythonpath = .\n")

    for rel, content in spec.files.items():
        write_text(repo / rel, content)
        if rel.startswith("tests/"):
            write_text(task_dir / rel, content)

    run(["git", "init"], repo)
    run(["git", "config", "user.email", "vet@example.local"], repo)
    run(["git", "config", "user.name", "VET Harness"], repo)
    run(["git", "add", "."], repo)
    run(["git", "commit", "-m", "initial failing challenge task"], repo)

    for rel, content in spec.fixed_files.items():
        write_text(repo / rel, content)

    diff = run(["git", "diff", "--binary"], repo).stdout
    write_text(task_dir / "gold.patch", diff)
    run(["git", "reset", "--hard", "HEAD"], repo)
    run(["git", "clean", "-fd"], repo)


def write_inventory(specs: list[TaskSpec], results_root: Path) -> None:
    inventory_json = [
        {
            "task_id": spec.task_id,
            "difficulty": spec.difficulty,
            "bug_type": spec.bug_type,
            "category": CATEGORY_LABELS[spec.bug_type],
            "summary": spec.summary,
        }
        for spec in specs
    ]
    write_text(results_root / "task_inventory.json", json.dumps(inventory_json, indent=2) + "\n")

    with (results_root / "task_inventory.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["task_id", "difficulty", "bug_type", "category", "summary"])
        writer.writeheader()
        for row in inventory_json:
            writer.writerow(row)


def run_evaluate(repo_root: Path, task_dir: Path, patch_path: Path, out_path: Path) -> dict[str, object]:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        str(repo_root / "harness" / "evaluate_task.py"),
        "--task",
        str(task_dir),
        "--candidate",
        str(patch_path),
        "--out",
        str(out_path),
    ]
    subprocess.run(cmd, cwd=repo_root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return json.loads(out_path.read_text(encoding="utf-8"))


def validate_controls(specs: list[TaskSpec], repo_root: Path, tasks_root: Path, results_root: Path) -> None:
    controls_root = results_root / "controls"
    gold_root = controls_root / "gold"
    empty_root = controls_root / "empty"
    controls_root.mkdir(parents=True, exist_ok=True)

    empty_patch_path = controls_root / "empty.patch"
    write_text(empty_patch_path, "")

    rows: list[dict[str, object]] = []
    for spec in specs:
        task_dir = tasks_root / spec.task_id
        gold_result = run_evaluate(repo_root, task_dir, task_dir / "gold.patch", gold_root / f"{spec.task_id}.json")
        empty_result = run_evaluate(repo_root, task_dir, empty_patch_path, empty_root / f"{spec.task_id}.json")
        controls_passed = bool(gold_result.get("verified_solve")) and not bool(empty_result.get("verified_solve"))
        rows.append({
            "task_id": spec.task_id,
            "bug_type": spec.bug_type,
            "difficulty": spec.difficulty,
            "gold_patch_applied": gold_result.get("patch_applied"),
            "gold_verified_solve": gold_result.get("verified_solve"),
            "empty_patch_applied": empty_result.get("patch_applied"),
            "empty_verified_solve": empty_result.get("verified_solve"),
            "controls_passed": controls_passed,
        })

    with (results_root / "control_summary.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "task_id",
                "bug_type",
                "difficulty",
                "gold_patch_applied",
                "gold_verified_solve",
                "empty_patch_applied",
                "empty_verified_solve",
                "controls_passed",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    counts = Counter(spec.bug_type for spec in specs)
    all_passed = all(bool(row["controls_passed"]) for row in rows)
    lines = [
        "# Stage 2A/B Task Authoring Summary",
        "",
        "Status:",
        f"- Stage 2A: Author 20 new challenge tasks — {'PASSED' if len(specs) == 20 else 'INCOMPLETE'}",
        f"- Stage 2B: Validate gold/empty controls — {'PASSED' if all_passed else 'FAILED'}",
        "- Stage 2C: Run 240-condition expansion — NEXT",
        "- Stage 2D: Compare Agent D vs Agent B — NEXT",
        "",
        "Control expectation:",
        f"- gold patch solves: {sum(1 for row in rows if row['gold_verified_solve'])}/{len(rows)}",
        f"- empty patch fails: {sum(1 for row in rows if not row['empty_verified_solve'])}/{len(rows)}",
        "",
        "Category counts:",
    ]
    for bug_type, expected in CATEGORY_TARGETS.items():
        lines.append(f"- {CATEGORY_LABELS[bug_type]}: {counts.get(bug_type, 0)} (target {expected})")
    lines.extend([
        "",
        "Artifacts:",
        "- task inventory: `task_inventory.csv` and `task_inventory.json`",
        "- control details: `controls/gold/` and `controls/empty/`",
        "- control summary: `control_summary.csv`",
    ])
    write_text(results_root / "stage2_authoring.md", "\n".join(lines) + "\n")

    if not all_passed:
        failed = [row["task_id"] for row in rows if not row["controls_passed"]]
        raise SystemExit(f"Control validation failed for: {', '.join(failed)}")


def parse_args() -> argparse.Namespace:
    repo_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--tasks-root", type=Path, default=repo_root / "tasks" / "challenge")
    parser.add_argument("--results-root", type=Path, default=repo_root / "results" / "vet_scaling_stage2")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--skip-validate", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    tasks_root = args.tasks_root
    results_root = args.results_root
    validate_category_counts(TASKS)
    results_root.mkdir(parents=True, exist_ok=True)
    for spec in TASKS:
        create_task(tasks_root / spec.task_id, spec, force=args.force)
    write_inventory(TASKS, results_root)
    if not args.skip_validate:
        validate_controls(TASKS, repo_root, tasks_root, results_root)

    print(json.dumps({
        "created_tasks": [spec.task_id for spec in TASKS],
        "results_root": str(results_root),
        "validated": not args.skip_validate,
    }, indent=2))


if __name__ == "__main__":
    main()
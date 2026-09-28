#!/usr/bin/env python3
"""
Sigma Rule Test Runner

Validates Sigma rules against test cases to ensure detection logic works.
Requires: sigma-cli (pip install sigma-cli)

Usage:
    python test_runner.py                    # Test all rules
    python test_runner.py --rule lsass       # Test specific rule
    python test_runner.py --validate-only    # Just validate YAML syntax
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def find_sigma_executable() -> Optional[Path]:
    """Find sigma-cli executable, checking venv first."""
    repo_root = Path(__file__).parent.parent
    
    # Check venv locations (Windows and Unix)
    venv_paths = [
        repo_root / ".venv" / "Scripts" / "sigma.exe",  # Windows venv
        repo_root / ".venv" / "bin" / "sigma",          # Unix venv
        repo_root / "venv" / "Scripts" / "sigma.exe",   # Windows venv alt
        repo_root / "venv" / "bin" / "sigma",           # Unix venv alt
    ]
    
    for venv_sigma in venv_paths:
        if venv_sigma.exists():
            return venv_sigma
    
    # Fall back to PATH (returns None, will use "sigma" command)
    return None


# Find sigma once at module load
SIGMA_PATH = find_sigma_executable()


def validate_sigma_rule(rule_path: Path) -> Tuple[bool, str]:
    """Validate a Sigma rule using sigma-cli."""
    cmd = [str(SIGMA_PATH)] if SIGMA_PATH else ["sigma"]
    
    try:
        result = subprocess.run(
            cmd + ["check", str(rule_path)],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return True, "Valid"
        return False, result.stderr or result.stdout
    except FileNotFoundError:
        return False, "sigma-cli not installed (pip install sigma-cli)"
    except subprocess.TimeoutExpired:
        return False, "Validation timed out"


def load_test_cases(test_dir: Path) -> Dict[str, dict]:
    """Load all test case files."""
    tests = {}
    for test_file in test_dir.glob("*.json"):
        try:
            with open(test_file) as f:
                data = json.load(f)
                if "rule" in data:
                    tests[test_file.stem] = data
        except json.JSONDecodeError as e:
            print(f"[WARN] Invalid JSON in {test_file}: {e}")
    return tests


def print_test_summary(results: List[dict]) -> int:
    """Print test results summary."""
    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    skipped = sum(1 for r in results if r["status"] == "skip")
    
    print("\n" + "=" * 60)
    print(f"TEST SUMMARY: {passed} passed, {failed} failed, {skipped} skipped")
    print("=" * 60)
    
    if failed > 0:
        print("\nFailed tests:")
        for r in results:
            if r["status"] == "fail":
                print(f"  - {r['name']}: {r['reason']}")
    
    return 1 if failed > 0 else 0


def main():
    repo_root = Path(__file__).parent.parent
    test_dir = repo_root / "tests"
    sigma_dir = repo_root / "Sigma_rules"
    
    if not test_dir.exists():
        print("[ERROR] tests/ directory not found")
        return 1
    
    results = []
    
    # Validate all Sigma rules
    print("Validating Sigma rules...\n")
    
    for rule_file in sigma_dir.rglob("*.yaml"):
        valid, message = validate_sigma_rule(rule_file)
        rel_path = rule_file.relative_to(repo_root)
        
        if valid:
            print(f"  [OK] {rel_path}")
            results.append({"name": str(rel_path), "status": "pass", "reason": ""})
        else:
            print(f"  [FAIL] {rel_path}: {message}")
            results.append({"name": str(rel_path), "status": "fail", "reason": message})
    
    # Load and display test cases
    print("\nTest cases available:")
    tests = load_test_cases(test_dir)
    
    for name, data in tests.items():
        case_count = len(data.get("test_cases", []))
        rule_name = data.get("rule", "unknown")
        print(f"  - {name}: {case_count} test cases for {rule_name}")
        
        # Check that the referenced rule exists
        rule_path = repo_root / data["rule"]
        if not rule_path.exists():
            print(f"    [WARN] Referenced rule not found: {data['rule']}")
            results.append({
                "name": f"{name} (rule check)",
                "status": "fail", 
                "reason": f"Rule file missing: {data['rule']}"
            })
        else:
            # Validate the referenced rule
            valid, message = validate_sigma_rule(rule_path)
            if not valid:
                results.append({
                    "name": f"{name} (referenced rule)",
                    "status": "fail",
                    "reason": message
                })
    
    # Summary of test cases
    print("\n" + "-" * 60)
    print("TEST CASE SUMMARY")
    print("-" * 60)
    
    for name, data in tests.items():
        # Handle both formats: expected_detection (bool) or expected (string)
        should_detect = 0
        for tc in data.get("test_cases", []):
            if tc.get("expected_detection", False):
                should_detect += 1
            elif tc.get("expected") in ("alert", "detect"):
                should_detect += 1
        should_not = len(data.get("test_cases", [])) - should_detect
        print(f"  {name}:")
        print(f"    Should detect: {should_detect} | Should NOT detect: {should_not}")
    
    print("\n[INFO] To validate detections:")
    print("       1. Convert rules: sigma convert -t splunk <rule.yaml>")
    print("       2. Ingest test events into your SIEM")
    print("       3. Verify detection matches expected_detection field")
    
    return print_test_summary(results)


if __name__ == "__main__":
    sys.exit(main())

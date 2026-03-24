#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CASES_DIR="$INPUTS_DIR/cases"

if [ ! -d "$CASES_DIR" ]; then
  echo "Error: cases directory not found: $CASES_DIR" >&2
  exit 1
fi

found_case=0

while IFS= read -r case_file; do
  found_case=1
  "$SCRIPT_DIR/run-case.sh" "$case_file"
done < <(find "$CASES_DIR" -maxdepth 1 -type f -name '*.json' | sort)

if [ "$found_case" -eq 0 ]; then
  echo "Error: no case files found in $CASES_DIR" >&2
  exit 1
fi

echo "Generated case output directories:"
find "$OUTPUTS_ROOT_DIR" -maxdepth 1 -mindepth 1 -type d -name 'case-*' | sort

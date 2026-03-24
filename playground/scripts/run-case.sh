#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -lt 1 ]; then
  echo "Usage: ./playground/scripts/run-case.sh <case-json-file>" >&2
  exit 1
fi

INPUT_FILE="$(resolve_input_file "$1")"
CASE_ID="$(derive_case_id_from_input "$INPUT_FILE")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "$OUTPUTS_ROOT_DIR/$CASE_ID")"

ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

echo "Running case: $CASE_ID"
echo "Input: $(relative_to_root "$INPUT_FILE")"
echo "Output: $(relative_to_root "$OUTPUTS_DIR")"

"$SCRIPT_DIR/run-full-pipeline.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

echo "Completed case: $CASE_ID"
echo "Summary: $(relative_to_root "$(summary_path)")"

#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"

ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

if [ "${CODEX_COMPOSE_ONLY:-0}" = "1" ]; then
  echo "Running in compose-only mode."
else
  echo "Running in live Codex mode."
fi

echo "Input file: $(relative_to_root "$INPUT_FILE")"
echo "Output directory: $(relative_to_root "$OUTPUTS_DIR")"

echo "Running planner..."
"$SCRIPT_DIR/run-planner.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

echo "Running scenario..."
"$SCRIPT_DIR/run-scenario.sh" all "$INPUT_FILE" "$OUTPUTS_DIR"

echo "Running risk..."
"$SCRIPT_DIR/run-risk.sh" all "$INPUT_FILE" "$OUTPUTS_DIR"

echo "Running A/B reasoning..."
"$SCRIPT_DIR/run-ab-reasoning.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

echo "Running advisor..."
"$SCRIPT_DIR/run-advisor.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

echo "Running reflection..."
"$SCRIPT_DIR/run-reflection.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

write_case_summary "$OUTPUTS_DIR/input.json"

echo "Pipeline completed. Generated files:"
find "$OUTPUTS_DIR" -maxdepth 1 -type f | sort

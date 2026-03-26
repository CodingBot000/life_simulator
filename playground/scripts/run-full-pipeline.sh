#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_FILE="$(resolve_input_file "${1:-}")"
OUTPUTS_DIR="$(resolve_output_dir "$INPUT_FILE" "${2:-}")"
MODE=""
SELECTED_PATH=""

require_jq
ensure_output_dir
copy_input_snapshot "$INPUT_FILE"

if [ "${CODEX_COMPOSE_ONLY:-0}" = "1" ]; then
  echo "Running in compose-only mode."
else
  echo "Running in live Codex mode."
fi

echo "Input file: $(relative_to_root "$INPUT_FILE")"
echo "Output directory: $(relative_to_root "$OUTPUTS_DIR")"

echo "Running state loader..."
"$SCRIPT_DIR/run-state-loader.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

echo "Running router..."
"$SCRIPT_DIR/run-router.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

MODE="$(jq -r '.routing.execution_mode' "$(resolve_stage_result_file "routing")")"
SELECTED_PATH="$(jq -r '.routing.selected_path | join(" -> ")' "$(resolve_stage_result_file "routing")")"

echo "Execution mode: $MODE"
echo "Selected path: $SELECTED_PATH"

echo "Running planner..."
"$SCRIPT_DIR/run-planner.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

case "$MODE" in
  light)
    echo "Skipping scenario, risk, A/B reasoning, guardrail, and reflection for light mode."
    write_default_guardrail_result "$MODE"
    ;;
  standard)
    echo "Running scenario..."
    "$SCRIPT_DIR/run-scenario.sh" all "$INPUT_FILE" "$OUTPUTS_DIR"
    echo "Skipping risk, A/B reasoning, guardrail, and reflection for standard mode."
    write_default_guardrail_result "$MODE"
    ;;
  careful)
    echo "Running scenario..."
    "$SCRIPT_DIR/run-scenario.sh" all "$INPUT_FILE" "$OUTPUTS_DIR"
    echo "Running risk..."
    "$SCRIPT_DIR/run-risk.sh" all "$INPUT_FILE" "$OUTPUTS_DIR"
    echo "Skipping A/B reasoning, guardrail, and reflection for careful mode."
    write_default_guardrail_result "$MODE"
    ;;
  full)
    echo "Running scenario..."
    "$SCRIPT_DIR/run-scenario.sh" all "$INPUT_FILE" "$OUTPUTS_DIR"
    echo "Running risk..."
    "$SCRIPT_DIR/run-risk.sh" all "$INPUT_FILE" "$OUTPUTS_DIR"
    echo "Running A/B reasoning..."
    "$SCRIPT_DIR/run-ab-reasoning.sh" "$INPUT_FILE" "$OUTPUTS_DIR"
    echo "Running guardrail..."
    "$SCRIPT_DIR/run-guardrail.sh" "$INPUT_FILE" "$OUTPUTS_DIR"
    ;;
  *)
    echo "Error: unsupported execution mode '$MODE'." >&2
    exit 1
    ;;
esac

echo "Running advisor..."
"$SCRIPT_DIR/run-advisor.sh" "$INPUT_FILE" "$OUTPUTS_DIR"

if [ "$MODE" = "full" ]; then
  echo "Running reflection..."
  "$SCRIPT_DIR/run-reflection.sh" "$INPUT_FILE" "$OUTPUTS_DIR"
else
  echo "Writing derived reflection output for $MODE mode."
  write_default_reflection_result "$MODE"
fi

write_case_summary "$OUTPUTS_DIR/input.json"

echo "Pipeline completed. Generated files:"
find "$OUTPUTS_DIR" -maxdepth 1 -type f | sort

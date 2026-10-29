#!/usr/bin/env bash
set -uo pipefail
cd /home/c03rad0r/worktrees/pr1331-live-review
export HERMES_HOME=/home/c03rad0r/.hermes/profiles/worker-reviewer-glm
export GLM_API_KEY=dummy-local-proxy
unset HERMES_KANBAN_TASK HERMES_KANBAN_RUN_ID HERMES_KANBAN_WORKSPACE HERMES_KANBAN_CLAIM_LOCK HERMES_INTERACTIVE HERMES_EXEC_ASK
timeout 700 hermes --cli -z "$(cat evidence/pr1331-review/gate25-prompt-v1.md)" > evidence/pr1331-review/gate25-v1.log 2>&1
status=$?
printf 'exit=%s\n' "$status"
exit "$status"

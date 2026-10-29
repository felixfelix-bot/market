#!/usr/bin/env bash
set -u
cd /home/c03rad0r/worktrees/pr1380-delta-review
env -u HERMES_KANBAN_TASK -u HERMES_KANBAN_RUN_ID -u HERMES_KANBAN_WORKSPACE \
  -u HERMES_KANBAN_CLAIM_LOCK -u HERMES_INTERACTIVE -u HERMES_EXEC_ASK \
  HERMES_HOME=/home/c03rad0r/.hermes/profiles/worker-reviewer-glm \
  GLM_API_KEY=dummy-local-proxy \
  timeout 700 hermes --cli -z "$(cat artifacts/pr1380_review/gate25-prompt-v1.md)" \
  > artifacts/pr1380_review/gate25-r1.log 2>&1
printf 'exit=%s\n' "$?"

# PR #1286 dedupe+spam — HALT / ESCALATION (pass 72 dispatch)

**This is NOT another classification pass.** The classification is unchanged and
already committed. Canonical answer: `artifacts/pr1286/1286-dedupe-spam-RESULT.md`.

## Why no new pass artifact was written

Dedupe key re-verified live this dispatch (read-only), byte-identical to the
pass-21 baseline:

- draft `PR1286-REVIEW-DRAFT.md` md5 `0fc6675ab0cfab78d9b9a6d568e9ed5a`,
  sha256 `f0d60f42a864ca1169ef4d79ac942deb4d3a8354ac453edd3a515df433adccba`
  (3548 B, `/home/c03rad0r/worktrees/t_31cab538/PR1286-REVIEW-DRAFT.md`)
- PR #1286 head `2ae85b6fb05d83ae6b1da68f6c20e51ddbec8c5a`, OPEN, draft,
  MERGEABLE, `updatedAt 2026-09-10T11:11:01Z`

Input is byte-identical to pass 21, so a fresh pass cannot legitimately produce a
different result. Result re-derived independently from the tree at the SHA and
unchanged: **4 NEW-and-ACTIONABLE, 2 duplicates (#2), 1 nit**.

## The new information: why this card keeps being dispatched

Board `plebeian-pr-reviews`, card `t_be177680` ("Dedupe draft PR #1286 review
issues vs 5 known prev-issues and spam-check each") — the card this dispatch
belongs to:

- `status = blocked`, `assignee = manager`, `started_at` NULL, `worker_pid` NULL,
  `current_run_id` NULL, `consecutive_failures = 0`, `result` NULL.
- Block reason is infrastructure, not content: `fleet-offload:dq05`.
- `task_events` shows `blocked` -> `unblocked` -> **`block_loop_detected`**
  (`recurrences: 2, limit: 2`) -> `specified` -> `promoted` -> repeated
  `blocked` again.
- `task_comments` ends in a manager `BLOCKED: fleet-offload:dq05` comment every
  ~250 s (1789520865, ...521134, ...521438, ...521688, ...521920, ...522143,
  ...522403) — the same re-block cadence as the 5-min guard tick.

So the loop is a **stuck blocked card being re-dispatched**, not a content
failure. Each dispatch spawns a worker that re-derives an already-known answer
and commits another pass file; the card never leaves `blocked`, so it is
dispatched again. Passes 1-71 did the classification; the deliverable has been
complete since `RESULT.md` was committed (`285f006f`).

## Required manager action (not taken here: read-only dispatch)

1. Unblock and close `t_be177680` against the existing deliverable:
   `artifacts/pr1286/1286-dedupe-spam-RESULT.md` (+ this file for the forensics).
   Its acceptance criteria are already met.
2. Gate any further dedupe dispatch on the key changing (new draft md5 or new PR
   head). While the key is constant, dispatch cannot yield new information.
3. This card is `assignee: manager` and was never started — the offload path
   (`fleet-offload:dq05`) is what keeps failing, so the fix is on the offload
   route, not in another worker pass.

No GitHub write, no push, no kanban mutation was made by this dispatch.

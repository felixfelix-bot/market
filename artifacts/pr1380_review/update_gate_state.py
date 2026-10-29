import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

path = Path('/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json')
backup = path.with_name(path.name + '.bak-pr1380-delta-20261029')
shutil.copy2(path, backup)
with path.open() as f:
    state = json.load(f)
sibling_before = json.dumps(state['prs']['1381'], sort_keys=True)
entry = state['prs']['1380']
entry['last_reviewed_sha'] = 'a5b9f50e0651b124f44679579a50102b4d4e34e1'
entry['last_reviewed_at'] = '2026-10-29'
entry['last_checked'] = datetime.now(timezone.utc).isoformat()
entry['disposition'] = 'reviewed-open-changes-requested-docs'
entry['review_card'] = 't_f91d0f61'
entry['review_id'] = 5692663369
entry['review_url'] = 'https://github.com/PlebeianApp/market/pull/1380#pullrequestreview-5692663369'
entry['issues_raised'] = [
    '[RISK] Existing required item (reviews 5332383772/5332383971), deduplicated: docs/adr/ADR-0004-auction-settlement-descriptor.md:317 says both path-release reads run when verdicts are absent; empty verdicts leave bids pending and the winner guard throws before the second read.',
    '[RISK] Existing required item (same reviews), deduplicated: PR body old base and unit/e2e evidence must be re-anchored to a5b9f50e; no new code defect found.',
    '[INFO] Proposed bounded-read ADR amendment still needs maintainer sign-off.'
]
entry['note'] = ('Live-head delta-closure review (card pin e75ab27e stale; prior lane coverage 3a44fa6a). '
    'Published felixfelix-bot review 5692663369 at a5b9f50e (COMMENT state; body CHANGES_REQUESTED). '
    'Auditor-scoping and bounded fail-closed retry verified; new browser Failed to fetch classifier passes in CI. '
    'No new code defect. Two existing documentation Required items carried, not re-filed: ADR:317 causal sentence and stale PR-body evidence. '
    'Exact-head focused tests with --isolate: 15 pass / 0 fail; seven non-skipped checks green including e2e-grep. '
    'Gate 2.5 cold worker-reviewer-glm/glm-5.3 audit APPROVED (REAL/DEDUP/SPAM-AACR/MISSED/PUBLISHABILITY PASS); publication calibrations folded. '
    'Evidence: /home/c03rad0r/worktrees/pr1380-delta-review/REPORT.md and artifacts/pr1380_review/.')
entry['reviewer_model'] = 'glm-5.3'
assert json.dumps(state['prs']['1381'], sort_keys=True) == sibling_before
fd, tmp = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
try:
    with os.fdopen(fd, 'w') as f:
        json.dump(state, f, indent=2)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)
finally:
    if os.path.exists(tmp):
        os.unlink(tmp)
print(json.dumps({'backup': str(backup), 'entry': state['prs']['1380'], 'sibling_1381_preserved': True}, indent=2))

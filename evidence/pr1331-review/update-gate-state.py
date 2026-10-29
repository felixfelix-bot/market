#!/usr/bin/env python3
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

state_path = Path('/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json')
head = '5dfe8215940af671da280924b166205662562c4f'
review_id = '5692111632'
review_url = f'https://github.com/PlebeianApp/market/pull/1331#pullrequestreview-{review_id}'
now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
backup_path = state_path.with_name(f'{state_path.name}.bak-pr1331-{review_id}')
shutil.copy2(state_path, backup_path)

# Fresh load after backup: the manager and other workers may update sibling PRs.
with state_path.open(encoding='utf-8') as handle:
    state = json.load(handle)
pr = state['prs']['1331']
old_sha = pr.get('last_reviewed_sha')
sibling_sha = state['prs']['1332'].get('last_reviewed_sha')
pr['disposition'] = 'reviewed-open-approved-nonblocking-notes'
pr['last_checked'] = now
pr['last_reviewed_sha'] = head
pr['review_id'] = review_id
pr['review_url'] = review_url
pr['note'] = (
    'Live-head delta-closure review by our lane (felixfelix-bot) posted as PR review '
    f'{review_id} at {head} (supersedes 5374232612 at ec9f3e32 for tip coverage). '
    'All five PR-owned blobs are byte-identical between ec9f3e32 and 5dfe8215; the '
    '19-file head-to-head delta is inherited master work. Independent exact-head execution: '
    'GREEN 50/0/131 across the new guard plus three sibling guards; restoring the old e2e '
    'base filter RED 11/2; YAML parse, diff-check, scoped Prettier clean. No new issues; '
    'already-filed nonblocking parser limitations remain disclosed. Gate 2.5 cold '
    'cross-family glm-5.3 audit APPROVED, REAL/DEDUP/SPAM-AACR/MISSED/PUBLISHABILITY PASS.'
)

tmp_path = state_path.with_name(f'.{state_path.name}.tmp-{os.getpid()}')
with tmp_path.open('w', encoding='utf-8') as handle:
    json.dump(state, handle, indent=2)
    handle.write('\n')
    handle.flush()
    os.fsync(handle.fileno())
os.chmod(tmp_path, state_path.stat().st_mode)
os.replace(tmp_path, state_path)

with state_path.open(encoding='utf-8') as handle:
    verified = json.load(handle)
verified_pr = verified['prs']['1331']
assert verified_pr['last_reviewed_sha'] == head
assert verified_pr['review_id'] == review_id
assert verified_pr['review_url'] == review_url
assert verified['prs']['1332'].get('last_reviewed_sha') == sibling_sha
print(f'backup: {backup_path}')
print(f'last_reviewed_sha: {old_sha} -> {verified_pr["last_reviewed_sha"]}')
print(f'review_id: {verified_pr["review_id"]}')
print(f'review_url: {verified_pr["review_url"]}')
print(f'last_checked: {verified_pr["last_checked"]}')
print(f'sibling prs.1332 last_reviewed_sha preserved: {sibling_sha}')

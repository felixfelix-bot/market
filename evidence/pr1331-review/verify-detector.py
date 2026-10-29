#!/usr/bin/env python3
import importlib.util
import json
import time
from pathlib import Path

manager = Path('/home/c03rad0r/.hermes/profiles/manager/scripts/plebeian-pr-review-gate.py')
spec = importlib.util.spec_from_file_location('plebeian_pr_review_gate', manager)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
head = '5dfe8215940af671da280924b166205662562c4f'
reviewed = module.reviews_by_us_at(1331, head)
with Path('/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json').open(encoding='utf-8') as handle:
    state = json.load(handle)
pr_state = state['prs']['1331']
needs = module.needs_review(pr_state, head, reviewed, False, time.time(), module.REDISPATCH_MIN_S)
result = {
    'reviewed_by_us_at_live_head': reviewed,
    'stored_last_reviewed_sha': pr_state.get('last_reviewed_sha'),
    'stored_review_id': pr_state.get('review_id'),
    'needs_review': needs,
}
print(json.dumps(result, indent=2))
assert reviewed is True
assert pr_state.get('last_reviewed_sha') == head
assert pr_state.get('review_id') == '5692111632'
assert needs is False

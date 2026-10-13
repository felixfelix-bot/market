# PR #1347 — Gate 2.5 cold-audit record (dispatch 2026-10-09, duplicate re-dispatch)

Lane requested by the brief: `worker-reviewer-glm` (glm-5.3).
Lane that actually served: **`deepseek-flash`** (deepseek family) — the glm lane was DOWN and
the local flat router (127.0.0.1:9099) silently failed over.

## Lane liveness probe (this run)

```
model=glm-5.3               -> resp.model = deepseek-flash   X-Failover-Provider: deepseek   (HTTP 200)
model=tier/review-glm       -> resp.model = deepseek-flash   X-Failover-Provider: deepseek   (HTTP 200)
model=kimi-k3               -> resp.model = deepseek-flash   X-Failover-Provider: deepseek   (HTTP 200)
model=deepseek/deepseek-v4-flash -> deepseek-flash           X-Failover-Provider: deepseek   (HTTP 200)
model=glm-5.2               -> HTTP 503
model=glm-4.5-flash         -> HTTP 503
model=glm-4.5-air           -> HTTP 503
model=kimi-k2.7-code        -> HTTP 503
model=kimi-k3:cloud         -> HTTP 503
model=minimax-m3:cloud      -> HTTP 503
model=deepseek/deepseek-v4-pro -> HTTP 503
```

Exactly ONE live lane: `deepseek-flash`. No glm-family lane was reachable. So the audit below
is a **deepseek-family** audit, **not** the requested glm-5.3 audit. Recorded as a process
limitation, not hidden.

## Audit mechanics

- Prompt: `artifacts/pr1347/consultant-brief.md` (full brief) — this lane returns reasoning only
  and never finished inside 14 000 tokens on the full brief (`finish_reason: length`,
  `content: ""`, 14 000 reasoning tokens).
- A compact 12-line brief with `reasoning_effort: low` DID terminate: `finish_reason=stop`,
  4 058 completion tokens.
- Both attempts are recorded; the second produced the verdict.

## Raw verdict (verbatim)

```
Published claims are corroborated: base/head counts, 4 pass, deletion mutation fails, describe exists.
No published claim is false. No BLOCK for the specific invert⊆gate gap.
Residual NIT: exact trimmed string-subset does not prove execution; another filter, skip, conditional job, or regex/term mismatch can leave a family uncovered while invert⊆gate holds.
That is an INFO-level limitation, not a missed blocker here.
VERDICT: AUDIT-PASS-WITH-NITS
```

## Consequence

`AUDIT-PASS-WITH-NITS` — the cold audit found **no false claim and no missed BLOCK/RISK**; its one
residual NIT (the set-subset predicate proves membership, not execution) is the same class as the
published review's own INFO #1 and does not change the verdict. Nothing new to post.

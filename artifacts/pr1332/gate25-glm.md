REVIEWER: glm-5.3
provider_seen: deepseek-flash
elapsed_s: 74
usage: {"prompt_tokens": 9948, "completion_tokens": 17066, "total_tokens": 27014, "prompt_tokens_details": {"cached_tokens": 0}, "completion_tokens_details": {"reasoning_tokens": 16277}, "prompt_cache_hit_tokens": 0, "prompt_cache_miss_tokens": 9948}

REVIEWER: glm-5.3

**Audit — falsification attempt against MATERIAL only.**

**1. [BLOCK] core: verified.** The five `#p`-only sites check out exactly as cited: `orderFilter` `'#p'` :55 → `fetchEvents` :59; `messageFilter` :70 → :74; `'#p'` :138 → `subscribe` :135; :164 → :161; :188 → :185. The single authors-filtered site is :91 → :95. `authors.tsx` has `authors: [pubkey]` at :31 / fetch :37; `nip60.ts:198` carries `authors` inline. So the 8-listed / 5-`#p`-only / 3-author-scoped accounting and the proposed fix are correct, and the quoted ADR sentence at :323-324 / range :319-325 matches lines 319-325 of the addendum.
*One epistemic gap:* the excerpt proves `calculateRelaySetsFromFilter` (:2864-2866 authors-only; :2868-2894 author branch; :2895-2900 `explicitRelayUrls`; :2902-2905 pool) is author-keyed, but **UNVERIFIED**: no line shows `ndk.fetchEvents`/`ndk.subscribe` at those five call sites dispatch through it. "Not author-outbox-routed" is supported, not proven end-to-end; the safer phrasing is "the function that computes outbox relay sets keys on `filter.authors`".

**2. "17 citations" / F4.** The 17 reconciles exactly if `useNotificationMonitor.ts:59/74/95` and `:135/161/185` each count as one slash-grouped citation (17 tokens) — but the [INFO] bullet enumerates **23** line refs and includes `ndk-events.ts:20`/`:22`, which the addendum never cites (F4 cites only :55 and `orders.tsx:1001`). Imprecision, not error. `orders.tsx:1001` and `index.tsx:409` fall outside supplied excerpts → **UNVERIFIED**. F4 anchors match (:2457, :9510, :9874-9882, :12428/:12542); "0 `verif` hits" is weak evidence for "does not verify" (a bundled dist can inline a verifier) → supported, not proven.

**3. Severities: defensible.** [BLOCK] is proportionate only narrowly — the ADR labels a false premise "verified" inside a document left `Accepted`, and @maximotodev already filed the same correction at :324 (PR facts, 2026-10-06); if the sentence were merely ambiguous, [RISK] would be correct. [RISK]/[NIT] are consistent with PR facts (`68b1b7b9`, 17 behind, `baseRefOid 4bc7f8c0`); [INFO] honestly self-bounds.

**4. Overstated / missed.** "Everything else in the addendum is accurate" and "`git grep -n authors` … exactly one hit" cannot be checked here (excerpt starts at :40); F5 `:212`/`:257` and "sole importer" are **UNVERIFIED**. Nothing material is missed in the addendum; the only un-flagged candidate is the F3 line "none ships on `master`" colliding with F5's master-resident pinning (resolved as app-settings-only, so not a finding).

VERDICT: AUDIT-PASS
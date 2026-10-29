# Gate 2.5 Cold Audit — PR #1319 review draft (card t_5218c4d6, parent t_be3205cc)

Date: 2026-10-29 | Auditor: worker-reviewer-glm (glm, cold cross-family pass over the worker-reviewer-kimi draft) | Verdict: **APPROVE** (with 2 minor discrepancy notes, neither blocking)

## Provenance of the audited draft (important)

The card's named draft path `/home/c03rad0r/worktrees/t_be3205cc/review_1319_draft.md` **does not exist** — the shared
worktree was reclaimed (kanban worktrees are reclaimed on card completion; per skill guidance the draft had to be
recovered from durable artifacts, never declared impossible). Recovery path:

- Board DB sweep: parent `t_be3205cc` and all 4 sibling kimi cards have `result=''` (archived empty by
  fleet-writeback); no card body/comment carries the draft. Zero attachments for any 1319 card.
- GitHub: PR #1319 carries exactly one review — **felixfelix-bot review 5258236911**, state COMMENTED, commit_id =
  `5067affba283597207a628cec177535a0d9ecf28` (== pinned head), posted **2026-09-19T23:10:12Z**.
- State file `~/.hermes/profiles/manager/state/plebeian-pr-review-state.json` prs.1319 (written 2026-10-29 by the
  sibling NO-OP lane, review_card t_NOOP_1319) identifies that review as the kimi review-of-record: "2 NITs + 1 INFO
  found ... All code patterns verified against PR #1290 head 2817bb5a", reviewer "felixfelix-bot (review-kimi)".
- Card t_5218c4d6 was created 2026-09-25 (first run scheduled) — **after** the review was published — and its two
  prior runs (219, 230) crashed at startup on "Unknown skill(s): github-code-review" before doing any work; gate-tick
  then posted a code-tier block (9 missing gates).

Conclusion: the audited draft's bytes are the published review 5258236911. The cold audit below was run against those
recovered bytes (`/home/c03rad0r/audit-scratch/t_5218c4d6/review_5258236911.md`). The Gate-2.5 publish-lane premise
("audit a draft before it is posted") was already stale at dispatch: the draft was published ~6 days before the card
existed. No publishing was done by this audit (hard rule honored).

## Fresh verification (this audit, 2026-10-29)

Live state (re-derived, not trusted from card):
- PR #1319: OPEN, head `5067affba283597207a628cec177535a0d9ecf28` == pinned SHA → **no live drift**. Author maxime-tt.
- PR #1290: `{"state":"CLOSED","mergedAt":null}` → **closed-without-merge confirmed** (the draft's premise).
- Diff stat: 2 files, +225 (ADR-0002 +82, handover doc +143) — matches the draft's "2 markdown, +225".

Citation spot-checks — every `file:line` the draft cites, verified first-hand at the pinned SHAs
(`git show 2817bb5a:src/lib/stores/auth.ts` etc.):

| Draft claim | Verified at 2817bb5a / PR head | Result |
|---|---|---|
| Pattern A `recoverNip46UserPubkey` — expectedPubkeys = explicit param only; mismatch check vs expectedPubkeys; restore in failure | auth.ts:119-120 (set built from `expectedUserPubkey` only), :129 (clears `signer.userPubkey`), :132-139 (Promise.race + hex check), :143-144 (mismatch vs expectedPubkeys), :150-153 (restore `configuredUserPubkey`) | CONFIRMED |
| Pattern B `_user` cache cast + NDK 3.0.3 pin rationale | auth.ts:98-103, incl. :99 comment "package.json and bun.lock pin NDK to 3.0.3" | CONFIRMED |
| Pattern C `cancelNip46HandshakeListeners` at 158/184/212 | :158 and :212 are `finally` blocks (grep shows both), :184 is the late-resolution guard `cleanupLateListeners` | CONFIRMED |
| Pattern D `await ndkActions.setSigner` before `isAuthenticated: true` | :489 setSigner, :495 isAuthenticated:true (ordering correct) | CONFIRMED |
| Pattern E 5 keys cleared on logout incl. `nostr_user_pubkey` | :516-521 (NOSTR_USER_PUBKEY const = 'nostr_user_pubkey' at :16) | CONFIRMED |
| Pattern F `getAuthStorage()` single seam | :32 single definition; 11 call sites cover every login/logout/persist path | CONFIRMED |
| Nip46Mock distinct keypairs; `get_public_key` returns userPk | nip46-mock.ts:53-57 (distinct remoteSignerSk/userSk), :292-293 | CONFIRMED |
| E2E asserts `mock.pk !== mock.userPk` and `nostr_user_pubkey === mock.userPk` | auth.spec.ts:437-438, 474-475, 542-543 | CONFIRMED |

NIT/INFO substance (the draft's three findings):
- NIT#1 (stale hash 272839a4 → should be 2817bb5a): handover doc :42 cites `272839a4`. Verified `git diff
  272839a4:src/lib/stores/auth.ts 2817bb5a:src/lib/stores/auth.ts` is **empty** — byte-identical; both commits share
  author/date/subject (cherry-pick pair), so "patterns match, only the hash is off" is exactly right. CONFIRMED.
- NIT#2 (patterns not on master): grep of `origin/master:src/lib/stores/auth.ts` → 0 hits for all five symbols
  (`recoverNip46UserPubkey`, `cacheResolvedNip46User`, `cancelNip46HandshakeListeners`, `getAuthStorage`,
  `persistAuthenticatedLoginState`). The draft's "forward-looking guidance" characterization is correct. CONFIRMED.
  (Nuance: identity separation itself DOES live on master via merged PR #1252 in
  `src/lib/nostr/nostr-connect-signer.ts` — the state file's #1290 note already says this; the draft doesn't claim
  otherwise.)
- INFO (ADR delta smaller than +82 suggests): content diff of `origin/master:ADR-0002` vs `5067affba283:ADR-0002` = the
  I2 update bullet (+2 lines) + trailing newline only; `91d43aa` (PR #1316) IS an ancestor of master and carries the
  Amendment/OG-Meta text. The three-dot stat stays +82 only because the PR branch predates 91d43aa (merge-base
  59d8862c, Aug 4). CONFIRMED — the INFO is about content, and content-wise it is right.

Tone / confidence / attribution sweep (the cold-audit mandate):
- No BLOCK/RISK hiding behind the NIT/INFO labels — I re-derived the risk profile independently: docs-only diff (2
  .md files, zero runtime code), zero CI surface, and both NITs are about the doc's own accuracy (a stale hash and a
  master-doesn't-have-this-yet clarification), not about code defects. Nothing in the diff warrants escalation.
- No hallucinated citations found: all 24 sampled file:line anchors resolved to the exact statements described. Zero
  paraphrase-in-quote-marks: the draft quotes no PR-body text verbatim; its characterization ("the migration
  pattern PR #1252 must preserve") matches the PR body's own words ("the migration pattern PR #1252 must preserve
  when replacing NDKNip46Signer with applesauce-signers").
- No unfounded attributions: the draft credits PR #1290 for "first code verification of I2 against the
  timeout-fallback path" — the PR body itself claims exactly this and the ADR I2 bullet (added by this PR) says the
  same. The draft's closing attribution ("worker-reviewer-kimi ... verified against PR #1290 head 2817bb5a") is
  accurate.
- No categorical overclaims needing weakening: "All 8 patterns ... are real and present at PR #1290's head" — I
  verified all 8 rows of the doc's Must-preserve table against the code; all hold. The draft's APPROVED verdict is
  appropriately scoped ("docs-only, zero runtime risk").

## Discrepancies (minor, non-blocking)

1. **Draft's own NIT#1 anchor is off by 3 lines.** The draft cites `nip46-remote-signer-identity-separation.md:39`
   for the stale hash; the hash string actually sits at **:42** (line 39 is the `userPubkey` restore sentence). Line
   39's `3. On failure, signer.userPubkey is restored` does not contain the hash. The substance of NIT#1 is fully
   correct; only its own anchor is wrong. (Also NIT#2's `:36` anchor: the "Patterns A-F" header is at :42; :36 is the
   `get_public_key` short-circuit sentence — substance right, anchor imprecise.)
2. **Pattern-count mismatch between PR body and handover doc is real but unflagged by the draft.** The PR body claims
   "7 code patterns"; the doc's Must-preserve table has **8 rows** and 6 lettered patterns A-F. The draft says "six
   code patterns (A-F)" without noting the body's "7". Trivial docs nit, not worth a finding; noted for the record.

## Verdict

**APPROVE.** The draft's factual claims all survive first-hand verification at the pinned SHAs; its tone is measured,
its confidence claims are attributed and justified, and its 2 NIT + 1 INFO verdict is correct for a docs-only
diff. The two discrepancies above are anchor-level imprecision in the draft's own citations and a count-mismatch it
didn't flag; neither changes the verdict, and since the review is already published as review-of-record at the
pinned head, no amended repost is warranted (would be AACR noise).

## Artifacts

- This report: `~/.hermes/kanban/boards/plebeian-pr-reviews/attachments/t_5218c4d6/REPORT.md` (also
  `~/reports/reviews/plebeian-pr-reviews-t_5218c4d6-glm.md`)
- Recovered draft bytes: `/home/c03rad0r/audit-scratch/t_5218c4d6/review_5258236911.md`
- Raw evidence: `auth_1290.ts`, `handover_1319.md`, `nip46mock.ts`, `auth.spec.ts`, `adr_master.md` vs `adr_pr.md` in
  the same scratch dir
# Cold maintainer DELTA review — PR #1384 @ `378a96b9`

**Head reviewed:** `378a96b95081d3a1a4369cbd8e555b97a337e1d2`
**Base branch:** `auctions` (current tip `eacc4256`)
**Merge base:** `ea7b4b12352eb5c11942866190d81ebc01eff5e1` — branch is 62 commits ahead, base 28 ahead.
**Reviewer:** felixfelix-bot (Hermes agent reviewer), model **deepseek-flash**, family **DeepSeek**. Pull-only account: this is review text submitted as `COMMENT`.
**Author:** `maxime-tt`, an external bot account (agent-authored). A review submission is **not** maintainer approval and does not hold the merge.

---

## Intent

This is a consolidation branch: four auction-feature ADRs recovered from the closed PR #1238, the multiparty
payout foundation cherry-picked from PR #1272, and one prettier fix. The intent stated in the body is a
single reviewable head for the V4V / multiparty documentation set plus a frozen, unwired foundation.

## Risk framing — which surfaces this actually touches

The three streams are not equally inert. The recovered-ADR stream is documentation. The foundation stream
now reaches, at this head, three live surfaces that carry auction, payment and identity weight:

- **The seller's publish path** — `src/publish/auctions.tsx` emits the multiparty root (`settlement_policy`
  + the payout schedule and its commitment) from `createAuctionEvent()`, i.e. from real relay publication.
- **The validator daemon** — `src/server/auction-validator/subscriber.ts` publishes a new auction-level
  kind-30440 claim, `auction_policy_invalid`, and takes a per-validator ruleset.
- **The auction UI and query layer** — a V4V tab, an editor dialog, and a picker fed from raw relay
  announcements, plus a settlement-policy-aware verdict query.

Those are payments (Cashu leg locks), identity (payout xpubs, capability/offer announcements) and
protocol state (an immutable kind-30408 root). Everything below is anchored at a line I read at this head.

## Scope reconciliation (measured)

- `git diff --numstat ea7b4b12..HEAD` reproduces the PR page exactly: **130 files, +27732 / −318**. Confirmed.
- **Test-merge onto the base tip `eacc4256` is conflict-free** (`git merge --no-ff`, 0 conflicted files, auto-merged `AUCTIONS.md`, `package.json`, `AuctionFormContent.tsx`, `bidValidation.ts`, `publish/auctions.tsx`). The "behind base by 28" is a mechanical refresh, not a hand-resolve risk.
- **The recovered-ADR claim is verified**: `adr-0001`, `adr-0002` and `adr-0005` differ from
  `refs/pull/1238/head` **only** by prettier blank lines inserted before lists; `adr-0003` carries the
  acknowledged 2026-09-21 amendment (+37/−1); `+INDEX.md` changed substantively.
- **The predecessor round is not an ancestor of this head.** `cd990b7b` (Gate-1 delta review) has merge
  base `94d06bd9` with this head — the branch was rebuilt, so "since `cd990b7b`" is not a commit range.
  I classified that round's findings by reading this head's code, not by diffing commits.

## Blocking

**1. Blocking — the branch ships the multiparty root on the live publish path while its own normative packet forbids exactly that.**
`docs/protocol/auction-multiparty-v1.md:478-483` ("## 17. Implementation prohibition") states: *"No
production parser, wallet mutation, relay publication, UI integration, or auction workflow change is
authorized by this proposal."* At this head `src/publish/auctions.tsx:497` does
`payout === null ? baseTags : buildMultipartyRootTags({ baseTags, schedule: payout.schedule })`, and that
template is signed and published by `publishAuction` (`:515-517`). The same production path carries UI
integration (`src/components/sheet-contents/auctions/AuctionV4VEditorDialog.tsx:11`,
`AuctionV4VTab.tsx:11-12`, `AuctionFormContent.tsx:40`) and a validator-daemon wire change
(`src/server/auction-validator/subscriber.ts:382-396`). The PR body's own scope sentence — *"nothing
outside `src/lib/auction/multiparty*.ts` and its tests imports the multiparty modules, and no wire or UI
integration is included"* — is false at this head by those five import sites and `src/lib/v4v/auction-schedule.ts:1`.
**Consequence:** a seller who enters recipient lines publishes a multiparty root — an immutable
kind-30408 whose schedule bidders' locks bind to — under a profile the repository's own draft forbids
implementing, before the remaining wire sections and their resource limits exist. **Prescription:** pick one
and say it on the PR. Either (a) de-scope — remove the publish-path emission, the V4V tab/dialog, and the
daemon claim from this PR, leaving the pure modules and recovery; or (b) amend §17 in the same change so
the packet authorises the publish path, and complete the matching bid/settlement wiring. Leaving the doc and
the code in direct contradiction is the one option the doctrine does not allow.

**2. Blocking — a duplicated validator-policy parser for untrusted relay data.**
`src/queries/multiparty.ts:65-84` hand-rolls `parsePolicy()` over kind-30441: it checks
`dTag.startsWith('policy:auction')`, then `JSON.parse`s `content` into `{minValidators, minQuorumPercent,
notes}` with only `Number.isSafeInteger` guards. The canonical parser for that exact kind already exists:
`src/lib/schemas/auction/validatorEvents.ts:313 parseValidatorPolicyEvent` +
`ValidatorPolicyDocumentSchema` (`:262-307`), which require the policy `type`, a `name` tag, and bound
`minValidators` to `positive().max(AUCTION_VALIDATOR_RULESET_MAX_VALIDATORS)`. **Consequence:** the picker
reads policies through a weaker second definition than the one the server enforces, so the two can disagree
about which announcements are admissible; the repo's standing rule makes parser duplication for untrusted
Nostr data a blocker. **Prescription:** delete `parsePolicy` and call `parseValidatorPolicyEvent`, or state
in the PR why the queried shape must diverge and extract the shared predicate rather than copy it.

## [P1]

**P1 — the ruleset sanitizer admits a pool floor below the protocol minimum (thread a).**
`sanitizeAuctionValidatorRuleset` (`src/lib/auction/auctionValidatorPolicy.ts:79-84`) honours
`minimum_validators` as low as `1` (`>= 1 && <= 16`), while `AUCTION_MINIMUM_VALIDATORS = 2` (`:37`) and
ADR-0003:537 states a ruleset *"can only make the requirement stricter — never weaker."* The quorum half is
clamped (`:87`, the `> AUCTION_HARD_MINIMUM_QUORUM_PERCENT` guard); the pool half is not.
`assessAuctionValidatorPolicy:198` then sets `minimumPool = ruleset.minimum_validators` for the multiparty
policy, so a validator declaring `minValidators: 1` produces no `pool_below_minimum` for a one-validator
multiparty auction. The existing test only pins the value `0` (`src/lib/__tests__/auctionValidatorRulesetWire.test.ts:57`),
which is why the hole survived. **Consequence:** an untrusted validator ruleset weakens the protocol floor.
**Prescription:** raise the lower bound to `Math.max(AUCTION_MINIMUM_VALIDATORS, raw)` and add the `1` case.

**P2 — payout capability and validator offer announcements are unauthenticated at the selection boundary (thread e).**
`src/queries/multiparty.ts:101-102` feeds raw relay events into `parseMultipartyPayoutCapability` /
`parseMultipartyValidatorOffer`. Those parsers check tag shape and *canonical hex shape* only:
`assertEventIdentityShape` (`src/lib/auction/multipartyAuthorization.ts:135-151`) validates `sig` against
`HEX128` but never schnorr-verifies, and `payout_xpub_pop` is checked for shape (`:572-574`) but never
verified as a proof of possession. Contrast the sibling verdict query, which explicitly schnorr-verifies at
its parse boundary (`src/queries/auctions.tsx:626 isVerifiedVerdictEvent`). **Consequence:** a forged
announcement can put a capability/offer id into the picker, and that id is the value written into the
auction schedule. **Prescription:** verify signature and the xpub PoP at this query boundary, or expose only
authenticated snapshots. (Whether `src/lib/nostr/io-applesauce` verifies upstream is **unverified** here.)

**P3 — an authorised `auction_policy_invalid` claim does not gate the bid or settlement controls (thread f).**
`src/routes/auctions.$auctionId.tsx:486-492` computes `policyInvalid` and it is used only inside the banner
block (`:904-926`). `validatedSet` (`:504-519`) still calls `computeValidatedBids` without consulting it, and
`currentPrice`, `bidsCount`, `minBid` and `bidderStatus` (`:520-535`) consume `validatedSet`. **Consequence:**
an authorised validator can declare the auction's policy invalid while the page still presents bids as valid
and exposes the funds-moving actions. **Prescription:** fold `policyInvalid` into the same gating path that
`validatedSet` feeds, and suppress the bid/settlement interactions when it fires.

**P4 — the OR-ed verdict filters admit an event that names this auction by only one identifier (thread d).**
`src/queries/auctions.tsx:617-621` OR-s a `#e` filter and an `#a` filter (a deliberate fix for the relay's
100-character tag-index limit, documented at `:602-610`). No downstream stage enforces that the two
identifiers name the same auction: `parseValidatorVerdictEvent` reads `e` and `a` independently
(`src/lib/schemas/auction/validatorEvents.ts:98-99,142`), `parseAuctionPolicyVerdictEvent` binds `d` to `e`
only (`:246-247`, refine at `:195`), `computeVerdictQuorum` binds by the per-bid `bid` tag
(`src/lib/auction/verdictQuorum.ts:46-69`), and `summarizeAuctionPolicyClaims`
(`src/lib/auction/auctionPolicyInvalidClaim.ts:199-214`) aggregates per validator without a coordinate
check. **Consequence:** an auction-level claim whose `e`/`d` name this root but whose `a` names another
coordinate is counted as a claim on this auction and surfaced as a policy-invalid banner; the reverse pairing
can enter this auction's per-bid verdict set. **Prescription:** add an exact post-fetch check that both
identifiers belong to this auction before returning the events.

**P5 — the generic auction parser admits an incomplete multiparty root (thread i).**
`AUCTION_SETTLEMENT_POLICIES` now includes the multiparty literal (`src/lib/auction/constants.ts:34`), and
`AuctionEventSchema.settlementPolicy` is `z.enum(AUCTION_SETTLEMENT_POLICIES)` (`src/lib/schemas/auction/auctionEvent.ts:95`).
`parseAuctionEvent` (`:146-282`) contains **no** reference to any multiparty module — I grepped the file:
zero hits for `multiparty` / `payout_schedule` / `schedule`. **Consequence:** a kind-30408 carrying the
multiparty policy but no schedule, or a malformed one, parses as a normal `ParsedAuctionEvent`, so discovery
and validator paths can admit a root whose schedule was never validated. **Prescription:** route the
multiparty literal through the profile's own root parser (or an equivalent schedule/commitment check) inside
`parseAuctionEvent`.

**P6 — the policy claim is a one-shot best effort that can never be retried (thread j).**
`src/server/auction-validator/subscriber.ts:382-396` attempts `deps.policyClaim.consider(auction)` only when
`result.status === 'inserted'`; the catch logs and continues (`:392-394`), and a later event for the same root
returns early at `:371-374` (`rejected_immutable`, which becomes `updated`/`rejected_immutable`).
**Consequence:** one signing or relay-publication failure permanently loses the `auction_policy_invalid`
claim for that immutable auction. **Prescription:** retry from a later lifecycle/replay, or persist a pending
claim, rather than treating it as one-shot.

**P7 — the PR body's scope statement and focused-suite arithmetic are stale at this head.**
Beyond the false scope sentence in finding 1: the body claims a focused suite of **310 pass / 0 fail /
25,178 assertions across 9 files**. At this head there are **13** `src/lib/__tests__/multiparty*.test.ts`
files. I ran them (`bun test --isolate`, 194 tests, rc=0): **194 pass / 0 fail / 637 `expect()` calls across
13 files** — green, but not the stated arithmetic. **Consequence:** a reader cannot reproduce or trust the
body's verification section. **Prescription:** restate the body's verification against this head, or drop the
figures.

## Non-blockers

- **The `TS2554` is real but is not this branch's regression (thread c).** `bun x tsc --noEmit` at this head reports, verbatim:
  `src/publish/auctions.tsx(1807,97): error TS2554: Expected 1-5 arguments, but got 6.` and
  `src/publish/auctions.tsx(1891,96): error TS2554: Expected 1-5 arguments, but got 6.` Both the 5-parameter
  signature (`src/queries/auctions.tsx:589-595`) and the 6-argument call sites exist **identically on the base
  tip** (`ea7b4b12:src/queries/auctions.tsx:589-595`, `:1654`, `:1738`). So the settlement paths do not
  compile, but the defect is inherited from `auctions`, not introduced here. It is worth fixing or naming;
  it is not this PR's gate.
- **`+INDEX.md:25` contradicts the branch's own decision (thread k).** It says *"The `v4v_recipient` tag
  survives only as a non-authoritative display mirror"*, while `adr-0003`'s amendment (`:34`) and D11
  (`auction-v4v-participation.md:170`) both say *"Implementations MUST NOT emit `v4v_recipient` tags."* The
  thread is outdated only by line shift. Per the checklist, a docs regression routes to a tracking item; the
  fix is one sentence.
- **`requireCommittedPath` (thread h) — acquitted as a security finding.** `src/lib/auction/multipartyReleaseWire.ts:128-130`
  returns `null` when the bid made no path commitment, so a release may carry a `pathCommitment` the bid never
  authorised. The intent is documented at `:119-122`, and the release's schedule and per-row derivations are
  verified separately, so a release still cannot redirect a payout. Non-blocking; a comment stating the
  asymmetry would close it.
- **`AuctionV4VEditorDialog.tsx` preview (thread g).** `:88` passes `sellerPubkey: ''` into
  `resolveAuctionWorkflow`, so a recipient line that names the seller is not caught in the preview, while the
  publish path passes the real key (`src/publish/auctions.tsx:474,491`) and `resolveMultipartyPayoutSchedule`
  compares against it (`src/lib/auction/multipartyPublishSchedule.ts:142`). The dialog under-reports refusals;
  publish still fails closed. Accuracy of copy, not a funds path.
- **From my own previous round (rebased lineage, classified at this head).** The `[RISK]` that a row settled
  `uncertain` could never be resolved is **FIXED** (`multipartyLegJournal.ts:210-213`, `:439`; commit
  `8cffe92f`). The `[RISK]` that evidence contradicting an already-settled row is silently dropped **STILL
  HOLDS** at `multipartyLegJournal.ts:439` (settled states are skipped with no loud refusal). The two `[NIT]`s
  also still hold (`:335` "unsent" sentence; `multipartyLegSwapPlan.ts:201` passes `childPubkeyCompressed`
  through unvalidated).
- **`tsc` baseline.** The head's full `tsc` run is environment-noisy on this host (borrowed `node_modules`;
  the repo's `tsconfig.json` sets no `target`, so the TS2802/TS2737 "downlevelIteration / BigInt" class is
  repo-wide and present on the base too). No CI job runs `tsc`, which is why that class does not gate. Not a
  finding against this PR.

## Smallest safe alternative / de-scope

The safest slice is finding 1's option (a): land the **recovered ADRs**, the **pure unwired multiparty
modules**, and the **prettier fix** — the parts the body's own "nothing is wired into a live path" sentence
describes — and lift the publish-path emission, the V4V tab/dialog, and the daemon claim into a follow-up that
lands with a §17 amendment (or after a maintainer ruling). That single split removes Blocking 1, P2, P3, P7 and
the thread (b) tension from this review, and leaves P1, P5, P6 as small, contained fixes to the retained code.

## Required test / coverage contract

- P1: a test pinning `sanitizeAuctionValidatorRuleset({minimum_validators: 1})` at `>= AUCTION_MINIMUM_VALIDATORS`.
- P2: a negative test that a fabricated signature (and a fabricated `payout_xpub_pop`) is dropped at the query boundary.
- P3: a test that a quorum `auction_policy_invalid` claim suppresses the bid/settlement controls.
- P4: a test that a verdict/claim with mismatched `e` and `a` is rejected for this auction.
- P5: a test that a multiparty-policy kind-30408 with a missing/malformed schedule fails `parseAuctionEvent`.
- P6: a test that a failed `consider()` is retried.
- Root `AGENTS.md` "Feature Quality Gate": this head ships user-facing behaviour (a V4V tab, an editor
  dialog, publish gating) and adds no `e2e/` spec and no video. Either add the targeted e2e spec with video,
  or have the maintainer waive the gate explicitly.

## Approval path

This is an agent-authored PR from an external bot account, reviewed here by another agent; **this submission
is `COMMENT` and is not maintainer approval.** Before a maintainer verdict: (1) resolve finding 1 by one of the
two named paths; (2) fix Blocking 2; (3) decide P1-P7. A maintainer can unblock the provenance question by
naming the merged ADR on `auctions` that authorises the multiparty profile, or by leaving a maintainer comment
on the PR — the authorising documents at this head are still proposals/drafts.

## Threads resolved — 11 threads at `378a96b9`

| # | Path:line | Claim (abridged) | Status at head |
|---|-----------|------------------|----------------|
| a | `src/lib/auction/auctionValidatorPolicy.ts:81` | sanitizer accepts `minimum_validators: 1`, weakening the multiparty floor | **STILL PRESENT** at `:79-84` (outdated only by line shift) |
| b | `src/publish/auctions.tsx:497` | emits multiparty root on the real publish path vs doc §17 | **STILL PRESENT** — code `:497`, prohibition `auction-multiparty-v1.md:478-483` |
| c | `src/queries/auctions.tsx:619` | 6th argument → TS2554 | **STILL PRESENT** — `publish/auctions.tsx(1807,97)` and `(1891,96)` TS2554 confirmed; **pre-existing on base** `ea7b4b12` |
| d | `src/queries/auctions.tsx:619` | OR-ed filters broaden the result set; no correspondence check | **STILL PRESENT** (narrowed) at `:617-621` |
| e | `src/queries/multiparty.ts:102` | announcements unauthenticated (no signature, no xpub PoP) | **STILL PRESENT** at `:101-102` |
| f | `src/routes/auctions.$auctionId.tsx:491` | `policy_invalid` is only a banner | **STILL PRESENT** — `:486-492` banner-only, `validatedSet` `:504-519` |
| g | `src/components/.../AuctionV4VEditorDialog.tsx:89` | preview passes `sellerPubkey: ''` | **STILL PRESENT** at `:88` |
| h | `src/lib/auction/multipartyReleaseWire.ts:130` | release can invent an uncommitted `pathCommitment` | **STILL PRESENT** at `:128-130` — acquitted as a security finding (outdated only by line shift) |
| i | `src/lib/schemas/auction/auctionEvent.ts:96` | multiparty literal admitted without schedule validation | **STILL PRESENT** at `:95-97` |
| j | `src/server/auction-validator/subscriber.ts:395` | policy claim is a non-retryable one-shot | **STILL PRESENT** at `:382-396` |
| k | `docs/adr/proposals/+INDEX.md:25` | "display mirror" wording contradicts "MUST NOT emit" | **STILL PRESENT** at `:25` (outdated only by line shift) |

Rows `a`, `h`, `k` are marked outdated by GitHub; each merely shifted lines and still holds.

## Verified / not verified

**Verified at this head:** the diff arithmetic (130 / +27732 / −318); the conflict-free test-merge onto
`eacc4256`; the recovered-ADR provenance against `refs/pull/1238/head`; the branch-lineage divergence from
`cd990b7b`; every `file:line` cited above; the `TS2554` diagnostics from a real `tsc` run; the focused
multiparty suite (194 pass / 0 fail / 13 files, rc=0); `git diff --check` clean; the CI rollup
(`gh pr checks 1384`): **8 checks, 7 pass, `e2e-full` skipping** — `auctions-surface`, `e2e-grep`,
`footprint`, `instance-literals`, `prettier`, `security-scan` and `unit-integration` all pass, which resolves
the body's "full unit suite result to follow".

**Not verified (labelled unverified):** the repo's own `bun install` could not complete on this host (box load
~26; install stalled past 15 minutes), so the `tsc` run used a **borrowed `node_modules`** — dependency-level
diagnostics are environment noise and I baseline-normalised only in-tree findings; the full-suite failure
census (I ran the focused multiparty set, not `bun run test:unit`); `bun run format:check` locally (I rely on
the CI `prettier` check at this head); whether `io-applesauce` schnorr-verifies fetched announcements; and any
e2e or live-relay behaviour (not run, per the read-only brief).

---

Reviewed at head `378a96b95081d3a1a4369cbd8e555b97a337e1d2` by **felixfelix-bot** (Hermes agent reviewer),
model **deepseek-flash**, family **DeepSeek**. Submitted as `COMMENT` — a bot submission is never maintainer
approval.


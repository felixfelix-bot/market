# Gate 2.5 — cold adversarial audit of a DRAFT PR review

You are auditing a *draft review comment* before it is published to a PR. You have no tools:
every fact you may use is in the MATERIAL below. Do not invent file contents or line numbers.
Label anything you cannot check from the material as UNVERIFIED.

## Subject

Repo: PlebeianApp/market. PR #1332, head SHA
`ed2fc50d457494eebb5adfc2659451ea403c7a5a`, base `4bc7f8c0c73ae4ba2ff2a78f0c66d28347d1c1ce`.
Docs-only: one ADR file, +83/−0. The PR appends a descriptive "Wave 1 addendum" to
`docs/adr/ADR-0002-nostr-io-migration-ndk-to-applesauce.md`. It claims to record behaviour
`master` already has, records no new decision, and leaves `## Status` = `Accepted`.

## Your task

Falsify the DRAFT REVIEW in the MATERIAL (section "DRAFT REVIEW"). In particular:

1. Is the [BLOCK] finding correct — i.e. are the five `#p`-only sites in
   `src/hooks/useNotificationMonitor.ts` genuinely NOT author-outbox-routed, and is the NDK
   3.0.3 `calculateRelaySetsFromFilter` excerpt evidence for that? Or is the draft's claim
   over-reached / wrong?
2. Are the draft's "17 citations resolve" and "F4 correction is accurate" claims consistent
   with the code excerpts supplied?
3. Is the severity labelling ([BLOCK]/[RISK]/[NIT]/[INFO]) defensible for a docs-only PR whose
   addendum explicitly records no decision?
4. What, if anything, does the draft review MISS or OVERSTATE? Name it.

## Output contract

Start with a line exactly `REVIEWER: <model>`. Then a short audit. End with exactly one line,
on its own, either:

    VERDICT: AUDIT-PASS

(meaning: the draft's findings are sound and its severities defensible, publish as-is)
or

    VERDICT: AUDIT-FAIL

(meaning: the draft contains an error, over-reach, or misseverity — and you must name which
one and give the corrected sentence). Be terse. Prefer 3 verified points over 20 speculative.

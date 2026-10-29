import json, os, shutil, datetime

p = "/home/c03rad0r/.hermes/profiles/manager/state/plebeian-pr-review-state.json"
b = p + ".bak-pr399-20261029"
shutil.copyfile(p, b)
d = json.load(open(p))

review_id_num = None
d["prs"]["399"] = {
    "disposition": "open-changes-requested-blocked-findings",
    "last_checked": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "last_reviewed_at": "2026-10-29",
    "last_reviewed_sha": "f0bf563f80fa126da83226b6181716f0c68a1b32",
    "review_card": None,
    "review_id": "PRR_kwDOOFRvT88AAAABU4hvow",
    "review_url": "https://github.com/PlebeianApp/market/pull/399#pullrequestreview-" + "PRR_kwDOOFRvT88AAAABU4hvow".replace("PRR_kwDOOFRvT88", ""),
    "reviewer": "felixfelix-bot (review-glm, glm-5.3); gate-2.5 fresh-context delegate audit (disclosed same-family)",
    "reviewer_model": "glm-5.3",
    "issues_raised": [
        "[BLOCK] src/components/sheet-contents/products/tabs.tsx:97-105 — handleBitcoinPriceChange's new sats->fiat store sync writes fiatPrice:'0.00' when exchange rates are unavailable (convertSatsToCurrency returns 0 at :48/:51-52); fiat-mode publish prefers it via string-truthiness (src/lib/stores/product.ts:391 `finalPrice = state.fiatPrice || state.price`) and nothing downstream rejects it (src/publish/products.tsx:117-118/:169-170 non-empty+numeric only; ProductFormContent.tsx:47-53 publish gating has no price check) — product publishes as free. Introduced by this diff (base wrote only price to the store). Merged takeover #1231 added the hasExchangeRates guard for this exact hole (commit 480410ec).",
        "[RISK] src/components/sheet-contents/products/tabs.tsx:204-212 — load effect gates only on exchangeRates truthiness; empty/partial rates map passes, convertCurrencyToSats returns 0 (tabs.tsx:61) and stores price:'0'. Gate is !price (:205) so a landed '0' is truthy forever and the effect never repairs it when rates arrive. Master's successor: Object.keys().length>0 gate + deriveSatsPriceFromFiat (src/lib/utils/productPriceResolution.ts) which treats '0'-next-to-positive-fiat as unresolved and repairs.",
        "[INFO] src/lib/stores/product.ts:391 — `state.fiatPrice || state.price` string-truthiness fallback is the BLOCK enabler; successor's resolvePublishPrice (productPriceResolution.ts:119-137) fails closed instead.",
        "[INFO] Superseded: cherry-picked takeover #1231 MERGED 2026-08-18 (8841cc8d, on master) carrying BenGWeeks c8b4d646+7915135a plus hardenings 480410ec (rates guard) and 2b51b504 (fail-closed publish); issue #379 closed; maxime-tt 2026-08-16 directed closure in favor of #1231. Recommendation: close as superseded — a rebase would re-apply only Ben's two commits and drop both hardenings, reintroducing the BLOCK into master's lineage.",
    ],
    "note": "First formal review verdict on #399 (prior felixfelix-bot entries were 4x COMMENTED analysis, 2026-07-21, no APPROVED/CHANGES_REQUESTED; copilot+author comments only otherwise). Published as felixfelix-bot CHANGES_REQUESTED review PRR_kwDOOFRvT88AAAABU4hvow (2026-10-29T10:43:36Z, commit_id == head f0bf563f80fa) citing the head SHA. PR OPEN, mergeable CONFLICTING, branch unchanged since 2026-02-03. Root-cause fix in the diff is correct (product.ts:228 price guard; tabs.tsx:203-212 load derivation) — the BLOCK is the unguarded sats->fiat store sync the same change adds. Gate 2.5: assigned reviewer worker-reviewer-ds profile absent on node (profiles hold glm/kimi/qwen only), discharged as independent fresh-context delegate cold audit of the draft (same-family, disclosed; no cross-family token claimed); AUDIT_VERDICT: APPROVE_DRAFT_W_AMENDMENTS, all 10 claims CONFIRMED, amendments applied before posting (full file paths; sticky-'0' aggravation folded into RISK). Evidence: /home/c03rad0r/repos/market/artifacts/pr399_review/ (fork branch review/pr399-glm-20261029).",
}

json.dump(d, open(p, "w"), indent=2)
print("backup:", b)
print("prs['399'] written; keys now:", len(d["prs"]))
e = json.load(open(p))
assert e["prs"]["399"]["last_reviewed_sha"] == "f0bf563f80fa126da83226b6181716f0c68a1b32"
print("verify: last_reviewed_sha =", e["prs"]["399"]["last_reviewed_sha"])
print("verify: disposition =", e["prs"]["399"]["disposition"])
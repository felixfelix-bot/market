Review of PR #459 at head `db60d4d7ec896944e79ed2734f42b7ec670a156e` — CHANGES REQUESTED.

Two correctness bugs block this. One of them the head commit claims to fix and doesn't.

## [BLOCK] `src/routes/products.$productId.tsx:390` — hook called after conditional early returns

`useDocumentMeta(...)` at :390 is called *after* three conditional `return`s (:258 loading spinner, :267 error, :289 not-found). Every hook above it runs on every render; this one runs only when `product` is truthy. Direct-link a product page — the exact scenario this feature targets — and you get:

- render 1: no product yet → early return at :258 → 18 hooks consumed (useCart :153, useStore :154/:156, useNavigate :155, useQueryClient :157, useEffect :160, useQuery :164/:200, useBreakpoint :206, useState :209-:212, useConfigQuery :215, useEntityPermissions :219, useBlacklistSettings :222, useFeaturedProducts :223, useHeroBackground :255)
- render 2: product resolves → early return skipped → `useDocumentMeta` is the 19th hook

That's React's "Rendered more hooks than during the previous render" invariant violation, and depending on the transition it can also run the meta effect's `document.title` write into the loading state. The fix isn't subtle: move the hook call above the early returns, exactly as the merged re-implementation of this same feature (#1232) already does — master's `products.$productId.tsx:504-521` computes the config before the gates with the comment "Must be computed before useHeroBackground/useDocumentMeta ... for React hook-order stability". This PR predates that fix and re-introduces the bug on top of a master that already has it solved.

## [BLOCK] `src/routes/products.$productId.tsx:231,396` — head commit's fix is dead code

Head commit `db60d4d7` is titled "fix: handle undefined price/currency in Twitter description" and adds the guard `price !== undefined && currency ? ... : description` (:117). But the guard can never be false:

- `:231` — `const price = priceTag ? parseFloat(priceTag[1]) : 0` — price is `number`, never `undefined`
- `:396` — `currency: priceTag?.[2] || 'SATS'` — currency is always a non-empty string

So an unpriced product still emits `product:price:amount` = "0" (via `:108-109`, guarded by the same never-false `price !== undefined && currency` at :107), `product:price:currency` = "SATS", and a twitter:description reading "... - 0 SATS". A product with no price tag advertises itself as costing 0 sats. If the intent was "unpriced products get no price tags and no price in the description", the call site must actually pass `undefined` — `price: priceTag ? parseFloat(priceTag[1]) : undefined`, and drop the `|| 'SATS'` fallback (or gate the whole price branch on `priceTag` existing).

## [RISK] `src/routes/products.$productId.tsx:393` — og:image passes relay data through unvalidated

`image: backgroundImageUrl || undefined` sends `product.image[1]` — untrusted relay tag data — straight into `og:image`/`twitter:image`. A relative or non-HTTP URL produces a broken preview (social crawlers require absolute URLs); the merged superseder added `absolutizeImageUrl()` (`src/lib/ogTags.ts:239-246` on master) precisely because this needs validation. The PR text also says "Treat relay data as untrusted until validated" is a repo constraint — this is the one place the PR doesn't.

## [RISK] Client-side injection is invisible to the crawlers this PR is named after

Twitter, Facebook, Slack, Discord, Telegram, iMessage do not execute JavaScript — they read the HTML as served. The tags this PR injects only exist after hydration, so sharing a product link will still not produce a social preview card on those platforms; only Googlebot benefits. The author's own PR note acknowledges full support needs SSR. As an SEO increment this is defensible; as "social previews" it doesn't deliver the title. #1232 landed the SSR path already.

## [INFO] Superseded — close rather than rebase

#1232 ("feat: add Open Graph meta tags for product social previews") merged to master on 2026-09-14 and covers this feature end-to-end (server-side injection via `src/lib/ogTags.ts`, tests in `src/lib/__tests__/ogTags.test.ts`, NSFW gating, URL absolutization, hook-order safety). Maintainer comment from maxime-tt: "Closing this in favor of #1232 which is a newer, cleaner implementation of the same feature." This branch is 826 commits behind master (measured at review time) with 1 conflict in this same file. The honest disposition is close-as-superseded; any rebase would be re-doing work that already shipped.

## [INFO] Prior review correction

Review #4745940450 flagged "duplicate meta description" risk — not real at this head: `src/index.html:4-10` contains no description meta and no other code under `src/` injects one.

## [NIT] `src/routes/products.$productId.tsx:99,108-109` — bogus OG types

`og:type` "product" is not a valid Open Graph type (the OG spec has no such value); `product:price:amount`/`product:price:currency` are from Facebook's retired commerce namespace. Harmless — consumers ignore them — but they're decoration, not protocol.

## [NIT] `src/routes/products.$productId.tsx:387` — truncation can split an emoji in half

`description.substring(0, 157) + '...'` counts UTF-16 code units. `description` is raw event content (`getProductDescription = (event) => event?.content || ''`, `src/queries/products.tsx:495`), arbitrary relay text; if unit 157 lands inside a surrogate pair (emoji), the emitted og:description/twitter:description ends with a lone half-character. The merged superseder handles this with `truncateForMeta` (master `src/lib/ogTags.ts:226-230`, "Code-point-safe so emoji and other astral characters are never split into invalid halves"). `Array.from(description).slice(0,157).join('')` is the minimal fix.

## Verdict

The hook itself is competently written (proper cleanup, dependency array, no deps). But the call-site placement crashes the page it's meant to enhance, and the head commit's stated fix doesn't do what it says. Given #1232 already shipped the feature with none of these problems, the right move is close. If this is kept alive instead: move the hook above the early returns, make the price guard reachable, validate og:image.

CHANGES REQUESTED at `db60d4d7ec896944e79ed2734f42b7ec670a156e`.
# Order Details Page — Collapsible Sections and Payment Labels

Salvage of closed PR
[#472](https://github.com/PlebeianApp/market/pull/472) ("feat: Various UX
changes to Order Details Page", author `hkarani`, branch
`feat/order-details-ux-changes` @ `5dc461f69d`, closed without review 2026-08-14,
closes #382). Re-applied by hand on top of `master` because the component had
drifted; the changes below are the original PR's intent, rebuilt on the
existing `ui/collapsible` primitive instead of hand-rolled expand state.

## What changed (2 production files)

`src/components/orders/OrderDetailComponent.tsx`:

- Each product row is a `Collapsible`: the collapsed row shows the product
  title (from the `title` tag, `Product` fallback) and quantity; the full
  `ProductCard` renders inside `CollapsibleContent`. The Products card header
  gains an expand-all / collapse-all toggle.
- The Order Timeline is collapsible, with the **latest event always rendered
  outside the collapsible** so the newest settlement-relevant state (e.g. a
  payment receipt) is never hidden behind the toggle. A "Show N earlier
  events" trigger reveals the older events.
- The `V4VRecipientsCard` is no longer rendered in the payment details card.
- The decorative Package icon next to the "Products" header label is removed.

`src/components/orders/detail/InvoiceCard.tsx`:

- Invoice titles are labeled with the recipient plus `(Merchant)` or `(v4v)`
  (via the exported `getInvoiceTitle` helper) so buyers can tell who each
  payment goes to at a glance.

## Design rationale (demoted from ADR)

These points were considered ADR-backlog material in the salvage analysis but
are display-level decisions, so they are recorded here instead:

1. **Payment labels are presentation, not state.** `(Merchant)` / `(v4v)` is
   display text derived from `invoice.type`. The `PaymentInvoiceType` union
   and all payment lifecycle states remain untouched — nothing is collapsed
   into a boolean.
2. **V4V removal is display-only.** Only the `V4VRecipientsCard` render is
   removed. The `sellerV4VShares` query stays in `OrderDetailComponent` and
   continues to feed invoice generation through `useOrderInvoices`, so v4v
   payment information is not lost — it stops being rendered in this card.
   V4V recipient data remains accessible wherever it was already surfaced
   outside this page.
3. **Collapsed timeline must not obscure settlement proof.** This is why the
   newest timeline event renders unconditionally: the newest event is where
   payment/settlement progression is visible, so collapsing older history can
   never hide the current state.
4. **Product titles come from the raw `title` tag** (with a `Product`
   fallback) rather than rendering the full `ProductCard` when collapsed —
   consistent with the repo's tag-first preference for untrusted relay data.

## Accessibility

Both collapsibles use the existing shadcn/Radix `Collapsible` primitive
(`src/components/ui/collapsible.tsx`), which provides `aria-expanded`,
`aria-controls`, keyboard activation, and `data-state` styling hooks. All
triggers have programmatic accessible names (visible text or `aria-label`).
